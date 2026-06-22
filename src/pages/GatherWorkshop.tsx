import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Box, Check, RefreshCw, Download, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../components/AuthContext';
import { db, storage } from '../lib/tcb';
import { doc, setDoc, updateDoc } from '../lib/tcb';
import { ref, uploadString, getDownloadURL } from '../lib/tcb';
import { aiContentService } from '../cloudbase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const apiUrl = (path: string) => (API_BASE_URL ? API_BASE_URL : `/api${path}`);

const STEPS = ['选择模式', '输入提示词', 'AI生成中', '查看成果'];
const TYPES = [
  { id: 'human', label: '萌新入门', desc: 'Q版手办引导式生成' },
  { id: 'object', label: '潮玩艺术家', desc: '参考图与自定义提示词生成' },
  { id: 'product', label: '造物极客', desc: '增添多种模型与分辨率选择' }
];

const BODY_TYPES = [
  { id: 'animal', label: '动物', icon: '🐾' },
  { id: 'mengli', label: '萌粒', icon: '🎈' },
  { id: 'q_version', label: 'Q版', icon: '👼' }
];

const ANIMAL_TYPES = [
  { id: 'cat', label: '小猫', desc: '灵动、可爱' },
  { id: 'dog', label: '小狗', desc: '亲切、陪伴感强' },
  { id: 'rabbit', label: '小兔', desc: '温柔、软萌' },
  { id: 'bear', label: '小熊', desc: '稳重、可爱' },
  { id: 'duck', label: '小鸭', desc: '呆萌、有趣' },
  { id: 'deer', label: '小鹿', desc: '自然、清新' },
  { id: 'fox', label: '小狐狸', desc: '聪明、灵巧' },
  { id: 'bird', label: '小鸟', desc: '轻盈、自由' }
];

const EXPRESSIONS = [
  { id: 'smile', label: '微笑', desc: '亲和、通用' },
  { id: 'star_eyes', label: '星星眼', desc: '兴奋、好奇' },
  { id: 'squint', label: '眯眼笑', desc: '治愈、温暖' },
  { id: 'surprise', label: '惊讶脸', desc: '活泼、有互动感' },
  { id: 'shy', label: '害羞脸', desc: '可爱、柔和' },
  { id: 'thinking', label: '思考脸', desc: '学习、探索' },
  { id: 'sleepy', label: '困困脸', desc: '呆萌、有生活感' },
  { id: 'proud', label: '得意脸', desc: '有个性，适合潮玩感' },
  { id: 'crying', label: '哭哭脸', desc: '适合情绪表达类IP' },
  { id: 'cool', label: '酷酷脸', desc: '适合年轻化、个性化角色' }
];

const HAIRSTYLES = [
  { id: 'none', label: '无发型', desc: '保持圆润干净的基础萌粒形象' },
  { id: 'ahoge', label: '小呆毛', desc: '增加俏皮感' },
  { id: 'double_buns', label: '双丸子', desc: '可爱、活泼、适合儿童风' },
  { id: 'curly', label: '小卷毛', desc: '软萌、有亲和力' },
  { id: 'short_bangs', label: '短刘海', desc: '简洁、乖巧' },
  { id: 'side_bangs', label: '斜刘海', desc: '更有个性' },
  { id: 'cloud', label: '云朵发', desc: '梦幻、艺术感强' },
  { id: 'hat', label: '小帽子发型', desc: '适合角色职业或主题设定' },
  { id: 'leaf', label: '叶子发芽', desc: '适合自然、环保、美育主题' },
  { id: 'antenna', label: '小触角', desc: '适合幻想、外星、精灵风格' }
];

const POSES = [
  { id: 'stand', label: '站立', desc: '' },
  { id: 'wave', label: '举手打招呼', desc: '' },
  { id: 'heart', label: '双手比心', desc: '' },
  { id: 'hold_brush', label: '抱着画笔', desc: '' },
  { id: 'sit', label: '坐姿', desc: '' },
  { id: 'jump', label: '跳跃', desc: '' },
  { id: 'think_pose', label: '思考托腮', desc: '' },
  { id: 'magnifier', label: '拿放大镜', desc: '' }
];

export default function GatherWorkshop() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState('');
  const [prompt, setPrompt] = useState('');
  const [genPhase, setGenPhase] = useState(0);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [isGeneratingOrtho, setIsGeneratingOrtho] = useState(false);
  const [currentWorkId, setCurrentWorkId] = useState<string | null>(null);

  // New specific states for "human" type
  const [ipBodyType, setIpBodyType] = useState<string>('');
  const [animalType, setAnimalType] = useState<string>('');
  const [animalExpr, setAnimalExpr] = useState<string>('');
  const [mengliHairstyle, setMengliHairstyle] = useState<string>('');
  const [mengliExpr, setMengliExpr] = useState<string>('');
  const [mengliPose, setMengliPose] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<'gpt' | 'gemini' | 'doubao'>('gpt');
  const [failCount, setFailCount] = useState(0);

  const [ipName, setIpName] = useState('');
  const [ipStory, setIpStory] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Move to next step helper
  const next = () => setStep(s => Math.min(s + 1, 3));

  const runGeneration = async (overrideModel?: 'gpt' | 'gemini' | 'doubao') => {
    let targetModel = overrideModel || currentModel;
    setCurrentModel(targetModel);
    
    setStep(2);
    setGenPhase(0);
    const interval = setInterval(() => {
      setGenPhase(p => Math.min(p + 1, 2));
    }, 2000);

    try {
      const typeObj = TYPES.find(t => t.id === selectedType);
      const typeLabel = typeObj ? typeObj.label : '';
      
      let fullPrompt = '';
      if (selectedType === 'human') {
        if (ipBodyType === 'animal') {
          const at = ANIMAL_TYPES.find(a => a.id === animalType);
          const ae = EXPRESSIONS.find(e => e.id === animalExpr);
          fullPrompt = `一个动物IP角色设计，${at?.label || ''} (${at?.desc || ''})，表情是${ae?.label || ''} (${ae?.desc || ''})。清晰的线条，扁平化上色，可爱的风格。Q版手办视图，白底纯色背景。3D立体风格Q版手办，圆润可爱`;
        } else {
          const mh = HAIRSTYLES.find(h => h.id === mengliHairstyle);
          const me = EXPRESSIONS.find(e => e.id === mengliExpr);
          const mp = POSES.find(p => p.id === mengliPose);
          fullPrompt = `一个${ipBodyType === 'mengli' ? '萌粒' : 'Q版'}IP角色设计，发型是${mh?.label || ''} (${mh?.desc || ''})，表情是${me?.label || ''} (${me?.desc || ''})，姿势是${mp?.label || ''}。清晰的线条，高级的色彩渲染，治愈可爱的风格。Q版手办视图，白底纯色背景。3D立体风格Q版手办，圆润可爱`;
        }
        setPrompt(fullPrompt); // Save it for display
      } else {
        fullPrompt = `${typeLabel}设计. ${prompt}`;
      }
      
      const apiEndpoint = selectedType === 'human' ? apiUrl('/generate-ip') : apiUrl('/generate-image');
      const bodyPayload = selectedType === 'human' 
        ? JSON.stringify({ action: 'generate-ip', prompt: fullPrompt, model: targetModel })
        : JSON.stringify({ action: 'generate-image', prompt: fullPrompt, mode: 'main' });

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyPayload
      });
      const data = await res.json();
      
      clearInterval(interval);
      setGenPhase(3);
      
      let images: string[] = [];
      if (data.imageUrls && data.imageUrls.length > 0) {
        images = data.imageUrls;
      } else if (data.imageUrl) {
        images = [data.imageUrl];
      }
      
      if (images.length === 0) {
         throw new Error("No images generated");
      }

      setResultImages(images);

      // Save to Firestore
      if (user && images.length > 0) {
        const newWorkId = crypto.randomUUID();
        setCurrentWorkId(newWorkId);
        try {
          const uploadedImageUrls = await Promise.all(images.map(async (img, idx) => {
            if (img.startsWith('data:image')) {
              const imageRef = ref(storage, `works/${newWorkId}_${idx}.jpg`);
              await uploadString(imageRef, img, 'data_url');
              return await getDownloadURL(imageRef);
            }
            return img;
          }));

          await setDoc(doc(db, 'works', newWorkId), {
            userId: user.uid,
            prompt: fullPrompt,
            typeLabel: typeLabel,
            images: uploadedImageUrls,
            createdAt: new Date().toISOString()
          });

          // Save AI content explicitly via the cloudbase service
          try {
            await aiContentService.saveContent({
              prompt: fullPrompt,
              typeLabel: typeLabel,
              images: uploadedImageUrls,
              model: targetModel,
              workId: newWorkId
            });
          } catch (aiErr) {
            console.error('Error saving to ai_contents:', aiErr);
          }
        } catch (fbErr) {
          console.error('Error saving to Firestore:', fbErr);
        }
      }
      
      setTimeout(() => setStep(3), 1000);
    } catch (err) {
      console.error(err);
      clearInterval(interval);
      setResultImages([]);
      setFailCount(prev => prev + 1);
      setGenPhase(4); // Error state
    }
  };

  const handleGenerateOrthoViews = async () => {
    if (resultImages.length === 0) return;
    setIsGeneratingOrtho(true);
    
    try {
      const typeObj = TYPES.find(t => t.id === selectedType);
      const typeLabel = typeObj ? typeObj.label : '';
      const fullPrompt = `${typeLabel}设计. ${prompt}`;
      
      const res = await fetch(apiUrl('/generate-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-image',
          prompt: fullPrompt,
          mode: 'ortho',
          referenceImage: resultImages[0]
        })
      });
      const data = await res.json();
      if (data.imageUrls && data.imageUrls.length === 3) {
        const newImages = [resultImages[0], ...data.imageUrls];
        setResultImages(newImages);
        
        if (user && currentWorkId) {
          try {
            const uploadedImageUrls = await Promise.all(newImages.map(async (img, idx) => {
              if (img.startsWith('data:image')) {
                const imageRef = ref(storage, `works/${currentWorkId}_ortho_${idx}.jpg`);
                await uploadString(imageRef, img, 'data_url');
                return await getDownloadURL(imageRef);
              }
              return img;
            }));

            await updateDoc(doc(db, 'works', currentWorkId), {
              images: uploadedImageUrls
            });

            // Save AI content for ortho views explicitly
            try {
              await aiContentService.saveContent({
                prompt: fullPrompt,
                typeLabel: typeLabel,
                mode: 'ortho',
                images: uploadedImageUrls,
                workId: currentWorkId
              });
            } catch (aiErr) {
              console.error('Error saving ortho to ai_contents:', aiErr);
            }
          } catch (fbErr) {
            console.error('Error updating Firestore:', fbErr);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingOrtho(false);
    }
  };

  const handleSaveIpDetails = async () => {
    if (!currentWorkId) return;
    setIsSavingDetails(true);
    try {
      await updateDoc(doc(db, 'works', currentWorkId), {
        name: ipName,
        story: ipStory
      });
      setSaveMessage('已保存');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Error saving IP details:', err);
      setSaveMessage('保存失败');
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-24 pb-16 px-6 bg-[#1A1A1A] text-[#F7F7F5] flex flex-col"
    >
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Progress Tracker */}
        <div className="flex justify-between items-center mb-16 border-b border-white/10 pb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-4">
              <div className={cn(
                "w-2 h-2 rounded-none transition-all duration-500",
                step >= i ? "bg-white" : "border border-white/20",
                step === i && "scale-150"
              )} />
              <span className={cn(
                "text-[10px] tracking-widest uppercase transition-colors hidden md:block",
                step >= i ? "text-white" : "text-white/30"
              )}>{s}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            
            {/* Step 0: Type */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col justify-center"
              >
                <h2 className="text-4xl font-light mb-12">选择IP生成模式</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedType(t.id); next(); }}
                      className="group border border-white/10 p-8 text-left hover:border-white/50 transition-colors bg-white/[0.02] hover:bg-white/[0.05]"
                    >
                      <div className="w-1.5 h-1.5 bg-white mb-8 opacity-20 group-hover:opacity-100 transition-opacity" />
                      <h3 className="text-xl font-light mb-4">{t.label}</h3>
                      <p className="text-white/50 text-sm font-light leading-relaxed">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Prompt */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={selectedType === 'human' ? "max-w-4xl mx-auto" : "max-w-2xl mx-auto"}
              >
                {selectedType === 'human' ? (
                  <div className="space-y-12 pb-24">
                    <h2 className="text-4xl font-light mb-8">选择你的IP体型</h2>
                    <div className="grid grid-cols-3 gap-6">
                      {BODY_TYPES.map(bt => (
                        <button
                          key={bt.id}
                          onClick={() => setIpBodyType(bt.id)}
                          className={cn(
                            "flex items-center gap-4 border p-6 text-left transition-colors cursor-pointer",
                            ipBodyType === bt.id ? "bg-white text-black border-white" : "border-white/20 text-white hover:border-white/50"
                          )}
                        >
                          <span className="text-4xl">{bt.icon}</span>
                          <span className="text-xl font-light">{bt.label}</span>
                        </button>
                      ))}
                    </div>

                    {ipBodyType === 'animal' && (
                      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div>
                          <h3 className="text-2xl font-light mb-6">1. 选择你的动物形象</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {ANIMAL_TYPES.map(at => (
                              <button
                                key={at.id}
                                onClick={() => setAnimalType(at.id)}
                                className={cn(
                                  "border p-4 text-left transition-colors cursor-pointer",
                                  animalType === at.id ? "bg-white text-black border-white" : "border-white/20 text-white hover:border-white/50"
                                )}
                              >
                                <div className="font-medium mb-1">{at.label}</div>
                                <div className={cn("text-xs font-light", animalType === at.id ? "text-black/60" : "text-white/50")}>{at.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-light mb-6">2. 选择动物表情</h3>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {EXPRESSIONS.map(ex => (
                              <button
                                key={ex.id}
                                onClick={() => setAnimalExpr(ex.id)}
                                className={cn(
                                  "border p-4 text-left transition-colors cursor-pointer",
                                  animalExpr === ex.id ? "bg-white text-black border-white" : "border-white/20 text-white hover:border-white/50"
                                )}
                              >
                                <div className="font-medium mb-1">{ex.label}</div>
                                <div className={cn("text-[10px] font-light", animalExpr === ex.id ? "text-black/60" : "text-white/50")}>{ex.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {(ipBodyType === 'mengli' || ipBodyType === 'q_version') && (
                      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div>
                          <h3 className="text-2xl font-light mb-6">1. 选择你的IP发型</h3>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {HAIRSTYLES.map(hs => (
                              <button
                                key={hs.id}
                                onClick={() => setMengliHairstyle(hs.id)}
                                className={cn(
                                  "border p-4 text-left transition-colors cursor-pointer",
                                  mengliHairstyle === hs.id ? "bg-white text-black border-white" : "border-white/20 text-white hover:border-white/50"
                                )}
                              >
                                <div className="font-medium mb-1">{hs.label}</div>
                                <div className={cn("text-[10px] font-light", mengliHairstyle === hs.id ? "text-black/60" : "text-white/50")}>{hs.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-light mb-6">2. 选择你的IP表情</h3>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {EXPRESSIONS.map(ex => (
                              <button
                                key={ex.id}
                                onClick={() => setMengliExpr(ex.id)}
                                className={cn(
                                  "border p-4 text-left transition-colors cursor-pointer",
                                  mengliExpr === ex.id ? "bg-white text-black border-white" : "border-white/20 text-white hover:border-white/50"
                                )}
                              >
                                <div className="font-medium mb-1">{ex.label}</div>
                                <div className={cn("text-[10px] font-light", mengliExpr === ex.id ? "text-black/60" : "text-white/50")}>{ex.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-light mb-6">3. 选择你的IP姿势</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {POSES.map(pos => (
                              <button
                                key={pos.id}
                                onClick={() => setMengliPose(pos.id)}
                                className={cn(
                                  "border p-4 text-left transition-colors text-center font-medium cursor-pointer",
                                  mengliPose === pos.id ? "bg-white text-black border-white" : "border-white/20 text-white hover:border-white/50"
                                )}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-8">
                      <button 
                        onClick={() => runGeneration('gpt')}
                        disabled={
                          !ipBodyType || 
                          (ipBodyType === 'animal' && (!animalType || !animalExpr)) ||
                          ((ipBodyType === 'mengli' || ipBodyType === 'q_version') && (!mengliHairstyle || !mengliExpr || !mengliPose))
                        }
                        className="px-8 py-4 bg-white text-black uppercase tracking-widest text-xs font-semibold disabled:opacity-50 hover:bg-white/90 transition-colors"
                      >
                        点亮我的角色
                      </button>
                    </div>

                  </div>
                ) : (
                  <>
                    <h2 className="text-4xl font-light mb-8">描述你的IP想法</h2>
                    <p className="text-white/50 font-light mb-12">用准确的描述语言触发AI引擎，描绘情感基调、受众以及色彩范围。不要输入“矢量”、“SVG”等词，请聚焦于最终实体位图渲染效果。</p>
                    
                    <textarea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="例如：生成一个治愈系桌面收纳IP，形如混凝土建筑与铝制零件的结合，带有浅蓝色情感光源指示灯的大眼睛，高级的冷工业配色位图渲染..."
                      className="w-full h-48 bg-transparent border border-white/20 p-6 text-lg font-light placeholder:text-white/20 focus:outline-none focus:border-white transition-colors mb-12 resize-none"
                    />

                    <div className="flex justify-end">
                      <button 
                        onClick={() => runGeneration()}
                        disabled={!prompt}
                        className="px-8 py-4 bg-white text-black uppercase tracking-widest text-xs font-semibold disabled:opacity-50 hover:bg-white/90 transition-colors"
                      >
                        开始生成灵感
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Synthesis (Loading) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                {genPhase === 4 ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border border-white/20 relative mb-8 flex items-center justify-center text-white/50 text-2xl">
                      !
                    </div>
                    <p className="text-sm font-light text-white/80 mb-8">生成失败，请更换模型或再次尝试。</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => runGeneration('gemini')}
                        className="px-8 py-4 bg-white text-black uppercase tracking-widest text-xs font-semibold hover:bg-white/90 transition-colors"
                      >
                        再次尝试
                      </button>
                      <button 
                        onClick={() => { setStep(1); setFailCount(0); }}
                        className="px-8 py-4 border border-white/20 text-white uppercase tracking-widest text-xs font-semibold hover:bg-white/10 transition-colors"
                      >
                        返回修改
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 border border-white/20 relative mb-12 flex items-center justify-center">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-t border-white"
                      />
                      <div className="w-1.5 h-1.5 bg-white" />
                    </div>

                    <div className="h-8">
                      <AnimatePresence mode="wait">
                        {genPhase === 0 && <motion.p key="p0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tracking-widest uppercase text-xs text-white/50">正在解析指令，提取IP特征词...</motion.p>}
                        {genPhase === 1 && <motion.p key="p1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tracking-widest uppercase text-xs text-white/50">构建角色轮廓与基础形态网格...</motion.p>}
                        {genPhase === 2 && <motion.p key="p2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tracking-widest uppercase text-xs text-white/50">计算CMF材质节点与光影映射...</motion.p>}
                        {genPhase === 3 && <motion.p key="p3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tracking-widest uppercase text-xs text-white/50">输出高保真位图与工业三视图...</motion.p>}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Result */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-12"
              >
                <div className="md:col-span-2">
                   <div className="aspect-[4/3] bg-[#0a0a0a] border border-white/10 relative overflow-hidden group">
                     <img src={resultImages[0] || undefined} alt="Generated Output" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     <div className="absolute inset-0 border border-white/0 group-hover:border-white/20 transition-colors pointer-events-none" />
                   </div>
                   <div className="grid grid-cols-3 gap-4 mt-4 relative">
                     {/* Empty state / Loading state / Generated state for Ortho Views */}
                     {resultImages.length === 1 && !isGeneratingOrtho && (
                       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10">
                         <p className="text-sm font-light text-white/70 mb-4">基于主图生成配套工业三视图</p>
                         <button 
                           onClick={handleGenerateOrthoViews}
                           className="px-6 py-2 bg-white text-black text-xs font-semibold uppercase tracking-widest hover:bg-white/90 transition-colors"
                         >
                           生成三视图
                         </button>
                       </div>
                     )}
                     
                     {[1, 2, 3].map((index) => {
                       const labels = ['Front', 'Side', 'Back'];
                       const label = labels[index - 1];
                       const imgSrc = resultImages[index];

                       return (
                         <div key={label} className="aspect-square bg-[#0a0a0a] border border-white/10 relative group overflow-hidden flex items-center justify-center">
                           {isGeneratingOrtho ? (
                             <div className="flex flex-col items-center justify-center">
                               <RefreshCw className="w-5 h-5 text-white/40 animate-spin mb-2" />
                               <span className="text-[10px] text-white/40 uppercase tracking-widest">{label}</span>
                             </div>
                           ) : imgSrc ? (
                             <>
                               <img src={imgSrc || undefined} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                               <div className="absolute top-2 left-2 text-[10px] bg-black/60 px-1 text-white/60">{label}</div>
                             </>
                           ) : null}
                         </div>
                       );
                     })}
                   </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-light mb-8">实体IP输出完成</h2>
                    
                    <div className="mb-8 p-4 border border-white/10 bg-white/5 space-y-4">
                      <div>
                        <label className="block text-[10px] tracking-widest text-white/50 uppercase mb-2">给IP起个名字</label>
                        <input
                          type="text"
                          value={ipName}
                          onChange={(e) => setIpName(e.target.value)}
                          placeholder="例如：呆萌小猫"
                          className="w-full bg-transparent border-b border-white/20 p-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] tracking-widest text-white/50 uppercase mb-2">写个简短的故事或介绍</label>
                        <textarea
                          value={ipStory}
                          onChange={(e) => setIpStory(e.target.value)}
                          placeholder="这个主角来自哪里？有什么特别？"
                          rows={2}
                          className="w-full bg-transparent border border-white/20 p-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-end">
                        {saveMessage && <span className="text-xs text-white/50 mr-4">{saveMessage}</span>}
                        <button
                          onClick={handleSaveIpDetails}
                          disabled={isSavingDetails || (!ipName && !ipStory)}
                          className="px-4 py-2 border border-white/20 text-xs tracking-widest uppercase hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          {isSavingDetails ? '保存中...' : '保存设定'}
                        </button>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h4 className="text-[10px] tracking-widest text-white/50 uppercase mb-2">生成指令</h4>
                      <p className="text-sm font-light text-white/80 leading-relaxed pl-4 border-l border-white/20">{prompt}</p>
                    </div>
                    <div className="mb-12">
                      <h4 className="text-[10px] tracking-widest text-white/50 uppercase mb-4">{selectedType === 'human' ? '我的创作过程' : '工程参数'}</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedType === 'human' ? (
                          <>
                            <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">体型: {BODY_TYPES.find(b => b.id === ipBodyType)?.label}</span>
                            {ipBodyType === 'animal' && (
                              <>
                                <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">形象: {ANIMAL_TYPES.find(a => a.id === animalType)?.label}</span>
                                <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">表情: {EXPRESSIONS.find(e => e.id === animalExpr)?.label}</span>
                              </>
                            )}
                            {(ipBodyType === 'mengli' || ipBodyType === 'q_version') && (
                              <>
                                <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">发型: {HAIRSTYLES.find(h => h.id === mengliHairstyle)?.label}</span>
                                <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">表情: {EXPRESSIONS.find(e => e.id === mengliExpr)?.label}</span>
                                <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">姿势: {POSES.find(p => p.id === mengliPose)?.label}</span>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">载体: {selectedType}</span>
                            <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">输出格式: 位图渲染 (Bitmap RGB)</span>
                            <span className="text-[10px] uppercase border border-white/20 px-2 py-1 text-white/60">解析度: 4K</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                      <button onClick={() => {setStep(0); setPrompt('');}} className="flex-1 flex justify-center py-4 border border-white/20 hover:bg-white/10 transition-colors">
                        <RefreshCw className="w-4 h-4 text-white/50" />
                      </button>
                      <button className="flex-1 flex justify-center py-4 border border-white/20 hover:bg-white/10 transition-colors">
                        <Share2 className="w-4 h-4 text-white/50" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.main>
  );
}
