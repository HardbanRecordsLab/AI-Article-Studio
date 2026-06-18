import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Template } from "../types";

interface TemplateEditorModalProps {
  show: boolean;
  onClose: () => void;
  newTemplateName: string;
  setNewTemplateName: (v: string) => void;
  newTemplateStructure: string;
  setNewTemplateStructure: (v: string) => void;
  onCreateTemplate: () => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  show,
  onClose,
  newTemplateName,
  setNewTemplateName,
  newTemplateStructure,
  setNewTemplateStructure,
  onCreateTemplate
}) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl"
          >
            <div className="flex justify-between items-center text-white">
              <h3 className="text-xl font-black italic">NEW CUSTOM TEMPLATE</h3>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Template Name</label>
                <input 
                  value={newTemplateName || ""}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. My Technical Deep Dive"
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Structure Description</label>
                <textarea 
                  value={newTemplateStructure || ""}
                  onChange={(e) => setNewTemplateStructure(e.target.value)}
                  placeholder="Describe how the LLM should structure the article..."
                  rows={4}
                  className="glass-input w-full p-4 rounded-xl text-sm resize-none"
                />
              </div>
            </div>
            <button 
              onClick={onCreateTemplate}
              className="w-full py-4 bg-brand-accent text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20"
            >
              Create Template
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
