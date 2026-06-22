import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { db } from '../lib/tcb';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from '../lib/tcb';
import Markdown from 'react-markdown';

const hardcodedTutorials = [
  {
    id: 'wx1',
    title: '文创IP如何结合产品发光发热？',
    tags: ['IP设计', '文创', '审美'],
    duration: '10 min read',
    desc: '从无形的文化内涵到具象的创意设计，教你如何打造有温度、有故事的艺术周边产品。',
    image: 'https://images.unsplash.com/photo-1616166330003-8e7f1e6fec76?auto=format&fit=crop&q=80&w=800',
    content: '从无形的文化内涵到具象的创意设计，教你如何打造有温度、有故事的艺术周边产品。\n\n文化创意的核心在于价值的转译与生活方式的传达。'
  },
  {
    id: 'wx2',
    title: '打动人心的艺术IP背后的美学机理',
    tags: ['IP美学', '爆款逻辑', '视觉'],
    duration: '8 min read',
    desc: '深度解析当代热门艺术周边的美学基因，寻找产品背后的结构化设计路径。',
    image: 'https://images.unsplash.com/photo-1541888047535-71701712a44b?auto=format&fit=crop&q=80&w=800',
    content: '深度解析当代热门艺术周边的美学基因，寻找产品背后的结构化设计路径。\n\n审美不仅仅是视觉上的愉悦，更是对特定文化语境的深度认同。'
  },
  {
    id: 'wx3',
    title: '从灵感到实体的跨越：IP设计实录',
    tags: ['落地实操', '材质', '质感'],
    duration: '12 min read',
    desc: '分享实际的周边案例，从草图、灵感来源，到材料打样、成品的惊艳转变。',
    image: 'https://images.unsplash.com/photo-1594912953266-70e28d8b94bd?auto=format&fit=crop&q=80&w=800',
    content: '分享实际的周边案例，从草图、灵感来源，到材料打样、成品的惊艳转变。\n\n真正的好设计，不仅存在于图纸，更需要经历材质和工艺的千锤百炼。'
  }
];

export default function LightWorkshop() {
  const { user } = useAuth();
  const [tutorials, setTutorials] = useState<any[]>(hardcodedTutorials);
  const [activeTutorial, setActiveTutorial] = useState<any | null>(null);
  const [showFullArticle, setShowFullArticle] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const snap = await getDocs(collection(db, 'articles'));
        if (!snap.empty) {
          const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          fetched.sort((a: any, b: any) => {
            if(b.createdAt && a.createdAt) {
               return b.createdAt.seconds - a.createdAt.seconds;
            }
            return 0;
          });
          setTutorials(fetched);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchArticles();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchFavs = async () => {
      const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const articleIds = snap.docs.map(d => d.data().articleId);
      setFavorites(articleIds);
    };
    fetchFavs();
  }, [user]);

  const isSaved = (id: string) => favorites.includes(id);

  const toggleFavorite = async (tutorial: any) => {
    if (!user || isSaving) return;
    setIsSaving(true);
    
    try {
      const favId = `${user.uid}_${tutorial.id}`;
      const favRef = doc(db, 'favorites', favId);
      
      if (isSaved(tutorial.id)) {
        await deleteDoc(favRef);
        setFavorites(prev => prev.filter(id => id !== tutorial.id));
      } else {
        await setDoc(favRef, {
          userId: user.uid,
          articleId: tutorial.id,
          title: tutorial.title,
          category: (tutorial.tags && tutorial.tags[0]) || '',
          readTime: tutorial.duration || '5 min read',
          author: 'System',
          createdAt: new Date().toISOString()
        });
        setFavorites(prev => [...prev, tutorial.id]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-32 pb-16 px-6 bg-[#F7F7F5] text-[#1A1A1A]"
    >
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-24">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "40px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-[1px] bg-black mb-8"
          />
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6">从一个知识点，点亮艺术灵感。</h1>
          <p className="text-black/50 max-w-xl text-lg font-light flex items-center justify-between">
            <span>集结工业美学教案与艺术转化路径。不仅是展示，更是灵感启蒙的开端。</span>
          </p>
        </header>

        <section>
          <div className="flex items-center justify-between mb-8 border-b border-black/10 pb-4">
            <h2 className="text-xs tracking-[0.2em] uppercase text-black/50">Knowledge Base</h2>
            <div className="text-xs text-black/40 tracking-widest">{tutorials.length} Artifacts</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tutorials.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                onClick={() => {
                  setActiveTutorial(item);
                  setShowFullArticle(false);
                }}
                className="group cursor-pointer"
              >
                <div className="aspect-[4/5] bg-white overflow-hidden mb-6 relative border border-black/5 group-hover:border-black/20 transition-colors">
                  <img
                     src={item.image || undefined}
                     alt={item.title}
                     className="w-full h-full object-cover grayscale opacity-90 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-white via-white/80 to-transparent flex justify-between items-end">
                     <div>
                       <div className="w-1 h-1 bg-black mb-4" />
                       <h3 className="text-xl font-medium">{item.title}</h3>
                     </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Modal / Active Tutorial */}
        <AnimatePresence>
          {activeTutorial && !showFullArticle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-white/80 backdrop-blur-md"
              onClick={() => setActiveTutorial(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#F7F7F5] border border-black/10 w-full max-w-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
              >
                <div 
                  className="md:w-1/2 aspect-square md:aspect-auto border-r border-black/10 cursor-pointer group relative hover:opacity-90" 
                  onClick={() => {
                    if (activeTutorial.link) {
                      window.open(activeTutorial.link, '_blank', 'noopener,noreferrer');
                    } else if (activeTutorial.content || activeTutorial.desc) {
                      setShowFullArticle(true);
                    }
                  }} 
                  title="点击阅读完整图文"
                >
                  <img src={activeTutorial.image || undefined} alt={activeTutorial.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="text-white font-semibold tracking-widest uppercase text-sm opacity-0 group-hover:opacity-100 transition-opacity">阅读全文</span>
                  </div>
                </div>
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-medium mb-4">{activeTutorial.title}</h2>
                    <div className="flex gap-2 mb-8 flex-wrap">
                      {activeTutorial.tags?.map((tag: string) => (
                        <span key={tag} className="text-[10px] tracking-widest uppercase border border-black/20 px-2 py-1 text-black/60">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-black/60 font-light leading-relaxed mb-12">
                      {activeTutorial.desc}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleFavorite(activeTutorial)}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 border border-black/20 hover:bg-black hover:text-white transition-colors py-4 uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
                    >
                      {isSaved(activeTutorial.id) ? (
                        <>Saved <Bookmark className="w-4 h-4 fill-current" /></>
                      ) : (
                        <>Save to Archive <Bookmark className="w-4 h-4" /></>
                      )}
                    </button>
                    <button onClick={() => setActiveTutorial(null)} className="p-4 border border-black/20 hover:bg-black/5 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTutorial && showFullArticle && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 z-50 bg-[#F7F7F5] overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto px-6 py-12 md:py-24 relative">
                <button 
                  onClick={() => setShowFullArticle(false)}
                  className="fixed top-8 left-8 p-4 bg-white border border-black/10 hover:bg-black hover:text-white transition-colors rounded-full shadow-lg z-10"
                  title="返回上一级"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setActiveTutorial(null);
                    setShowFullArticle(false);
                  }}
                  className="fixed top-8 right-8 p-4 bg-white border border-black/10 hover:bg-black hover:text-white transition-colors rounded-full shadow-lg z-10"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-12 text-center pt-8">
                  <div className="flex justify-center gap-2 mb-6 flex-wrap">
                    {activeTutorial.tags?.map((tag: string) => (
                      <span key={tag} className="text-[10px] tracking-widest uppercase border border-black/20 px-2 py-1 text-black/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-8 leading-tight">
                    {activeTutorial.title}
                  </h1>
                </div>

                {activeTutorial.image && (
                  <div className="w-full aspect-[21/9] bg-gray-100 overflow-hidden mb-16 border border-black/10">
                    <img src={activeTutorial.image || undefined} alt={activeTutorial.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <article className="prose prose-lg prose-neutral max-w-none prose-headings:font-semibold prose-a:text-black prose-a:underline hover:prose-a:opacity-80 mx-auto px-4 prose-img:mx-auto">
                  <div className="markdown-body">
                    {(activeTutorial.content && (activeTutorial.content.includes('<p>') || activeTutorial.content.includes('<h1'))) ? (
                      <div dangerouslySetInnerHTML={{ __html: activeTutorial.content }} />
                    ) : (
                      <Markdown>{activeTutorial.content || activeTutorial.desc || '本文暂无内容提供。'}</Markdown>
                    )}
                  </div>
                </article>

                <div className="mt-20 pt-12 border-t border-black/10 flex justify-center">
                  <button
                    onClick={() => toggleFavorite(activeTutorial)}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-3 border border-black/20 hover:bg-black hover:text-white transition-colors px-8 py-4 uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
                  >
                    {isSaved(activeTutorial.id) ? (
                      <>取消收藏 <Bookmark className="w-5 h-5 fill-current" /></>
                    ) : (
                      <>收藏该内容 <Bookmark className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
