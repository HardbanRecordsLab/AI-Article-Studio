import React from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

interface LoadingStepProps {
  delay: number;
  text: string;
}

export const LoadingStep: React.FC<LoadingStepProps> = ({ delay, text }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.5 }}
      >
        <CheckCircle2 className="w-4 h-4 text-brand-cyan" />
      </motion.div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{text}</span>
    </motion.div>
  );
};
