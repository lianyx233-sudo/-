import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db } from '../lib/tcb';
import { doc, updateDoc, serverTimestamp } from '../lib/tcb';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const QUESTIONS = [
  {
    id: 'source',
    title: '你是从哪里知道这个工作坊的？',
    options: [
      '学校 / 老师推荐',
      '社区 / 活动通知',
      '公众号 / 小红书 / 抖音等平台',
      '家人或朋友推荐',
      '线下展览 / 美育活动现场',
      '偶然看到，想点进来看看'
    ]
  },
  {
    id: 'ageGroup',
    title: '你的年龄段是？',
    options: [
      '6岁以下',
      '6-12岁',
      '13-18岁',
      '19-30岁',
      '31-45岁',
      '46-60岁',
      '60岁以上'
    ]
  },
  {
    id: 'identity',
    title: '你的身份更接近哪一类？',
    options: [
      '儿童 / 青少年',
      '家长 / 宝妈宝爸',
      '学生',
      '教师 / 教育工作者',
      '工科 / 技术背景人群',
      '设计 / 艺术相关人群',
      '社区居民 / 普通体验者'
    ]
  },
  {
    id: 'artRelation',
    title: '你和艺术、设计的关系更像哪一种？',
    options: [
      '不太了解，但想轻松体验一下',
      '对艺术感兴趣，平时会看展、做手工或画画',
      '有一定基础，学过美术、设计或相关课程',
      '更关注产品、结构、功能和技术实现',
      '想陪孩子、学生或家人一起体验'
    ]
  }
];

export default function Survey() {
  const navigate = useNavigate();
  const { user, refreshUserData } = useAuth();
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const isComplete = QUESTIONS.every(q => answers[q.id]);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const path = `users/${user.uid}`;
      await updateDoc(doc(db, 'users', user.uid), {
        surveyCompleted: true,
        surveyData: answers,
        updatedAt: serverTimestamp()
      });
      await refreshUserData();
      navigate('/');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col py-24 px-6 text-[#1A1A1A]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto"
      >
        <header className="mb-16">
          <h2 className="text-[12px] uppercase tracking-[0.4em] text-black/40 mb-4 font-bold">入坊前小测试</h2>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
            在进入「有点艺思，点育万家」IP艺术工坊前，先回答几个小问题
          </h1>
          <p className="text-black/50 leading-relaxed font-light">
            系统将为你推荐更适合的美育体验路径。
          </p>
        </header>

        <div className="space-y-16">
          {QUESTIONS.map((q, index) => (
            <div key={q.id}>
              <h3 className="text-lg font-medium mb-6">
                <span className="text-black/40 mr-4 font-mono">{index + 1}.</span> 
                {q.title} <span className="text-xs text-black/30 font-normal ml-2">【单选】</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(q.id, opt)}
                    className={`text-left p-4 border transition-colors ${
                      answers[q.id] === opt 
                        ? 'border-black bg-black text-white' 
                        : 'border-black/10 bg-white hover:border-black/30 text-black/70'
                    }`}
                  >
                    <div className="text-sm">{opt}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-16 border-t border-black/5 text-center">
          <button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className="px-12 py-5 bg-[#1A1A1A] text-white text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-black/90 transition-colors disabled:opacity-30 disabled:hover:bg-[#1A1A1A]"
          >
            {isSubmitting ? '保存中...' : '开始匹配我的美育方案'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
