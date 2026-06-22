import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ArrowRight } from 'lucide-react';

const steps = [
  { id: '01', title: '发现触点', desc: '从人、物、场景、文化等工业制造缝隙中寻找设计触发点。' },
  { id: '02', title: '提取关键词', desc: '将工业属性提炼为情绪、功能、几何规则与材质语言。' },
  { id: '03', title: '确定IP类型', desc: '定义核心方向：人物构架、动物拟真、工业道具或是抽象产品形体。' },
  { id: '04', title: '建立角色设定', desc: '通过情感工程学，设定性格、功能属性与目标人群轨迹。' },
  { id: '05', title: '转化造型语言', desc: '将性格转译为实体参数：轮廓弧度、CMF（色彩/材质/表面处理）、拟人表情。' },
  { id: '06', title: '设计周边产品', desc: '界定实体输出载体：从生活物件、桌面装置到工业衍生品。' },
  { id: '07', title: '生成展示方案', desc: '输出高保真是非矢量位图效果、严格的三视图以及环境应用验证。' }
];

export default function TouchWorkshop() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start center", "end center"] });
  
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const elements = document.querySelectorAll('.step-element');
      let currentActive = 0;
      
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < windowHeight * 0.6) {
          currentActive = index;
        }
      });
      setActiveStep(currentActive);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[#F7F7F5] text-[#1A1A1A]"
    >
      <div className="h-screen flex flex-col justify-center items-center px-6 text-center sticky top-0 z-0 bg-[#F7F7F5]">
        <h2 className="text-xs font-semibold tracking-widest text-[#1A1A1A]/50 uppercase mb-4">— 触点坊 —</h2>
        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8">让创意一步步被点亮</h1>
        <p className="text-[#1A1A1A]/60 max-w-lg mx-auto font-light leading-relaxed mb-12">
          向下滚动，感受设计思维流淌的过程。通过七个结构化节点，体验工业产品形态如何被转化为鲜活的艺术IP。
        </p>
        <div className="w-[1px] h-24 bg-gradient-to-b from-[#1A1A1A]/30 to-transparent" />
      </div>

      <div ref={containerRef} className="relative z-10 bg-[#F7F7F5] pb-48 pt-24 px-6">
        <div className="max-w-4xl mx-auto relative">
           {/* Static background line */}
           <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-[1px] bg-[#1A1A1A]/10 -translate-x-1/2" />
           
           {/* Active scroll line */}
           <motion.div 
             className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-[1px] bg-[#1A1A1A] -translate-x-1/2 origin-top"
             style={{ scaleY: scrollYProgress }}
           />

           <div className="flex flex-col gap-32">
             {steps.map((step, index) => {
               const isActive = activeStep >= index;
               const isCurrent = activeStep === index;
               
               return (
                 <div key={step.id} className="step-element relative flex flex-col md:flex-row items-start md:items-center justify-between group">
                   
                   {/* Center Dot */}
                   <div className={cn(
                     "absolute left-[20px] md:left-1/2 w-3 h-3 rounded-none -translate-x-1/2 rotate-45 transition-all duration-700 z-10",
                     isActive ? "bg-[#1A1A1A] scale-100" : "bg-[#F7F7F5] border border-[#1A1A1A]/20 scale-50"
                   )} />

                   {/* Left Side (Empty on mobile, ID on desktop) */}
                   <div className="w-full md:w-[45%] text-left md:text-right pl-12 md:pl-0 pt-1 md:pt-0">
                     <span className={cn(
                       "text-6xl md:text-8xl font-bold tracking-tighter transition-all duration-1000",
                       isActive ? "text-[#1A1A1A]/5" : "text-transparent"
                     )}>
                       {step.id}
                     </span>
                   </div>

                   {/* Right Side (Content) */}
                   <div className="w-full md:w-[45%] pl-12 md:pl-0">
                     <div className={cn(
                       "transition-all duration-700 ease-out transform",
                       isActive ? "opacity-100 translate-y-0" : "opacity-20 translate-y-8"
                     )}>
                       <h3 className="text-2xl font-light mb-4 flex items-center gap-4">
                         <span className="text-xs tracking-widest text-[#1A1A1A]/50">{step.id}</span>
                         {step.title}
                       </h3>
                       <p className="text-[#1A1A1A]/50 font-light leading-relaxed">
                         {step.desc}
                       </p>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        {activeStep === steps.length - 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="max-w-xl mx-auto mt-48 text-center"
          >
             <div className="w-1.5 h-1.5 bg-[#1A1A1A] mx-auto mb-8" />
             <h3 className="text-2xl font-light mb-4">完成思维重构</h3>
             <p className="text-[#1A1A1A]/50 font-light mb-12">
               你已经完成了一次IP设计思维路径体验。下一步，进入“聚点坊”生成自己的产品周边方案。
             </p>
             <Link 
               to="/gather" 
               className="inline-flex items-center gap-4 px-8 py-4 bg-[#1A1A1A] text-white font-semibold uppercase tracking-widest text-xs hover:bg-[#1A1A1A]/90 transition-colors"
             >
               进入工作台 <ArrowRight className="w-4 h-4" />
             </Link>
          </motion.div>
        )}
      </div>
    </motion.main>
  );
}
