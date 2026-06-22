import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { db, storage } from '../lib/tcb';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from '../lib/tcb';
import { ref, uploadBytes, getDownloadURL, uploadString } from '../lib/tcb';
import { LogOut, Plus, Trash2, Edit2, X, Image as ImageIcon, Check, FileText } from 'lucide-react';
import { auth } from '../lib/tcb';
import { signOut } from '../lib/tcb';
import * as mammoth from 'mammoth';
import TurndownService from 'turndown';

interface Article {
  id: string;
  title: string;
  image: string;
  tags: string[];
  desc: string;
  content: string;
  link?: string;
  duration?: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'new' | 'edit'>('list');
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [editSection, setEditSection] = useState<'A' | 'B' | 'C' | 'ALL'>('ALL');
  
  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);
  const fileInputRefC = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  }, [currentArticle.title, currentArticle.image, currentArticle.desc, currentArticle.content, currentArticle.tags]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'articles'));
      const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      // Sort by creation desc usually, but let's just reverse for now or use timestamp if present
      fetched.sort((a, b) => {
        if(b.createdAt && a.createdAt) {
           return b.createdAt.seconds - a.createdAt.seconds;
        }
        return 0;
      });
      setArticles(fetched);
    } catch (error) {
      console.error("Error fetching articles", error);
    } finally {
      setLoading(false);
    }
  };

  // Seed initial articles if db is empty
  const seedInitialArticles = async () => {
    const initial = [
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

    setSaving(true);
    for (const art of initial) {
      await setDoc(doc(db, 'articles', art.id), {
        ...art,
        createdAt: serverTimestamp()
      });
    }
    await fetchArticles();
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const ext = file.type.split('/')[1] || 'jpg';
      const filename = `covers/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCurrentArticle(prev => ({ ...prev, [field]: url }));
    } catch (error) {
      console.error(error);
      alert("上传失败");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleWordDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const options = {
        convertImage: mammoth.images.imgElement(function(image: any) {
          return image.read("base64").then(async function(imageBuffer: string) {
            const contentType = image.contentType || 'image/jpeg';
            const ext = contentType.split('/')[1] || 'jpg';
            const filename = `articles/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
            const storageRef = ref(storage, filename);
            await uploadString(storageRef, `data:${contentType};base64,${imageBuffer}`, 'data_url');
            const url = await getDownloadURL(storageRef);
            return {
              src: url
            };
          });
        })
      };

      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      
      setCurrentArticle(prev => ({ 
        ...prev, 
        content: result.value
      }));
    } catch (err) {
      console.error(err);
      alert("解析 Word 文档失败，请确保格式正确");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("确定要删除这篇推文吗？")) {
      await deleteDoc(doc(db, 'articles', id));
      await fetchArticles();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload = {
        title: currentArticle.title || '',
        image: currentArticle.image || '',
        tags: currentArticle.tags || [],
        desc: currentArticle.desc || '',
        content: currentArticle.content || '',
        link: currentArticle.link || '',
        duration: currentArticle.duration || '5 min read',
      };

      if (view === 'new') {
        const docRef = await addDoc(collection(db, 'articles'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        setCurrentArticle(prev => ({ ...prev, id: docRef.id }));
        setView('edit');
      } else if (view === 'edit' && currentArticle.id) {
        await updateDoc(doc(db, 'articles', currentArticle.id), payload);
      }
      
      setSaveSuccess(true);
    } catch (error) {
      console.error("Save error: ", error);
      alert("保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    setView('list');
    setSaveSuccess(false);
    fetchArticles();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]"><div className="w-4 h-4 bg-black animate-ping" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <nav className="border-b border-black/10 bg-white px-8 py-5 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold tracking-widest text-black flex items-center gap-4">
          ADMIN DASHBOARD
          <span className="text-xs bg-black text-white px-2 py-1 rounded font-normal">管理员端</span>
        </h1>
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 text-sm font-semibold tracking-widest uppercase hover:text-black/60 transition-colors"
        >
          <LogOut className="w-4 h-4" /> 退出登录
        </button>
      </nav>

      <main className="max-w-6xl mx-auto p-8 mb-20">
        {view === 'list' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-light">管理推文</h2>
              <div className="flex gap-4">
                {articles.length === 0 && (
                  <button 
                    onClick={seedInitialArticles}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 border border-black/20 hover:bg-black/5 transition-colors uppercase tracking-widest text-xs font-semibold"
                  >
                    初始化测试推文
                  </button>
                )}
                <button 
                  onClick={() => {
                    setCurrentArticle({ tags: [] });
                    setView('new');
                    setEditSection('ALL');
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white hover:bg-black/80 transition-colors uppercase tracking-widest text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" /> 新建推文
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {articles.map((art) => (
                <div key={art.id} className="bg-white border border-black/10 p-6 flex items-center gap-8 shadow-sm">
                  <div className="w-32 h-32 bg-gray-100 flex-shrink-0">
                    {art.image ? <img src={art.image || undefined} alt={art.title} className="w-full h-full object-cover" /> : <div className="w-full h-full border border-dashed border-black/20" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-medium mb-2">{art.title}</h3>
                    <p className="text-black/60 text-sm mb-4 line-clamp-2">{art.desc}</p>
                    <div className="flex gap-2">
                       {art.tags?.map((t, idx) => (
                         <span key={idx} className="text-xs border border-black/20 px-2 py-1 text-black/60">{t}</span>
                       ))}
                    </div>
                  </div>
                  <div className="flex gap-4 border-l border-black/10 pl-6 h-full items-center">
                     <button 
                        onClick={() => {
                          setCurrentArticle(art);
                          setView('edit');
                          setEditSection('ALL');
                        }}
                        className="p-3 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors"
                     >
                       <Edit2 className="w-5 h-5" />
                     </button>
                     <button 
                        onClick={() => handleDelete(art.id)}
                        className="p-3 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {(view === 'new' || view === 'edit') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
            <div className="flex justify-between items-center mb-8 border-b border-black/10 pb-4">
               <div>
                 <h2 className="text-2xl font-light mb-2">{view === 'new' ? '新建推文' : '编辑推文'}</h2>
               </div>
               <button onClick={handleExit} className="text-sm font-semibold tracking-widest uppercase hover:text-black/60">
                 取消返回
               </button>
            </div>

            {view === 'edit' && (
              <div className="flex gap-4 mb-8">
                <button onClick={() => setEditSection('A')} className={`px-4 py-2 border border-black/20 text-xs font-semibold tracking-widest uppercase ${editSection === 'A' ? 'bg-black text-white' : 'hover:bg-black/5'}`}>编辑预览图块 (A)</button>
                <button onClick={() => setEditSection('B')} className={`px-4 py-2 border border-black/20 text-xs font-semibold tracking-widest uppercase ${editSection === 'B' ? 'bg-black text-white' : 'hover:bg-black/5'}`}>编辑摘要卡片 (B)</button>
                <button onClick={() => setEditSection('C')} className={`px-4 py-2 border border-black/20 text-xs font-semibold tracking-widest uppercase ${editSection === 'C' ? 'bg-black text-white' : 'hover:bg-black/5'}`}>编辑完整正文 (C)</button>
                <button onClick={() => setEditSection('ALL')} className={`px-4 py-2 border border-black/20 text-xs font-semibold tracking-widest uppercase ${editSection === 'ALL' ? 'bg-black text-white' : 'hover:bg-black/5'}`}>展示全部</button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-12">
               {/* FORM COLUMN */}
               <div className="lg:w-1/2 flex flex-col gap-10">
                 {(editSection === 'ALL' || editSection === 'A' || editSection === 'B') && (
                   <section className="bg-white p-8 border border-black/10">
                     <h3 className="text-sm font-semibold tracking-widest uppercase text-black/40 mb-6">基本信息</h3>
                     <div className="space-y-6">
                       <div>
                         <label className="block text-xs uppercase tracking-widest text-black/60 font-semibold mb-2">推文标题</label>
                         <input 
                           type="text" 
                           value={currentArticle.title || ''}
                           onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                           className="w-full bg-[#F7F7F5] border border-black/10 p-3 outline-none focus:border-black transition-colors"
                           placeholder="输入推文大标题"
                         />
                       </div>
                       
                       <div className="flex flex-col gap-2">
                         <label className="block text-xs uppercase tracking-widest text-black/60 font-semibold">主图上传 (预览图)</label>
                         <p className="text-xs text-black/40 mb-2">图片将同步用于 A.推文预览 和 B.摘要卡片</p>
                         <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRefA}
                            onChange={(e) => handleImageUpload(e, 'image')}
                         />
                         <button 
                           onClick={() => fileInputRefA.current?.click()}
                           disabled={uploadingImage}
                           className="w-full py-8 border-2 border-dashed border-black/20 hover:border-black/50 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                         >
                           {uploadingImage ? (
                             <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                           ) : (
                             <>
                               <ImageIcon className="w-6 h-6 text-black/40" />
                               <span className="text-xs text-black/60 tracking-widest uppercase">{currentArticle.image ? '主图已上传 (点击可替换)' : '点击上传主图'}</span>
                             </>
                           )}
                         </button>
                       </div>
                     </div>
                   </section>
                 )}

                 {(editSection === 'ALL' || editSection === 'B') && (
                   <section className="bg-white p-8 border border-black/10">
                     <h3 className="text-sm font-semibold tracking-widest uppercase text-black/40 mb-6">摘要附加信息 (B区块)</h3>
                     <div className="space-y-6">
                       <div>
                         <label className="block text-xs uppercase tracking-widest text-black/60 font-semibold mb-2">关键词 (用逗号分隔)</label>
                         <input 
                           type="text" 
                           value={currentArticle.tags?.join('， ') || ''}
                           onChange={e => setCurrentArticle({...currentArticle, tags: e.target.value.split(/[,，]/).map(t => t.trim()).filter(Boolean)})}
                           className="w-full bg-[#F7F7F5] border border-black/10 p-3 outline-none focus:border-black transition-colors"
                           placeholder="例如: IP美学, 爆款逻辑"
                         />
                       </div>
                       <div>
                         <label className="block text-xs uppercase tracking-widest text-black/60 font-semibold mb-2">简介</label>
                         <textarea 
                           value={currentArticle.desc || ''}
                           onChange={e => setCurrentArticle({...currentArticle, desc: e.target.value})}
                           className="w-full bg-[#F7F7F5] border border-black/10 p-3 outline-none focus:border-black transition-colors min-h-[100px]"
                           placeholder="推文的简短摘要"
                         />
                       </div>
                     </div>
                   </section>
                 )}

                 {(editSection === 'ALL' || editSection === 'C') && (
                   <section className="bg-white p-8 border border-black/10">
                     <h3 className="text-sm font-semibold tracking-widest uppercase text-black/40 mb-6">跳转链接 (C区块)</h3>
                     <div className="space-y-6">
                       <div>
                         <label className="block text-xs uppercase tracking-widest text-black/60 font-semibold mb-2">文章超链接</label>
                         <input 
                           type="url"
                           value={currentArticle.link || ''}
                           onChange={e => setCurrentArticle({...currentArticle, link: e.target.value})}
                           className="w-full bg-[#F7F7F5] border border-black/10 p-3 outline-none focus:border-black transition-colors"
                           placeholder="https://example.com/article"
                         />
                       </div>
                     </div>
                   </section>
                 )}

                 <div className="sticky bottom-8 bg-[#F7F7F5] pt-4 z-50">
                   <button 
                     onClick={handleSave}
                     disabled={saving}
                     className="w-full py-4 bg-black text-white font-semibold tracking-widest uppercase text-sm hover:bg-black/90 transition-colors flex justify-center items-center gap-2 shadow-xl disabled:opacity-50"
                   >
                     {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : saveSuccess ? <><Check className="w-5 h-5" /> 发布成功</> : <><Check className="w-5 h-5" /> 保存并发布推文</>}
                   </button>
                 </div>
               </div>

               {/* PREVIEW COLUMN */}
               <div className="lg:w-1/2 flex flex-col gap-10 opacity-70 hover:opacity-100 transition-opacity">
                 <div className="sticky top-24">
                   <h3 className="text-sm font-semibold tracking-widest uppercase text-black/40 mb-6 flex items-center gap-2 border-b border-black/10 pb-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> 实时预览 (用户端效果)
                   </h3>
                   
                   {(editSection === 'ALL' || editSection === 'A') && (
                     <div className="mb-8">
                       <p className="text-xs text-black/40 mb-2 font-mono">预览区域 A：点亮坊首页列表项</p>
                       <div className="border border-black/10 bg-white grid grid-cols-1 md:grid-cols-2 group hover:shadow-xl transition-shadow cursor-not-allowed">
                         <div className="aspect-[4/3] md:aspect-auto border-b md:border-b-0 md:border-r border-black/10 relative overflow-hidden">
                           {currentArticle.image ? (
                             <img src={currentArticle.image || undefined} alt={currentArticle.title} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-[#f0f0f0] flex items-center justify-center text-xs text-black/30">待上传主图</div>
                           )}
                         </div>
                         <div className="p-8 md:p-12 flex flex-col justify-between">
                           <h2 className="text-2xl font-medium mb-6 line-clamp-3">{currentArticle.title || '推文主标题'}</h2>
                           <div className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center">
                             <Plus className="w-4 h-4" />
                           </div>
                         </div>
                       </div>
                     </div>
                   )}

                   {(editSection === 'ALL' || editSection === 'B') && (
                     <div className="mb-8">
                       <p className="text-xs text-black/40 mb-2 font-mono">预览区域 B：摘要卡片弹窗</p>
                       <div className="bg-[#F7F7F5] border border-black/10 flex flex-col md:flex-row shadow-2xl scale-95 origin-top">
                         <div className="md:w-1/2 aspect-square md:aspect-auto border-r border-black/10">
                           {currentArticle.image ? (
                             <img src={currentArticle.image || undefined} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-[#f0f0f0] flex items-center justify-center text-xs text-black/30">待上传主图</div>
                           )}
                         </div>
                         <div className="md:w-1/2 p-8 flex flex-col justify-between">
                           <div>
                             <h2 className="text-xl font-medium mb-4">{currentArticle.title || '推文主标题'}</h2>
                             <div className="flex gap-2 mb-4 flex-wrap">
                               {currentArticle.tags && currentArticle.tags.length > 0 ? currentArticle.tags.map(tag => (
                                 <span key={tag} className="text-[10px] tracking-widest uppercase border border-black/20 px-2 py-1 text-black/60">{tag}</span>
                               )) : <span className="text-[10px] tracking-widest uppercase border border-black/20 px-2 py-1 text-black/30">关键词</span>}
                             </div>
                             <p className="text-black/60 font-light leading-relaxed text-sm">
                               {currentArticle.desc || '此处显示推文简短摘要内容...'}
                             </p>
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
