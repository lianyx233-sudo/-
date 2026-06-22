import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db } from '../lib/tcb';
import { collection, query, where, limit, getDocs } from '../lib/tcb';
import touchImg from '../assets/images/regenerated_image_1781659671013.jpg';
import lightImg from '../assets/images/regenerated_image_1781665814621.jpg';
import gatherImg from '../assets/images/regenerated_image_1781665817264.jpg';

const cards = [
  {
    id: 'light',
    title: '点亮坊',
    subtitle: '01 / 学习启发',
    desc: '汇集IP设计教程、案例与工作室美育内容',
    link: '/light',
    delay: 0.1,
    bgImg: lightImg,
    dotColor: 'bg-[#E54D2E]',
    actionText: '进入内容',
    theme: 'light',
    imgBg: 'bg-[#EBEBE9]'
  },
  {
    id: 'touch',
    title: '触点坊',
    subtitle: '02 / 方法路径',
    desc: '通过滚动交互体验从灵感到IP形象的7个步骤',
    link: '/touch',
    delay: 0.2,
    bgImg: touchImg,
    dotColor: 'bg-[#3E63DD]',
    actionText: '点亮流程',
    theme: 'light',
    imgBg: 'bg-[#E2E2E0]'
  },
  {
    id: 'gather',
    title: '聚点坊',
    subtitle: '03 / 协同创作',
    desc: '聚合想象，利用AI辅助生成属于你的周边方案',
    link: '/gather',
    delay: 0.3,
    bgImg: gatherImg,
    dotColor: 'bg-[#30A46C]',
    actionText: '开始定制',
    theme: 'dark',
    imgBg: 'bg-[#222]'
  }
];

export default function Home() {
  const { user } = useAuth();
  const [recentWorks, setRecentWorks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchRecent = async () => {
      try {
        const q = query(
          collection(db, 'works'),
          where('userId', '==', user.uid),
          limit(4)
        );
        const snap = await getDocs(q);
        const works = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        works.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentWorks(works);
      } catch (err) {
        console.error('Error fetching recent works:', err);
      }
    };
    fetchRecent();
  }, [user]);

  return (
    <motion.main

      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pt-32 h-full"
    >
      <div className="flex-1 flex flex-col px-12 pb-12 w-full max-w-7xl mx-auto">
        <header className="max-w-3xl mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="text-[12px] uppercase tracking-[0.4em] text-black/40 mb-4"
          >
            Product Design IP Aesthetic Education
          </motion.h2>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-6xl font-light tracking-tight leading-[1.1] mb-6"
          >
            有点艺思 <span className="font-medium italic font-serif">点育万家</span><br />
            <span className="text-3xl md:text-4xl text-black/60 font-light">IP艺术工坊实践平台</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-black/50 leading-relaxed max-w-xl font-light"
          >
            产品设计 IP 的大众美育浸润实践：从一个灵感点开始，通过结构化的设计路径，学习IP方法，触发无限创意，生成属于你自己的艺术周边产品方案。
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[400px]">
          {cards.map((card) => (
            <Link key={card.id} to={card.link} className="focus:outline-none flex">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
                className={`group relative border border-black/5 flex flex-col overflow-hidden w-full ${card.theme === 'dark' ? 'bg-black text-white' : 'bg-white'}`}
              >
                <div className={`h-1/2 md:h-2/3 overflow-hidden ${card.imgBg}`}>
                  <img src={card.bgImg || undefined} alt={card.title} className={`w-full h-full object-cover transition-all duration-700 ${card.theme === 'dark' ? 'opacity-60 group-hover:scale-105 group-hover:opacity-100' : 'grayscale opacity-90 group-hover:scale-105 group-hover:grayscale-0'}`} />
                </div>
                <div className="p-8 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${card.dotColor}`}></span>
                      <span className={`text-[10px] uppercase tracking-widest font-bold ${card.theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>{card.subtitle}</span>
                    </div>
                    <h3 className="text-2xl font-medium tracking-tight mb-2">{card.title}</h3>
                    <p className={`text-[13px] leading-relaxed ${card.theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>{card.desc}</p>
                  </div>
                  <div className={`text-[10px] uppercase tracking-widest font-bold border-b w-fit pb-1 mt-6 ${card.theme === 'dark' ? 'border-white' : 'border-black'}`}>
                    {card.actionText}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {recentWorks.length > 0 && (
          <div className="mt-20">
            <div className="flex items-center justify-between mb-8 border-b border-black/10 pb-4">
              <h2 className="text-xs tracking-[0.2em] uppercase text-black/50">我的产出预览</h2>
              <Link to="/works" className="text-xs text-black/40 tracking-widest hover:text-black hover:underline transition-colors">全部收藏 &gt;</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentWorks.map(work => (
                <Link key={work.id} to="/works" className="group">
                  <div className="aspect-square bg-black/5 border border-black/10 overflow-hidden relative">
                    {work.images && work.images[0] && (
                      <img src={work.images[0] || undefined} alt="Work" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <footer className="px-12 py-6 flex flex-col md:flex-row justify-between items-start md:items-end border-t border-black/5 mt-auto bg-white/50 w-full">
        <div className="flex space-x-12 mb-4 md:mb-0">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-black/30 font-bold mb-1">在线用户</span>
            <span className="text-[11px] font-medium">{user?.email || '未登录'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-black/30 font-bold mb-1">实践阶段</span>
            <span className="text-[11px] font-medium">大众美育浸润实践 · 第一期</span>
          </div>
        </div>
        <div className="text-[9px] text-black/40 tracking-[0.2em] font-medium uppercase">
          © {new Date().getFullYear()} 有点艺思 IP ART WORKSHOP. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </motion.main>
  );
}
