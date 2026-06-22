import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthContext';
import { db } from '../lib/tcb';
import { collection, query, where, getDocs, doc, updateDoc } from '../lib/tcb';
import { Download, Share2, X, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function MyWorks() {
  const { user } = useAuth();
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeWork, setActiveWork] = useState<any | null>(null);
  const [shareWork, setShareWork] = useState<any | null>(null);
  const [isGeneratingBoard, setIsGeneratingBoard] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStory, setEditStory] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchWorks = async () => {
      try {
        const q = query(
          collection(db, 'works'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedWorks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        fetchedWorks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWorks(fetchedWorks);
      } catch (err) {
        console.error('Error fetching works:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, [user]);

  const handleDownloadSingle = async (url: string, index: number, typeLabel: string, createdAt: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const viewNames = ['主视图', '顶视图', '正视图', '侧视图'];
      const viewName = viewNames[index] || `视图${index + 1}`;
      a.download = `${typeLabel}-设计-${new Date(createdAt).getTime()}-${viewName}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShare = (work: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareWork(work);
  };

  const handleOpenEdit = () => {
    setEditName(activeWork.name || '');
    setEditStory(activeWork.story || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!activeWork) return;
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, 'works', activeWork.id), {
        name: editName,
        story: editStory
      });
      // Update local state
      const updatedWork = { ...activeWork, name: editName, story: editStory };
      setActiveWork(updatedWork);
      setWorks(works.map(w => w.id === activeWork.id ? updatedWork : w));
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating work:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const generateAndDownloadBoard = async () => {
    if (!boardRef.current || !shareWork) return;
    setIsGeneratingBoard(true);

    const parent = boardRef.current.parentElement;
    if (parent) {
      parent.classList.remove('scale-[0.75]', 'sm:scale-100', 'transform');
    }

    // Allow DOM to update layout before taking screenshot to fix text shifting
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Ensure images are fully loaded before capturing
      const canvas = await html2canvas(boardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFDF9',
        scale: 2 // Higher resolution
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${shareWork.typeLabel}-展板-${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating board:', error);
    } finally {
      if (parent) {
        parent.classList.add('scale-[0.75]', 'sm:scale-100', 'transform');
      }
      setIsGeneratingBoard(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-32 pb-16 px-12 bg-[#F7F7F5] flex items-center justify-center"><div className="w-4 h-4 bg-black animate-ping" /></div>;
  }

  const getViewLabel = (index: number, total: number) => {
    if (total <= 1) return '原图';
    const names = ['主视图', '顶视图', '正视图', '侧视图'];
    return names[index] || `视图 ${index + 1}`;
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-32 pb-16 px-12 bg-[#F7F7F5] text-black"
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-light mb-12">我的作品</h1>
        
        {works.length === 0 ? (
          <div className="text-black/40 font-light">暂无作品。去聚点坊创作一个吧。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works.map(work => (
              <div 
                key={work.id} 
                onClick={() => setActiveWork(work)}
                className="border border-black/10 bg-white group overflow-hidden flex flex-col cursor-pointer transition-shadow hover:shadow-xl"
              >
                <div className="aspect-[4/3] bg-black/5 overflow-hidden relative">
                  {work.images && work.images[0] && (
                    <img src={work.images[0] || undefined} alt={work.typeLabel} crossOrigin="anonymous" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                  {work.images && work.images.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/80 px-2 text-white text-[10px] tracking-widest">{work.images.length} 视图</div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase border border-black/20 px-2 py-1 tracking-widest">{work.typeLabel}设计</span>
                    <span className="text-[10px] text-black/40">{new Date(work.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-medium mb-2">{work.name || `${work.typeLabel}设计`}</h3>
                  <p className="text-sm font-light text-black/60 leading-relaxed line-clamp-3 mb-6">{work.story || work.prompt}</p>
                  
                  <div className="mt-auto pt-4 border-t border-black/10 flex justify-between items-center text-xs">
                    <span className="text-black/40 tracking-widest uppercase">点击查看详情</span>
                    <button 
                      onClick={(e) => handleShare(work, e)}
                      className="flex items-center gap-2 font-semibold tracking-widest uppercase hover:text-black/60 transition-colors"
                      title="分享"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>分享展板</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {activeWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveWork(null)} />
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white max-w-5xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col"
            >
              <button 
                onClick={() => setActiveWork(null)}
                className="absolute top-6 right-6 p-2 hover:bg-black/5 rounded-full transition-colors z-20"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-8 md:p-12">
                <div className="mb-10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs tracking-[0.2em] uppercase text-black/50 font-semibold block">
                      作品详情
                    </span>
                    {!isEditing && (
                      <button onClick={handleOpenEdit} className="text-xs text-black/50 hover:text-black flex items-center gap-1 transition-colors uppercase tracking-widest font-semibold">
                        <Edit2 className="w-3 h-3" /> 编辑设定
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mb-8 p-6 bg-[#F7F7F5] border border-black/10 space-y-4">
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-black/50 mb-2">IP名称</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-transparent border-b border-black/20 p-2 text-xl font-medium focus:outline-none focus:border-black transition-colors"
                          placeholder="例如：呆萌小猫"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-black/50 mb-2">IP故事 / 介绍</label>
                        <textarea 
                          value={editStory}
                          onChange={(e) => setEditStory(e.target.value)}
                          rows={3}
                          className="w-full bg-transparent border border-black/20 p-3 text-sm font-light leading-relaxed focus:outline-none focus:border-black transition-colors resize-none"
                          placeholder="这个主角来自哪里？有什么特别？"
                        />
                      </div>
                      <div className="flex justify-end gap-4 pt-2">
                        <button onClick={() => setIsEditing(false)} className="text-xs uppercase tracking-widest text-black/50 hover:text-black transition-colors px-4 py-2">取消</button>
                        <button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-black text-white text-xs uppercase tracking-widest px-6 py-2 hover:bg-black/80 transition-colors disabled:opacity-50">
                          {isSavingEdit ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-3xl font-light mb-4">{activeWork.name || `${activeWork.typeLabel}设计`}</h2>
                      {activeWork.story && (
                        <p className="text-sm font-light leading-relaxed text-black/80 mb-6 border-l-2 border-black/20 pl-4">{activeWork.story}</p>
                      )}
                    </>
                  )}
                  
                  <div className="p-4 bg-[#F7F7F5] border border-black/10 text-xs font-light leading-relaxed text-black/60">
                    <span className="font-medium text-black/40 mr-2 uppercase tracking-widest">生成指令</span>
                    {activeWork.prompt}
                  </div>
                </div>

                <div className={`grid gap-6 ${activeWork.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
                  {activeWork.images.map((img: string, i: number) => (
                    <div key={i} className="flex flex-col border border-black/10">
                      <div className="flex justify-between items-center p-4 border-b border-black/10 bg-[#F7F7F5]">
                        <span className="text-xs font-semibold tracking-widest uppercase">{getViewLabel(i, activeWork.images.length)}</span>
                        <button 
                          onClick={() => handleDownloadSingle(img, i, activeWork.typeLabel, activeWork.createdAt)}
                          className="text-xs flex items-center gap-2 hover:text-black/50 transition-colors uppercase tracking-widest font-semibold"
                        >
                          <Download className="w-3 h-3" /> 下载
                        </button>
                      </div>
                      <div className="aspect-square bg-white relative">
                        <img src={img || undefined} alt={`View ${i + 1}`} crossOrigin="anonymous" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Board Modal */}
      <AnimatePresence>
        {shareWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShareWork(null)} />
            
            <div className="relative z-10 flex flex-col items-center max-w-[100vw]">
              <div className="transform scale-[0.75] sm:scale-100 origin-top">
                {/* Hidden Board for rendering (needs to be visible but off-screen to render correctly with html2canvas if we don't want it seen, but showing it as preview is better UI) */}
                <div 
                  ref={boardRef}
                  className="bg-[#FFFDF9] w-[450px] h-[600px] p-8 text-black shadow-xl relative overflow-hidden flex flex-col justify-between rounded-xl border-4 border-[#FFD1664D]"
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#EF476F1A] rounded-full blur-2xl -mt-10 -mr-10"></div>
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#118AB21A] rounded-full blur-2xl -mb-10 -ml-10"></div>
                  
                  <div className="text-center pt-2 relative z-10 w-full flex-shrink-0">
                    <h2 className="text-xl font-bold tracking-wider flex items-center justify-center gap-2 text-[#264653]">
                      ✨ 有点艺思·点育万家 ✨
                    </h2>
                    <p className="text-[10px] font-semibold text-[#26465399] tracking-wider mt-2">{shareWork.typeLabel}设计</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full relative z-10 my-3">
                    <div className="aspect-square w-[75%] bg-white rounded-2xl border-2 border-[#118AB233] overflow-hidden shadow-sm flex-shrink-0 relative">
                      <img src={shareWork.images[0] || undefined} crossOrigin="anonymous" className="w-full h-full object-cover" alt="Share preview" />
                    </div>
                    
                    <div className="w-full px-2 mt-4 flex flex-col gap-3 min-h-0">
                      <div>
                        <span className="inline-block bg-[#FFD16633] text-[#264653] font-bold text-[9px] px-2 py-0.5 rounded-full mb-1">IP名称</span>
                        <div className="text-sm font-bold text-[#EF476F] truncate">{shareWork.name || '未命名小精灵'}</div>
                      </div>
                      {shareWork.story && (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <span className="inline-block bg-[#06D6A033] text-[#264653] font-bold text-[9px] px-2 py-0.5 rounded-full mb-1 w-fit">IP故事</span>
                          <div className="text-[10px] text-[#264653CC] leading-relaxed line-clamp-3 overflow-hidden">{shareWork.story}</div>
                        </div>
                      )}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <span className="inline-block bg-[#118AB233] text-[#264653] font-bold text-[9px] px-2 py-0.5 rounded-full mb-1 w-fit">创作过程</span>
                        <div className="text-[9px] font-light text-[#26465399] leading-relaxed line-clamp-2 overflow-hidden italic">"{shareWork.prompt}"</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-[#2646531A] pt-3 flex justify-between items-center text-[8px] font-bold text-[#26465380] w-full relative z-10 flex-shrink-0">
                    <span className="flex items-center gap-1.5">
                      🎵 由 AI 协作生成
                    </span>
                    <span>{new Date(shareWork.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-[-100px] sm:mt-6 flex gap-4 relative z-20">
                <button 
                  onClick={() => setShareWork(null)}
                  className="px-6 py-3 bg-white/10 text-white hover:bg-white/20 transition-colors uppercase tracking-widest text-xs font-semibold backdrop-blur"
                >
                  取消
                </button>
                <button 
                  onClick={generateAndDownloadBoard}
                  disabled={isGeneratingBoard}
                  className="px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors uppercase tracking-widest text-xs font-semibold disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  {isGeneratingBoard ? (
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isGeneratingBoard ? '生成中...' : '下载保存展板'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.main>
  );
}

