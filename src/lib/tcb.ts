import * as cloudbaseObj from '@cloudbase/js-sdk';

const cloudbase = (cloudbaseObj as any).default || cloudbaseObj;

export const tcbEnvId =
  import.meta.env.VITE_CLOUDBASE_ENV_ID ||
  import.meta.env.VITE_TCB_ENV_ID ||
  'dianyuwanjia1-d4gy47isafba6b3ce';
export const tcbRegion =
  import.meta.env.VITE_CLOUDBASE_REGION || import.meta.env.VITE_TCB_REGION || 'ap-shanghai';
const tcbAccessKey = import.meta.env.VITE_CLOUDBASE_ACCESS_KEY;

const cloudbaseConfig: Record<string, string> = {
  env: tcbEnvId,
  region: tcbRegion,
};

if (tcbAccessKey) {
  cloudbaseConfig.accessKey = tcbAccessKey;
}

export const app = cloudbase.init(cloudbaseConfig);

export const auth = app.auth({ persistence: 'local' });
export const db = app.database();
export const storage = app;

type QueryArg =
  | { type: 'where'; field: string; op: string; val: any }
  | { type: 'limit'; limit: number };

export const collection = (_db: any, path: string) => ({ type: 'collection', path });

export const doc = (dbOrColl: any, ...args: string[]) => {
  if (dbOrColl?.type === 'collection') {
    return { type: 'doc', path: dbOrColl.path, id: args[0] };
  }

  return { type: 'doc', path: args[0], id: args[1] };
};

export const query = (coll: any, ...args: Array<QueryArg | false | null | undefined>) => ({
  ...coll,
  type: 'query',
  args: args.filter(Boolean),
});

export const where = (field: string, op: string, val: any): QueryArg => ({
  type: 'where',
  field,
  op,
  val,
});

export const limit = (num: number): QueryArg => ({ type: 'limit', limit: num });

function normalizeDocData(data: any) {
  if (Array.isArray(data)) {
    return data[0];
  }

  return data;
}

export const getDocs = async (q: any) => {
  let ref = db.collection(q.path);

  if (q.args) {
    const whereObj: Record<string, any> = {};

    for (const arg of q.args) {
      if (arg.type === 'where') {
        if (arg.op === '==') {
          whereObj[arg.field] = db.command.eq(arg.val);
        } else if (arg.op === '>=') {
          whereObj[arg.field] = db.command.gte(arg.val);
        } else if (arg.op === '<=') {
          whereObj[arg.field] = db.command.lte(arg.val);
        }
      } else if (arg.type === 'limit') {
        ref = ref.limit(arg.limit);
      }
    }

    if (Object.keys(whereObj).length > 0) {
      ref = ref.where(whereObj);
    }
  }

  const res = await ref.get();
  const data = Array.isArray(res.data) ? res.data : [];

  return {
    docs: data.map((item: any) => ({
      id: item._id,
      data: () => item,
    })),
    empty: data.length === 0,
  };
};

export const getDoc = async (d: any) => {
  const res = await db.collection(d.path).doc(d.id).get();
  const data = normalizeDocData(res.data);

  return {
    id: d.id,
    exists: () => Boolean(data),
    data: () => data,
  };
};

export const setDoc = async (d: any, data: any) => {
  await db.collection(d.path).doc(d.id).set(data);
};

export const updateDoc = async (d: any, data: any) => {
  const cleanData = { ...data };
  Object.keys(cleanData).forEach((key) => cleanData[key] === undefined && delete cleanData[key]);
  await db.collection(d.path).doc(d.id).update(cleanData);
};

export const deleteDoc = async (d: any) => {
  await db.collection(d.path).doc(d.id).remove();
};

export const addDoc = async (c: any, data: any) => {
  const res = await db.collection(c.path).add(data);
  return { id: res.id };
};

export const serverTimestamp = () => db.serverDate();

export const getDocFromServer = getDoc;

function normalizeAuthUser(input: any) {
  const user = input?.data?.user || input?.user || input?.data || input;
  if (!user) {
    return null;
  }

  return {
    ...user,
    uid: user.uid || user.userId || user.sub || user._id,
    email: user.email || input?.email,
  };
}

function throwAuthErrorIfNeeded(result: any) {
  if (result?.error) {
    const message = result.error.message || result.error.errMsg || 'Authentication failed';
    const error = new Error(message) as Error & { code?: string };
    error.code = result.error.code || result.error.errCode;
    throw error;
  }

  return result?.data || result;
}

export function isAnonymousAuthUser(user: any) {
  const loginType = String(
    user?.loginType ||
      user?.authType ||
      user?.provider ||
      user?.data?.loginType ||
      user?.user?.loginType ||
      '',
  ).toLowerCase();

  return (
    Boolean(
      user?.isAnonymous ||
        user?.is_anonymous ||
        user?.data?.user?.isAnonymous ||
        user?.data?.user?.is_anonymous ||
        user?.user?.isAnonymous ||
        user?.user?.is_anonymous,
    ) ||
    loginType.includes('anonymous') ||
    loginType === 'anon'
  );
}

function normalizeNonAnonymousAuthUser(input: any) {
  const user = normalizeAuthUser(input);
  return user && !isAnonymousAuthUser(user) ? user : null;
}

async function getAuthUser(authObj: any, fallback?: any) {
  const fromCurrent = normalizeNonAnonymousAuthUser(authObj.currentUser);
  if (fromCurrent) {
    return fromCurrent;
  }

  if (typeof authObj.getCurrentUser === 'function') {
    const fromGetCurrentUser = normalizeNonAnonymousAuthUser(await authObj.getCurrentUser());
    if (fromGetCurrentUser) {
      return fromGetCurrentUser;
    }
  }

  const fromFallback = normalizeNonAnonymousAuthUser(fallback);
  if (fromFallback) {
    return fromFallback;
  }

  const loginState = await authObj.getLoginState?.();
  return normalizeNonAnonymousAuthUser(loginState);
}

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  let emitted = false;
  const unsubscribe = authObj.onLoginStateChanged((state: any) => {
    emitted = true;
    const user = normalizeAuthUser(authObj.currentUser || state);
    callback(user && !isAnonymousAuthUser(user) ? user : null);
  });

  authObj.getLoginState?.().then((state: any) => {
    if (!emitted) {
      const user = normalizeAuthUser(authObj.currentUser || state);
      callback(user && !isAnonymousAuthUser(user) ? user : null);
    }
  });

  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
};

export const signOut = (authObj: any) => authObj.signOut();

export const createUserWithEmailAndPassword = async (
  authObj: any,
  email: string,
  pass: string,
) => {
  const signUpResult = throwAuthErrorIfNeeded(await authObj.signUp({ email, password: pass }));
  const signInResult = throwAuthErrorIfNeeded(
    await authObj.signInWithPassword({ email, password: pass }),
  );
  const user = await getAuthUser(authObj, signInResult || signUpResult);
  if (!user) {
    throw new Error('Email registration succeeded, but no non-anonymous user was returned.');
  }

  return { user };
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const signInResult = throwAuthErrorIfNeeded(
    await authObj.signInWithPassword({ email, password: pass }),
  );
  const user = await getAuthUser(authObj, signInResult);
  if (!user) {
    throw new Error('Email sign-in succeeded, but no non-anonymous user was returned.');
  }

  return { user };
};

export const sendPasswordResetEmail = async (authObj: any, email: string) => {
  throwAuthErrorIfNeeded(await authObj.resetPasswordForEmail(email));
};

export const sendEmailVerificationCode = async (authObj: any, email: string) => {
  return throwAuthErrorIfNeeded(await authObj.getVerification({ email }));
};

export const signInWithEmailVerificationCode = async (
  authObj: any,
  email: string,
  verificationInfo: any,
  verificationCode: string,
) => {
  const signInResult = throwAuthErrorIfNeeded(
    await authObj.signInWithEmail({
      verificationInfo,
      verificationCode,
      email,
    }),
  );
  const user = await getAuthUser(authObj, signInResult);
  if (!user) {
    throw new Error('Email code sign-in succeeded, but no non-anonymous user was returned.');
  }

  return { user };
};

export type User = any;

export const ref = (_storageObj: any, path: string) => ({ type: 'ref', path });

function dataURLtoBlob(dataUrl: string) {
  const [header, payload] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

export const uploadString = async (r: any, dataUrl: string, _format?: string) => {
  const blob = dataURLtoBlob(dataUrl);
  const file = new File([blob], r.path.split('/').pop() || 'upload.png', { type: blob.type });
  const res = await app.uploadFile({
    cloudPath: r.path,
    filePath: file as any,
  });

  r.fileID = res.fileID;
  return { ref: r };
};

export const uploadBytes = async (r: any, file: File) => {
  const res = await app.uploadFile({
    cloudPath: r.path,
    filePath: file,
  });

  r.fileID = res.fileID;
  return { ref: r };
};

export const getDownloadURL = async (r: any) => {
  if (!r.fileID) {
    return '';
  }

  const res = await app.getTempFileURL({ fileList: [r.fileID] });
  return res.fileList[0]?.tempFileURL || '';
};
