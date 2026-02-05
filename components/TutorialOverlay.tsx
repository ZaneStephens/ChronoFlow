import React, { useEffect, useState } from 'react';
import { ChevronRight, X, Sparkles } from 'lucide-react';

export interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  view: string; // The view the app needs to be in for this step
}

interface TutorialOverlayProps {
  step: TutorialStep;
  totalSteps: number;
  currentStepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, totalSteps, currentStepIndex, onNext, onSkip }) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = step;

  useEffect(() => {
    // Small delay to allow View transitions to render
    const timer = setTimeout(() => {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback if element not found (e.g. mobile vs desktop layouts)
        setTargetRect(null);
      }
    }, 400); // 400ms delay to ensure UI is ready

    return () => clearTimeout(timer);
  }, [currentStep, currentStepIndex]);

  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Dark Overlay with "Hole" */}
      {targetRect ? (
         <div className="absolute inset-0">
            {/* Top */}
            <div className="absolute top-0 left-0 right-0 bg-black/80 backdrop-blur-[1px] transition-all duration-500" style={{ height: targetRect.top - 8 }}></div>
            {/* Bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-[1px] transition-all duration-500" style={{ top: targetRect.bottom + 8 }}></div>
            {/* Left */}
            <div className="absolute left-0 bg-black/80 backdrop-blur-[1px] transition-all duration-500" style={{ top: targetRect.top - 8, bottom: window.innerHeight - (targetRect.bottom + 8), width: targetRect.left - 8 }}></div>
            {/* Right */}
            <div className="absolute right-0 bg-black/80 backdrop-blur-[1px] transition-all duration-500" style={{ top: targetRect.top - 8, bottom: window.innerHeight - (targetRect.bottom + 8), left: targetRect.right + 8 }}></div>
            
            {/* Spotlight Border */}
            <div 
              className="absolute border-2 border-indigo-500 rounded-lg shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-500 animate-pulse"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16
              }}
            ></div>
         </div>
      ) : (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      )}

      {/* Tooltip Card */}
      <div 
        className="absolute z-[101] w-full max-w-sm px-4 transition-all duration-500"
        style={{
          top: targetRect ? Math.min(window.innerHeight - 300, Math.max(20, targetRect.bottom + 24)) : '50%',
          left: targetRect ? Math.max(20, Math.min(window.innerWidth - 340, targetRect.left)) : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)'
        }}
      >
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
          
          <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-2">
               <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
                 {currentStepIndex + 1}
               </span>
               <h3 className="text-lg font-bold text-white">{currentStep.title}</h3>
             </div>
             <button onClick={onSkip} className="text-slate-500 hover:text-white transition-colors">
               <X size={16} />
             </button>
          </div>
          
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            {currentStep.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-1.5 h-1.5 rounded-full ${idx === currentStepIndex ? 'bg-indigo-500' : 'bg-slate-700'}`}
                ></div>
              ))}
            </div>
            
            <button 
              onClick={onNext}
              className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              {currentStepIndex === totalSteps - 1 ? (
                 <>
                   <Sparkles size={16} className="text-indigo-600" />
                   Get Started
                 </>
              ) : (
                 <>
                   Next
                   <ChevronRight size={16} />
                 </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;