import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, X, Loader2, Sparkles } from "lucide-react";

interface BatchFactoryModalProps {
  show: boolean;
  onClose: () => void;
  batchTopics: string;
  setBatchTopics: (v: string) => void;
  isBatchGenerating: boolean;
  handleBatchGenerate: () => void;
  tone: string;
}

export const BatchFactoryModal: React.FC<BatchFactoryModalProps> = ({
  show,
  onClose,
  batchTopics,
  setBatchTopics,
  isBatchGenerating,
  handleBatchGenerate,
  tone
}) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[48px] p-12 space-y-8 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 text-white">
                <div className="w-14 h-14 rounded-2xl bg-brand-cyan/20 flex items-center justify-center">
                   <Zap className="w-7 h-7 text-brand-cyan fill-current" />
                </div>
                <div>
                   <h3 className="text-3xl font-black italic tracking-tighter uppercase">Factory</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Multi-Asset Content Engineering</p>
                </div>
              </div>
              {!isBatchGenerating && (
                <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-white">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest ml-2">Topic Pipeline (One per line)</label>
               <textarea 
                  value={batchTopics}
                  onChange={(e) => setBatchTopics(e.target.value)}
                  disabled={isBatchGenerating}
                  placeholder="Future of Energy 2025&#10;Smart Grids in Berlin&#10;Agritecture Guide"
                  rows={6}
                  className="glass-input w-full p-8 rounded-[32px] text-lg font-medium italic resize-none leading-tight"
               />
               <div className="flex items-center gap-4 p-5 bg-white/2 rounded-2xl border border-white/5">
                  <Sparkles className="w-5 h-5 text-brand-purple" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                     Engine will process {batchTopics.split('\n').filter(t => t.trim()).length} articles using {tone} tone.
                  </p>
               </div>
            </div>

            <button 
              onClick={handleBatchGenerate}
              disabled={isBatchGenerating || !batchTopics.trim()}
              className="w-full py-6 bg-brand-cyan text-slate-900 font-black rounded-3xl shadow-2xl shadow-brand-cyan/20 hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-4 text-lg"
            >
              {isBatchGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>ENGINEERING CONTENT...</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6 fill-current" />
                  <span>LAUNCH MASS PRODUCTION</span>
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
