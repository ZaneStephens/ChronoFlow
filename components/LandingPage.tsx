import React, { useState, useEffect } from 'react';
import { Zap, Shield, Cpu, ChevronRight, Activity, Globe, Lock } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center overflow-hidden text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Background Grid & Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className={`relative z-10 max-w-5xl w-full px-8 transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* Header Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-mono text-indigo-400 mb-6 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            SYSTEM v2.5.0 ONLINE
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-2xl">
            ChronoFlow <span className="text-indigo-500">IT</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            The premium, AI-enhanced workspace engineered for elite freelance IT professionals.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Cpu, title: "Gemini AI Core", desc: "Automated task breakdown & reporting." },
            { icon: Activity, title: "Precision Timing", desc: "Subtask-level tracking with 6m rounding." },
            { icon: Globe, title: "Client Command", desc: "Manage detailed portfolios & service agreements." }
          ].map((feature, idx) => (
            <div 
              key={idx} 
              className="group p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 transition-all hover:bg-slate-800/60 backdrop-blur-sm"
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <feature.icon size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Action Area */}
        <div className="flex flex-col items-center gap-8">
          {progress < 100 ? (
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between text-xs font-mono text-indigo-400">
                <span>INITIALIZING MODULES...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-100 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button
              onClick={onStart}
              className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all transform hover:-translate-y-1 flex items-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              <Zap size={20} className="group-hover:text-yellow-300 transition-colors" fill="currentColor" />
              <span>Initialize Workspace</span>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          
          <div className="flex items-center gap-6 text-xs text-slate-600 font-mono">
             <span className="flex items-center gap-1"><Lock size={12}/> ENCRYPTED LOCAL STORAGE</span>
             <span className="flex items-center gap-1"><Shield size={12}/> GDPR COMPLIANT</span>
          </div>
        </div>
      </div>
      
      {/* Bottom ticker */}
      <div className="absolute bottom-0 w-full border-t border-slate-900 bg-slate-950/50 p-2 overflow-hidden">
         <div className="whitespace-nowrap animate-marquee text-[10px] font-mono text-slate-600 flex gap-8">
            {Array(10).fill("READY FOR DEPLOYMENT // WAITING FOR USER INPUT // SYSTEM OPTIMIZED").map((t, i) => (
                <span key={i}>{t}</span>
            ))}
         </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;