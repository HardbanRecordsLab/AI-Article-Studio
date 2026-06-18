import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Plus, 
  Mail, 
  SlidersHorizontal, 
  CheckCircle2, 
  ArrowRight,
  User,
  Tags,
  Zap,
  Bell,
  X,
  FileText,
  AlertCircle,
  Eye,
  Settings,
  Flame,
  Check,
  Send
} from "lucide-react";
import { SavedArticle, FullArticle } from "../types";

// Helper function to format timestamp beautifully
const formatDateString = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
};

interface EditorialCalendarPlannerProps {
  articleHistory: SavedArticle[];
  editorialCalendar: SavedArticle[];
  onPersistArticle: (article: SavedArticle) => Promise<void>;
  onRemoveArticle: (articleId: string) => Promise<void>;
  onInspectArticle: (article: FullArticle) => void;
  onSetStep: (step: any) => void;
}

export const EditorialCalendarPlanner: React.FC<EditorialCalendarPlannerProps> = ({
  articleHistory,
  editorialCalendar,
  onPersistArticle,
  onRemoveArticle,
  onInspectArticle,
  onSetStep
}) => {
  const [plannerTab, setPlannerTab] = useState<"kanban" | "monthly">("kanban");
  
  // Backwards compatible calendar filters
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Custom upcoming planning draft form popup
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanFormat, setNewPlanFormat] = useState("Poradnik (How-to)");
  const [newPlanTone, setNewPlanTone] = useState("Formalny");
  const [newPlanDate, setNewPlanDate] = useState("2026-06-15");
  const [newPlanKeywords, setNewPlanKeywords] = useState("");
  
  // Email alerts configuration state
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderEmailInput, setReminderEmailInput] = useState("hardbanrecordslab.pl@gmail.com");
  const [reminderFrequency, setReminderFrequency] = useState("24h_before");
  const [statusChangeAlerts, setStatusChangeAlerts] = useState(true);
  const [dispatchingEmail, setDispatchingEmail] = useState(false);
  const [emailSimulationResult, setEmailSimulationResult] = useState<any | null>(null);

  // Month names for timeline selector
  const MONTHS = ["STYCZEŃ", "LUTY", "MARZEC", "KWIECIEŃ", "MAJ", "CZERWIEC", "LIPIEC", "SIERPIEŃ", "WRZESIEŃ", "PAŹDZIERNIK", "LISTOPAD", "GRUDZIEŃ"];

  // Handle Planning card addition
  const handleCreatePlannedCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) {
      alert("Proszę wpisać tytuł publikacji.");
      return;
    }

    const mockArticle: FullArticle = {
      title: newPlanTitle,
      content: [
        { heading: "Wstęp do tematu", text: "Zaplanowana sekcja artykułu..." }
      ],
      seo: {
        metaTitle: `${newPlanTitle} | Optymalizacja`,
        metaDescription: `Zapoznaj się z planowaną publikacją na temat: ${newPlanTitle}`,
        tags: newPlanKeywords.split(",").map(k => k.trim()).filter(Boolean),
        slug: newPlanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        keywordDensity: {},
        readabilityScore: 90,
        sentiment: "neutral",
        gapAnalysis: "",
        alternativeTitles: [],
        fleschKincaidLevel: "Ekspert",
        vocabularyGaps: [],
        competitorVocabulary: []
      },
      faq: [],
      cta: {
        text: "Zapisz się do bazy wiedzy, by nie przegapić premiery artykułu!",
        buttonText: "Subskrybuj",
        type: "subscription",
        personalizedHint: "Zbudowane dla subskrypcji"
      },
      social: []
    };

    const newSaved: SavedArticle = {
      id: "planned-" + Math.random().toString(36).substring(2, 9),
      topic: newPlanTitle,
      timestamp: Date.now(),
      article: mockArticle,
      heroImages: ["https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"],
      scheduledDate: newPlanDate,
      isPublished: false
    };

    await onPersistArticle(newSaved);
    setShowPlanForm(false);
    setNewPlanTitle("");
    setNewPlanKeywords("");
  };

  // Move Column inside Kanban
  const handleMoveStage = async (article: SavedArticle, targetStage: "draft" | "review" | "scheduled" | "published") => {
    const updated: SavedArticle = { ...article };
    
    if (targetStage === "draft") {
      updated.isPublished = false;
      // Keep scheduledDate or clear it if moving to raw drafts
      updated.scheduledDate = undefined;
    } else if (targetStage === "review") {
      updated.isPublished = false;
    } else if (targetStage === "scheduled") {
      updated.isPublished = false;
      if (!updated.scheduledDate) {
        // Set default to 7 days from now
        const d = new Date();
        d.setDate(d.getDate() + 7);
        updated.scheduledDate = d.toISOString().split('T')[0];
      }
    } else if (targetStage === "published") {
      updated.isPublished = true;
    }

    await onPersistArticle(updated);
  };

  // Group items into Kanban Columns
  // 1. Pomysły / Szkice (no scheduledDate, not published, or marked specifically)
  // 2. W Recenzji (has draft/history status but flagged as reviewing or in-transition)
  // 3. Zaplanowane (has scheduledDate, not published)
  // 4. Opublikowane (isPublished === true)
  const kanbanColumns = React.useMemo(() => {
    const columns = {
      ideas: [] as SavedArticle[],
      review: [] as SavedArticle[],
      scheduled: [] as SavedArticle[],
      published: [] as SavedArticle[]
    };

    articleHistory.forEach(article => {
      if (article.isPublished) {
        columns.published.push(article);
      } else if (article.scheduledDate) {
        columns.scheduled.push(article);
      } else {
        // Simple heuristic: if it contains comment, move to review columns sometimes, or divide
        // Let's make it fully custom: if it starts with "planned-" we treat it as ideas initially
        if (article.id.startsWith("planned-")) {
          columns.ideas.push(article);
        } else {
          columns.review.push(article);
        }
      }
    });

    return columns;
  }, [articleHistory]);

  // Simulate Email Reminders dispatching to user's address
  const handleTriggerMockEmail = () => {
    setDispatchingEmail(true);
    
    const upcoming = editorialCalendar.sort((a,b) => {
      const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return dateA - dateB;
    });

    setTimeout(() => {
      setDispatchingEmail(false);
      setEmailSimulationResult({
        sentTo: reminderEmailInput,
        dispatchTime: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        frequency: reminderFrequency === "24h_before" ? "24 godziny przed terminem" : reminderFrequency === "3d_before" ? "3 dni przed terminem" : "Cykliczny alert tygodniowy",
        articlesAlerted: upcoming.slice(0, 3).map(a => ({
          title: a.article?.title || "Bez tytułu",
          date: a.scheduledDate,
          sentiment: a.article?.seo?.sentiment || "neutral",
          score: a.article?.seo?.readabilityScore || 0
        }))
      });
    }, 1200);
  };

  return (
    <div className="space-y-10 selection:bg-brand-cyan/30">
      
      {/* Header controls */}
      <div className="flex flex-col md:flex-row gap-6 justify-between md:items-center">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter text-white flex items-center gap-3">
            <Calendar className="w-10 h-10 text-brand-purple" />
            ORGANIZER PUBLIKACJI
          </h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
            Wielotygodniowy Planer Cyfrowy & Automatyzacja Powiadomień E-mail
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Section views togglers */}
          <div className="flex border border-white/5 rounded-2xl bg-white/2 p-1.5 shrink-0">
            <button 
              onClick={() => setPlannerTab("kanban")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${plannerTab === "kanban" ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "text-slate-500 hover:text-white"}`}
            >
              Tablica Kanban
            </button>
            <button 
              onClick={() => setPlannerTab("monthly")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${plannerTab === "monthly" ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "text-slate-500 hover:text-white"}`}
            >
              Widok Miesięczny
            </button>
          </div>

          <button 
            onClick={() => setShowPlanForm(true)}
            className="px-5 py-3 bg-brand-purple/15 text-brand-purple hover:bg-brand-purple hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-purple/30 shadow-xl shadow-brand-purple/5 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Zaplanuj nową treść
          </button>
        </div>
      </div>

      {/* Main Grid: Work area & configuration Sidebar */}
      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Left Column: Kanban / Month view */}
        <div className="lg:col-span-3 space-y-8">
          
          {plannerTab === "kanban" ? (
            <div className="grid md:grid-cols-4 gap-4 items-start">
              
              {/* COL 1: Koncepty & Pomysły */}
              <div className="rounded-3xl border border-white/5 bg-[#0a0a0c] p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    Koncepty ({kanbanColumns.ideas.length})
                  </span>
                </div>
                <div className="space-y-3 min-h-[500px]">
                  {kanbanColumns.ideas.map(card => (
                    <div key={card.id} className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:border-brand-cyan/20 transition-all space-y-3 relative group">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 italic">"{card.article?.title || "Bez tytułu"}"</h4>
                        <p className="text-[8px] text-slate-500 font-mono">Format: {card.article?.cta?.type === "subscription" ? "Zapis / Lista" : "Artykuł"}</p>
                      </div>
                      
                      {(card.article?.seo?.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 leading-none">
                          {(card.article?.seo?.tags || []).slice(0, 2).map(t => (
                            <span key={t} className="text-[8px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">#{t}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <button 
                          onClick={() => onInspectArticle(card.article)}
                          className="text-[9px] font-black text-brand-cyan uppercase hover:underline"
                        >
                          Podgląd
                        </button>

                        <button 
                          onClick={() => handleMoveStage(card, "review")}
                          className="p-1 px-2.5 bg-white/5 hover:bg-brand-cyan hover:text-slate-900 rounded-lg text-[8px] font-black text-slate-300 transition-colors flex items-center gap-1"
                          title="Przesuń do recenzji"
                        >
                          Dalej <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {kanbanColumns.ideas.length === 0 && (
                    <div className="py-12 text-center text-[10px] text-slate-600 italic">
                      Brak pomysłów. Zaplanuj nowy powyżej!
                    </div>
                  )}
                </div>
              </div>

              {/* COL 2: W Trakcie Recenzji */}
              <div className="rounded-3xl border border-white/5 bg-[#0a0a0c] p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-purple" />
                    W Recenzji ({kanbanColumns.review.length})
                  </span>
                </div>
                <div className="space-y-3 min-h-[500px]">
                  {kanbanColumns.review.map(card => (
                    <div key={card.id} className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:border-brand-purple/20 transition-all space-y-3 relative group">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{card.article?.title || "Bez tytułu"}</h4>
                        <div className="text-[8px] text-slate-400 font-mono">
                          Czytelność: {card.article?.seo?.readabilityScore || 0}/100
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <button 
                          onClick={() => {
                            onInspectArticle(card.article);
                            onSetStep("result");
                          }}
                          className="text-[9px] font-black text-brand-purple uppercase hover:underline"
                        >
                          Edytuj
                        </button>

                        <button 
                          onClick={() => handleMoveStage(card, "scheduled")}
                          className="p-1 px-2 bg-white/5 hover:bg-brand-purple hover:text-white rounded-lg text-[8px] font-black text-slate-300 transition-all flex items-center gap-1"
                        >
                          Planuj <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {kanbanColumns.review.length === 0 && (
                    <div className="py-12 text-center text-[10px] text-slate-600 italic">
                      Wszystkie szkice zrecenzowano.
                    </div>
                  )}
                </div>
              </div>

              {/* COL 3: Zaplanowane */}
              <div className="rounded-3xl border border-white/5 bg-[#0a0a0c] p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                    Zaplanowane ({kanbanColumns.scheduled.length})
                  </span>
                </div>
                <div className="space-y-3 min-h-[500px]">
                  {kanbanColumns.scheduled.map(card => (
                    <div key={card.id} className="p-4 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/20 hover:border-brand-cyan/45 transition-all space-y-3 relative group">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{card.article?.title || "Bez tytułu"}</h4>
                        <span className="inline-block text-[8px] font-black bg-brand-cyan/10 text-brand-cyan px-2 py-0.5 rounded font-mono">
                          📅 {card.scheduledDate}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/10 gap-2">
                        <button 
                          onClick={async () => {
                            const newDate = prompt("Zmień planowaną datę publikacji (RRRR-MM-DD):", card.scheduledDate || "2026-06-01");
                            if (newDate) {
                              await onPersistArticle({ ...card, scheduledDate: newDate });
                            }
                          }}
                          className="text-[8px] font-black text-slate-400 hover:text-white uppercase font-mono"
                        >
                          📅 Reschedule
                        </button>

                        <button 
                          onClick={() => handleMoveStage(card, "published")}
                          className="p-1 px-2 bg-brand-cyan/15 hover:bg-brand-cyan hover:text-slate-900 rounded-lg text-[8px] font-black text-brand-cyan transition-colors"
                        >
                          Publikuj
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {kanbanColumns.scheduled.length === 0 && (
                    <div className="py-12 text-center text-[10px] text-slate-600 italic">
                      Przeciągnij szkice tutaj, by ustalić datę publikacji.
                    </div>
                  )}
                </div>
              </div>

              {/* COL 4: Opublikowane */}
              <div className="rounded-3xl border border-white/5 bg-[#0a0a0c] p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Opublikowane ({kanbanColumns.published.length})
                  </span>
                </div>
                <div className="space-y-3 min-h-[500px]">
                  {kanbanColumns.published.map(card => (
                    <div key={card.id} className="p-4 rounded-2xl bg-emerald-400/5 border border-emerald-400/15 transition-all space-y-3 relative group">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 opacity-80">{card.article?.title || "Bez tytułu"}</h4>
                        <div className="flex items-center gap-1 text-[8px] text-emerald-400 font-mono uppercase font-black">
                          <CheckCircle2 className="w-2.5 h-2.5" /> LIVE
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <button 
                          onClick={() => onInspectArticle(card.article)}
                          className="text-[9px] font-black text-slate-400 hover:text-white uppercase"
                        >
                          Obejrzyj
                        </button>

                        <button 
                          onClick={() => handleMoveStage(card, "scheduled")}
                          className="text-[8px] text-slate-600 hover:text-red-500 uppercase font-bold"
                          title="Cofnij publikację"
                        >
                          Cofnij
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {kanbanColumns.published.length === 0 && (
                    <div className="py-12 text-center text-[10px] text-slate-600 italic">
                      Brak upublicznionych postów.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            
            /* Widok Miesięczny Timeline Grid */
            <div className="glass-panel p-8 md:p-10 rounded-[48px] border border-white/5 space-y-8 bg-white/2">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-xl font-black italic flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-brand-cyan" />
                  HARMONOGRAM TERMINÓW
                </h3>
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                  {MONTHS.slice(4, 7).map((m, idx) => {
                    const monthIdx = idx + 4; // May, June, July
                    return (
                      <button 
                        key={m} 
                        onClick={() => setCurrentMonth(monthIdx)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap cursor-pointer ${currentMonth === monthIdx ? "bg-brand-cyan text-slate-900 shadow" : "text-slate-400 hover:text-white"}`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly calendar days skeleton */}
              <div className="grid grid-cols-7 gap-3">
                {["PON", "WT", "ŚR", "CZW", "PT", "SOB", "ND"].map(d => (
                  <div key={d} className="text-center text-[8px] font-black text-slate-600 tracking-widest">{d}</div>
                ))}
                {Array.from({ length: 30 }).map((_, i) => {
                  const day = i + 1;
                  // Look up articles matching this day
                  // We simulate month check by looking up substring in dates: May (05), June (06), July (07)
                  const dayString = day < 10 ? `0${day}` : `${day}`;
                  const monthString = (currentMonth + 1) < 10 ? `0${currentMonth + 1}` : `${currentMonth + 1}`;
                  const fullMatchStr = `${currentYear}-${monthString}-${dayString}`;

                  const itemsOnThisDay = editorialCalendar.filter(item => {
                    return item.scheduledDate === fullMatchStr;
                  });

                  return (
                    <div key={i} className={`aspect-square rounded-2xl border border-white/5 flex flex-col justify-between p-3 transition-all relative group ${
                      itemsOnThisDay.length > 0 ? "bg-brand-purple/10 border-brand-purple/30" : "bg-white/2 hover:bg-white/5"
                    }`}>
                      <span className={`text-[10px] font-black ${itemsOnThisDay.length > 0 ? "text-brand-purple" : "text-slate-700"}`}>
                        {day}
                      </span>
                      {itemsOnThisDay.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {itemsOnThisDay.map((s, idx) => (
                            <div 
                              key={idx} 
                              className="w-2 h-2 rounded-full bg-brand-cyan border border-slate-950" 
                              title={s.article?.title || ""} 
                            />
                          ))}
                        </div>
                      )}

                      {/* Day Hover Detail Popover */}
                      {itemsOnThisDay.length > 0 && (
                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 w-56 bg-slate-950 border border-white/10 rounded-2xl p-4 z-40 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all shadow-2xl space-y-3">
                          <div className="text-[8px] font-black text-brand-cyan uppercase tracking-wider border-b border-white/5 pb-1 select-none">
                            Zaplanowane {day} {MONTHS[currentMonth]}
                          </div>
                          {itemsOnThisDay.map((s, idx) => (
                            <div key={idx} className="space-y-1">
                              <p className="text-[10px] text-white font-bold leading-tight italic">"{s.article?.title || "Bez tytułu"}"</p>
                              <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono">
                                <span>Ton: {s.article?.seo?.sentiment || "neutral"}</span>
                                <span className="text-brand-purple">QA: {s.article?.seo?.readabilityScore || 0}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List queue of scheduled pipeline */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-500">NADCHODZĄCA PIELĘGNACJA TREŚCI</h3>
              <span className="text-[9px] bg-white/5 border border-white/5 text-slate-500 px-3 py-1 rounded-full font-mono">
                Razem zaplanowanych: {editorialCalendar.length}
              </span>
            </div>
            
            <div className="grid gap-4">
              {editorialCalendar.length === 0 ? (
                <div className="p-16 rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center space-y-4 opacity-30">
                  <Clock className="w-12 h-12" />
                  <p className="text-sm font-bold italic">Brak zaplanowanych publikacji w kalendarzu.</p>
                </div>
              ) : (
                editorialCalendar.sort((a,b) => {
                  const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
                  const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
                  return dateA - dateB;
                }).map(article => (
                  <div key={article.id} className="p-6 rounded-[32px] bg-white/3 border border-white/5 group space-y-4 hover:border-brand-cyan/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex gap-4 items-center min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={article.heroImages[0] || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"} className="w-full h-full object-cover opacity-60" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="text-xs font-black text-white truncate italic pr-4">"{article.article?.title || "Bez tytułu"}"</h4>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[9px] font-black text-brand-cyan uppercase bg-brand-cyan/10 px-2 py-0.5 rounded font-mono">
                            📅 PUBLIKACJA: {article.scheduledDate}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 font-mono">
                            Długość: {(article.article?.content || []).reduce((acc, sec) => acc + (sec.text || "").split(" ").length, 0)} słów
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto self-end sm:self-auto justify-end">
                      <button 
                        onClick={() => {
                          onInspectArticle(article.article);
                          onSetStep("result");
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase text-white transition-all cursor-pointer"
                      >
                        Otwórz szkic
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm("Czy na pewno usunąć zaplanowaną datę dla tego posta?")) {
                            const { scheduledDate, ...rest } = article;
                            await onPersistArticle(rest);
                          }
                        }}
                        className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                        title="Usuń z kalendarza"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Alerts and Configuration Workspace */}
        <div className="space-y-8">
          
          {/* Email Notification Integration Control Panel */}
          <div className="glass-panel p-6 md:p-8 rounded-[40px] border border-white/5 space-y-6 bg-white/2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Mail className="w-32 h-32 text-brand-purple" />
            </div>

            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white leading-none">Powiadomienia E-mail</h4>
                <span className="text-[8px] text-slate-500 font-mono">INTEGRACJA Z GMAIL ALERTS</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">Włącz Przypomnienia:</span>
                <button 
                  onClick={() => setRemindersEnabled(!remindersEnabled)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${remindersEnabled ? "bg-brand-purple" : "bg-white/10"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${remindersEnabled ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Odbiorcy (e-mail zespołu)</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input 
                    type="email" 
                    value={reminderEmailInput} 
                    onChange={(e) => setReminderEmailInput(e.target.value)}
                    placeholder="redaktor@domena.pl"
                    className="w-full bg-[#070708] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Cykliczny Harmonogram</label>
                <select 
                  value={reminderFrequency}
                  onChange={(e) => setReminderFrequency(e.target.value)}
                  className="w-full bg-[#070708] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                >
                  <option value="24h_before">24 godziny przed publikacją</option>
                  <option value="3d_before">3 dni przed publikacją</option>
                  <option value="weekly_digest">Cottodzienny / Tygodniowy Raport</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400 font-bold">Alert o zmianie stanu:</span>
                <input 
                  type="checkbox" 
                  checked={statusChangeAlerts}
                  onChange={(e) => setStatusChangeAlerts(e.target.checked)}
                  className="rounded bg-black border-white/10 accent-brand-purple w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <button 
                  onClick={handleTriggerMockEmail}
                  disabled={dispatchingEmail || !remindersEnabled}
                  className="w-full py-3 bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-102 transition-all flex items-center justify-center gap-2 shadow-lg hover:bg-brand-purple/90 disabled:opacity-50 cursor-pointer"
                >
                  {dispatchingEmail ? (
                    <>
                      <Zap className="w-3.5 h-3.5 animate-spin" /> Wysyłanie...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Wyślij Alert Testowy
                    </>
                  )}
                </button>
                <p className="text-[8px] text-slate-600 uppercase text-center leading-normal">
                  Wyśle natychmiastowe zestawienie zaplanowanych artykułów na podany adres e-mail.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="glass-panel p-6 rounded-[32px] bg-white/2 border border-white/5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#6c6f7d]">OPERACJE W WYDAWNICTWIE</h4>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tempo Publikowania</span>
                <span className="text-brand-purple font-black">78%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand-purple" style={{ width: "78%" }} />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Bezpieczeństwo Łącza</span>
                <span className="text-brand-cyan font-black">Zabezpieczone</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand-cyan" style={{ width: "95%" }} />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Plan Form Modal overlay */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0b0b0c] border border-white/10 rounded-[36px] max-w-md w-full p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-2">
            <button 
              onClick={() => setShowPlanForm(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h4 className="text-xl font-black italic text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-purple" />
                Planowanie Publikacji
              </h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Stwórz nową winietę kalendarzową</p>
            </div>

            <form onSubmit={handleCreatePlannedCard} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-600 tracking-wider">Tytuł Artykułu / Topic</label>
                <input 
                  type="text"
                  required
                  placeholder="np. Jak zoptymalizować pozycjonowanie e-sklepu..."
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  className="w-full bg-[#070708] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-600 tracking-wider font-mono">Format</label>
                  <select
                    value={newPlanFormat}
                    onChange={(e) => setNewPlanFormat(e.target.value)}
                    className="w-full bg-[#070708] border border-white/10 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                  >
                    <option>Poradnik (How-to)</option>
                    <option>Analiza Case Study</option>
                    <option>Sezonowy Listicle</option>
                    <option>Artykuł Prasowy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-600 tracking-wider">Ton wypowiedzi</label>
                  <select
                    value={newPlanTone}
                    onChange={(e) => setNewPlanTone(e.target.value)}
                    className="w-full bg-[#070708] border border-white/10 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                  >
                    <option value="Formalny">Formalny</option>
                    <option value="Humorystyczny">Swobodny</option>
                    <option value="Ekspercki">Ekspercki</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-600 tracking-wider">Docelowa Data Publikacji</label>
                <input 
                  type="date"
                  required
                  value={newPlanDate}
                  onChange={(e) => setNewPlanDate(e.target.value)}
                  className="w-full bg-[#070708] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-600 tracking-wider">Słowa Kluczowe SEO (dzielone przecinkiem)</label>
                <input 
                  type="text"
                  placeholder="marketing b2b, seo, pozycjonowanie"
                  value={newPlanKeywords}
                  onChange={(e) => setNewPlanKeywords(e.target.value)}
                  className="w-full bg-[#070708] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowPlanForm(false)}
                  className="flex-1 py-3 border border-white/10 rounded-xl text-slate-400 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                >
                  Anuluj
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-brand-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-102 transition-all shadow-lg shadow-brand-purple/10 cursor-pointer"
                >
                  Zaplanuj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulator Email Modal layout popup */}
      {emailSimulationResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/92 backdrop-blur-md select-text">
          <div className="bg-slate-950 border border-white/15 rounded-[40px] max-w-2xl w-full p-8 md:p-10 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-2">
            
            <button 
              onClick={() => setEmailSimulationResult(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Simulated Email Envelope Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400 text-xs font-black uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> Powiadomienie e-mail zostało wysłane pomyślnie!
              </div>
              
              <div className="p-4 bg-white/2 border border-white/5 rounded-2xl text-[10px] font-mono text-slate-500 space-y-1">
                <div><span className="text-white font-bold">Nadawca:</span> Lumina Notifications &lt;no-reply@lumina-editorial.ai&gt;</div>
                <div><span className="text-white font-bold">Adresat (To):</span> {emailSimulationResult.sentTo}</div>
                <div><span className="text-white font-bold">Temat (Subject):</span> 📢 [AETHER CALENDAR] Twój Raport Wydawniczy & Aktualizacja Statusów</div>
                <div><span className="text-white font-bold">Wysłano:</span> Dzisiaj, {emailSimulationResult.dispatchTime} (UTC+2)</div>
              </div>
            </div>

            {/* Email Body Markup */}
            <div className="bg-[#111113] p-8 border border-white/10 rounded-3xl mx-auto space-y-6 max-w-xl text-slate-300 font-sans text-sm">
              
              {/* Internal Logo Area */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#6366f1] rounded flex items-center justify-center text-white font-black italic text-xs">L</div>
                  <span className="font-extrabold tracking-tight text-white size-xs">AETHER Content Engine</span>
                </div>
                <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase">STREFA REDAKCYJNA</span>
              </div>

              <div className="space-y-4">
                <p className="font-bold text-white leading-relaxed">Cześć!</p>
                <p className="leading-relaxed text-slate-400">
                  Zgodnie z Twoim harmonogramem, przesyłamy automatyczny biuletyn operacyjny systemu <strong className="text-white">AETHER Content Engine</strong>. Oto wykaz zaplanowanych publikacji na najbliższy cykl redakcyjny:
                </p>
              </div>

              {/* Articles detail */}
              <div className="space-y-3">
                {emailSimulationResult.articlesAlerted.length > 0 ? (
                  emailSimulationResult.articlesAlerted.map((item: any, i: number) => (
                    <div key={i} className="p-4 bg-black/60 border border-white/5 rounded-xl space-y-1.5">
                      <p className="font-bold text-white text-xs">"{item.title}"</p>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                        <span>🗓️ Data: {item.date}</span>
                        <span>SEO Score: <strong className="text-brand-purple">{item.score}/100</strong></span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 bg-white/2 rounded-xl text-center text-xs text-slate-500">
                    Brak artykułów oczekujących na natychmiastową publikację w najbliższym tygodniu.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4 text-xs text-slate-500">
                <p className="leading-relaxed">
                  System monitoruje statusy w czasie rzeczywistym. Wszelkie zmiany dat zaowocują natychmiastowym przeliczeniem godzin wysyłki przypomnień do Twojego zespołu.
                </p>
                <div>
                  <p className="font-bold text-slate-300">Z poważaniem,</p>
                  <p className="italic text-brand-purple">Algorytm Koordynacji AETHER</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setEmailSimulationResult(null)}
              className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase text-center tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Zamknij Podgląd E-maila
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
