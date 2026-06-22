import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/tcb';
import {
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  sendEmailVerificationCode,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithEmailVerificationCode,
} from '../lib/tcb';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

type LoginMethod = 'password' | 'code';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationInfo, setVerificationInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ensureUser = (user: any) => {
    if (!user?.uid) {
      throw new Error('登录成功，但没有拿到用户信息。');
    }

    return user;
  };

  const saveUserProfile = async (user: any) => {
    const path = `users/${user.uid}`;
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      surveyCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return path;
  };

  const finalizeLogin = async (user: any) => {
    const ensuredUser = ensureUser(user);

    try {
      const userDoc = await getDoc(doc(db, 'users', ensuredUser.uid));
      if (!userDoc.exists()) {
        await saveUserProfile(ensuredUser);
      }
    } catch (err) {
      console.error('Failed to recover user document', err);
    }

    navigate('/');
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setVerificationInfo(null);
    setVerificationCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setIsLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = ensureUser(userCredential.user);

        try {
          await saveUserProfile(user);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }

        navigate('/');
        return;
      }

      if (loginMethod === 'code') {
        if (!verificationInfo || !verificationCode) {
          setError('请先获取并输入邮箱验证码。');
          return;
        }

        const userCredential = await signInWithEmailVerificationCode(
          auth,
          email,
          verificationInfo,
          verificationCode,
        );
        await finalizeLogin(userCredential.user);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await finalizeLogin(userCredential.user);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('这个邮箱已经注册，请直接登录。');
        setIsRegister(false);
      } else if (err.code === 'auth/invalid-credential') {
        setError('邮箱或密码不正确。');
      } else {
        console.error(err);
        setError(err.message || '登录过程中出现错误。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!email) {
      setError('请先输入邮箱地址。');
      return;
    }

    setError('');
    setResetMessage('');
    setIsLoading(true);

    try {
      const info = await sendEmailVerificationCode(auth, email);
      setVerificationInfo(info);
      setResetMessage('验证码已发送，请查看邮箱。');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '发送验证码失败。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('请先输入邮箱地址。');
      return;
    }

    setError('');
    setResetMessage('');
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('密码重置邮件已发送，请查看邮箱。');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError('没有找到这个邮箱对应的账号。');
      } else {
        console.error(err);
        setError(err.message || '发送密码重置邮件失败。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-6 text-[#1A1A1A]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 border border-black/5 flex flex-col items-center"
      >
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            有点艺术<span className="font-serif italic font-medium"> 点育万家</span>
          </h1>
          <p className="text-xs uppercase tracking-widest text-black/40 font-bold">
            {isRegister ? 'Create an account' : 'Sign in to workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-6 w-full p-4 text-xs bg-red-50 text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {resetMessage && (
          <div className="mb-6 w-full p-4 text-xs bg-green-50 text-green-700 border border-green-100">
            {resetMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div>
            <label className="block text-xs uppercase tracking-widest text-black/60 font-bold mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="w-full border-b border-black/20 pb-2 bg-transparent focus:outline-none focus:border-black transition-colors"
              placeholder="name@example.com"
            />
          </div>

          {!isRegister && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`h-10 text-[10px] uppercase tracking-widest font-bold border transition-colors ${
                  loginMethod === 'password'
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 text-black/50 hover:text-black'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('code')}
                className={`h-10 text-[10px] uppercase tracking-widest font-bold border transition-colors ${
                  loginMethod === 'code'
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 text-black/50 hover:text-black'
                }`}
              >
                Email Code
              </button>
            </div>
          )}

          {(isRegister || loginMethod === 'password') && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs uppercase tracking-widest text-black/60 font-bold">
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[10px] text-black/40 hover:text-black transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required={isRegister || loginMethod === 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-black/20 pb-2 bg-transparent focus:outline-none focus:border-black transition-colors"
                placeholder="Password"
              />
            </div>
          )}

          {!isRegister && loginMethod === 'code' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-black/60 font-bold mb-2">
                Verification Code
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full border-b border-black/20 pb-2 bg-transparent focus:outline-none focus:border-black transition-colors"
                  placeholder="Code"
                />
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={isLoading || !email}
                  className="h-10 px-4 border border-black/10 text-[10px] uppercase tracking-widest font-bold text-black/50 hover:text-black transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              (!isRegister &&
                loginMethod === 'code' &&
                (!verificationInfo || !verificationCode))
            }
            className="w-full py-4 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-black/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center max-w-[80%]">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setLoginMethod('password');
              setError('');
              setResetMessage('');
            }}
            className="text-[11px] text-black/40 hover:text-black transition-colors underline underline-offset-4"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
