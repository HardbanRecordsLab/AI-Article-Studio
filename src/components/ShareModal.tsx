import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Twitter, 
  Linkedin, 
  Facebook, 
  MessageCircle, 
  Send, 
  Globe, 
  Pin, 
  Bookmark, 
  Type, 
  Hash, 
  AtSign, 
  Cloud, 
  Terminal, 
  Layers, 
  FileText, 
  Youtube,
  Instagram,
  Disc as Discord,
  Music2 as TikTok,
  Ghost as Snapchat,
  Twitch,
  Smartphone as WeChat,
  MessageSquare as Weibo,
  PhoneCall as Viber,
  HelpCircle as Quora,
  BookOpen as Medium,
  Code as DevTo,
  Cpu as Hashnode,
  Share2,
  Slack, 
  Mail, 
  Link 
} from "lucide-react";
import { cn } from "../lib/utils";
import { FullArticle } from "../types";

interface ShareModalProps {
  show: boolean;
  onClose: () => void;
  finalArticle: FullArticle | null;
}

const shareData = [
  { name: "Twitter", icon: Twitter, color: "hover:text-[#1DA1F2]", url: (text: string, title: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}` },
  { name: "LinkedIn", icon: Linkedin, color: "hover:text-[#0A66C2]", url: (text: string, title: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}` },
  { name: "Facebook", icon: Facebook, color: "hover:text-[#1877F2]", url: (text: string, title: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}` },
  { name: "WhatsApp", icon: MessageCircle, color: "hover:text-[#25D366]", url: (text: string, title: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + window.location.href)}` },
  { name: "Telegram", icon: Send, color: "hover:text-[#0088cc]", url: (text: string, title: string) => `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(title)}` },
  { name: "Reddit", icon: Globe, color: "hover:text-[#FF4500]", url: (text: string, title: string) => `https://www.reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}` },
  { name: "Pinterest", icon: Pin, color: "hover:text-[#E60023]", url: (text: string, title: string) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&description=${encodeURIComponent(title)}` },
  { name: "Pocket", icon: Bookmark, color: "hover:text-[#ef4056]", url: (text: string, title: string) => `https://getpocket.com/save?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(title)}` },
  { name: "Tumblr", icon: Type, color: "hover:text-[#35465c]", url: (text: string, title: string) => `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(title)}` },
  { name: "Mastodon", icon: Hash, color: "hover:text-[#2b90d9]", url: (text: string, title: string) => `https://mastodon.social/share?text=${encodeURIComponent(title + " " + window.location.href)}` },
  { name: "Threads", icon: AtSign, color: "hover:text-[#000000]", url: (text: string, title: string) => `https://www.threads.net/intent/post?text=${encodeURIComponent(title + " " + window.location.href)}` },
  { name: "BlueSky", icon: Cloud, color: "hover:text-[#0560ff]", url: (text: string, title: string) => `https://bsky.app/intent/compose?text=${encodeURIComponent(title + " " + window.location.href)}` },
  { name: "Hacker News", icon: Terminal, color: "hover:text-[#ff6600]", url: (text: string, title: string) => `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(window.location.href)}&t=${encodeURIComponent(title)}` },
  { name: "Buffer", icon: Layers, color: "hover:text-[#323b43]", url: (text: string, title: string) => `https://bufferapp.com/add?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(title)}` },
  { name: "Evernote", icon: FileText, color: "hover:text-[#2db34a]", url: (text: string, title: string) => `https://www.evernote.com/clip.action?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(title)}` },
  { name: "Slack", icon: Slack, color: "hover:text-[#4A154B]", url: (text: string, title: string) => `https://slack.com/share?url=${encodeURIComponent(window.location.href)}` },
  { name: "YouTube", icon: Youtube, color: "hover:text-[#FF0000]", url: (text: string, title: string) => `https://www.youtube.com/` },
  { name: "Instagram", icon: Instagram, color: "hover:text-[#E4405F]", url: (text: string, title: string) => `https://www.instagram.com/` },
  { name: "Discord", icon: Discord, color: "hover:text-[#5865F2]", url: (text: string, title: string) => `https://discord.com/` },
  { name: "TikTok", icon: TikTok, color: "hover:text-[#000000]", url: (text: string, title: string) => `https://www.tiktok.com/` },
  { name: "Snapchat", icon: Snapchat, color: "hover:text-[#FFFC00]", url: (text: string, title: string) => `https://www.snapchat.com/` },
  { name: "Twitch", icon: Twitch, color: "hover:text-[#9146FF]", url: (text: string, title: string) => `https://www.twitch.tv/` },
  { name: "WeChat", icon: WeChat, color: "hover:text-[#07C160]", url: (text: string, title: string) => `https://www.wechat.com/` },
  { name: "Weibo", icon: Weibo, color: "hover:text-[#E6162D]", url: (text: string, title: string) => `https://weibo.com/` },
  { name: "Viber", icon: Viber, color: "hover:text-[#665CAC]", url: (text: string, title: string) => `https://www.viber.com/` },
  { name: "Quora", icon: Quora, color: "hover:text-[#B92B27]", url: (text: string, title: string) => `https://www.quora.com/` },
  { name: "Medium", icon: Medium, color: "hover:text-[#000000]", url: (text: string, title: string) => `https://medium.com/` },
  { name: "Dev.to", icon: DevTo, color: "hover:text-[#0A0A0A]", url: (text: string, title: string) => `https://dev.to/` },
  { name: "Hashnode", icon: Hashnode, color: "hover:text-[#2962FF]", url: (text: string, title: string) => `https://hashnode.com/` },
  { name: "X (Feed)", icon: Share2, color: "hover:text-brand-cyan", url: (text: string, title: string) => `https://twitter.com/` },
  { name: "Email", icon: Mail, color: "hover:text-slate-400", url: (text: string, title: string) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(window.location.href)}` },
  { name: "Copy Link", icon: Link, color: "hover:text-brand-cyan", url: (text: string, title: string) => "copy" }
];

export const ShareModal: React.FC<ShareModalProps> = ({ show, onClose, finalArticle }) => {
  const handleShare = (platform: typeof shareData[0]) => {
    if (!finalArticle) return;
    if (platform.name === "Copy Link") {
      navigator.clipboard.writeText(`${finalArticle.title}\n${window.location.href}`);
      alert("Link copied to clipboard!");
      onClose();
      return;
    }
    const url = platform.url("", finalArticle.title);
    window.open(url, "_blank");
  };

  return (
    <AnimatePresence>
      {show && finalArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[40px] p-10 space-y-8 shadow-2xl relative overflow-hidden"
          >
            <div className="text-center space-y-2 text-white">
              <h3 className="text-3xl font-black italic tracking-tighter">Distribute Asset</h3>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-[0.2em]">Select Deployment Channel</p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
              {shareData.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handleShare(platform)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group",
                    platform.color
                  )}
                >
                  <div className="p-3 rounded-xl bg-white/5 group-hover:bg-current/10 transition-colors">
                    <platform.icon className="w-6 h-6 transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-white transition-colors text-center">{platform.name}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={onClose}
              className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border-t border-white/5"
            >
              Close Distribution Panel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
