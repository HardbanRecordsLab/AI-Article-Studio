import React, { useState } from "react";
import { 
  Zap, 
  PenTool, 
  Image as ImageIcon, 
  History, 
  Clock, 
  Share2, 
  Settings2, 
  Loader2, 
  LogOut, 
  LogIn, 
  ShoppingCart, 
  Github, 
  Twitter, 
  Linkedin 
} from "lucide-react";
import { auth } from "../lib/firebase";
import { User as FirebaseUser } from "firebase/auth";
import { FullArticle, UserProfile, Step } from "../types";
import { cn } from "../lib/utils";

interface SidebarProps {
  step: Step;
  finalArticle: FullArticle | null;
  user: FirebaseUser | null;
  profile: UserProfile;
  authLoading: boolean;
  onReset: () => void;
  onSetStep: (step: Step) => void;
  onLogout: () => void;
  onLogin: () => void;
  onShowShareModal: (show: boolean) => void;
  onShowBatchModal: (show: boolean) => void;
  onShowSettings: (show: boolean) => void;
  isHighContrast: boolean;
  isFocusMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  step,
  finalArticle,
  user,
  profile,
  authLoading,
  onReset,
  onSetStep,
  onLogout,
  onLogin,
  onShowShareModal,
  onShowBatchModal,
  onShowSettings,
  isHighContrast,
  isFocusMode
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const credits = profile.credits || 0;
  const maxCredits = 500; // Example cap for visual purposes
  const creditPercent = Math.min((credits / maxCredits) * 100, 100);

  const handleUpgrade = async () => {
    if (!user) {
      onLogin();
      return;
    }

    setIsUpgrading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <aside className={cn(
      "w-72 bg-black border-r border-white/5 hidden md:flex flex-col z-20 transition-all duration-300",
      isFocusMode && "translate-x-[-100%] w-0 border-none opacity-0"
    )}>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-12 group cursor-pointer" onClick={onReset}>
          <div className="w-10 h-10 bg-brand-accent rounded-2xl shadow-2xl shadow-brand-accent/20 flex items-center justify-center transition-transform group-hover:rotate-6">
            <Zap className="w-6 h-6 text-white fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black italic tracking-tighter leading-none">LUMINA</span>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-accent">Editorial</span>
          </div>
        </div>

        <nav className="space-y-2">
          {[
            { id: "input", icon: PenTool, label: "Content Architect", action: onReset },
            { id: "image-studio", icon: ImageIcon, label: "Visual Studio", action: () => onSetStep("image-studio") },
            { id: "history", icon: History, label: "Asset Archive", action: () => onSetStep("history") },
            { id: "calendar", icon: Clock, label: "Editorial Calendar", action: () => onSetStep("calendar") }
          ].map(item => (
            <button 
              key={item.id}
              onClick={item.action}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group",
                step === item.id ? "bg-white/5 text-white ring-1 ring-white/10 shadow-xl" : "text-slate-500 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", step === item.id ? "text-brand-accent" : "group-hover:text-brand-accent")} />
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </button>
          ))}
          
          {finalArticle && (
            <button 
              onClick={() => onShowShareModal(true)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-slate-500 hover:text-white group"
            >
              <Share2 className="w-5 h-5 group-hover:text-brand-accent" />
              <span className="text-sm font-bold tracking-tight">Distribute Content</span>
            </button>
          )}

          <button 
            onClick={() => onShowBatchModal(true)}
            className="w-full flex items-center gap-4 px-5 py-4 text-slate-500 hover:text-white rounded-2xl transition-all group"
          >
            <Zap className="w-5 h-5 group-hover:text-brand-accent" />
            <span className="text-sm font-bold tracking-tight">Batch Factory</span>
          </button>
          
          <button 
            onClick={() => onShowSettings(true)}
            className="w-full flex items-center gap-4 px-5 py-4 text-slate-500 hover:text-white rounded-2xl transition-all group"
          >
            <Settings2 className="w-5 h-5 group-hover:text-brand-accent" />
            <span className="text-sm font-bold tracking-tight">System Core</span>
          </button>
        </nav>

        <div className="mt-12 pt-8 border-t border-white/5 space-y-4">
          <p className="px-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">System Operator</p>
          <div className="space-y-2">
            <div className="flex items-center gap-4 px-5 py-3 text-white">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-brand-accent/30 shadow-lg shadow-brand-accent/10 flex-shrink-0">
                <img src={user?.photoURL || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop"} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate">{profile.name || "Właściciel Lumina"}</p>
                <p className="text-[10px] text-brand-accent truncate font-mono tracking-wider uppercase font-bold">Tryb Prywatny</p>
              </div>
            </div>
            
            <div className="mx-5 px-3 py-1.5 bg-brand-accent/10 border border-brand-accent/20 rounded-lg text-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-accent">Zasoby Aktywne</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto p-8 space-y-6">
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">System Cloud</span>
            <span className="text-[8px] font-black text-brand-accent ring-1 ring-brand-accent/30 px-2 py-0.5 rounded-full uppercase">Unlimited</span>
          </div>
          <div className="h-1 w-full bg-brand-accent/20 rounded-full overflow-hidden">
            <div 
              className="bg-brand-accent h-full shadow-[0_0_8px_var(--brand-accent)] opacity-80" 
              style={{ width: "100%" }}
            />
          </div>
          <div className="flex justify-between items-end">
             <p className="text-xs font-black text-white tracking-tight">Bez limitów <span className="text-brand-accent uppercase text-[8px] ml-1">Nodes</span></p>
             <span className="text-[8px] font-bold text-slate-500">Konto Nielimitowane</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          {[
            { icon: Github, href: "https://github.com" },
            { icon: Twitter, href: "https://twitter.com" },
            { icon: Linkedin, href: "https://linkedin.com" }
          ].map((social, idx) => (
            <a 
              key={idx}
              href={social.href}
              target="_blank"
              rel="no-referrer"
              className="text-slate-600 hover:text-brand-accent transition-colors"
            >
              <social.icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
};
