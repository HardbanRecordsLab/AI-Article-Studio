import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Linkedin, Loader2, Link2 } from "lucide-react";
import { UserProfile, SavedArticle } from "../types";
import { cn } from "../lib/utils";
import { auth } from "../lib/firebase";

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  isHighContrast: boolean;
  setIsHighContrast: (v: boolean) => void;
  isFocusMode: boolean;
  setIsFocusMode: (v: boolean) => void;
  preferenceHistory: any[];
  setPreferenceHistory: (h: any[]) => void;
  articleHistory: SavedArticle[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose,
  profile,
  setProfile,
  isHighContrast,
  setIsHighContrast,
  isFocusMode,
  setIsFocusMode,
  preferenceHistory,
  setPreferenceHistory,
  articleHistory
}) => {
  const [linkedinConnected, setLinkedinConnected] = React.useState(false);
  const [linkedinName, setLinkedinName] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [loadingStatus, setLoadingStatus] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isSavingCompany, setIsSavingCompany] = React.useState(false);

  const fetchLinkedInStatus = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/linkedin/status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedinConnected(data.connected);
        setLinkedinName(data.name || "");
        setCompanyId(data.companyId || "");
        setCompanyName(data.companyName || "");
      }
    } catch (err) {
      console.error("Failed to load LinkedIn status:", err);
    }
  };

  React.useEffect(() => {
    if (show) {
      fetchLinkedInStatus();
    }
  }, [show]);

  React.useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.service === 'linkedin') {
        fetchLinkedInStatus();
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        alert("Authentication Error: " + event.data.error);
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  const handleConnectLinkedIn = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/auth/linkedin/url", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Unable to retrieve LinkedIn authorization URL.");
      }
      const { url } = await res.json();
      
      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        "linkedin_oauth",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        alert("Popup blocked! Please enable popups for this website to connect LinkedIn.");
      }
    } catch (e: any) {
      alert("LinkedIn connection failed: " + e.message);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    if (!confirm("Are you sure you want to disconnect your LinkedIn account?")) return;
    setIsDisconnecting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/linkedin/disconnect", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setLinkedinConnected(false);
        setLinkedinName("");
        setCompanyId("");
        setCompanyName("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSaveCompany = async () => {
    setIsSavingCompany(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/linkedin/save-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ companyId, companyName })
      });
      if (res.ok) {
        alert("LinkedIn company page details saved successfully.");
      } else {
        throw new Error("Failed to save settings.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingCompany(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pb-20">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
              <div>
                 <h3 className="text-2xl font-black italic tracking-tighter">USER ARCHITECT PROFILE</h3>
                 <p className="text-[10px] text-brand-cyan font-bold uppercase tracking-widest mt-1">System Preferences & Personalization</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-8 space-y-10 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                     <input 
                       value={profile.name}
                       onChange={(e) => setProfile({...profile, name: e.target.value})}
                       className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">System Role</label>
                     <select 
                       value={profile.role}
                       onChange={(e) => setProfile({...profile, role: e.target.value})}
                       className="glass-input w-full px-4 py-3 rounded-xl text-sm italic"
                     >
                       <option value="Administrator">Administrator</option>
                       <option value="Editor">Editor</option>
                       <option value="Author">Author</option>
                     </select>
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Professional Bio</label>
                   <textarea 
                     value={profile.bio}
                     onChange={(e) => setProfile({...profile, bio: e.target.value})}
                     rows={2}
                     className="glass-input w-full p-4 rounded-xl text-sm italic resize-none"
                   />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Global Defaults</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <span className="text-[9px] font-bold text-slate-600 uppercase ml-1">Tone</span>
                     <select 
                        value={profile.defaultTone}
                        onChange={(e) => setProfile({...profile, defaultTone: e.target.value})}
                        className="glass-input w-full px-4 py-3 rounded-xl text-xs"
                     >
                        {["Professional", "Investigative", "Conversational", "Academic"].map(t => <option key={t} value={t} className="bg-[#0f172a]">{t}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <span className="text-[9px] font-bold text-slate-600 uppercase ml-1">SEO Density</span>
                     <div className="flex items-center gap-3 glass-input px-4 py-2.5 rounded-xl">
                        <input 
                          type="range" min="0.5" max="4" step="0.1" 
                          value={profile.seoDensity}
                          onChange={(e) => setProfile({...profile, seoDensity: parseFloat(e.target.value)})}
                          className="flex-1 accent-brand-cyan"
                        />
                        <span className="text-[10px] font-mono font-bold text-brand-cyan">{profile.seoDensity}%</span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Master Aesthetics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/2 rounded-2xl border border-white/5 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High Contrast</span>
                     <button 
                      onClick={() => setIsHighContrast(!isHighContrast)}
                      className={cn("w-10 h-5 rounded-full p-1 transition-all", isHighContrast ? "bg-brand-cyan" : "bg-white/10")}
                     >
                       <div className={cn("w-3 h-3 bg-white rounded-full transition-all", isHighContrast ? "translate-x-5" : "translate-x-0")} />
                     </button>
                  </div>
                  <div className="p-4 bg-white/2 rounded-2xl border border-white/5 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Focus Mode</span>
                     <button 
                      onClick={() => setIsFocusMode(!isFocusMode)}
                      className={cn("w-10 h-5 rounded-full p-1 transition-all", isFocusMode ? "bg-brand-purple" : "bg-white/10")}
                     >
                       <div className={cn("w-3 h-3 bg-white rounded-full transition-all", isFocusMode ? "translate-x-5" : "translate-x-0")} />
                     </button>
                  </div>
                </div>
              </div>

              {/* LinkedIn Publishing Integration */}
              <div className="space-y-4 pt-6 border-t border-white/5 bg-white/2 p-6 rounded-3xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-[#0077b5] uppercase tracking-widest flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 fill-[#0077b5] text-[#0077b5]" /> LINKEDIN PUBLISHING
                  </h4>
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                    linkedinConnected ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-slate-400"
                  )}>
                    {linkedinConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                {linkedinConnected ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[11px] text-slate-300">
                      Connected as <strong className="text-white">{linkedinName}</strong>
                    </div>

                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">LinkedIn Company Page Setup</div>
                      
                      <div className="space-y-2">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Company / Page ID (Numeric)</label>
                        <input 
                          type="text"
                          placeholder="e.g. 13579246"
                          value={companyId}
                          onChange={(e) => setCompanyId(e.target.value)}
                          className="glass-input w-full px-3 py-2 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Company Display Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. Lumina HQ"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="glass-input w-full px-3 py-2 text-xs"
                        />
                      </div>

                      <button 
                        onClick={handleSaveCompany}
                        disabled={isSavingCompany}
                        className="w-full py-2 bg-[#0077b5]/20 hover:bg-[#0077b5]/30 text-[#0077b5] text-[10px] font-black uppercase rounded-lg border border-[#0077b5]/30 transition-all flex items-center justify-center gap-1.5"
                      >
                        {isSavingCompany ? <Loader2 className="w-3 h-3 animate-spin"/> : "Save Company Parameters"}
                      </button>
                    </div>

                    <button 
                      onClick={handleDisconnectLinkedIn}
                      disabled={isDisconnecting}
                      className="w-full py-2 border border-red-500/20 hover:bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      {isDisconnecting && <Loader2 className="w-3 h-3 animate-spin" />} Disconnect LinkedIn Access
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 duration-200">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Connect your LinkedIn Account to publish articles directly to your Professional Profile or corporate Company Pages with custom target audiences.
                    </p>
                    <button 
                      onClick={handleConnectLinkedIn}
                      className="w-full py-3 bg-[#0077b5] hover:bg-[#0077b5]/85 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0077b5]/10"
                    >
                      <Linkedin className="w-4 h-4 fill-white text-white" /> Connect LinkedIn Account
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-brand-cyan uppercase tracking-widest">Developer Hub</h4>
                  <div className="flex gap-2">
                     <span className="text-[8px] bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded font-black">API ACTIVE</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                       <span>Article Sync Webhook</span>
                       <span className="text-brand-purple">wh_0182_x9</span>
                    </div>
                    <code className="block text-[10px] text-brand-cyan font-mono italic truncate bg-black/40 p-2 rounded-lg">
                      https://api.lumina.io/v1/sync/{profile.name.toLowerCase().replace(/\s+/g, '_')}
                    </code>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-[10px] font-black text-brand-purple uppercase tracking-widest">Privacy & Archive</h4>
                {(preferenceHistory || []).length > 0 && (
                  <div className="space-y-2">
                     <p className="text-[9px] font-bold text-slate-600 uppercase">Recent Configuration History</p>
                     <div className="space-y-1">
                        {(preferenceHistory || []).slice(0, 3).map((hist, i) => (
                          <div key={i} className="flex justify-between text-[9px] text-slate-500 italic bg-white/2 p-2 rounded-lg">
                             <span>{hist.defaultTone} / {hist.defaultLanguage}</span>
                             <span>{new Date(hist.timestamp).toLocaleDateString()}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const data = JSON.stringify({ profile, articleHistory });
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `lumina_gdpr_export_${profile.name}.json`;
                      a.click();
                    }}
                    className="flex-1 py-3 border border-white/10 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white"
                  >
                    Export Personal Data
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm("DANGER: Wiping all local data. Continue?")) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="flex-1 py-3 border border-red-500/20 rounded-xl text-[9px] font-black uppercase text-red-500 hover:bg-red-500/10"
                  >
                    Account Deletion
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/2 border-t border-white/5 flex gap-4">
               <button 
                onClick={onClose}
                className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-2xl"
               >
                 Discard
               </button>
               <button 
                onClick={() => {
                  const updatedHistory = [{ ...profile, timestamp: Date.now() }, ...preferenceHistory];
                  setPreferenceHistory(updatedHistory);
                  localStorage.setItem("user_profile", JSON.stringify(profile));
                  localStorage.setItem("preference_history", JSON.stringify(updatedHistory));
                  onClose();
                }}
                className="flex-1 py-4 bg-brand-cyan text-slate-900 font-bold rounded-2xl shadow-lg shadow-brand-cyan/20"
               >
                 Sync Profile
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
