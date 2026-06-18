import React, { useState } from "react";
import { 
  MessageSquare, 
  Check, 
  Plus, 
  Trash2, 
  Send, 
  User, 
  Clock, 
  AlertCircle,
  FolderLock,
  Layers,
  ChevronDown,
  ShieldAlert,
  SlidersHorizontal,
  Bookmark,
  Users
} from "lucide-react";

export interface CommentItem {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
  resolved: boolean;
}

interface WorkflowCommentMarginProps {
  sectionIndex: number;
  comments: CommentItem[];
  onAddComment: (sectionIdx: number, text: string, author: string, role: string) => void;
  onToggleResolveComment: (sectionIdx: number, commentId: string) => void;
  onDeleteComment: (sectionIdx: number, commentId: string) => void;
}

// Pre-configured team personas for high-fidelity multi-user collaboration mock
const TEAM_PERSONAS = [
  { name: "Tomasz", role: "Redaktor Naczelny", avatarColor: "bg-brand-purple" },
  { name: "Anna", role: "Ekspert SEO", avatarColor: "bg-brand-cyan" },
  { name: "Karol", role: "Wydawca Social", avatarColor: "bg-emerald-500" },
  { name: "Szymon", role: "Korektor Językowy", avatarColor: "bg-amber-500" }
];

export const WorkflowCommentMargin: React.FC<WorkflowCommentMarginProps> = ({
  sectionIndex,
  comments,
  onAddComment,
  onToggleResolveComment,
  onDeleteComment
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [selectedPersonaIdx, setSelectedPersonaIdx] = useState(0);

  const activePersona = TEAM_PERSONAS[selectedPersonaIdx];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    onAddComment(
      sectionIndex,
      newCommentText,
      activePersona.name,
      activePersona.role
    );
    setNewCommentText("");
  };

  const resolvedCount = comments.filter(c => c.resolved).length;
  const activeComments = comments.filter(c => !c.resolved);

  return (
    <div className="space-y-3">
      {/* Small Inline Toggle Button at side-margins */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            comments.length > 0
              ? activeComments.length > 0 
                ? "bg-brand-purple/10 border border-brand-purple/35 text-brand-purple" 
                : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> 
          Komentarze ({comments.length})
          {resolvedCount > 0 && <span className="opacity-60 text-[8px]">({resolvedCount} Rozw.)</span>}
        </button>
      </div>

      {isOpen && (
        <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          
          {/* Persona quick select */}
          <div className="flex gap-2 items-center border-b border-white/5 pb-3">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block shrink-0">Twoja rola:</span>
            <div className="flex flex-wrap gap-1 leading-none">
              {TEAM_PERSONAS.map((p, idx) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedPersonaIdx(idx)}
                  className={`px-2 py-1 rounded text-[8px] font-black transition-all ${
                    selectedPersonaIdx === idx 
                      ? "bg-white/10 text-white border border-white/10" 
                      : "text-slate-500 hover:text-slate-350"
                  }`}
                >
                  {p.name} ({p.role.split(" ")[0]})
                </button>
              ))}
            </div>
          </div>

          {/* Comment Threads */}
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic text-center py-2">Brak uwag edytorskich dla tej sekcji.</p>
            ) : (
              comments.map(c => {
                const persona = TEAM_PERSONAS.find(p => p.name === c.author);
                const color = persona?.avatarColor || "bg-slate-700";
                
                return (
                  <div key={c.id} className={`p-3 rounded-xl border transition-all ${
                    c.resolved 
                      ? "bg-emerald-500/5 border-emerald-500/15 opacity-60" 
                      : "bg-[#0b0b0c] border-white/5"
                  }`}>
                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1 select-none">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${color} flex items-center justify-center text-[8px] font-black text-black`}>
                          {c.author.slice(0, 1)}
                        </div>
                        <div className="leading-tight">
                          <span className="text-[9px] font-black text-white">{c.author}</span>
                          <span className="text-[7px] text-slate-500 font-bold uppercase block -mt-0.5">{c.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[7px] font-mono text-slate-600">{c.timestamp}</span>
                        <button 
                          onClick={() => onToggleResolveComment(sectionIndex, c.id)}
                          className={`p-1 rounded hover:bg-white/10 ${c.resolved ? "text-emerald-400" : "text-slate-600 hover:text-emerald-400"}`}
                          title={c.resolved ? "Przywróć" : "Rozwiąż uwagą"}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => onDeleteComment(sectionIndex, c.id)}
                          className="p-1 rounded hover:bg-white/10 text-slate-600 hover:text-red-500"
                          title="Usuń"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-[10px] pt-1.5 leading-relaxed text-slate-350 italic font-sans ${c.resolved ? "line-through opacity-50" : ""}`}>
                      "{c.text}"
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* New Comment Form input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Wpisz uwagę lub komentarz sekcji (np. zmień ton)..."
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/40 placeholder:text-slate-600"
            />
            <button 
              type="submit" 
              className="p-2 bg-brand-purple text-white hover:bg-brand-purple/80 rounded-xl transition-all cursor-pointer flex-shrink-0"
              title="Wyślij"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
