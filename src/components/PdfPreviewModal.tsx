import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, FileText, Check, Palette } from "lucide-react";
import { FullArticle } from "../types";

interface PdfPreviewModalProps {
  show: boolean;
  onClose: () => void;
  article: FullArticle | null;
  onDownload: (options: PdfOptions) => void;
}

export interface PdfOptions {
  showCoverPage: boolean;
  themeColor: "cyan" | "purple" | "amber" | "charcoal";
  includeTOC: boolean;
  fontFamily: "sans" | "serif" | "mono";
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  show,
  onClose,
  article,
  onDownload
}) => {
  const [options, setOptions] = React.useState<PdfOptions>({
    showCoverPage: true,
    themeColor: "cyan",
    includeTOC: true,
    fontFamily: "serif"
  });

  if (!article) return null;

  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString("pl-PL", {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getThemeHex = (color: "cyan" | "purple" | "amber" | "charcoal") => {
    switch (color) {
      case "cyan": return "text-[#00bcd4]";
      case "purple": return "text-[#a855f7]";
      case "amber": return "text-[#f59e0b]";
      case "charcoal": return "text-[#475569]";
    }
  };

  const getThemeBg = (color: "cyan" | "purple" | "amber" | "charcoal") => {
    switch (color) {
      case "cyan": return "bg-[#00bcd4]";
      case "purple": return "bg-[#a855f7]";
      case "amber": return "bg-[#f59e0b]";
      case "charcoal": return "bg-[#475569]";
    }
  };

  const getThemeBorder = (color: "cyan" | "purple" | "amber" | "charcoal") => {
    switch (color) {
      case "cyan": return "border-[#00bcd4]";
      case "purple": return "border-[#a855f7]";
      case "amber": return "border-[#f59e0b]";
      case "charcoal": return "border-[#475569]";
    }
  };

  const getFontClass = (font: "sans" | "serif" | "mono") => {
    switch (font) {
      case "sans": return "font-sans";
      case "serif": return "font-serif";
      case "mono": return "font-mono";
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-5xl bg-[#0f172a] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col lg:flex-row h-[85vh]"
          >
            {/* Left Controls Panel */}
            <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col justify-between bg-slate-900/40">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-cyan" /> DOCUMENT DESIGN
                  </h3>
                  <p className="text-[9px] text-brand-cyan font-bold uppercase tracking-widest mt-1">
                    Live PDF Layout Preview
                  </p>
                </div>

                {/* Cover Page */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Document Sections</span>
                  <div className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Show Cover Page</span>
                    <button 
                      onClick={() => setOptions({ ...options, showCoverPage: !options.showCoverPage })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${options.showCoverPage ? 'bg-brand-cyan' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${options.showCoverPage ? 'translate-x-[16px]' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Table of Contents</span>
                    <button 
                      onClick={() => setOptions({ ...options, includeTOC: !options.includeTOC })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${options.includeTOC ? 'bg-brand-cyan' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${options.includeTOC ? 'translate-x-[16px]' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Color Schemes */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Color Theme Accents</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(["cyan", "purple", "amber", "charcoal"] as const).map((col) => (
                      <button
                        key={col}
                        onClick={() => setOptions({ ...options, themeColor: col })}
                        className={`aspect-square rounded-lg flex items-center justify-center border transition-all ${
                          options.themeColor === col ? "border-white bg-white/10 scale-105" : "border-white/5 hover:border-white/20 hover:scale-102"
                        }`}
                        title={col.toUpperCase()}
                      >
                        <div className={`w-4 h-4 rounded-full ${col === "cyan" ? "bg-[#00bcd4]" : col === "purple" ? "bg-[#a855f7]" : col === "amber" ? "bg-[#f59e0b]" : "bg-[#475569]"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Choices */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Typography pairing</span>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white/2 rounded-xl border border-white/5">
                    {(["sans", "serif", "mono"] as const).map((font) => (
                      <button
                        key={font}
                        onClick={() => setOptions({ ...options, fontFamily: font })}
                        className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          options.fontFamily === font ? "bg-white/5 text-brand-cyan shadow" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-6 lg:pt-0">
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs"
                >
                  Close
                </button>
                <button 
                  onClick={() => onDownload(options)}
                  className="flex-1 py-3 bg-brand-cyan text-slate-900 hover:bg-brand-cyan/90 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-lg shadow-brand-cyan/20"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>

            {/* Right Live Preview Canvas Mockup */}
            <div className="flex-1 bg-slate-950 p-6 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PAGE PREVIEW MOCKUP (A4 SHEET)</span>
                <span className="text-[9px] font-mono text-slate-600">300 DPI Rendering</span>
              </div>

              {/* Simulated Paper Workspace Area */}
              <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-900 border border-white/5 p-6 flex justify-center custom-scrollbar">
                <div 
                  className={`w-full max-w-[650px] bg-white text-slate-800 aspect-[1/1.414] shadow-2xl p-12 transition-all flex flex-col justify-between ${getFontClass(options.fontFamily)} mb-6 select-none`}
                  style={{ minHeight: "800px" }}
                >
                  {/* Outer Border line */}
                  <div className={`border h-full flex flex-col justify-between p-8 ${getThemeBorder(options.themeColor)}`}>
                    
                    {/* Cover Page Representation */}
                    {options.showCoverPage ? (
                      <div className="flex flex-col justify-between h-full text-center">
                        <div className="pt-8">
                          <div className={`w-12 h-1 mx-auto mb-6 ${getThemeBg(options.themeColor)}`} />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400">Content Architecture Report</span>
                        </div>
                        
                        <div className="px-4 py-8">
                          <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
                            {article.title}
                          </h1>
                          <div className={`w-12 h-0.5 mx-auto mt-6 ${getThemeBg(options.themeColor)}`} />
                        </div>

                        <div className="pb-8 space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Formatted by Lumina AI Studio</p>
                          <p className="text-[10px] font-mono text-slate-500">{currentDate}</p>
                        </div>
                      </div>
                    ) : (
                      // Plain Header View
                      <div className="h-full flex flex-col justify-between text-left">
                        <div className="space-y-6">
                          {/* Header Line */}
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Content Architecture</span>
                            <span className="text-[9px] font-mono text-slate-400">Page 1 of 2</span>
                          </div>

                          {/* Post Content preview */}
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${getThemeHex(options.themeColor)}`}>
                              {(article.seo?.slug || "artykuł").toUpperCase()}
                            </span>
                            <h2 className="text-2xl font-black mt-1 text-slate-900 mb-6">{article.title}</h2>
                            
                            {/* Table of Contents simulated */}
                            {options.includeTOC && (
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg mb-8 space-y-2">
                                <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">SPIS TREŚCI</p>
                                <div className="space-y-1">
                                  {(article.content || []).map((sec, j) => (
                                    <div key={j} className="flex justify-between text-xs text-slate-600">
                                      <span>{j + 1}. {sec.heading}</span>
                                      <span className="border-b border-dotted border-slate-300 flex-1 mx-2 self-end mb-1" />
                                      <span className="font-mono">Page 0{j + 1}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Standard text representation */}
                            <div className="space-y-4">
                              {(article.content || []).slice(0, 1).map((sec, i) => (
                                <div key={i} className="space-y-2">
                                  <h3 className="text-sm font-semibold text-slate-800">{sec.heading}</h3>
                                  <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-4">
                                    {sec.text}
                                  </p>
                                </div>
                              ))}
                              
                              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 mt-8">
                                <span className="italic">CTA Type: {article.cta?.type || "Standard Link"}</span>
                                <span className={`font-semibold ${getThemeHex(options.themeColor)}`}>Generated via Lumina Portal</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 text-center">
                          <span className="text-[9px] text-slate-400 font-mono">Confidential & Proprietary Content © {currentYear}</span>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
