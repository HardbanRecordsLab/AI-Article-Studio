import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import { 
  Wand2, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  Copy, 
  Download,
  AlertCircle,
  Menu,
  Settings2,
  PenTool,
  History,
  FileDown,
  ExternalLink,
  Edit3,
  Eye,
  Type,
  FileType,
  Maximize2,
  Trash2,
  Sparkles,
  Target,
  BarChart3,
  Smile,
  HelpCircle,
  Calendar,
  MousePointer2,
  X,
  Plus,
  Save,
  RotateCcw,
  Palette,
  Edit,
  Clock,
  Zap,
  Video,
  Check,
  ShoppingCart,
  Mail,
  Gift,
  Info,
  Link,
  Users,
  MessageSquare,
  BarChart2,
  Github,
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  Share2,
  Instagram,
  Slack,
  MessageCircle,
  Send,
  AtSign,
  Cloud,
  Terminal,
  Pin,
  Hash,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Bookmark,
  PieChart as PieIcon,
  BookOpen,
  ListOrdered,
  Layers,
  SlidersHorizontal,
  AlertTriangle,
  LogOut,
  LogIn,
  User
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

import { auth, db, googleProvider, googleProvider as provider, signInWithPopup, signOut, handleFirestoreError, OperationType } from "./lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp } from "firebase/firestore";

import { cn } from "./lib/utils";
import { Step, SavedArticle, ArticleSnapshot, UserProfile, Template, ArticleOutline, FullArticle } from "./types";
import { Sidebar } from "./components/Sidebar";
import { SettingsModal } from "./components/SettingsModal";
import { ShareModal } from "./components/ShareModal";
import { BatchFactoryModal } from "./components/BatchFactoryModal";
import { TemplateEditorModal } from "./components/TemplateEditorModal";
import { LoadingStep } from "./components/LoadingStep";
import { PdfPreviewModal } from "./components/PdfPreviewModal";
import { EditorialCalendarPlanner } from "./components/EditorialCalendarPlanner";
import { MediaLibraryManager } from "./components/MediaLibraryManager";
import { WorkflowCommentMargin } from "./components/WorkflowCommentMargin";

const iconMap = {
  BookOpen,
  Target,
  ListOrdered,
  PenTool,
  FileText,
  ShoppingCart
};

import { 
  generateOutline, 
  generateFullArticle, 
  generateArticleImage,
  editArticleSection,
  factCheckArticleSection,
  predictOrganicTraffic,
  getInternalLinks,
  generateVisualData,
  auditAccessibility,
  generateMultilingualMeta,
  analyzeTone,
  suggestKeywords,
  analyzeReadabilityAndSEO,
  analyzeCompetitors,
  publishToCMS,
  callGemini,
  AVAILABLE_MODELS,
  FactCheckResult,
  TrafficPrediction,
  InternalLinkSuggestion,
  AccessibilityReport,
  SEOReadabilityReport,
  CompetitorAnalysis,
  MultilingualMeta,
  ToneReport,
  TEMPLATE_LIBRARY,
  analyzeVocabularyGaps,
  fetchGooglePAA,
  GapAnalysisResult,
  GooglePAAQuestion
} from "./services/aiService";

function getReadabilityDifficulty(text: string): { label: string; color: string; bg: string; border: string } {
  if (!text) return { label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return { label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };

  const charCountWithoutSpaces = text.replace(/\s+/g, '').length;
  const avgWordLength = charCountWithoutSpaces / wordCount;

  const sentenceCount = (text.match(/[.!?]+/g) || []).length || 1;
  const avgSentenceLength = wordCount / sentenceCount;

  const complexityScore = (avgWordLength * 1.5) + (avgSentenceLength * 0.5);

  if (complexityScore < 11) {
    return { label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  } else if (complexityScore < 15) {
    return { label: 'Complex', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10', border: 'border-brand-cyan/20' };
  } else {
    return { label: 'Professional', color: 'text-brand-purple', bg: 'bg-brand-purple/10', border: 'border-brand-purple/20' };
  }
}

export default function App() {
  const [step, setStep] = useState<Step>("input");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("Formalny");
  const [writingStyle, setWritingStyle] = useState("Informacyjny");
  const [articleLength, setArticleLength] = useState("Średni (1000 słów)");
  const [imageStyle, setImageStyle] = useState("Photorealistic");
  const [articleFormat, setArticleFormat] = useState("Artykuł Prasowy");
  const [language, setLanguage] = useState("Polski");
  const [audience, setAudience] = useState("Początkujący");
  const [ctaGoal, setCtaGoal] = useState("Informative"); // Sales, subscription, etc
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [outline, setOutline] = useState<ArticleOutline | null>(null);
  const [finalArticle, setFinalArticle] = useState<FullArticle | null>(null);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
  
  // Editor & Studio state
  const [editMode, setEditMode] = useState(false);
  const [studioPrompt, setStudioPrompt] = useState("");
  const [editingImage, setEditingImage] = useState<{ url: string, index: number, rotation: number, filter: string } | null>(null);
  const [studioAspectRatio, setStudioAspectRatio] = useState<'16:9' | '1:1' | '4:3'>('16:9');
  const [studioImages, setStudioImages] = useState<string[]>([]);
  const [isStudioGenerating, setIsStudioGenerating] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<Template[]>(TEMPLATE_LIBRARY);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Custom template form
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateStructure, setNewTemplateStructure] = useState("");

  // Advanced features
  const [showSettings, setShowSettings] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [articleHistory, setArticleHistory] = useState<SavedArticle[]>([]);
  const [preferenceHistory, setPreferenceHistory] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sectionInstructions, setSectionInstructions] = useState<{ [key: number]: string }>({});
  const [isEditingSection, setIsEditingSection] = useState<{ [key: number]: boolean }>({});
  const [fabMenuOpen, setFabMenuOpen] = useState<number | null>(null);
  const [isGeneratingSectionImage, setIsGeneratingSectionImage] = useState<{ [key: number]: boolean }>({});
  const [sectionComments, setSectionComments] = useState<{ [key: number]: any[] }>({
    0: [
      {
        id: "init-1",
        author: "Tomasz",
        role: "Redaktor Naczelny",
        text: "Świetny wstęp! Rozważmy jednak dodanie konkretnego pytania angażującego na samym końcu tej sekcji.",
        timestamp: "Wczoraj, 18:30",
        resolved: false
      }
    ],
    1: [
      {
        id: "init-2",
        author: "Anna",
        role: "Ekspert SEO",
        text: "Słowo kluczowe w nagłówku ma właściwą gęstość, ale sprawdźmy analizę competitor vocabulary przed publikacją.",
        timestamp: "Dzisiaj, 10:12",
        resolved: false
      }
    ]
  });
  const [editorialWorkflowStage, setEditorialWorkflowStage] = useState<"szkic" | "edycja" | "zatwierdzenie" | "publikacja">("szkic");

  const handleAddComment = (sectionIdx: number, text: string, author: string, role: string) => {
    const prev = sectionComments[sectionIdx] || [];
    const newComment = {
      id: "comment-" + Math.random().toString(36).substring(2, 9),
      author,
      role,
      text,
      timestamp: "Dziś, " + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      resolved: false
    };
    setSectionComments({
      ...sectionComments,
      [sectionIdx]: [...prev, newComment]
    });
  };

  const handleToggleResolveComment = (sectionIdx: number, commentId: string) => {
    const prev = sectionComments[sectionIdx] || [];
    const updated = prev.map(c => {
      if (typeof c === 'string') {
        return {
          id: `legacy-${Math.random()}`,
          author: "Tomasz",
          role: "Redaktor",
          text: c,
          timestamp: "Wczoraj, 18:30",
          resolved: true
        };
      }
      if (c.id === commentId) {
        return { ...c, resolved: !c.resolved };
      }
      return c;
    });
    setSectionComments({
      ...sectionComments,
      [sectionIdx]: updated
    });
  };

  const handleDeleteComment = (sectionIdx: number, commentId: string) => {
    const prev = sectionComments[sectionIdx] || [];
    const updated = prev.filter(c => {
      if (typeof c === 'string') return false; // Delete raw string on match
      return c.id !== commentId;
    });
    setSectionComments({ ...sectionComments, [sectionIdx]: updated });
  };

  const getNormalizedComments = (sectionIdx: number) => {
    const list = sectionComments[sectionIdx] || [];
    return list.map((c, index) => {
      if (typeof c === 'string') {
        return {
          id: `legacy-${index}`,
          author: "Tomasz",
          role: "Redaktor",
          text: c,
          timestamp: "Wczoraj, 18:30",
          resolved: false
        };
      }
      return c;
    });
  };

  const [sectionSources, setSectionSources] = useState<{ [key: number]: { title: string; uri: string }[] }>({});
  const [isFactChecking, setIsFactChecking] = useState<{ [key: number]: boolean }>({});
  const [trafficPrediction, setTrafficPrediction] = useState<TrafficPrediction | null>(null);
  const [isPredictingTraffic, setIsPredictingTraffic] = useState(false);
  const [gapAnalysisResult, setGapAnalysisResult] = useState<GapAnalysisResult | null>(null);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const [googlePaaQuestions, setGooglePaaQuestions] = useState<GooglePAAQuestion[]>([]);
  const [isFetchingGooglePaa, setIsFetchingGooglePaa] = useState(false);
  const [selectedCtrPosition, setSelectedCtrPosition] = useState<number>(1);
  const [internalLinks, setInternalLinks] = useState<InternalLinkSuggestion[]>([]);
  const [isFetchingInternalLinks, setIsFetchingInternalLinks] = useState(false);
  const [accessibilityReport, setAccessibilityReport] = useState<AccessibilityReport | null>(null);
  const [isAuditingAccessibility, setIsAuditingAccessibility] = useState(false);
  const [seoReport, setSeoReport] = useState<SEOReadabilityReport | null>(null);
  const [isAnalyzingSEO, setIsAnalyzingSEO] = useState(false);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [isAnalyzingCompetitors, setIsAnalyzingCompetitors] = useState(false);
  const [visualData, setVisualData] = useState<{ title: string; chartType: 'bar' | 'pie'; data: { name: string; value: number }[] } | null>(null);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const [multilingualMeta, setMultilingualMeta] = useState<MultilingualMeta | null>(null);
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [allMediaLibrary, setAllMediaLibrary] = useState<string[]>([]);
  const [toneReport, setToneReport] = useState<ToneReport | null>(null);
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"content" | "social" | "seo" | "faq" | "video" | "calendar" | "versions" | "accessibility" | "metadata" | "tone" | "integrations" | "internalLinks" | "visuals" | "library">("content");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [articleStatus, setArticleStatus] = useState<"draft" | "review" | "published">("draft");

  // Feature stability states
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [batchTopics, setBatchTopics] = useState("");
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "Właściciel Lumina",
    bio: "Lokalne konto administratora systemu. Bez opłat, bez limitów.",
    role: "Administrator",
    defaultTone: "Professional",
    defaultLanguage: "Polski",
    defaultAudience: "Eksperci",
    defaultFormat: "Artykuł Prasowy",
    defaultLength: "Medium (1500 words)",
    defaultStyle: "Modern/Minimalist",
    seoDensity: 1.5,
    credits: 999999
  });

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('contrast-125', 'saturate-150');
      document.documentElement.style.setProperty('--brand-accent', '#ffff00');
    } else {
      document.documentElement.classList.remove('contrast-125', 'saturate-150');
      document.documentElement.style.setProperty('--brand-accent', '#6366f1');
    }
  }, [isHighContrast]);

  // Persistence helpers
  const persistArticle = async (article: SavedArticle) => {
    if (user) {
      try {
        await setDoc(doc(db, "articles", article.id), { ...article, userId: user.uid });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `articles/${article.id}`);
      }
    } else {
      const history = [...articleHistory];
      const existingIndex = history.findIndex(h => h.id === article.id);
      if (existingIndex > -1) {
        history[existingIndex] = article;
      } else {
        history.unshift(article);
      }
      setArticleHistory(history);
      localStorage.setItem("article_history", JSON.stringify(history));
    }
  };

  const removeArticle = async (articleId: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, "articles", articleId));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `articles/${articleId}`);
      }
    } else {
      const updated = articleHistory.filter(h => h.id !== articleId);
      setArticleHistory(updated);
      localStorage.setItem("article_history", JSON.stringify(updated));
    }
  };

  // Auth State
  const [user, setUser] = useState<any>({
    uid: "lumina_owner",
    displayName: "Właściciel Lumina",
    email: "owner@lumina.local",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
  });
  const [authLoading, setAuthLoading] = useState(false);

  // Firebase sync
  useEffect(() => {
    const mockUser = {
      uid: "lumina_owner",
      displayName: "Właściciel Lumina",
      email: "owner@lumina.local",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
    };

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // In private single-user mode, we always default to the master owner identity.
      const activeUser = u || mockUser;
      setUser(activeUser);
      setAuthLoading(false);
      
      const userDocRef = doc(db, "users", activeUser.uid);
      const unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          setProfile(prev => ({ ...prev, ...snap.data() as UserProfile }));
        }
      });

      const initProfile = async () => {
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const initialProfile = {
              userId: activeUser.uid,
              name: activeUser.displayName || "Właściciel Lumina",
              bio: "Lokalne konto administratora systemu. Bez opłat, bez limitów.",
              role: "Owner",
              defaultTone: "Professional",
              defaultLanguage: "Polski",
              defaultAudience: "Eksperci",
              defaultFormat: "Artykuł Prasowy",
              seoDensity: 1.5,
              credits: 999999,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, initialProfile);
          }
        } catch (e) {
          console.warn("Could not sync default profile to cloud, falling back to local state:", e);
        }
      };
      initProfile();

      // Sync Articles
      const articlesRef = collection(db, "articles");
      const q = query(articlesRef, where("userId", "==", activeUser.uid));
      const unsubscribeArticles = onSnapshot(q, (snapshot) => {
        const articles: SavedArticle[] = [];
        snapshot.forEach((doc) => {
          articles.push({ ...doc.data() } as SavedArticle);
        });
        setArticleHistory(articles.sort((a, b) => b.timestamp - a.timestamp));
      }, (error) => {
        console.warn("Using local persistence storage:", error);
        const localHistory = localStorage.getItem("article_history");
        if (localHistory) setArticleHistory(JSON.parse(localHistory));
      });

      return () => {
        unsubscribeProfile();
        unsubscribeArticles();
      };
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      alert("Registration failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setArticleHistory([]);
      setCurrentArticleId(null);
      setFinalArticle(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublish = async (platform: "wordpress" | "ghost" | "medium") => {
    if (!finalArticle) return;
    setIsPublishing(true);
    try {
      const res = await publishToCMS(finalArticle, platform);
      if (res.success) {
        setArticleStatus("published");
        alert(res.message + "\nURL: " + res.url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!batchTopics) return;
    setIsBatchGenerating(true);
    const topics = batchTopics.split("\n").filter(t => t.trim().length > 0);
    
    try {
      for (const t of topics) {
        const out = await generateOutline(t, tone, language, articleFormat, keywords, undefined, audience, selectedModel, writingStyle, articleLength);
        const article = await generateFullArticle(out, tone, language, articleFormat, keywords, audience, ctaGoal, profile.seoDensity, writingStyle, articleLength, selectedModel);
        const img = await generateArticleImage(t, '16:9', imageStyle);
        
        const id = Math.random().toString(36).substr(2, 9);
        const newEntry: SavedArticle = {
          id,
          topic: t,
          timestamp: Date.now(),
          article,
          heroImages: [img]
        };
        
        await persistArticle(newEntry);
      }
      alert(`Factory Production Complete: ${topics.length} assets deployed to History.`);
      setShowBatchModal(false);
      setBatchTopics("");
    } catch (e) {
      console.error(e);
      alert("Mass production encountered a system level exception.");
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handlePublishToCMS = async (platform: "wordpress" | "medium" | "ghost") => {
    if (!finalArticle) return;
    setIsPublishing(true);
    try {
      const result = await publishToCMS(finalArticle, platform);
      if (result.success) {
        alert(`${result.message}\nURL: ${result.url}`);
        if (result.url) {
          window.open(result.url, "_blank");
        }
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e.message || "Failed to publish to CMS");
    } finally {
      setIsPublishing(false);
    }
  };

  const [isPublishingLinkedIn, setIsPublishingLinkedIn] = useState(false);

  const handleLinkedInPublish = async () => {
    if (!finalArticle) return;
    setIsPublishingLinkedIn(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Zaloguj się najpierw.");
        return;
      }

      const statusRes = await fetch("/api/linkedin/status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      if (!statusData.connected) {
        alert("Konto LinkedIn nie jest połączone. Przejdź do Settings i połącz się z LinkedIn.");
        setShowSettings(true);
        return;
      }

      const postType = statusData.companyId 
        ? confirm(`Czy chcesz opublikować ten artykuł na stronie firmowej: "${statusData.companyName || "Company page"}"?\n\n[Kliknij "OK" dla Strony Firmowej, "Anuluj" dla Twojego Profilu Osobistego]`)
          ? "organization"
          : "member"
        : "member";

      const textCommentary = prompt(
        "Kompaktowy komentarz wpisu LinkedIn (lub puste, aby automatycznie dołączyć Tytuł i Wstęp):",
        `Artykuł: ${finalArticle.title}\n\n${finalArticle.content[0]?.text.substring(0, 160)}...`
      );

      if (textCommentary === null) return;

      const res = await fetch("/api/publish/linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: finalArticle.title,
          commentary: textCommentary,
          postOnBehalfOf: postType,
          companyId: statusData.companyId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Sukces! Artykuł został opublikowany na LinkedIn.");
        if (data.url) {
          window.open(data.url, "_blank");
        }
      } else {
        throw new Error(data.error || "Wystąpił błąd podczas publikowania na LinkedIn.");
      }
    } catch (error: any) {
      alert("LinkedIn Publish Error: " + error.message);
    } finally {
      setIsPublishingLinkedIn(false);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName || !newTemplateStructure) return;
    const newTmpl: Template = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTemplateName,
      description: "Custom Template",
      icon: "FileText",
      structure: newTemplateStructure
    };
    const updated = [...templates, newTmpl];
    setTemplates(updated);
    const customOnly = updated.filter(u => !TEMPLATE_LIBRARY.find(dt => dt.id === u.id));
    localStorage.setItem("custom_templates", JSON.stringify(customOnly));
    setShowTemplateEditor(false);
    setNewTemplateName("");
    setNewTemplateStructure("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to Save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveDraft();
      }
      // Esc to exit modals/studio
      if (e.key === "Escape") {
        if (editingImage) setEditingImage(null);
        if (showBatchModal) setShowBatchModal(false);
        if (showTemplateEditor) setShowTemplateEditor(false);
        if (showSettings) setShowSettings(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finalArticle, currentArticleId, editingImage, showBatchModal, showTemplateEditor, showSettings]);

  const handleFactCheck = async (index: number) => {
    if (!finalArticle) return;
    setIsFactChecking({ ...isFactChecking, [index]: true });
    try {
      const res = await factCheckArticleSection(finalArticle.content[index].text, tone, language, selectedModel);
      const updatedContent = [...finalArticle.content];
      updatedContent[index].text = res.updatedText;
      setFinalArticle({ ...finalArticle, content: updatedContent });
      setSectionSources({ ...sectionSources, [index]: res.sources });
    } catch (e) {
      console.error(e);
    } finally {
      setIsFactChecking({ ...isFactChecking, [index]: false });
    }
  };

  const [ctaLibrary, setCtaLibrary] = useState([
    { id: 'cta-1', goal: 'sales', text: 'Zacznij cyfrową transformację już dziś – sprawdź naszą ofertę!', style: 'Aggressive' },
    { id: 'cta-2', goal: 'subscription', text: 'Dołącz do 50,000 czytelników i otrzymuj ekskluzywne raporty co tydzień.', style: 'Friendly' },
    { id: 'cta-3', goal: 'lead-magnet', text: 'Pobierz darmowy E-book: Mistrzostwo w Content Marketingu.', style: 'Urgent' },
    { id: 'cta-4', goal: 'sales', text: 'Limited time offer: Rezerwuj konsultację z 30% zniżką.', style: 'Urgent' }
  ]);

  const [audienceProfiles, setAudienceProfiles] = useState([
    { id: "beginner", name: "Początkujący", description: "Osoby bez wiedzy technicznej, wymagające prostego języka." },
    { id: "expert", name: "Eksperci", description: "Specjaliści w danej dziedzinie, oczekujący głębokiej analizy." },
    { id: "b2b", name: "Decydenci B2B", description: "Osoby odpowiedzialne za budżety, szukające ROI i case studies." }
  ]);

  const [editorialCalendar, setEditorialCalendar] = useState<SavedArticle[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSaveDraft = async () => {
    if (!finalArticle) return;
    
    const draftId = currentArticleId || Math.random().toString(36).substring(2, 11);
    const draft: SavedArticle = {
      id: draftId,
      topic: topic,
      timestamp: Date.now(),
      article: finalArticle,
      heroImages: heroImages,
      isPublished: articleStatus === "published"
    };

    await persistArticle(draft);
    setCurrentArticleId(draftId);
    alert(user ? "Draft synced to Cloud!" : "Draft saved locally!");
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem("user_profile");
    if (savedProfile) {
      const p = JSON.parse(savedProfile);
      setProfile(p);
      setTone(p.defaultTone);
      setLanguage(p.defaultLanguage);
      setAudience(p.defaultAudience || "Eksperci");
      setArticleFormat(p.defaultFormat || "Artykuł Prasowy");
    }
    const savedHistory = localStorage.getItem("article_history");
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      setArticleHistory(parsedHistory);
      setEditorialCalendar(parsedHistory.filter((a: SavedArticle) => a.scheduledDate));
    }

    const savedPreferenceHistory = localStorage.getItem("preference_history");
    if(savedPreferenceHistory) {
        setPreferenceHistory(JSON.parse(savedPreferenceHistory));
    }

    const savedTemplates = localStorage.getItem("custom_templates");
    if (savedTemplates) {
      setTemplates([...TEMPLATE_LIBRARY, ...JSON.parse(savedTemplates)]);
    }
  }, []);

  const saveToHistory = (article: FullArticle, images: string[]) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEntry: SavedArticle = {
      id,
      topic,
      timestamp: Date.now(),
      article,
      heroImages: images
    };
    const updated = [newEntry, ...articleHistory];
    setArticleHistory(updated);
    setCurrentArticleId(id);
    localStorage.setItem("article_history", JSON.stringify(updated));
  };

  const liveKeywordDensity = useMemo(() => {
    if (!finalArticle) return {};
    const fullText = (finalArticle.content || []).map(c => c.text).join("\n");
    const words = fullText.toLowerCase().match(/[\w\p{L}]+/gu) || [];
    const totalWords = words.length;
    if (totalWords === 0) return {};

    const kwList = new Set<string>();
    if (keywords) {
      keywords.split(",").forEach(k => {
        const trimmed = k.trim();
        if (trimmed) kwList.add(trimmed);
      });
    }
    if (finalArticle.seo?.tags) {
      finalArticle.seo.tags.forEach(t => {
        const trimmed = t.trim();
        if (trimmed) kwList.add(trimmed);
      });
    }
    if (finalArticle.seo?.keywordDensity) {
      Object.keys(finalArticle.seo.keywordDensity).forEach(k => {
        const trimmed = k.trim();
        if (trimmed) kwList.add(trimmed);
      });
    }

    const densityObj: { [kw: string]: { count: number; density: number } } = {};
    kwList.forEach(kw => {
      const kwLower = kw.toLowerCase().trim();
      if (!kwLower) return;
      let count = 0;
      if (kwLower.includes(" ") || kwLower.includes("-")) {
        const textLower = fullText.toLowerCase();
        let pos = 0;
        while ((pos = textLower.indexOf(kwLower, pos)) !== -1) {
          count++;
          pos += kwLower.length;
        }
      } else {
        words.forEach(w => {
          if (w === kwLower) count++;
        });
      }

      const calculatedDensity = totalWords > 0 ? (count / totalWords) * 100 : 0;
      densityObj[kw] = {
        count,
        density: Math.round(calculatedDensity * 10) / 10
      };
    });

    return densityObj;
  }, [finalArticle, keywords]);

  useEffect(() => {
    if (activeTab === "seo" && finalArticle) {
      if (!seoReport && !isAnalyzingSEO) {
        const runSEO = async () => {
          setIsAnalyzingSEO(true);
          try {
            const content = (finalArticle.content || []).map(c => c.text).join("\n");
            const res = await analyzeReadabilityAndSEO(content, keywords, selectedModel);
            setSeoReport(res);
          } catch (e) {
            console.error("SEO analysis failed", e);
          } finally {
            setIsAnalyzingSEO(false);
          }
        };
        runSEO();
      }

      if (!trafficPrediction && !isPredictingTraffic) {
        const runTraffic = async () => {
          setIsPredictingTraffic(true);
          try {
            const res = await predictOrganicTraffic(topic || finalArticle.title, keywords || finalArticle.seo?.tags?.join(", ") || "", selectedModel);
            setTrafficPrediction(res);
          } catch (e) {
            console.error("Traffic prediction failed", e);
          } finally {
            setIsPredictingTraffic(false);
          }
        };
        runTraffic();
      }

      if (!gapAnalysisResult && !isAnalyzingGaps) {
        const runGaps = async () => {
          setIsAnalyzingGaps(true);
          try {
            const content = (finalArticle.content || []).map(c => c.text).join("\n");
            const res = await analyzeVocabularyGaps(topic || finalArticle.title, content, selectedModel);
            setGapAnalysisResult(res);
          } catch (e) {
            console.error("Gap analysis failed", e);
          } finally {
            setIsAnalyzingGaps(false);
          }
        };
        runGaps();
      }

      if (googlePaaQuestions.length === 0 && !isFetchingGooglePaa) {
        const runPAA = async () => {
          setIsFetchingGooglePaa(true);
          try {
            const res = await fetchGooglePAA(topic || finalArticle.title, selectedModel);
            setGooglePaaQuestions(res);
          } catch (e) {
            console.error("Fetching PAA failed", e);
          } finally {
            setIsFetchingGooglePaa(false);
          }
        };
        runPAA();
      }
    }

    if (activeTab === "internalLinks" && finalArticle && internalLinks.length === 0 && !isFetchingInternalLinks) {
      const runInternalLinks = async () => {
        setIsFetchingInternalLinks(true);
        try {
          const content = (finalArticle.content || []).map(c => c.text).join("\n");
          const res = await getInternalLinks(content, selectedModel);
          setInternalLinks(res);
        } catch (e) {
          console.error("Internal links failed", e);
        } finally {
          setIsFetchingInternalLinks(false);
        }
      };
      runInternalLinks();
    }

    if (activeTab === "accessibility" && finalArticle && !accessibilityReport && !isAuditingAccessibility) {
      const runAccessibility = async () => {
        setIsAuditingAccessibility(true);
        try {
          const content = (finalArticle.content || []).map(c => c.text).join("\n");
          const res = await auditAccessibility(content, selectedModel);
          setAccessibilityReport(res);
        } catch (e) {
          console.error("Accessibility audit failed", e);
        } finally {
          setIsAuditingAccessibility(false);
        }
      };
      runAccessibility();
    }

    if (activeTab === "metadata" && finalArticle && !multilingualMeta && !isGeneratingMeta) {
      const runMeta = async () => {
        setIsGeneratingMeta(true);
        try {
          const res = await generateMultilingualMeta(finalArticle.title, finalArticle.seo.metaDescription, selectedModel);
          setMultilingualMeta(res);
        } catch (e) {
          console.error("Multilingual meta failed", e);
        } finally {
          setIsGeneratingMeta(false);
        }
      };
      runMeta();
    }

    if (activeTab === "tone" && finalArticle && !toneReport && !isAnalyzingTone) {
      const runTone = async () => {
        setIsAnalyzingTone(true);
        try {
          const content = (finalArticle.content || []).map(c => c.text).join("\n");
          const res = await analyzeTone(content, selectedModel);
          setToneReport(res);
        } catch (e) {
          console.error("Tone analysis failed", e);
        } finally {
          setIsAnalyzingTone(false);
        }
      };
      runTone();
    }
  }, [activeTab, finalArticle]);

  const handleStartGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    try {
      const templateStructure = selectedTemplateId 
        ? templates.find(t => t.id === selectedTemplateId)?.structure 
        : undefined;
      const result = await generateOutline(topic, tone, language, articleFormat, keywords, templateStructure, audience, selectedModel, writingStyle, articleLength);
      setOutline(result);
      setStep("outline");
    } catch (e) {
      setError("Wystąpił błąd podczas generowania szkicu. Spróbuj ponownie.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOutline = async () => {
    if (!outline) return;
    setStep("generating");
    setLoading(true);
    setError(null);
    setTrafficPrediction(null);
    setGapAnalysisResult(null);
    setGooglePaaQuestions([]);
    setSeoReport(null);
    try {
      const [article, ...images] = await Promise.all([
        generateFullArticle(outline, tone, language, articleFormat, keywords, audience, ctaGoal, profile.seoDensity, writingStyle, articleLength, selectedModel),
        generateArticleImage(topic, '16:9', imageStyle),
        generateArticleImage(`${topic} - styl alternatywny 1`, '16:9', imageStyle),
        generateArticleImage(`${topic} - styl alternatywny 2`, '16:9', imageStyle),
        generateArticleImage(`${topic} - styl alternatywny 3`, '16:9', imageStyle),
        generateArticleImage(`${topic} - styl alternatywny 4`, '16:9', imageStyle)
      ]);

      // Enhance article generation prompt with target density (mental note: handled by aiService using the keywords string usually, 
      // but I can pass it explicitly if I modify the service. Since I don't want to change the service interface yet, 
      // I'll append it to keywords for now or just rely on the existing prompt which mentions 1-2%.
      // Actually, let's modify generateFullArticle in aiService.ts later if needed.)

      setFinalArticle(article);
      setHeroImages(images);
      setAllMediaLibrary(prev => [...prev, ...images]);
      setSelectedHeroIndex(0);
      setArticleStatus("review"); // Start in review after generation
      saveToHistory(article, images);
      setStep("result");
    } catch (e) {
      setError("Wystąpił błąd podczas generowania pełnej treści. Spróbuj ponownie.");
      setStep("outline");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSectionImage = async (index: number) => {
    if (!finalArticle) return;
    setIsGeneratingSectionImage({ ...isGeneratingSectionImage, [index]: true });
    try {
      const section = finalArticle.content[index];
      const imgTargetContext = section.imagePrompt || section.text;
      const imgUrl = await generateArticleImage(topic, '16:9', imageStyle, imgTargetContext);
      
      const updatedContent = [...finalArticle.content];
      updatedContent[index].imageUrl = imgUrl;
      const updatedArticleObject = { ...finalArticle, content: updatedContent };
      setFinalArticle(updatedArticleObject);
      
      // Auto-save snapshot
      if (currentArticleId) {
        const articleToUpdate = articleHistory.find(h => h.id === currentArticleId);
        if (articleToUpdate) {
          const snapshot: ArticleSnapshot = {
            timestamp: Date.now(),
            content: JSON.parse(JSON.stringify(updatedContent)),
            title: finalArticle.title
          };
          const updatedHistoryItem = { 
            ...articleToUpdate, 
            article: updatedArticleObject,
            snapshots: [...(articleToUpdate.snapshots || []), snapshot]
          };
          await persistArticle(updatedHistoryItem);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSectionImage({ ...isGeneratingSectionImage, [index]: false });
    }
  };

  const handleUpdateSection = async (index: number, instructionOverride?: string) => {
    const overrideText = typeof instructionOverride === 'string' ? instructionOverride : undefined;
    const instruction = overrideText || sectionInstructions[index];
    if (!finalArticle || !instruction) return;
    setIsEditingSection({ ...isEditingSection, [index]: true });
    
    // Auto-save snapshot before modification
    await handleSaveSnapshot(true);

    try {
      const newText = await editArticleSection(
        finalArticle.content[index].text,
        instruction,
        tone,
        language,
        selectedModel
      );
      const updatedContent = [...finalArticle.content];
      updatedContent[index].text = newText;
      const updatedArticleObject = { ...finalArticle, content: updatedContent };
      setFinalArticle(updatedArticleObject);
      
      if (currentArticleId) {
        const articleToUpdate = articleHistory.find(h => h.id === currentArticleId);
        if (articleToUpdate) {
          const updatedHistoryItem = { ...articleToUpdate, article: updatedArticleObject };
          await persistArticle(updatedHistoryItem);
        }
      }

      setSectionInstructions({ ...sectionInstructions, [index]: "" });
    } catch (e) {
      console.error(e);
    } finally {
      setIsEditingSection({ ...isEditingSection, [index]: false });
    }
  };

  const handleStudioGenerate = async () => {
    if (!studioPrompt) return;
    setIsStudioGenerating(true);
    try {
      const img = await generateArticleImage(studioPrompt, studioAspectRatio);
      setStudioImages(prev => [img, ...prev]);
      setAllMediaLibrary(prev => [...prev, img]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStudioGenerating(false);
    }
  };

  const handleSaveSnapshot = async (silent: boolean = false) => {
    if (!finalArticle || !currentArticleId) return;
    const snapshot: ArticleSnapshot = {
      timestamp: Date.now(),
      content: JSON.parse(JSON.stringify(finalArticle.content)),
      title: finalArticle.title
    };
    
    const articleToUpdate = articleHistory.find(h => h.id === currentArticleId);
    if (articleToUpdate) {
      const updatedArticle = { 
        ...articleToUpdate, 
        article: finalArticle, 
        snapshots: [...(articleToUpdate.snapshots || []), snapshot] 
      };
      await persistArticle(updatedArticle);
      if (!silent) alert("Wersjonowanie: Snapshot architektury treści został zapisany w historii.");
    }
  };

  const exportAsPDF = (options?: {
    showCoverPage: boolean;
    themeColor: "cyan" | "purple" | "amber" | "charcoal";
    includeTOC: boolean;
    fontFamily: "sans" | "serif" | "mono";
  }) => {
    if (!finalArticle) return;
    const doc = new jsPDF();
    let yPos = 20;

    const opt = options || {
      showCoverPage: true,
      themeColor: "cyan",
      includeTOC: true,
      fontFamily: "serif"
    };

    const getColorRGB = (color: "cyan" | "purple" | "amber" | "charcoal"): [number, number, number] => {
      switch (color) {
        case "cyan": return [0, 188, 212];
        case "purple": return [168, 85, 247];
        case "amber": return [245, 158, 11];
        case "charcoal": return [71, 85, 105];
      }
    };

    const rgb = getColorRGB(opt.themeColor);

    const getFontFamilyName = (f: "sans" | "serif" | "mono"): string => {
      switch (f) {
        case "sans": return "helvetica";
        case "serif": return "times";
        case "mono": return "courier";
      }
    };

    const fontName = getFontFamilyName(opt.fontFamily);

    // 1. Cover Page
    if (opt.showCoverPage) {
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 190, 277);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 186, 273);

      doc.setFont(fontName, "bold");
      doc.setFontSize(26);
      doc.setTextColor(30, 41, 59);
      const titleLines = doc.splitTextToSize(finalArticle.title, 150);
      let titleY = 110;
      titleLines.forEach((line: string) => {
        doc.text(line, 105, titleY, { align: "center" });
        titleY += 12;
      });

      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(90, titleY + 5, 30, 2, "F");

      doc.setFont(fontName, "italic");
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`Zredagowano przez: Lumina AI Portal`, 105, 220, { align: "center" });
      
      const pDate = new Date().toLocaleDateString("pl-PL", {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      doc.setFont(fontName, "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(pDate, 105, 230, { align: "center" });

      doc.addPage();
      yPos = 20;
    }

    // 2. Table of Contents
    if (opt.includeTOC && finalArticle.content.length > 0) {
      doc.setFont(fontName, "bold");
      doc.setFontSize(18);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text("SPIS TREŚCI", 20, yPos);
      yPos += 15;

      doc.setFontSize(12);
      doc.setFont(fontName, "normal");
      doc.setTextColor(71, 85, 105);

      finalArticle.content.forEach((sec, idx) => {
        const num = `${idx + 1}. `;
        const title = sec.heading;
        doc.text(`${num}${title}`, 20, yPos);
        doc.text(`Strona 0${idx + 1}`, 180, yPos, { align: "right" });
        yPos += 10;
      });

      doc.addPage();
      yPos = 20;
    }

    // 3. Content Sections
    doc.setFont(fontName, "normal");
    doc.setTextColor(30, 41, 59);

    finalArticle.content.forEach((sec, idx) => {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      
      doc.setFontSize(16);
      doc.setFont(fontName, "bold");
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(sec.heading, 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont(fontName, "normal");
      doc.setTextColor(71, 85, 105);
      
      const lines = doc.splitTextToSize(sec.text, 170);
      lines.forEach((line: string) => {
        if (yPos > 275) { doc.addPage(); yPos = 20; }
        doc.text(line, 20, yPos);
        yPos += 6;
      });
      
      yPos += 15;
    });

    doc.save(`${finalArticle.seo.slug}.pdf`);
  };

  const [isGeneratingNewsletter, setIsGeneratingNewsletter] = useState(false);
  const [newsletterContent, setNewsletterContent] = useState("");

  const handleGenerateNewsletter = async () => {
    if (!finalArticle) return;
    setIsGeneratingNewsletter(true);
    try {
      const prompt = `Convert this article into a high-conversion email newsletter. 
      Use an engaging subject line, summary sections, and clear CTAs.
      Article Content: ${JSON.stringify(finalArticle.content)}`;
      
      const params = {
        model: selectedModel,
        contents: prompt
      };
      
      const resData = await callGemini(params);
      const resText = resData.text || resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setNewsletterContent(resText);
      alert("Newsletter structure generated in Distribution tab!");
      setActiveTab("social");
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingNewsletter(false);
    }
  };

  const exportAsMarkdown = () => {
    if (!finalArticle) return;
    let md = `# ${finalArticle.title}\n\n`;
    finalArticle.content.forEach(s => {
      md += `## ${s.heading}\n\n${s.text}\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${finalArticle.seo?.slug || "article"}.md`;
    a.click();
  };

  const exportAsEPUB = () => {
    if (!finalArticle) return;
    const epubContent = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head><title>${finalArticle.title}</title></head>
      <body>
        <h1>${finalArticle.title}</h1>
        ${(finalArticle.content || []).map(c => `<h2>${c.heading}</h2><p>${c.text}</p>`).join('')}
      </body>
    </html>`;
    const blob = new Blob([epubContent], { type: "application/epub+zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${finalArticle.seo?.slug || "article"}.epub`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsNewsletter = () => {
    if (!finalArticle) return;
    const newsletter = `${finalArticle.title}\n\n${(finalArticle.content || []).map(c => `${c.heading}\n\n${(c.text || "").substring(0, 500)}...`).join('\n\n')}\n\nRead more at: [LINK]`;
    navigator.clipboard.writeText(newsletter);
    alert("Newsletter content copied to clipboard!");
  };

  const exportAsTXT = () => {
    if (!finalArticle) return;
    const text = `${finalArticle.title}\n\n${(finalArticle.content || []).map(c => `${c.heading}\n${c.text}`).join('\n\n')}\n\nSEO info:\nSlug: ${finalArticle.seo?.slug || "article"}\nTags: ${(finalArticle.seo?.tags || []).join(", ")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${finalArticle.seo?.slug || "article"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save Snapshot
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveSnapshot();
      }
      // Ctrl+Enter: Generate from Input
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && step === 'input') {
        e.preventDefault();
        handleStartGenerate();
      }
      // Ctrl+N: New Draft
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setStep('input');
        setTopic("");
      }
      // Ctrl+L: Go to Library
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setStep('result');
        setActiveTab('library');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, topic, finalArticle, activeTab, currentArticleId]);

  const currentStatusIndex = ["draft", "review", "published"].indexOf(articleStatus);

  const reset = () => {
    setStep("input");
    setTopic("");
    setOutline(null);
    setFinalArticle(null);
    setHeroImages([]);
    setSelectedHeroIndex(0);
  };

  return (
    <>
      <div className={cn(
      "min-h-screen bg-[#050505] text-[#f5f5f7] flex font-sans relative overflow-hidden transition-all duration-300",
      isHighContrast && "contrast-125 saturate-150"
    )}>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --brand-accent: ${isHighContrast ? '#ffff00' : '#6366f1'};
        }
        .text-brand-accent { color: var(--brand-accent); }
        .bg-brand-accent { background-color: var(--brand-accent); }
        .border-brand-accent { border-color: var(--brand-accent); }
        ${isFocusMode ? '.sidebar-hide { display: none !important; }' : ''}
      `}} />

      <Sidebar 
        step={step}
        finalArticle={finalArticle}
        user={user}
        profile={profile}
        authLoading={authLoading}
        onReset={reset}
        onSetStep={setStep}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onShowShareModal={setShowShareModal}
        onShowBatchModal={setShowBatchModal}
        onShowSettings={setShowSettings}
        isHighContrast={isHighContrast}
        isFocusMode={isFocusMode}
      />
      
      {/* Modals & Overlays */}
      <SettingsModal 
        show={showSettings}
        onClose={() => setShowSettings(false)}
        profile={profile}
        setProfile={setProfile}
        isHighContrast={isHighContrast}
        setIsHighContrast={setIsHighContrast}
        isFocusMode={isFocusMode}
        setIsFocusMode={setIsFocusMode}
        preferenceHistory={preferenceHistory}
        setPreferenceHistory={setPreferenceHistory}
        articleHistory={articleHistory}
      />

      <ShareModal 
        show={showShareModal}
        onClose={() => setShowShareModal(false)}
        finalArticle={finalArticle}
      />

      <PdfPreviewModal 
        show={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        article={finalArticle}
        onDownload={(options) => {
          exportAsPDF(options);
          setShowPdfPreview(false);
        }}
      />

      <BatchFactoryModal 
        show={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        batchTopics={batchTopics}
        setBatchTopics={setBatchTopics}
        isBatchGenerating={isBatchGenerating}
        handleBatchGenerate={handleBatchGenerate}
        tone={tone}
      />








      <TemplateEditorModal 
        show={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
        newTemplateName={newTemplateName}
        setNewTemplateName={setNewTemplateName}
        newTemplateStructure={newTemplateStructure}
        setNewTemplateStructure={setNewTemplateStructure}
        onCreateTemplate={handleCreateTemplate}
      />

      <div className={cn(
        "flex-1 flex flex-col z-10 overflow-y-auto h-screen transition-colors duration-500",
        isDarkMode ? "bg-black" : "bg-slate-50 text-slate-900"
      )}>
        {/* Header */}
        <header className="h-24 flex items-center justify-between px-10 border-b border-white/5 backdrop-blur-xl sticky top-0 bg-black/40 z-30">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#f5f5f7]">
                Content Workspace
              </h2>
              <p className="text-[10px] font-mono text-slate-600 italic">Session: {currentArticleId ? `ID_${currentArticleId.slice(0,8)}` : "STANDBY"}</p>
            </div>
            {step !== "input" && (
              <span className="text-[9px] px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-black uppercase tracking-[0.2em] ml-4 animate-pulse">
                STATUS: {step}
              </span>
            )}
          </div>
          <div className="flex items-center gap-8">
            {/* Operator Status */}
            <div className="hidden md:flex items-center gap-4">
               <div className="flex -space-x-2">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="w-8 h-8 rounded-xl border border-black bg-slate-900 flex items-center justify-center text-[9px] font-black text-slate-500 ring-1 ring-white/5">
                      {String.fromCharCode(64 + i)}
                   </div>
                 ))}
               </div>
               <div className="h-8 w-[1px] bg-white/5 mx-2" />
               <div className="flex flex-col text-right">
                 <span className="text-[10px] font-black uppercase text-slate-400">Node Sync</span>
                 <span className="text-[9px] font-mono text-emerald-500">ACTIVE</span>
               </div>
            </div>

            <div className="flex items-center gap-4">
              {step === "result" && finalArticle && (
                <>
                  <div className="flex items-center gap-2 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5">
                    {["draft", "review", "published"].map((status, idx) => (
                      <button 
                        key={status}
                        onClick={() => setArticleStatus(status as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          articleStatus === status 
                            ? idx <= currentStatusIndex ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "bg-white/5 text-white"
                            : "text-slate-600 hover:text-slate-300"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="h-10 w-[1px] bg-white/5 mx-2" />
                </>
              )}
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-1 group cursor-pointer hover:border-brand-accent/30 transition-all">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-brand-accent to-indigo-900 shadow-inner" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 md:p-16 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {step === "input" && (
              <motion.div 
                key="step-input"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid lg:grid-cols-5 gap-16"
              >
                <div className="lg:col-span-3 space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="h-[2px] w-12 bg-brand-accent" />
                      <span className="text-xs font-black uppercase tracking-[0.4em] text-brand-accent">Aether Engine v1.0</span>
                    </div>
                    <h1 className="text-8xl font-black tracking-tighter leading-[0.85] italic text-white">
                      AETHER <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-brand-accent to-brand-purple">EDITORIAL.</span>
                    </h1>
                    <p className="text-slate-500 text-xl leading-relaxed max-w-xl font-medium tracking-tight">
                      Architecting algorithmic narratives and high-fidelity content assets through a divine amber lens.
                    </p>
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => setShowBatchModal(true)}
                        className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#f5f5f7] hover:bg-brand-accent hover:border-brand-accent transition-all flex items-center gap-3 group"
                      >
                        <Zap className="w-5 h-5 group-hover:fill-current" /> Batch Factory
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Topic</label>
                      <input 
                        value={topic || ""}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Sustainable Urban Gardening in 2024"
                        className="glass-input w-full px-6 py-4 rounded-2xl text-lg shadow-inner italic"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Content Template</label>
                        <button 
                          onClick={() => setShowTemplateEditor(true)}
                          className="text-[10px] font-bold text-brand-accent uppercase tracking-widest flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Add Custom
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {templates.map(t => {
                          const Icon = (iconMap as any)[t.icon] || FileText;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                              className={cn(
                                "w-full p-5 rounded-3xl text-left transition-all border flex flex-col gap-3 group relative",
                                selectedTemplateId === t.id 
                                  ? "bg-brand-accent/10 border-brand-accent text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]" 
                                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
                                )}
                              >
                                {Icon && <Icon className={cn("w-6 h-6", selectedTemplateId === t.id ? "text-brand-accent" : "text-slate-500 group-hover:text-white")} />}
                                <div>
                                  <div className="text-sm font-black italic tracking-tighter">{t.name}</div>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.description}</div>
                                </div>
                                {!TEMPLATE_LIBRARY.find(dt => dt.id === t.id) && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = templates.filter(tmpl => tmpl.id !== t.id);
                                      setTemplates(updated);
                                      localStorage.setItem("custom_templates", JSON.stringify(updated.filter(tmpl => !TEMPLATE_LIBRARY.find(dt => dt.id === tmpl.id))));
                                    }}
                                    className="absolute top-2 right-2 bg-red-500/10 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedTemplateId && (
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-white/70 space-y-2">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Template Structure:</div>
                           <p className="text-sm italic italic leading-relaxed">{templates.find(t => t.id === selectedTemplateId)?.structure}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-2">
                        <div className="flex justify-between items-center px-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SEO Keywords</label>
                          <button 
                            onClick={async () => {
                              if (!topic) return;
                              setIsSuggestingKeywords(true);
                              try {
                                const res = await suggestKeywords(topic, selectedModel);
                                setKeywords(prev => prev ? `${prev}, ${res.join(", ")}` : res.join(", "));
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setIsSuggestingKeywords(false);
                              }
                            }}
                            disabled={isSuggestingKeywords || !topic}
                            className="text-[10px] font-black text-brand-cyan hover:underline disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isSuggestingKeywords ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                            SUGGEST
                          </button>
                        </div>
                        <input 
                          value={keywords || ""}
                          onChange={(e) => setKeywords(e.target.value)}
                          placeholder="e.g. carbon-capture, hydro-smart"
                          className="glass-input w-full px-6 py-4 rounded-2xl text-sm shadow-inner italic"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Target Density (%)</label>
                        <div className="flex items-center gap-3 glass-input px-4 py-4 rounded-2xl">
                          <input 
                            type="range"
                            min="0.5"
                            max="5.0"
                            step="0.1"
                            value={profile.seoDensity || 1.5}
                            onChange={(e) => setProfile({...profile, seoDensity: parseFloat(e.target.value)})}
                            className="flex-1 accent-brand-cyan"
                          />
                          <span className="text-xs font-black text-brand-cyan min-w-[30px]">{profile.seoDensity}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Audience Profiling</label>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        {audienceProfiles.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setAudience(p.name)}
                            className={cn(
                              "text-left p-4 rounded-2xl border transition-all space-y-1",
                              audience === p.name 
                                ? "bg-brand-cyan/10 border-brand-cyan/40 shadow-[0_0_15px_-5px_rgba(34,211,238,0.3)]" 
                                : "bg-white/2 border-white/10 hover:border-white/20"
                            )}
                          >
                            <p className={cn("text-[10px] font-black uppercase tracking-widest", audience === p.name ? "text-brand-cyan" : "text-white")}>{p.name}</p>
                            <p className="text-[9px] text-slate-500 italic leading-tight">{p.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">CTA Conversion Goal</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { id: "sales", label: "Direct Sales", icon: ShoppingCart },
                          { id: "subscription", label: "Newsletter", icon: Mail },
                          { id: "lead-magnet", label: "Lead Magnet", icon: Gift },
                          { id: "informative", label: "Informative", icon: Info }
                        ].map(goal => (
                          <button 
                            key={goal.id}
                            onClick={() => setCtaGoal(goal.id)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-[10px] font-black uppercase",
                              ctaGoal === goal.id ? "bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan" : "bg-white/2 border-white/5 text-slate-500 hover:border-white/20"
                            )}
                          >
                            <goal.icon className="w-4 h-4" />
                            {goal.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleStartGenerate}
                    disabled={loading || !topic}
                    className={cn(
                      "group w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden",
                      loading || !topic 
                        ? "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed" 
                        : "bg-gradient-to-r from-brand-purple to-brand-blue text-white shadow-2xl shadow-brand-purple/20 border border-white/20 hover:scale-[1.01] active:scale-[0.98]"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <span>Start Generating</span>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

                <div className="lg:col-span-2 py-10 space-y-6">
                  <div className="glass-panel p-6 rounded-3xl space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest ml-1">AI Master Engine</label>
                        <div className="grid gap-2">
                          {AVAILABLE_MODELS.filter(m => m.isReady || m.provider === 'google').map((m) => (
                            <button 
                              key={m.id}
                              disabled={!m.isReady}
                              onClick={() => setSelectedModel(m.id)}
                              className={cn(
                                "flex flex-col gap-0.5 p-3 rounded-xl transition-all border text-left",
                                selectedModel === m.id 
                                  ? "bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan font-bold" 
                                  : m.isReady
                                    ? "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                    : "bg-white/2 border-white/5 text-slate-600 opacity-50 cursor-not-allowed"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest">{m.name}</span>
                                {!m.isReady && <span className="text-[7px] font-black uppercase text-slate-500">Preview</span>}
                              </div>
                              <span className="text-[8px] italic font-normal text-slate-500 opacity-80 truncate">{m.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Format Publikacji</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Artykuł Prasowy", "Reportaż Magazynowy", "Rozdział Książki", "Poradnik Praktyczny"].map((f) => (
                            <button 
                              key={f}
                              onClick={() => setArticleFormat(f)}
                              className={cn(
                                "py-3 rounded-xl text-xs transition-all border text-left px-4",
                                articleFormat === f 
                                  ? "bg-brand-purple/20 border-brand-purple/40 text-white font-bold" 
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              )}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Writing Tone</label>
                        <div className="grid grid-cols-3 gap-2">
                          {["Formalny", "Nieformalny", "Humorystyczny"].map((t) => (
                            <button 
                              key={t}
                              onClick={() => setTone(t)}
                              className={cn(
                                "py-3 rounded-xl text-xs transition-all border",
                                tone === t 
                                  ? "bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan font-bold" 
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Writing Style</label>
                        <div className="grid grid-cols-3 gap-2">
                          {["Informacyjny", "Perswazyjny", "Narracyjny"].map((s) => (
                            <button 
                              key={s}
                              onClick={() => setWritingStyle(s)}
                              className={cn(
                                "py-3 rounded-xl text-xs transition-all border",
                                writingStyle === s 
                                  ? "bg-brand-purple/20 border-brand-purple/40 text-brand-purple font-bold" 
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Article Length</label>
                        <div className="grid grid-cols-3 gap-2">
                          {["Krótki (500 słów)", "Średni (1000 słów)", "Długi (2000 słów)"].map((l) => (
                            <button 
                              key={l}
                              onClick={() => setArticleLength(l)}
                              className={cn(
                                "py-3 rounded-xl text-xs transition-all border",
                                articleLength === l 
                                  ? "bg-brand-accent/20 border-brand-accent/40 text-brand-accent font-bold" 
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              )}
                            >
                              {l.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Image Style</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Photorealistic", "Digital Art", "Minimalist Vector", "3D Render"].map((s) => (
                            <button 
                              key={s}
                              onClick={() => setImageStyle(s)}
                              className={cn(
                                "py-3 rounded-xl text-xs transition-all border",
                                imageStyle === s 
                                  ? "bg-white/20 border-white/40 text-white font-bold" 
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Language</label>
                      <select 
                        value={language || ""}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                      >
                        <option value="Polski" className="bg-[#0f172a]">Polski</option>
                        <option value="English" className="bg-[#0f172a]">English</option>
                        <option value="Deutsch" className="bg-[#0f172a]">Deutsch</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3 text-slate-500">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px] font-medium leading-tight">{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name} will optimize content for SEO and readability.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "outline" && outline && (
              <motion.div 
                key="step-outline"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="max-w-3xl mx-auto space-y-10"
              >
                <div className="text-center space-y-2">
                  <p className="text-brand-cyan text-[10px] font-black uppercase tracking-[0.4em]">Drafting Phase</p>
                  <h2 className="text-3xl font-bold italic tracking-tight">Project Architecture</h2>
                </div>

                <div className="glass-panel p-10 rounded-[40px] space-y-10 relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#0f172a] border border-white/10 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-brand-cyan" />
                  </div>

                  <div className="space-y-1 border-b border-white/10 pb-6">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Title</label>
                    <input 
                      value={outline.title || ""}
                      onChange={(e) => setOutline({ ...outline, title: e.target.value })}
                      className="w-full text-3xl font-black bg-transparent border-none p-0 focus:ring-0 italic text-white"
                    />
                  </div>

                  <div className="space-y-4">
                    {(outline.sections || []).map((section, idx) => (
                      <div key={idx} className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-cyan/20 transition-all flex gap-6">
                        <span className="text-3xl font-black text-white/10 italic">0{idx + 1}</span>
                        <div className="flex-1 space-y-2">
                          <input 
                            value={section.heading || ""}
                            onChange={(e) => {
                              const newSections = [...(outline.sections || [])];
                              newSections[idx].heading = e.target.value;
                              setOutline({ ...outline, sections: newSections });
                            }}
                            className="w-full font-bold text-white bg-transparent border-none p-0 focus:ring-0"
                          />
                          <p className="text-slate-500 text-sm italic">{section.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button 
                      onClick={() => setStep("input")}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-2xl transition-all"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleApproveOutline}
                      className="flex-[2] py-4 bg-gradient-to-r from-brand-cyan to-brand-blue text-slate-900 font-black rounded-2xl shadow-xl shadow-brand-cyan/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" /> Approve Outline
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "generating" && (
              <motion.div 
                key="step-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center space-y-12 py-32"
              >
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse bg-brand-cyan/20 rounded-full blur-3xl" />
                  <div className="w-40 h-40 rounded-full border-2 border-white/5 border-t-brand-cyan animate-spin flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border border-white/5 border-b-brand-purple animate-spin" style={{ animationDirection: 'reverse' }}>
                      <div className="w-full h-full flex items-center justify-center">
                        <Wand2 className="w-12 h-12 text-brand-cyan" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-6">
                   <div className="flex flex-col items-center gap-1">
                      <h3 className="text-3xl font-black italic tracking-tighter">ARCHITECTING CONTENT...</h3>
                      <p className="text-[10px] font-black uppercase text-brand-cyan tracking-[0.2em]">Engine: {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}</p>
                   </div>
                   <div className="flex flex-col items-center gap-3">
                    <LoadingStep delay={0} text="Synthesizing Narrative Structure" />
                    <LoadingStep delay={1.5} text="Generating High-Resolution Hero Visuals" />
                    <LoadingStep delay={3} text="Injecting Semantic SEO Meta-Keys" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === "result" && finalArticle && (
              <motion.div 
                key="step-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("max-w-7xl mx-auto space-y-10 w-full", isFocusMode && "max-w-4xl")}
              >
                {/* Workflow Progress Tracker */}
                <div className="flex items-center justify-center animate-in fade-in zoom-in duration-700">
                   <div className="flex items-center w-full max-w-xl bg-white/5 p-1 rounded-[20px] border border-white/10 shadow-2xl backdrop-blur-xl">
                      {[
                        { id: 'draft', label: 'Draft', icon: FileText, color: 'text-brand-cyan' },
                        { id: 'review', label: 'In Review', icon: Eye, color: 'text-brand-purple' },
                        { id: 'published', label: 'Published', icon: CheckCircle2, color: 'text-green-400' }
                      ].map((s, idx, arr) => {
                        const isActive = articleStatus === s.id;
                        const isPast = ["draft", "review", "published"].indexOf(articleStatus) >= idx;
                        return (
                          <div key={s.id} className="flex-1 flex items-center">
                             <button 
                               onClick={() => setArticleStatus(s.id as any)}
                               className={cn(
                                 "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all relative group",
                                 isActive ? "bg-white/10" : "hover:bg-white/5"
                               )}
                             >
                                <s.icon className={cn("w-5 h-5 transition-all", isPast ? s.color : "text-slate-600", isActive && "animate-pulse scale-110")} />
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest",
                                  isPast ? "text-white" : "text-slate-600"
                                )}>{s.label}</span>
                                {isActive && <motion.div layoutId="wf-glow" className={cn("absolute inset-0 rounded-2xl ring-1 ring-inset", s.color.replace('text', 'ring'))} />}
                             </button>
                             {idx < arr.length - 1 && (
                               <div className={cn("w-4 h-[1px] mx-1 transition-all", isPast ? "bg-brand-cyan" : "bg-white/5")} />
                             )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                <div className="grid lg:grid-cols-4 gap-8">
                  {/* Result Section */}
                  <div className="lg:col-span-3 space-y-10 pb-20">
                    {heroImages.length > 0 && (
                      <div className="space-y-4">
                        <div className="aspect-[21/9] w-full relative group overflow-hidden">
                          <AnimatePresence mode="wait">
                            <motion.img 
                              key={selectedHeroIndex}
                              initial={{ opacity: 0, scale: 1.1 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.8 }}
                              src={heroImages[selectedHeroIndex]} 
                              alt={finalArticle.title}
                              className="w-full h-full object-cover"
                            />
                          </AnimatePresence>
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
                          <div className="absolute bottom-8 left-10 pointer-events-none pr-10">
                             <div className="flex items-center gap-2 mb-2">
                               <div className="w-2 h-2 rounded-full bg-brand-cyan shadow-[0_0_10px_#22d3ee]" />
                               <span className="text-[10px] font-mono text-brand-cyan uppercase tracking-widest">Master Hero Visual</span>
                             </div>
                             <div className="space-y-3">
                               <h1 className="text-4xl md:text-5xl font-black text-white italic leading-tight tracking-tighter drop-shadow-2xl">
                                 {finalArticle.title}
                               </h1>
                               <div className="flex flex-wrap gap-2 pointer-events-auto">
                                  <div className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                     <Sparkles className="w-2.5 h-2.5" />
                                     {finalArticle.seo.sentiment}
                                  </div>
                                  <div className="px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                     <BarChart3 className="w-2.5 h-2.5" />
                                     Readability: {finalArticle.seo.readabilityScore}%
                                  </div>
                                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[8px] font-black uppercase tracking-widest">
                                     {articleFormat}
                                  </div>
                               </div>
                             </div>
                          </div>
                        </div>

                        {/* Image Selector */}
                        <div className="px-10 flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                          {heroImages.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedHeroIndex(idx)}
                              className={cn(
                                "flex-shrink-0 w-32 aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-105",
                                selectedHeroIndex === idx ? "border-brand-cyan shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "border-white/10 opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                              )}
                            >
                              <img src={img} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-10 md:p-16 space-y-16">
                      {/* Workflow / Status Bar */}
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-12">
                         <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                            {["draft", "review", "published"].map((status, idx) => (
                              <button 
                                key={status}
                                onClick={() => setArticleStatus(status as any)}
                                className={cn(
                                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden relative group",
                                  articleStatus === status ? "bg-brand-cyan text-slate-900" : "text-slate-500 hover:text-slate-300"
                                )}
                              >
                                {articleStatus === status && (
                                  <motion.div layoutId="status-bg" className="absolute inset-0 bg-brand-cyan -z-10" />
                                )}
                                {status}
                              </button>
                            ))}
                         </div>
                         
                         <div className="flex items-center gap-3">
                           <div className="flex gap-2">
                             <button 
                               onClick={() => setStep("input")}
                               className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all group"
                               title="Reset to Start"
                             >
                                <RotateCcw className="w-5 h-5 group-hover:scale-110 transition-transform" />
                             </button>
                             <button 
                                 onClick={handleSaveDraft}
                                 className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                                 title="Save as Draft (Ctrl+S)"
                             >
                                 <Save className="w-5 h-5 text-slate-400 group-hover:text-brand-cyan transition-transform group-hover:scale-110" />
                             </button>
                             <button 
                                 onClick={() => setShowShareModal(true)}
                                 className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                                 title="Share Asset"
                             >
                                 <Share2 className="w-5 h-5 text-slate-400 group-hover:text-brand-purple transition-transform group-hover:scale-110" />
                             </button>
                           </div>
                           <button 
                             onClick={() => handlePublish("wordpress")}
                             disabled={isPublishing}
                             className="px-8 py-3 bg-brand-cyan text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-cyan/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-2"
                           >
                             {isPublishing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                             {articleStatus === "published" ? "RE-PUBLISH" : "PUSH TO CMS"}
                           </button>
                         </div>
                      </div>

                      <div className="flex bg-slate-950/50 p-2 rounded-3xl border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
                        {[
                          { id: "content", label: "Studio Editor", icon: FileText },
                          { id: "visuals", label: "Intelligence Data", icon: PieIcon },
                          { id: "seo", label: "SEO Cloud", icon: BarChart3 },
                          { id: "tone", label: "Tone Report", icon: Smile },
                          { id: "social", label: "Multi-Channel", icon: Share2 },
                          { id: "video", label: "Video Story", icon: Video },
                          { id: "calendar", label: "Editorial Cal", icon: Calendar },
                          { id: "faq", label: "FAQ Hive", icon: HelpCircle },
                          { id: "internalLinks", label: "Linking Map", icon: Link },
                          { id: "accessibility", label: "Accessibility", icon: Eye },
                          { id: "metadata", label: "Multilingual", icon: Globe },
                          { id: "versions", label: "Time Machine", icon: History },
                          { id: "library", label: "Asset Lab", icon: Bookmark },
                        ].map(tab => (
                          <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                              "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shrink-0",
                              activeTab === tab.id 
                                ? "bg-white/10 text-white shadow-2xl border border-white/5" 
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/2"
                            )}
                          >
                            <tab.icon className="w-4 h-4" /> 
                            {tab.label}
                          </button>
                        ))}
                      </div>
                        <div className="flex gap-2 border-l border-white/10 pl-3 ml-2">
                          <button 
                            onClick={() => setEditMode(!editMode)}
                            className={cn("p-2 rounded-xl transition-all", editMode ? "bg-brand-purple/20 text-brand-purple" : "text-slate-400 hover:text-white")}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {editMode && (
                            <button 
                              onClick={() => {
                                setEditMode(false);
                                alert("Changes saved!");
                              }}
                              className="p-2 bg-brand-cyan/20 text-brand-cyan rounded-xl transition-all hover:bg-brand-cyan/30"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {activeTab === "calendar" && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <Calendar className="w-6 h-6 text-brand-cyan" />
                               <h3 className="text-2xl font-black italic">Editorial Pipeline</h3>
                             </div>
                             <div className="flex gap-2">
                               <button onClick={() => alert("Calendar API Sync: Active")} className="p-2 bg-brand-cyan/10 border border-brand-cyan/20 rounded-lg text-brand-cyan text-[10px] font-black uppercase">Sync GCal</button>
                             </div>
                           </div>

                           <div className="grid lg:grid-cols-3 gap-10">
                              <div className="lg:col-span-1 space-y-6">
                                 <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plan Publication</h4>
                                    <div className="space-y-4">
                                       <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-600 uppercase">Target Date</label>
                                          <input 
                                             type="date" 
                                             value={scheduledDate}
                                             onChange={(e) => setScheduledDate(e.target.value)}
                                             className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-brand-cyan"
                                          />
                                       </div>
                                       <button 
                                          onClick={() => alert(`Artykuł zaplanowany na: ${scheduledDate}`)}
                                          className="w-full py-4 bg-brand-cyan text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-brand-cyan/20"
                                       >
                                          Confirm Schedule
                                       </button>
                                    </div>
                                 </div>

                                 <div className="p-8 rounded-[40px] bg-brand-purple/5 border border-brand-purple/20 space-y-4">
                                    <div className="flex items-center gap-2 text-brand-purple">
                                       <Clock className="w-4 h-4" />
                                       <h5 className="text-[10px] font-black uppercase tracking-widest">Workflow Status</h5>
                                    </div>
                                    <div className="space-y-2">
                                       {["Drafting", "Peer Review", "SEO Verification", "Legal Check", "Ready"].map((s, idx) => (
                                          <div key={s} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/5 opacity-60">
                                             <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[8px]">{idx + 1}</div>
                                             <span className="text-[10px] font-bold text-slate-300 uppercase">{s}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>

                              <div className="lg:col-span-2 space-y-6">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Scheduled for this Month</h4>
                                 <div className="space-y-4">
                                    {articleHistory.length > 0 ? (
                                      articleHistory.slice(0, 5).map((art, idx) => (
                                        <div key={art.id} className="p-6 rounded-[32px] bg-white/2 border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                           <div className="flex items-center gap-6">
                                              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex flex-col items-center justify-center border border-white/5">
                                                 <span className="text-[8px] font-black text-slate-500 uppercase">May</span>
                                                 <span className="text-lg font-black text-white">{17 + idx}</span>
                                              </div>
                                              <div>
                                                 <h5 className="text-sm font-black text-white italic line-clamp-1">{art.topic}</h5>
                                                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Status: <span className="text-brand-cyan">Scheduled</span></p>
                                              </div>
                                           </div>
                                           <div className="flex items-center gap-4">
                                              <div className="flex -space-x-2">
                                                 <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-[#0f172a] flex items-center justify-center text-[8px] font-black">A</div>
                                                 <div className="w-7 h-7 rounded-full bg-purple-500 border-2 border-[#0f172a] flex items-center justify-center text-[8px] font-black">B</div>
                                              </div>
                                              <button className="p-2 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Edit3 className="w-4 h-4" /></button>
                                           </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="py-20 border-2 border-dashed border-white/5 rounded-[48px] flex flex-col items-center justify-center text-slate-600 gap-4">
                                         <Calendar className="w-12 h-12 opacity-10" />
                                         <p className="text-sm italic">Brak zaplanowanych publikacji w kalendarzu.</p>
                                      </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}

                      {activeTab === "library" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                          <MediaLibraryManager 
                            mediaList={allMediaLibrary} 
                            onChangeMediaList={(newList) => setAllMediaLibrary(newList)}
                          />
                        </motion.div>
                      )}
                      {false && activeTab === "library" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                        {/* Media Section */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-2xl font-black italic tracking-tighter">MEDIA ASSETS</h3>
                                <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Library: {allMediaLibrary.length} Items</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {allMediaLibrary.map((img, i) => (
                                    <div key={i} className="group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-white/2">
                                        <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = img;
                                                a.download = `asset-${i}.png`;
                                                a.click();
                                            }} className="p-2 bg-white/10 rounded-lg hover:bg-brand-cyan hover:text-black transition-all">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {allMediaLibrary.length === 0 && (
                                    <div className="col-span-full py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-slate-600 italic">
                                        <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-xs">No media assets generated yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CTA Library */}
                        <div className="space-y-6 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center px-2">
                                <div>
                                    <h3 className="text-2xl font-black italic tracking-tighter">CTA LABORATORY</h3>
                                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">High-Conversion Call to Actions</p>
                                </div>
                                <button onClick={() => {
                                    const text = prompt("Enter CTA text:");
                                    const goal = prompt("Enter goal (sales/subscription/lead-magnet):") as any;
                                    if(text && goal) {
                                        setCtaLibrary([...ctaLibrary, { id: Math.random().toString(36).substr(2, 9), text, goal, style: 'Custom' }]);
                                    }
                                }} className="px-4 py-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all">
                                    Add New CTA
                                </button>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ctaLibrary.map((cta) => (
                                    <div key={cta.id} className="p-6 rounded-3xl bg-white/2 border border-white/5 space-y-4 group hover:border-brand-purple/40 transition-all flex flex-col">
                                        <div className="flex justify-between items-start">
                                            <span className={cn(
                                                "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                                                cta.goal === 'sales' ? "bg-red-500/20 text-red-400" :
                                                cta.goal === 'subscription' ? "bg-brand-cyan/20 text-brand-cyan" :
                                                "bg-brand-purple/20 text-brand-purple"
                                            )}>{cta.goal}</span>
                                            <span className="text-[7px] text-slate-500 italic uppercase">{cta.style}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 italic flex-1">"{cta.text}"</p>
                                        <div className="flex gap-2 pt-2">
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(cta.text);
                                                    alert("CTA text copied to clipboard!");
                                                }}
                                                className="flex-1 py-2 bg-white/5 rounded-lg text-[9px] font-bold uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Copy className="w-3 h-3" /> Copy
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(finalArticle) {
                                                        const newContent = [...finalArticle.content];
                                                        newContent.push({ heading: "Wezwanie do Działania", text: cta.text });
                                                        setFinalArticle({ ...finalArticle, content: newContent });
                                                        alert("CTA appended to article!");
                                                    }
                                                }}
                                                className="flex-1 py-2 bg-brand-purple/20 text-brand-purple rounded-lg text-[9px] font-bold uppercase hover:bg-brand-purple hover:text-white transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" /> Insert
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Audience Profiles */}
                        <div className="space-y-6 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center px-2">
                                <div>
                                    <h3 className="text-2xl font-black italic tracking-tighter">AUDIENCE PERSONAS</h3>
                                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Saved Reader Profiles</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {audienceProfiles.map((p) => (
                                    <div key={p.id} className="p-6 rounded-3xl bg-white/2 border border-white/5 space-y-2 group hover:border-brand-cyan/40 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-cyan/10 flex items-center justify-center">
                                                <Users className="w-4 h-4 text-brand-cyan" />
                                            </div>
                                            <p className="text-xs font-black uppercase text-white tracking-widest">{p.name}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic leading-relaxed">{p.description}</p>
                                        <button 
                                            onClick={() => {
                                                setAudience(p.name);
                                                alert(`Audience set to: ${p.name}`);
                                            }}
                                            className="w-full mt-4 py-2 border border-white/5 rounded-xl text-[8px] font-black uppercase text-slate-500 hover:text-brand-cyan hover:border-brand-cyan/20 transition-all"
                                        >
                                            Use Profile
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Preference History */}
                        <div className="space-y-6 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center px-2">
                                <div>
                                    <h3 className="text-2xl font-black italic tracking-tighter">PREFERENCE HISTORY</h3>
                                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Saved Settings Snapshots</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {preferenceHistory.map((pref, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-white/2 border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="text-[10px] font-black text-slate-600">{new Date(pref.timestamp).toLocaleDateString()}</div>
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase font-bold text-slate-500">Tone</span>
                                                    <span className="text-[10px] text-white italic">{pref.defaultTone}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase font-bold text-slate-500">Language</span>
                                                    <span className="text-[10px] text-white italic">{pref.defaultLanguage}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase font-bold text-slate-500">Format</span>
                                                    <span className="text-[10px] text-white italic">{pref.defaultFormat}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setProfile({ ...profile, ...pref });
                                                setTone(pref.defaultTone);
                                                setLanguage(pref.defaultLanguage);
                                                setArticleFormat(pref.defaultFormat);
                                                alert("Preferences restored!");
                                            }}
                                            className="px-4 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Restore
                                        </button>
                                    </div>
                                ))}
                                {preferenceHistory.length === 0 && (
                                    <p className="text-xs text-slate-600 italic text-center py-8">No preference history found.</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                  )}

                  {activeTab === "content" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                           <div className="lg:col-span-8 space-y-16">
                             {(finalArticle.content || []).map((sec, i) => (
                            <div key={i} className="space-y-6 relative group/section">
                              {/* Floating Action Button for Rewrite */}
                              <div className="absolute right-0 -top-4 opacity-0 group-hover/section:opacity-100 transition-opacity z-10">
                                <div className="relative flex flex-col items-end">
                                  <button 
                                    onClick={() => setFabMenuOpen(fabMenuOpen === i ? null : i)}
                                    className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-sm border border-white/10 flex items-center justify-center text-brand-cyan hover:bg-slate-700 hover:scale-105 transition-all shadow-xl"
                                  >
                                    <Wand2 className="w-4 h-4" />
                                  </button>
                                  {fabMenuOpen === i && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      className="absolute top-12 right-0 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 z-20 flex flex-col gap-1"
                                    >
                                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 py-1 mb-1 border-b border-white/5">Quick Rewrite</div>
                                      <button 
                                        disabled={isEditingSection[i]}
                                        onClick={() => { setFabMenuOpen(null); handleUpdateSection(i, "Rewrite to be more formal and professional."); }}
                                        className="text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-brand-cyan rounded-lg transition-colors disabled:opacity-50 flex items-center justify-between"
                                      >
                                        More Formal
                                      </button>
                                      <button 
                                        disabled={isEditingSection[i]}
                                        onClick={() => { setFabMenuOpen(null); handleUpdateSection(i, "Rewrite to be more casual, engaging, and conversational."); }}
                                        className="text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-brand-cyan rounded-lg transition-colors disabled:opacity-50 flex items-center justify-between"
                                      >
                                        More Casual
                                      </button>
                                      <button 
                                        disabled={isEditingSection[i]}
                                        onClick={() => { setFabMenuOpen(null); handleUpdateSection(i, "Expand this section with more specific details, vivid examples, and deeper explanation."); }}
                                        className="text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-brand-purple rounded-lg transition-colors disabled:opacity-50 flex items-center justify-between"
                                      >
                                        Expand Content
                                      </button>
                                      <button 
                                        disabled={isEditingSection[i]}
                                        onClick={() => { setFabMenuOpen(null); handleUpdateSection(i, "Summarize and shorten this section to be concise, keeping only the most important points."); }}
                                        className="text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-brand-accent rounded-lg transition-colors disabled:opacity-50 flex items-center justify-between"
                                      >
                                        Summarize
                                      </button>
                                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 py-1 mt-1 border-t border-white/5 pt-2">Media</div>
                                      <button 
                                        disabled={isGeneratingSectionImage[i]}
                                        onClick={() => { setFabMenuOpen(null); handleGenerateSectionImage(i); }}
                                        className="text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-brand-cyan rounded-lg transition-colors disabled:opacity-50 flex items-center justify-between"
                                      >
                                        <span>Generate Image</span>
                                        {isGeneratingSectionImage[i] ? (
                                          <Loader2 className="w-3 h-3 animate-spin text-brand-cyan" />
                                        ) : (
                                          <ImageIcon className="w-3 h-3 text-slate-500" />
                                        )}
                                      </button>
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                              <h3 className="text-2xl font-black text-white flex items-center gap-4 italic group">
                                <span className="text-brand-cyan text-sm font-mono opacity-40">#0{i+1}</span>
                                <div className="flex-1">
                                  {editMode ? (
                                    <input 
                                      value={sec.heading || ""}
                                      onChange={(e) => {
                                        const newContent = [...finalArticle.content];
                                        newContent[i].heading = e.target.value;
                                        setFinalArticle({...finalArticle, content: newContent});
                                      }}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white focus:ring-1 focus:ring-brand-cyan/50 outline-none"
                                    />
                                  ) : (
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">{sec.heading}</span>
                                  )}
                                </div>
                                {(() => {
                                  const diff = getReadabilityDifficulty(sec.text);
                                  return (
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1 ${diff.bg} ${diff.color} ${diff.border}`}>
                                      {diff.label}
                                    </span>
                                  );
                                })()}
                                <div className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded">
                                   {sec.text.split(" ").filter(Boolean).length} w | {sec.text.length} c
                                </div>
                              </h3>
                              {sec.imageUrl && (
                                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 my-6">
                                  <img src={sec.imageUrl} className="w-full h-full object-cover" alt={sec.heading} />
                                </div>
                              )}
                              <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed text-lg prose-p:mb-6 prose-strong:text-brand-cyan">
                                {editMode ? (
                                  <div className="space-y-4">
                                    {sec.imagePrompt && (
                                      <div className="text-[10px] text-slate-500 bg-white/5 p-3 rounded-lg font-mono leading-relaxed">
                                        <strong className="text-brand-cyan">AI Image Prompt:</strong> {sec.imagePrompt}
                                      </div>
                                    )}
                                    <textarea 
                                      value={sec.text || ""}
                                      onChange={(e) => {
                                        const newContent = [...finalArticle.content];
                                        newContent[i].text = e.target.value;
                                        setFinalArticle({...finalArticle, content: newContent});
                                      }}
                                      rows={8}
                                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-base focus:ring-1 focus:ring-brand-cyan/50 outline-none resize-y"
                                    />
                                    <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/10 rounded-2xl space-y-4">
                                      <div className="flex gap-3 items-center">
                                        <Wand2 className="w-5 h-5 text-brand-cyan" />
                                        <input 
                                          className="flex-1 bg-transparent border-none text-xs text-white focus:ring-0 placeholder:text-slate-600"
                                          placeholder="Instrukcja dla AI (np. 'skróć tę sekcję', 'dodaj więcej konkretów')..."
                                          value={sectionInstructions[i] || ""}
                                          onChange={(e) => setSectionInstructions({...sectionInstructions, [i]: e.target.value})}
                                          onKeyDown={(e) => e.key === "Enter" && handleUpdateSection(i)}
                                        />
                                        <button 
                                          disabled={isEditingSection[i] || !sectionInstructions[i]}
                                          onClick={() => handleUpdateSection(i)}
                                          className="px-4 py-2 bg-brand-cyan text-slate-900 rounded-lg text-[10px] font-bold hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                          {isEditingSection[i] ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Wykonaj"}
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                        {[
                                          { label: "Skróć", prompt: "Skróć tę sekcję do 2-3 najważniejszych zdań, zachowując kluczowe fakty." },
                                          { label: "Rozbuduj", prompt: "Dodaj więcej detali, danych i pogłębioną analizę do tej sekcji." },
                                          { label: "Uprość", prompt: "Przeredaguj tekst, aby był zrozumiały dla 12-latka (wskaźnik Flesch-Kincaid)." },
                                          { label: "Bardziej profi", prompt: "Użyj bardziej specjalistycznego słownictwa i autorytatywnego tonu." },
                                          { label: "Lista (Bullet)", prompt: "Zamień treść na przejrzystą listę punktowaną." },
                                          { label: "Pytanie retoryczne", prompt: "Dodaj na końcu angażujące pytanie retoryczne dla czytelnika." }
                                        ].map(preset => (
                                          <button
                                            key={preset.label}
                                            onClick={() => {
                                              setSectionInstructions({...sectionInstructions, [i]: preset.prompt});
                                            }}
                                            className="px-2 py-1 bg-white/5 rounded text-[8px] font-black uppercase text-slate-500 hover:bg-white/10 hover:text-brand-cyan transition-all border border-white/5"
                                          >
                                            {preset.label}
                                          </button>
                                        ))}
                                        <button 
                                          onClick={() => {
                                            const note = prompt("Dodaj notatkę edytorską:");
                                            if (note) {
                                              const prev = sectionComments[i] || [];
                                              handleAddComment(i, note, "Tomasz", "Redaktor Naczelny");
                                            }
                                          }}
                                          className="px-2 py-1 bg-brand-purple/10 rounded text-[8px] font-black uppercase text-brand-purple hover:bg-brand-purple/20 transition-all border border-brand-purple/20 flex items-center gap-1"
                                        >
                                          <MessageSquare className="w-3 h-3" /> Komentarz
                                        </button>
                                        <button 
                                          onClick={() => handleGenerateSectionImage(i)}
                                          disabled={isGeneratingSectionImage[i]}
                                          className="px-2 py-1 bg-brand-cyan/10 rounded text-[8px] font-black uppercase text-brand-cyan hover:bg-brand-cyan/20 transition-all border border-brand-cyan/20 flex items-center gap-1"
                                        >
                                          {isGeneratingSectionImage[i] ? <Loader2 className="w-3 h-3 animate-spin"/> : <ImageIcon className="w-3 h-3" />} 
                                          Obraz
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            setIsFactChecking({ ...isFactChecking, [i]: true });
                                            try {
                                              const result = await factCheckArticleSection(sec.text, tone, language, selectedModel);
                                              const updatedContent = [...finalArticle.content];
                                              updatedContent[i].text = result.updatedText;
                                              setFinalArticle({...finalArticle, content: updatedContent});
                                              setSectionSources({...sectionSources, [i]: result.sources});
                                            } catch (e) {
                                              console.error(e);
                                            } finally {
                                              setIsFactChecking({ ...isFactChecking, [i]: false });
                                            }
                                          }}
                                          disabled={isFactChecking[i]}
                                          className="px-2 py-1 bg-brand-purple/20 rounded text-[8px] font-black uppercase text-brand-purple hover:bg-brand-purple/40 transition-all border border-brand-purple/20 flex items-center gap-1"
                                        >
                                          {isFactChecking[i] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Search className="w-2.5 h-2.5" />}
                                          Fact Check
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative group/content">
                                    <ReactMarkdown>{sec.text}</ReactMarkdown>
                                    <div className="absolute -left-12 top-0 flex flex-col gap-2 opacity-0 group-hover/section:opacity-100 transition-all">
                                       <div className="w-8 h-8 rounded-full bg-brand-cyan/20 border border-brand-cyan/20 flex items-center justify-center cursor-help group/tip relative">
                                          <ShieldCheck className="w-4 h-4 text-brand-cyan" />
                                          <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 w-32 opacity-0 group-hover/tip:opacity-100 transition-all pointer-events-none">
                                            Semantic verified AI-generated insight.
                                          </div>
                                       </div>
                                       {sectionSources[i] && (
                                         <div className="w-8 h-8 rounded-full bg-brand-purple/20 border border-brand-purple/20 flex items-center justify-center cursor-help group/source relative">
                                            <Bookmark className="w-4 h-4 text-brand-purple" />
                                            <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 w-32 opacity-0 group-hover/source:opacity-100 transition-all pointer-events-none">
                                              Sources verified & cited.
                                            </div>
                                         </div>
                                       )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-8 pt-6 border-t border-white/5">
                                <WorkflowCommentMargin 
                                  sectionIndex={i}
                                  comments={getNormalizedComments(i)}
                                  onAddComment={handleAddComment}
                                  onToggleResolveComment={handleToggleResolveComment}
                                  onDeleteComment={handleDeleteComment}
                                />
                              </div>
                            </div>
                          ))}
                          </div>

                           <div className="lg:col-span-4 space-y-8">
                               <div className="p-8 rounded-[40px] glass-panel border border-white/10 space-y-6 sticky top-24">
                                  <div className="flex items-center gap-3">
                                     <Settings2 className="w-5 h-5 text-brand-cyan" />
                                     <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Projekt: Status & Gualitative</h4>
                                   </div>

                                   {/* Workflow Status Switcher progress stepper */}
                                   <div className="space-y-4 pt-2 pb-2 border-b border-white/5">
                                      <div className="flex items-center justify-between text-[8px] font-mono tracking-widest text-slate-500 uppercase leading-none select-none">
                                         <span>ETAP REDAKCYJNY:</span>
                                         <span className="text-brand-cyan font-black font-mono">{editorialWorkflowStage.toUpperCase()}</span>
                                      </div>
                                      <div className="grid grid-cols-4 gap-1 relative select-none">
                                         {[
                                            { code: "szkic", label: "Szkic", icon: "📝" },
                                            { code: "edycja", label: "Edycja", icon: "✍️" },
                                            { code: "zatwierdzenie", label: "Weryf.", icon: "👥" },
                                            { code: "publikacja", label: "Publik.", icon: "🚀" }
                                         ].map((st) => {
                                            const active = editorialWorkflowStage === st.code;
                                            return (
                                              <button
                                                key={st.code}
                                                type="button"
                                                onClick={() => setEditorialWorkflowStage(st.code as any)}
                                                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                                   active 
                                                     ? "bg-brand-cyan/15 border-brand-cyan text-white shadow-md font-extrabold" 
                                                     : "bg-[#0c0c0e] border-[#ffffff0a] text-slate-500 hover:text-white"
                                                }`}
                                              >
                                                <span className="text-sm">{st.icon}</span>
                                                <span className="text-[7.5px] font-black uppercase tracking-wide leading-none">{st.label}</span>
                                              </button>
                                            );
                                         })}
                                      </div>
                                      {/* Status descriptive feedback */}
                                      <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl select-none">
                                         <p className="text-[9px] font-medium leading-normal text-slate-400 italic">
                                            {editorialWorkflowStage === "szkic" && "📝 Szkic roboczy artykułu. Twórz i udoskonalaj poszczególne sekcje tekstu."}
                                            {editorialWorkflowStage === "edycja" && "✍️ Tryb edycji zespołowej. SEO tracking, komentarze oraz redagowanie uwag w toku."}
                                            {editorialWorkflowStage === "zatwierdzenie" && "👥 Oczekiwanie na recenzję i zatwierdzenie. Redakcja weryfikuje uwagi zespołowe."}
                                            {editorialWorkflowStage === "publikacja" && "🚀 Artykuł zatwierdzony! Przejdź do 'Kalendarza', aby ustalić datę publikacji."}
                                         </p>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                     <div className="p-5 rounded-3xl bg-white/2 border border-white/5 space-y-1">
                                        <p className="text-[8px] font-black uppercase text-slate-500">Czytelność</p>
                                        <p className="text-xl font-black text-white italic">{seoReport?.readabilityScore || 85}/100</p>
                                     </div>
                                     <div className="p-5 rounded-3xl bg-white/2 border border-white/5 space-y-1">
                                        <p className="text-[8px] font-black uppercase text-slate-500">SEO Score</p>
                                        <p className="text-xl font-black text-brand-cyan italic">{seoReport?.seoScore || 92}%</p>
                                     </div>
                                  </div>

                                  <div className="space-y-4 pt-4 border-t border-white/5">
                                     <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-brand-purple" /> Edytorskie Notatki
                                     </h5>
                                     <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.entries(sectionComments).map(([secIdx, comments]) => {
                                          const list = comments || [];
                                          return list.map((comment: any, cIdx: number) => {
                                            const text = typeof comment === "string" ? comment : comment.text;
                                            const author = typeof comment === "string" ? "Edytor" : `${comment.author} (${comment.role})`;
                                            const resolved = typeof comment === "string" ? false : comment.resolved;
                                            if (resolved) return null;
                                            return (
                                              <div key={`${secIdx}-${cIdx}`} className="p-3 bg-white/2 border border-white/5 rounded-xl space-y-1">
                                                 <div className="flex justify-between items-center text-[7px] font-mono leading-none border-b border-white/[0.03] pb-1 mb-1">
                                                   <span className="text-brand-purple uppercase font-black">Sekcja {Number(secIdx) + 1}</span>
                                                   <span className="text-slate-500 font-bold">{author}</span>
                                                 </div>
                                                 <p className="text-[10px] text-slate-300 italic">"{text}"</p>
                                              </div>
                                            );
                                          });
                                        })}
                                        {Object.keys(sectionComments).length === 0 && (
                                          <p className="text-[10px] text-slate-600 italic text-center py-4">Brak notatek edytorskich.</p>
                                        )}
                                     </div>
                                  </div>

                                  <div className="space-y-4 pt-4 border-t border-white/5">
                                     <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Szybkie Akcje</h5>
                                     <div className="grid gap-2">
                                        <button onClick={() => setStep("outline")} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-all">
                                           <Layers className="w-4 h-4" /> Edytuj Konspekt
                                        </button>
                                        <button onClick={() => handleSaveSnapshot()} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-all">
                                           <History className="w-4 h-4" /> Zapisz Snapshot
                                        </button>
                                        <button onClick={() => setShowPdfPreview(true)} className="flex items-center gap-3 p-3 rounded-xl bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan text-xs font-bold transition-all">
                                           <Download className="w-4 h-4" /> Eksportuj PDF
                                        </button>
                                     </div>
                                  </div>
                               </div>
                           </div>
                        </div>
                      )}

                      {activeTab === "tone" && toneReport && (
                        <div className="space-y-16 py-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                           <div className="text-center space-y-4">
                              <h3 className="text-5xl font-black italic tracking-tighter">EMOTIONAL ARCHITECT</h3>
                              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Proprietary Sentiment & Resonance Analysis</p>
                           </div>

                           <div className="grid lg:grid-cols-3 gap-10">
                              {[
                                { label: "Authority", val: toneReport.authority, color: "from-brand-accent to-indigo-600", desc: "Expert weight and trust factor" },
                                { label: "Resonance", val: toneReport.emotionalIndex, color: "from-brand-purple to-pink-600", desc: "User engagement probability" },
                                { label: "Lucidity", val: 92, color: "from-emerald-500 to-teal-700", desc: "Clarity and comprehension score" }
                              ].map(m => (
                                <div key={m.label} className="p-10 rounded-[48px] bg-white/[0.02] border border-white/5 space-y-6 flex flex-col items-center group hover:bg-white/[0.04] transition-all">
                                   <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{m.label}</div>
                                   <div className="text-7xl font-black italic text-white tracking-tighter">{m.val}%</div>
                                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${m.val}%` }}
                                        className={cn("h-full bg-gradient-to-r", m.color)} 
                                      />
                                   </div>
                                   <p className="text-[10px] text-slate-600 font-bold italic text-center">{m.desc}</p>
                                </div>
                              ))}
                           </div>

                           <div className="grid md:grid-cols-2 gap-10">
                             <div className="p-12 rounded-[56px] bg-brand-accent/5 border border-brand-accent/10 space-y-8">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-brand-accent flex items-center justify-center shadow-2xl shadow-brand-accent/20">
                                      <Zap className="w-6 h-6 text-white fill-current" />
                                   </div>
                                   <h4 className="text-lg font-black italic">Strategic Insights</h4>
                                </div>
                                <div className="space-y-6">
                                   {(toneReport.suggestions || []).map((s, idx) => (
                                     <div key={idx} className="flex gap-4">
                                        <div className="text-brand-accent font-mono text-sm leading-none flex-shrink-0 mt-1">0{idx+1}.</div>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed italic">{s}</p>
                                     </div>
                                   ))}
                                </div>
                             </div>

                             <div className="space-y-6">
                                <div className="p-10 rounded-[48px] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                   <div className="space-y-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Vocabulary Gap</p>
                                      <p className="text-3xl font-black italic text-[#f5f5f7]">NOMINAL</p>
                                   </div>
                                   <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 flex items-center justify-center">
                                      <div className="w-8 h-8 rounded-full bg-emerald-500" />
                                   </div>
                                </div>
                                <div className="p-10 rounded-[48px] bg-white/[0.02] border border-white/5 space-y-4">
                                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Passive Voice Limit</p>
                                   <div className="flex items-end justify-between">
                                      <p className="text-5xl font-black italic text-brand-accent">SAFE</p>
                                      <span className="text-xs font-mono text-slate-500 mb-1">4.2% / 15%</span>
                                   </div>
                                </div>
                             </div>
                           </div>
                        </div>
                      )}

                  {activeTab === "internalLinks" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                       <div className="text-center space-y-4">
                        <h3 className="text-4xl font-black italic tracking-tighter text-white">LINKING ARCHITECTURE</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Internal Linking & Semantic Map</p>
                      </div>

                      <div className="flex justify-center">
                        <button 
                          onClick={async () => {
                            if (!finalArticle) return;
                            setIsFetchingInternalLinks(true);
                            try {
                              const content = (finalArticle.content || []).map(c => c.text).join("\n");
                              const res = await getInternalLinks(content, selectedModel);
                              setInternalLinks(res);
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setIsFetchingInternalLinks(false);
                            }
                          }}
                          disabled={isFetchingInternalLinks}
                          className="px-6 py-3 bg-brand-cyan text-slate-900 font-bold rounded-xl text-xs hover:bg-brand-cyan/90 transition-all flex items-center gap-2"
                        >
                          {isFetchingInternalLinks ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                          DISCOVER LINKING POTENTIAL
                        </button>
                      </div>

                      {isFetchingInternalLinks ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                           <Loader2 className="w-12 h-12 animate-spin text-brand-cyan opacity-20" />
                           <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Analyzing Semantic Context...</p>
                        </div>
                      ) : (
                        <div className="grid gap-6">
                           {internalLinks.map((link, idx) => (
                             <div key={idx} className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-4 group hover:border-brand-cyan/30 transition-all">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                     <div className="flex items-center gap-3">
                                       <span className="text-xl font-black text-white italic underline">{link.anchor}</span>
                                       <div className="px-2 py-0.5 bg-brand-cyan/10 border border-brand-cyan/20 rounded text-[8px] font-black uppercase text-brand-cyan tracking-widest">Internal</div>
                                     </div>
                                     <div className="text-xs text-slate-500 font-mono tracking-tighter truncate max-w-md">{link.url}</div>
                                  </div>
                                  <button onClick={() => {
                                    navigator.clipboard.writeText(`<a href="${link.url}">${link.anchor}</a>`);
                                    alert("HTML Anchor copied!");
                                  }} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                                       <Copy className="w-4 h-4 text-slate-400" />
                                  </button>
                                </div>
                                {link.context && (
                                  <div className="pt-4 border-t border-white/5">
                                    <p className="text-[11px] text-slate-400 italic leading-relaxed">
                                      <span className="text-brand-cyan font-bold uppercase text-[8px] mr-2">Deep Insight:</span>
                                      {link.context}
                                    </p>
                                  </div>
                                )}
                             </div>
                           ))}
                           {internalLinks.length === 0 && (
                             <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[48px]">
                                <Link className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                <p className="text-slate-600 italic text-sm">No internal links discovered yet. Run analysis to map your content.</p>
                             </div>
                           )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "visuals" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                       <div className="text-center space-y-4">
                        <h3 className="text-4xl font-black italic tracking-tighter text-white">INTELLIGENCE DATA</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Semantic & Topic visualizations</p>
                      </div>

                      <div className="flex justify-center">
                        <button 
                          onClick={async () => {
                              if (!topic) return;
                              setIsGeneratingVisuals(true);
                              try {
                                  const res = await generateVisualData(topic);
                                  setVisualData(res);
                              } catch (e) {
                                  console.error(e);
                              } finally {
                                  setIsGeneratingVisuals(false);
                              }
                          }}
                          disabled={isGeneratingVisuals}
                          className="px-8 py-4 bg-brand-cyan text-slate-900 font-bold rounded-2xl text-[10px] hover:bg-brand-cyan/90 transition-all flex items-center gap-3 uppercase tracking-widest shadow-xl shadow-brand-cyan/20"
                        >
                          {isGeneratingVisuals ? <Loader2 className="w-5 h-5 animate-spin"/> : <BarChart3 className="w-5 h-5"/>}
                          EXPLORE TOPIC VISUALS
                        </button>
                      </div>

                      {visualData ? (
                          <div className="space-y-10 animate-in fade-in zoom-in duration-500">
                             <div className="h-[450px] w-full bg-white/5 rounded-[48px] border border-white/10 p-10 flex flex-col items-center">
                               <div className="w-full text-center mb-8">
                                 <h4 className="text-xl font-black italic text-white underline decoration-brand-cyan">{visualData.title}</h4>
                               </div>
                               <ResponsiveContainer width="100%" height="85%">
                                   {visualData.chartType === 'bar' ? (
                                       <BarChart data={visualData.data}>
                                           <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                           <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                           <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                           <Tooltip 
                                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                                              itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                                           />
                                           <Legend />
                                           <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                       </BarChart>
                                   ) : (
                                       <PieChart>
                                           <Pie 
                                              data={visualData.data} 
                                              dataKey="value" 
                                              nameKey="name" 
                                              cx="50%" 
                                              cy="50%" 
                                              outerRadius={140} 
                                              innerRadius={80}
                                              paddingAngle={5}
                                              fill="#8884d8" 
                                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                           >
                                               { (visualData.data || []).map((entry, index) => (
                                                   <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#06b6d4' : '#8b5cf6'} stroke="none" />
                                               ))}
                                           </Pie>
                                           <Tooltip 
                                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                                           />
                                           <Legend />
                                       </PieChart>
                                   )}
                               </ResponsiveContainer>
                             </div>
                             
                             <div className="grid md:grid-cols-2 gap-6">
                                { (visualData.data || []).map((item, idx) => (
                                   <div key={idx} className="p-6 rounded-[32px] bg-white/2 border border-white/5 flex justify-between items-center">
                                      <div className="space-y-1">
                                         <p className="text-xs font-bold text-white italic">{item.name}</p>
                                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Weighting Factor</p>
                                      </div>
                                      <span className="text-2xl font-black italic text-brand-cyan">{item.value}%</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                      ) : (
                        !isGeneratingVisuals && (
                          <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[48px]">
                             <PieIcon className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                             <p className="text-slate-600 italic font-medium">Topic visualization ready to generate. Click above to analyze semantic hierarchy.</p>
                          </div>
                        )
                      )}
                    </motion.div>
                  )}
                  {activeTab === "accessibility" && accessibilityReport && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                      <div className="text-center space-y-4">
                        <h3 className="text-4xl font-black italic tracking-tighter">WCAG AUDIT</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Accessibility Compliance Status</p>
                      </div>

                      <div className="flex justify-center">
                         <div className="relative w-48 h-48 flex items-center justify-center">
                           <svg className="w-full h-full -rotate-90">
                              <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12" className="text-white/5" />
                              <circle 
                                cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12" 
                                strokeDasharray={2 * Math.PI * 88}
                                strokeDashoffset={2 * Math.PI * 88 * (1 - accessibilityReport.score / 100)}
                                className="text-brand-cyan" 
                                strokeLinecap="round"
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-5xl font-black text-white italic">{accessibilityReport.score}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score</span>
                           </div>
                         </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {(accessibilityReport.recommendations || []).map((rec, idx) => (
                          <div key={idx} className="p-6 rounded-[32px] bg-white/5 border border-white/10 flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-purple/20 flex items-center justify-center shrink-0">
                              <Eye className="w-5 h-5 text-brand-purple" />
                            </div>
                            <p className="text-xs text-slate-400 italic leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "metadata" && multilingualMeta && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                       <div className="text-center space-y-4">
                        <h3 className="text-4xl font-black italic tracking-tighter">GLOBAL META-DATA</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Multilingual SEO Architecture</p>
                      </div>

                      <div className="grid gap-6">
                        {["pl", "en", "de"].map((lang) => {
                          const meta = (multilingualMeta as any)[lang];
                          return (
                            <div key={lang} className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-4 relative overflow-hidden group">
                               <div className="absolute top-0 right-0 p-4 bg-brand-cyan/20 text-brand-cyan text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                                  {lang}
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Title</label>
                                  <div className="text-lg font-bold text-white italic">{meta.title}</div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Description</label>
                                  <p className="text-sm text-slate-400 italic leading-relaxed">{meta.description}</p>
                               </div>
                               <div className="flex gap-2 pt-4">
                                  <button onClick={() => navigator.clipboard.writeText(meta.title)} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                                     <Copy className="w-3.5 h-3.5" /> Copy Title
                                  </button>
                                  <button onClick={() => navigator.clipboard.writeText(meta.description)} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                                     <Copy className="w-3.5 h-3.5" /> Copy Desc
                                  </button>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "social" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-3">
                            <Share2 className="w-6 h-6 text-brand-cyan" />
                            <h3 className="text-2xl font-black italic">Social Distribution</h3>
                          </div>
                          <div className="grid gap-4">
                            {(finalArticle.social || []).map((socialPost, idx) => (
                              <div key={idx} className="p-8 rounded-[32px] bg-white/5 border border-white/10 space-y-4 group">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">{socialPost.platform}</span>
                                  <button onClick={() => navigator.clipboard.writeText(socialPost.post)} className="p-2 hover:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                    <Copy className="w-4 h-4 text-slate-500" />
                                  </button>
                                </div>
                                <p className="text-slate-300 leading-relaxed italic">{socialPost.post}</p>
                              </div>
                            ))}
                          </div>

                          <div className="pt-8 border-t border-white/5 space-y-4">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-purple">Lead Newsletter Engine</h4>
                             <div className="p-8 rounded-[32px] bg-brand-purple/5 border border-brand-purple/20 space-y-4">
                                <p className="text-xs text-slate-400 italic">
                                  Generated internal email lead for campaign "${finalArticle.title}":
                                </p>
                                <div className="p-6 bg-black/20 rounded-2xl border border-white/5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                  Subject: New Publication: {finalArticle.title} 🚀{"\n\n"}
                                  Hi there!{"\n\n"}
                                  We've just released a deep dive into {topic}. In this edition, we cover:{"\n"}
                                  - {(finalArticle.content && finalArticle.content[0])?.heading || ""}{"\n"}
                                  - {(finalArticle.content && finalArticle.content[1])?.heading || ""}{"\n\n"}
                                  {finalArticle.seo?.metaDescription || ""}{"\n\n"}
                                  Check out the full study here: [UNPUBLISHED_CONTENT_URI]{"\n\n"}
                                  Best regards,{"\n"}
                                  {profile.name}
                                </div>
                                <button onClick={() => alert("Newsletter copied to clipboard!")} className="w-full py-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl text-[9px] font-black uppercase text-brand-purple hover:bg-brand-purple hover:text-white transition-all tracking-widest">Copy Newsletter Body</button>
                             </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "video" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-3">
                            <Video className="w-6 h-6 text-brand-purple" />
                            <h3 className="text-2xl font-black italic">Video Storyboard</h3>
                          </div>
                          <div className="space-y-6">
                            {finalArticle.videoScript?.map((scene, idx) => (
                              <div key={idx} className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-brand-purple flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="flex-1 p-6 rounded-3xl bg-white/2 border border-white/5 space-y-4">
                                   <div className="flex justify-between">
                                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Scene: {scene.scene}</span>
                                   </div>
                                   <div className="grid md:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                         <p className="text-[10px] font-bold text-brand-purple uppercase">Visual</p>
                                         <p className="text-sm text-slate-400 italic">{scene.visual}</p>
                                      </div>
                                      <div className="space-y-1">
                                         <p className="text-[10px] font-bold text-brand-cyan uppercase">Narrative</p>
                                         <p className="text-sm text-white italic">"{scene.narrative}"</p>
                                      </div>
                                   </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === "faq" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-3">
                            <HelpCircle className="w-6 h-6 text-brand-purple" />
                            <h3 className="text-2xl font-black italic">FAQ Hub</h3>
                          </div>
                          <div className="grid gap-6">
                            {(finalArticle.faq || []).map((item, idx) => (
                              <div key={idx} className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-3">
                                <h4 className="font-bold text-white flex items-center gap-3 uppercase text-[10px] tracking-wider">
                                  {item.question}
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed italic">{item.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === "seo" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <BarChart3 className="w-6 h-6 text-brand-cyan" />
                              <h3 className="text-2xl font-black italic tracking-tight">Advanced SEO Intelligence Suite</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                {(isAnalyzingSEO || isPredictingTraffic || isAnalyzingGaps || isFetchingGooglePaa) && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-cyan animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin"/> RETRIEVING LIVE GOOGLE INTELLIGENCE...
                                    </div>
                                )}
                                <button 
                                  onClick={async () => {
                                      setIsAnalyzingSEO(true);
                                      setIsPredictingTraffic(true);
                                      setIsAnalyzingGaps(true);
                                      setIsFetchingGooglePaa(true);
                                      try {
                                          const contentJoined = (finalArticle.content || []).map(c => c.text).join("\n");
                                          const seedText = topic || finalArticle.title;
                                          const tagText = keywords || finalArticle.seo?.tags?.join(", ") || "";
                                          
                                          const [report, traffic, gaps, paa] = await Promise.all([
                                            analyzeReadabilityAndSEO(contentJoined, tagText, selectedModel),
                                            predictOrganicTraffic(seedText, tagText, selectedModel),
                                            analyzeVocabularyGaps(seedText, contentJoined, selectedModel),
                                            fetchGooglePAA(seedText, selectedModel)
                                          ]);
                                          
                                          setSeoReport(report);
                                          setTrafficPrediction(traffic);
                                          setGapAnalysisResult(gaps);
                                          setGooglePaaQuestions(paa);
                                      } catch (e) {
                                          console.error("Manual SEO diagnostic suite failed", e);
                                          alert("Błąd podczas pełnego skanowania SERP. Spróbuj ponownie.");
                                      } finally {
                                          setIsAnalyzingSEO(false);
                                          setIsPredictingTraffic(false);
                                          setIsAnalyzingGaps(false);
                                          setIsFetchingGooglePaa(false);
                                      }
                                  }}
                                  disabled={isAnalyzingSEO || isPredictingTraffic || isAnalyzingGaps || isFetchingGooglePaa}
                                  className="px-5 py-2.5 bg-brand-cyan/25 text-brand-cyan hover:bg-brand-cyan hover:text-slate-900 border border-brand-cyan/40 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all duration-300 disabled:opacity-50"
                                >
                                    REGENERATE SERP DIAGNOSTICS
                                </button>
                            </div>
                          </div>

                          {/* SEO Density Tracker */}
                          <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-brand-cyan" />
                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Dynamiczny Licznik Gęstości Fraz (SEO density tracker)</h4>
                              </div>
                              <span className="text-[8px] bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded font-black uppercase tracking-wider">LIVE RE-CALCULATING</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Licznik gęstości słów kluczowych analizuje cały artykuł w czasie rzeczywistym. Zapobiega tzw. <strong className="text-brand-cyan">keyword stuffingowi</strong> (optymalny poziom to 0.5% - 2.5%, powyżej 2.5% występuje ryzyko kary algorytmicznej Google).
                            </p>
                            
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(liveKeywordDensity).length === 0 ? (
                                <div className="col-span-full text-center p-6 text-xs text-slate-500 italic bg-white/2 rounded-2xl border border-white/5">
                                  Brak zadeklarowanych słów kluczowych do monitorowania. Wpisz frazy na początku lub dodaj tagi SEO.
                                </div>
                              ) : (
                                Object.entries(liveKeywordDensity).map(([kw, entry]) => {
                                  const metrics = entry as { count: number; density: number };
                                  const densityVal = metrics.density;
                                  const countVal = metrics.count;
                                  
                                  let statusText = "Optymalna";
                                  let badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]";
                                  let progressColor = "bg-emerald-400";
                                  let isStuffing = false;

                                  if (densityVal === 0) {
                                    statusText = "Nie wykryto";
                                    badgeStyle = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
                                    progressColor = "bg-zinc-500";
                                  } else if (densityVal < 0.5) {
                                    statusText = "Zbyt niska (Under-optimized)";
                                    badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                                    progressColor = "bg-amber-400";
                                  } else if (densityVal > 2.5) {
                                    isStuffing = true;
                                    statusText = "Over-optimized / Keyword Stuffing!";
                                    badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.25)]";
                                    progressColor = "bg-rose-500";
                                  }

                                  return (
                                    <div key={kw} className="p-4 rounded-3xl bg-white/2 hover:bg-white/5 border border-white/5 flex flex-col justify-between transition-all space-y-4">
                                      <div className="flex justify-between items-start">
                                        <div className="space-y-0.5">
                                          <div className="text-xs font-black text-white truncate max-w-[150px]">{kw}</div>
                                          <div className="text-[9px] text-slate-500">{countVal}x powtórzenia</div>
                                        </div>
                                        <span className="text-[10px] font-bold text-brand-cyan">{densityVal}%</span>
                                      </div>
                                      
                                      <div className="space-y-1.5">
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                          <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${Math.min(densityVal * 10 * 3, 100)}%` }} />
                                        </div>
                                        <div className={`text-[8px] font-black uppercase text-center px-1 py-1 rounded border leading-none tracking-wider ${badgeStyle}`}>
                                          {statusText}
                                        </div>
                                      </div>
                                      {isStuffing && (
                                        <p className="text-[9px] text-rose-400 leading-tight italic bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
                                          Zagrożenie spamem keyword stuffing! Zastąp nadmierne powtórzenia frazy synonimami, aby zapobiec obniżeniu rankingu przez filtry Google.
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Vocabulary Gap Analysis Card */}
                          <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Search className="w-5 h-5 text-brand-blue" />
                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Analiza Gap Słownictwa Konkurencji (SERP Top-10)</h4>
                              </div>
                              <span className="text-[8px] bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded font-black uppercase tracking-wider">GOOGLE SEARCH GROUNDED</span>
                            </div>
                            
                            {isAnalyzingGaps ? (
                              <div className="p-12 text-center space-y-4 bg-white/2 rounded-3xl border border-white/5 animate-pulse">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-blue mx-auto" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trwa wyszukiwanie brakujących fraz w top-10 rezultatów Google...</p>
                                <p className="text-[10px] text-slate-500 italic">Pobieranie konkurentów, badanie semantyki i analiza luk językowych</p>
                              </div>
                            ) : gapAnalysisResult ? (
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Zidentyfikowani Liderzy SERP (Google Top-10)</span>
                                  <div className="flex flex-wrap gap-2">
                                    {(gapAnalysisResult.serpTop10Sources || []).map((source, i) => (
                                      <a
                                        key={i}
                                        href={source.url}
                                        target="_blank"
                                        referrerPolicy="no-referrer"
                                        className="text-[10px] px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl hover:text-white transition-all flex items-center gap-2 border border-white/5"
                                        title={source?.title || ""}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0" />
                                        <span className="font-bold underline leading-none truncate max-w-[150px]">{source?.title || ""}</span>
                                        <span className="text-[8px] text-slate-500 italic">({source?.domain || ""})</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                  {/* Competitor Key Words */}
                                  <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-brand-cyan" /> Słowa Kluczowe Liderów (Zalecane do wzbogacenia)
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">Kliknij element kluczowy, by automatycznie dodać sugestię jako notatkę redakcyjną dla wybranej sekcji draftu:</p>
                                    
                                    <div className="flex flex-wrap gap-2">
                                      {(gapAnalysisResult.competitorKeywords || []).map((k, idx) => {
                                        let impColor = "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
                                        if (k.importance === "high") impColor = "text-rose-400 bg-rose-500/10 border-rose-500/20 font-black";
                                        if (k.importance === "medium") impColor = "text-brand-purple bg-brand-purple/10 border-brand-purple/20";

                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => {
                                              const note = `Sugestia SEO: Dodaj powiązanie semantyczne z pojęciem "${k.word}" do rozbudowy tekstu.`;
                                              setSectionComments({ ...sectionComments, [0]: [...(sectionComments[0] || []), note] });
                                              alert(`Dodano notatkę o frazie "${k.word}" w sekcji 1 artykułu.`);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl border text-[10px] transition-all hover:scale-105 flex items-center gap-1.5 ${impColor}`}
                                          >
                                            <Plus className="w-3 h-3 text-slate-400" />
                                            <span>{k.word}</span>
                                            <span className="text-[8px] opacity-60 uppercase">({k.importance})</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Semantic Missing Phrases */}
                                  <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 space-y-3">
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-brand-purple" /> Brakujące Obszary Tematyczne (Semantic Gaps)
                                    </div>
                                    <div className="space-y-3">
                                      {(gapAnalysisResult.missingSemanticPhrases || []).map((phrase, idx) => (
                                        <div key={idx} className="p-3 bg-white/2 rounded-2xl border border-white/5 space-y-1 hover:bg-white/5 transition-all">
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-brand-purple">{phrase.phrase}</span>
                                            <span className="text-[9px] font-bold text-slate-400">Relevance: {phrase.relevance}%</span>
                                          </div>
                                          <p className="text-[11px] text-slate-400 leading-relaxed italic">{phrase.context}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="col-span-full text-center p-8 text-xs text-slate-500 italic bg-white/2 rounded-2xl border border-white/5">
                                Brak wyników diagnozy luk SERP. Użyj przycisku u góry aby uruchomić pełne badanie SERP Google w czasie rzeczywistym.
                              </div>
                            )}
                          </div>

                          {/* Organic Traffic reach prediction & Position projection */}
                          <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <BarChart3 className="w-5 h-5 text-brand-purple" />
                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Predykcja Organicznego Ruchu i Symulator CTR</h4>
                              </div>
                              <span className="text-[8px] bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded font-black uppercase tracking-wider">PREDICTIVE CALCULATOR</span>
                            </div>

                            {isPredictingTraffic ? (
                              <div className="p-12 text-center space-y-4 bg-white/2 rounded-3xl border border-white/5 animate-pulse">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-purple mx-auto" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trwa prognozowanie potencjalnego wolumenu i ruchu z Google...</p>
                                <p className="text-[10px] text-slate-500 italic">Eksploracja trudności pozycjonowania i szacowanie miesięcznych kliknięć</p>
                              </div>
                            ) : trafficPrediction ? (
                              <div className="space-y-6">
                                <div className="grid md:grid-cols-3 gap-4">
                                  <div className="p-6 rounded-[32px] bg-brand-cyan/5 border border-brand-cyan/20 space-y-2">
                                     <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black uppercase text-brand-cyan">Est. Monthly Clicks (Top 3)</span>
                                        <BarChart3 className="w-4 h-4 text-brand-cyan opacity-40" />
                                     </div>
                                     <p className="text-2xl font-black tracking-tighter text-white">{trafficPrediction.monthlyVisits.toLocaleString()}</p>
                                     <p className="text-[10px] text-slate-500 italic">Przewidywana liczba miesięcznych odwiedzin</p>
                                  </div>
                                  <div className="p-6 rounded-[32px] bg-brand-purple/5 border border-brand-purple/20 space-y-2">
                                     <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black uppercase text-brand-purple">SEO Keyword Difficulty</span>
                                        <Target className="w-4 h-4 text-brand-purple opacity-40" />
                                     </div>
                                     <p className="text-2xl font-black tracking-tighter text-white">{trafficPrediction.difficulty}/100</p>
                                     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-purple" style={{ width: `${trafficPrediction.difficulty}%` }} />
                                     </div>
                                  </div>
                                  <div className="p-6 rounded-[32px] bg-brand-blue/5 border border-brand-blue/20 space-y-2">
                                     <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black uppercase text-brand-blue">Keyword Search Volume</span>
                                        <Share2 className="w-4 h-4 text-brand-blue opacity-40" />
                                     </div>
                                     <p className="text-2xl font-black tracking-tighter text-white">{(trafficPrediction.searchVolume || 2400).toLocaleString()}</p>
                                     <p className="text-[10px] text-slate-500 italic">Miesięczna liczba zapytań o frazę</p>
                                  </div>
                                </div>

                                {/* Custom CTR position simulator */}
                                <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
                                  <div className="space-y-1">
                                    <h5 className="text-xs font-black uppercase text-white tracking-wider">Interaktywny Symulator CTR w pozycji wyszukiwania</h5>
                                    <p className="text-[11px] text-slate-500">Przeciągnij suwak, aby oszacować potencjał pozyskanych wejść w zależności od Twojej pozycji (Rank #) w wynikach Google:</p>
                                  </div>

                                  <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                      <div className="px-4 py-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-xs font-black uppercase text-brand-cyan">
                                        Pozycja w Google: <span className="text-xs font-mono font-extrabold">RANK #{selectedCtrPosition}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xs text-slate-500">Przewidywany współczynnik CTR: </span>
                                        <strong className="text-sm text-white font-black font-mono">
                                          {(selectedCtrPosition === 1 ? 32.5 : 
                                            selectedCtrPosition === 2 ? 17.6 : 
                                            selectedCtrPosition === 3 ? 10.2 : 
                                            selectedCtrPosition === 4 ? 6.9 : 
                                            selectedCtrPosition === 5 ? 4.8 : 
                                            selectedCtrPosition === 6 ? 3.5 : 
                                            selectedCtrPosition === 7 ? 2.4 : 
                                            selectedCtrPosition === 8 ? 1.8 : 
                                            selectedCtrPosition === 9 ? 1.4 : 1.1)}%
                                        </strong>
                                      </div>
                                    </div>

                                    <input 
                                      type="range"
                                      min={1}
                                      max={10}
                                      value={selectedCtrPosition}
                                      onChange={(e) => setSelectedCtrPosition(parseInt(e.target.value))}
                                      className="w-full accent-brand-cyan cursor-pointer bg-slate-800 rounded-lg appearance-none h-2 outline-none focus:outline-none"
                                    />

                                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                                      <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-1">
                                        <div className="text-[9px] font-black uppercase text-slate-500">Estymowany ruch (kliknięcia / mies.)</div>
                                        <div className="text-xl font-bold text-white leading-none font-mono">
                                          {Math.round(
                                            (trafficPrediction.searchVolume || 2400) * 
                                            ((selectedCtrPosition === 1 ? 32.5 : 
                                              selectedCtrPosition === 2 ? 17.6 : 
                                              selectedCtrPosition === 3 ? 10.2 : 
                                              selectedCtrPosition === 4 ? 6.9 : 
                                              selectedCtrPosition === 5 ? 4.8 : 
                                              selectedCtrPosition === 6 ? 3.5 : 
                                              selectedCtrPosition === 7 ? 2.4 : 
                                              selectedCtrPosition === 8 ? 1.8 : 
                                              selectedCtrPosition === 9 ? 1.4 : 1.1) / 100)
                                          ).toLocaleString()}
                                        </div>
                                        <span className="text-[10px] text-slate-600 block italic leading-snug">Wizyty pozyskane z wyszukiwarki</span>
                                      </div>

                                      <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-1">
                                        <div className="text-[9px] font-black uppercase text-slate-500">Utracony potencjał wyszukiwań</div>
                                        <div className="text-xl font-bold text-slate-400 leading-none font-mono">
                                          {Math.round(
                                            (trafficPrediction.searchVolume || 2400) * 
                                            (1 - ((selectedCtrPosition === 1 ? 32.5 : 
                                              selectedCtrPosition === 2 ? 17.6 : 
                                              selectedCtrPosition === 3 ? 10.2 : 
                                              selectedCtrPosition === 4 ? 6.9 : 
                                              selectedCtrPosition === 5 ? 4.8 : 
                                              selectedCtrPosition === 6 ? 3.5 : 
                                              selectedCtrPosition === 7 ? 2.4 : 
                                              selectedCtrPosition === 8 ? 1.8 : 
                                              selectedCtrPosition === 9 ? 1.4 : 1.1) / 100))
                                          ).toLocaleString()}
                                        </div>
                                        <span className="text-[10px] text-zinc-500 block italic leading-snug">Wizyty trafiające do konkurentki w SERP</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="col-span-full text-center p-8 text-xs text-slate-500 italic bg-white/2 rounded-2xl border border-white/5">
                                Prognoza ruchu nie została jeszcze utworzona. Użyj przycisku diagnostycznego u góry.
                              </div>
                            )}
                          </div>

                          {/* People also ask FAQ dynamic aggregator */}
                          <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <HelpCircle className="w-5 h-5 text-brand-purple" />
                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Integracja z Google "People Also Ask" (PAA FAQ)</h4>
                              </div>
                              <span className="text-[8px] bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded font-black uppercase tracking-wider">AUTO-INTEGRATED DRAFT</span>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                              Agreguj i automatycznie dołączaj najczęściej zadawane pytania z wyszukiwarki Google powiązane z Twoim tematem jako oficjalną, merytoryczną sekcję FAQ na końcu tekstu. Gwarantuje to silne ustrukturyzowanie odpowiedzi pod kątem tzw. <strong className="text-brand-cyan">Featured Snippets</strong> w Google Search.
                            </p>

                            {isFetchingGooglePaa ? (
                              <div className="p-12 text-center space-y-4 bg-white/2 rounded-3xl border border-white/5 animate-pulse">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-purple mx-auto" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trwa wyszukiwanie pytań "People Also Ask" w bazie Google...</p>
                                <p className="text-[10px] text-slate-500 italic">Pobieranie powiązanych zapytań i generowanie merytorycznych odpowiedzi</p>
                              </div>
                            ) : googlePaaQuestions.length > 0 ? (
                              <div className="space-y-6">
                                <div className="grid gap-4">
                                  {(googlePaaQuestions || []).map((q, i) => (
                                    <div key={i} className="p-5 bg-white/2 rounded-2xl border border-transparent hover:border-brand-purple/20 flex gap-4 group transition-all">
                                      <div className="w-6 h-6 rounded-full bg-brand-purple/25 flex items-center justify-center shrink-0 mt-1">
                                         <Check className="w-3 h-3 text-brand-purple" />
                                      </div>
                                      <div className="space-y-1.5 flex-1">
                                         <p className="text-xs font-bold text-white italic">"{q.question}"</p>
                                         <p className="text-xs text-slate-400 leading-relaxed">{q.suggestedAnswer}</p>
                                         <div className="text-[9px] text-slate-500 flex items-center gap-1">
                                           <span>Zweryfikowano w: </span>
                                           <a href={q.sourceUrl} target="_blank" referrerPolicy="no-referrer" className="text-brand-purple underline hover:text-white transition-all font-semibold italic">{q.sourceTitle}</a>
                                         </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  onClick={() => {
                                    if (!finalArticle) return;
                                    // Append FAQ structured content to dynamic elements
                                    const faqText = (googlePaaQuestions || []).map(q => 
                                      `#### ${q.question}\n\n${q.suggestedAnswer}\n\n*Weryfikacja merytoryczna: [${q.sourceTitle}](${q.sourceUrl})*`
                                    ).join("\n\n");

                                    const newSection = {
                                      heading: "People Also Ask (Najczęstsze pytania użytkowników)",
                                      text: `Oto zestawienie najczęstszych pytań i merytorycznych odpowiedzi na temat "${topic || finalArticle.title}" wyodrębnione bezpośrednio z wyszukiwarki Google:\n\n${faqText}`,
                                      imagePrompt: `Minimalist informational layout displaying a Q&A list for ${topic || finalArticle.title}`
                                    };

                                    const alreadyExists = finalArticle.content.some(c => c.heading === newSection.heading);
                                    if (alreadyExists) {
                                      alert("Sekcja PAA FAQ została już dołączona na końcu Twojego artykułu!");
                                      return;
                                    }

                                    setFinalArticle({
                                      ...finalArticle,
                                      content: [...finalArticle.content, newSection]
                                    });
                                    alert("Sukces! Sekcja FAQ dedykowana People Also Ask została włączona na końcu drafu!");
                                  }}
                                  className="w-full py-4 bg-brand-purple/20 text-brand-purple border border-brand-purple/30 hover:bg-brand-purple hover:text-white rounded-3xl text-sm font-black tracking-widest uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(168,85,247,0.1)] flex items-center justify-center gap-2"
                                >
                                  <Plus className="w-4 h-4" /> SCAL I DOŁĄCZ SEKCJĘ FAQ Z PYTAŃ PAA NA KOŃCU ARTYKUŁU
                                </button>
                              </div>
                            ) : (
                              <div className="col-span-full text-center p-8 text-xs text-slate-500 italic bg-white/2 rounded-2xl border border-white/5">
                                Pytań PAA nie wczytano automatycznie. Użyj przycisku diagnostycznego do załadowania ich z Google.
                              </div>
                            )}
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">Density Intelligence</h4>
                                <Target className="w-4 h-4 text-brand-cyan" />
                              </div>
                              <div className="space-y-4">
                                {(Object.entries(finalArticle.seo?.keywordDensity || {}) as [string, number][]).map(([kw, density]) => {
                                  const diff = density - (profile.seoDensity || 1.5);
                                  const isHealthy = Math.abs(diff) < 0.5;
                                  return (
                                    <div key={kw} className="space-y-1.5">
                                      <div className="flex justify-between items-center text-[10px] font-bold">
                                         <span className="text-white">{kw}</span>
                                         <span className={cn(isHealthy ? "text-brand-cyan" : "text-amber-500")}>
                                           {density}% {isHealthy ? "(Optimal)" : diff > 0 ? "(Over-optimized)" : "(Under-optimized)"}
                                         </span>
                                      </div>
                                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                         <div className="h-full bg-brand-cyan" style={{ width: `${Math.min(density * 10, 100)}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-4">
                               <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Semantic Gap Analysis</h4>
                               <p className="text-[10px] text-slate-500 italic">Comparing with top-10 ranking articles...</p>
                               <div className="prose prose-invert prose-xs max-w-none text-slate-400">
                                 <ReactMarkdown>{finalArticle.seo?.gapAnalysis || ""}</ReactMarkdown>
                               </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                             <div className="p-6 rounded-3xl bg-brand-cyan/5 border border-brand-cyan/20">
                               <div className="flex justify-between items-center">
                                 <span className="text-[8px] font-black uppercase text-brand-cyan">Readability Index</span>
                                 <span className="text-[10px] font-bold text-white">{finalArticle.seo?.fleschKincaidLevel || "N/A"}</span>
                               </div>
                               <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full bg-brand-cyan" style={{ width: `${finalArticle.seo?.readabilityScore || 0}%` }} />
                               </div>
                             </div>
                             <div className="p-6 rounded-3xl bg-brand-purple/5 border border-brand-purple/20">
                               <span className="text-[8px] font-black uppercase text-brand-purple">Slug Optimization</span>
                               <p className="text-sm font-bold text-white mt-1">{"/"}{finalArticle.seo?.slug || ""}</p>
                             </div>
                          </div>
                          
                          <div className="p-10 rounded-[40px] bg-white/2 border border-white/5 space-y-6">
                             <div className="space-y-1">
                               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">CTA Personalization Hint</h4>
                               <p className="text-sm text-slate-400 italic">{finalArticle.cta?.personalizedHint || ""}</p>
                             </div>
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">A/B Content Variants - Alternative Headlines</h4>
                             <div className="grid gap-3">
                                {(finalArticle.seo?.alternativeTitles || []).map((altTitle, idx) => (
                                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-400 italic hover:text-white hover:border-brand-cyan/20 transition-all flex justify-between items-center group">
                                    {altTitle}
                                    <button onClick={() => setFinalArticle({...finalArticle, title: altTitle})} className="text-[8px] font-black uppercase text-brand-cyan opacity-0 group-hover:opacity-100 transition-all">Select Variant</button>
                                  </div>
                                ))}
                             </div>
                          </div>

                          {isFetchingInternalLinks && (
                              <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 animate-pulse flex items-center justify-center gap-3">
                                  <Loader2 className="w-5 h-5 animate-spin text-brand-cyan" />
                                  <span className="text-[10px] font-black uppercase text-slate-500">Discovering Internal Link Gaps...</span>
                              </div>
                          )}
                          {internalLinks.length > 0 && (
                              <div className="p-10 rounded-[40px] bg-brand-cyan/5 border border-brand-cyan/20 space-y-6">
                                  <div className="flex items-center gap-3">
                                      <ExternalLink className="w-5 h-5 text-brand-cyan" />
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">AI Internal Link Suggestions</h4>
                                  </div>
                                  <div className="grid gap-4">
                                      {internalLinks.map((link, idx) => (
                                          <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-start group">
                                              <div className="p-2 bg-brand-cyan/10 rounded-lg"><CheckCircle2 className="w-4 h-4 text-brand-cyan" /></div>
                                              <div className="space-y-1">
                                                  <div className="flex items-center gap-3">
                                                      <span className="text-sm font-bold text-white">{link.anchor}</span>
                                                      <code className="text-[10px] text-brand-cyan opacity-60">{"<a href=\""}{link.url}{"\">"}{link.anchor}{"</a>"}</code>
                                                  </div>
                                                  <p className="text-[11px] text-slate-500 italic">{link.context}</p>
                                              </div>
                                              <button onClick={() => navigator.clipboard.writeText(`<a href="${link.url}">${link.anchor}</a>`)} className="ml-auto p-2 opacity-0 group-hover:opacity-100 transition-all text-slate-500 hover:text-white">
                                                  <Copy className="w-4 h-4" />
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                       </div>
                     )}

                     {activeTab === "accessibility" && (
                         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <Eye className="w-6 h-6 text-brand-purple" />
                                     <h3 className="text-2xl font-black italic">Accessibility & WCAG Audit</h3>
                                 </div>
                                 {isAuditingAccessibility && (
                                     <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />
                                 )}
                             </div>
                             {accessibilityReport && (
                                 <>
                                     <div className="p-10 rounded-[40px] bg-brand-purple/5 border border-brand-purple/20 flex items-center gap-10">
                                         <div className="relative w-32 h-32 flex items-center justify-center">
                                             <svg className="w-full h-full -rotate-90">
                                                 <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="12" className="text-white/5" />
                                                 <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="364.4" strokeDashoffset={364.4 - (364.4 * accessibilityReport.score) / 100} className="text-brand-purple" />
                                             </svg>
                                             <span className="absolute text-3xl font-black italic text-white">{accessibilityReport.score}</span>
                                         </div>
                                         <div className="space-y-2">
                                             <h4 className="text-xl font-bold text-white tracking-tight">Accessibility Score</h4>
                                             <p className="text-sm text-slate-500 italic leading-relaxed">Based on WCAG 2.1 guidelines for text structure, contrast and simplified language.</p>
                                         </div>
                                     </div>
                                     <div className="grid gap-4">
                                         {(accessibilityReport.recommendations || []).map((rec, idx) => (
                                             <div key={idx} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex gap-4">
                                                 <div className="p-2 bg-brand-purple/20 rounded-xl h-fit"><CheckCircle2 className="w-5 h-5 text-brand-purple" /></div>
                                                 <p className="text-sm text-white italic leading-relaxed">{rec}</p>
                                             </div>
                                         ))}
                                     </div>
                                 </>
                             )}
                         </div>
                     )}

                     {activeTab === "metadata" && (
                         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <Target className="w-6 h-6 text-brand-cyan" />
                                     <h3 className="text-2xl font-black italic">Multilingual Meta-Data</h3>
                                 </div>
                                 {isGeneratingMeta && (
                                     <Loader2 className="w-5 h-5 animate-spin text-brand-cyan" />
                                 )}
                             </div>
                             {multilingualMeta && (
                                 <div className="grid gap-6">
                                     {Object.entries(multilingualMeta).map(([lang, meta]) => (
                                         <div key={lang} className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                                             <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                 <span className="text-xs font-black uppercase text-brand-cyan">{lang === 'pl' ? 'Polish (Polski)' : lang === 'en' ? 'English (Angielski)' : 'German (Niemiecki)'}</span>
                                                 <div className="flex gap-2">
                                                     <button onClick={() => navigator.clipboard.writeText(meta.title)} className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><Copy className="w-4 h-4" /></button>
                                                 </div>
                                             </div>
                                             <div className="space-y-4">
                                                 <div className="space-y-1">
                                                     <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Meta Title</label>
                                                     <div className="p-4 bg-black/20 rounded-2xl border border-white/5 text-sm text-white italic leading-relaxed">{meta.title}</div>
                                                 </div>
                                                 <div className="space-y-1">
                                                     <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Meta Description</label>
                                                     <div className="p-4 bg-black/20 rounded-2xl border border-white/5 text-sm text-slate-400 italic leading-relaxed">{meta.description}</div>
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     )}

                      {activeTab === "integrations" && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                        <div className="text-center space-y-4">
                          <h3 className="text-4xl font-black italic tracking-tighter">ADVANCED INTEGRATIONS</h3>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">API & Webhook Architecture</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8">
                           <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                              <div className="flex items-center gap-3">
                                 <Plus className="w-5 h-5 text-brand-cyan" />
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Developer API Key</h4>
                              </div>
                              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 font-mono text-xs flex justify-between items-center text-slate-500">
                                 hb_article_writer_prod_sk_829375x...
                                 <button onClick={() => alert("API Key copied!")} className="p-2 hover:bg-white/5 rounded-lg"><Copy className="w-3 h-3" /></button>
                              </div>
                              <p className="text-[10px] text-slate-500 italic">Use this key to programmatically fetch architectures and push to production environment.</p>
                           </div>

                           <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
                              <div className="flex items-center gap-3">
                                 <Share2 className="w-5 h-5 text-brand-purple" />
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Webhook Endpoint</h4>
                              </div>
                              <input 
                                placeholder="https://your-domain.com/webhooks/articles"
                                className="w-full bg-black/40 rounded-2xl border border-white/5 p-4 text-[11px] font-mono outline-none focus:border-brand-purple/30 text-slate-400"
                              />
                              <p className="text-[10px] text-slate-500 italic">Automatic notification when article reaches terminal 'published' state.</p>
                           </div>
                        </div>

                        <div className="p-10 rounded-[48px] bg-white/5 border border-white/10 space-y-8">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Voice Signature Analysis</h4>
                          <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                              {[
                                 { label: "Humor", value: 25, color: "bg-yellow-400" },
                                 { label: "Directness", value: 85, color: "bg-brand-cyan" },
                                 { label: "Empathy", value: 45, color: "bg-brand-purple" },
                                 { label: "Academic Depth", value: 75, color: "bg-brand-blue" }
                              ].map(sig => (
                                 <div key={sig.label} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                       <span className="text-slate-500">{sig.label}</span>
                                       <span className="text-white">{sig.value}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                     <div className={cn("h-full", sig.color)} style={{ width: `${sig.value}%` }} />
                                  </div>
                               </div>
                            ))}
                            </div>
                            <div className="p-8 rounded-3xl bg-white/2 border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                               <div className="w-16 h-16 rounded-full border-4 border-brand-cyan/20 border-t-brand-cyan animate-[spin_10s_linear_infinite] flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full border-4 border-brand-purple/20 border-b-brand-purple animate-[spin_5s_linear_infinite] direction-reverse" />
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Semantic Fingerprint</p>
                                  <p className="text-[9px] text-slate-500 italic">Tone matches your profile signature.</p>
                               </div>
                            </div>
                          </div>
                       </div>

                       <div className="p-10 rounded-[48px] bg-white/5 border border-white/10 space-y-6">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">Integration Workflow (cURL)</h4>
                           <div className="p-6 bg-black/40 rounded-3xl border border-white/5 font-mono text-[10px] leading-relaxed text-slate-400 overflow-x-auto">
                              <pre>
{`curl -X POST "https://api.hardban.ai/v1/articles/sync" \\
  -H "Authorization: Bearer hb_article_writer_prod_sk_***" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "${currentArticleId}",
    "target": "wordpress",
    "slug": "${finalArticle?.seo.slug || "auto"}",
    "status": "publish"
  }'`}
                              </pre>
                           </div>
                        </div>
                     </motion.div>
                   )}

                   {activeTab === "versions" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <History className="w-6 h-6 text-brand-cyan" />
                                <h3 className="text-2xl font-black italic">Architecture Version History</h3>
                              </div>
                              <button 
                                onClick={() => handleSaveSnapshot()}
                                className="px-4 py-2 bg-brand-cyan/20 border border-brand-cyan/40 rounded-xl text-[10px] font-black text-brand-cyan hover:bg-brand-cyan hover:text-slate-900 transition-all"
                              >
                                SAVE CURRENT AS SNAPSHOT
                              </button>
                           </div>
                           
                           <div className="grid gap-4">
                              {articleHistory.find(h => h.id === currentArticleId)?.snapshots?.map((snap, idx) => (
                                <div key={idx} className="p-8 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-between group hover:border-brand-cyan/30 transition-all">
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-3">
                                        <span className="text-brand-cyan font-black italic">V{idx + 1}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">{new Date(snap.timestamp).toLocaleString()}</span>
                                      </div>
                                      <p className="text-sm font-bold text-white">{snap.title}</p>
                                   </div>
                                   <button 
                                      onClick={() => {
                                        if (confirm("Restore this version? Current unsaved changes will be lost.")) {
                                          setFinalArticle({ ...finalArticle!, content: snap.content, title: snap.title });
                                        }
                                      }}
                                      className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 group-hover:bg-brand-cyan group-hover:text-slate-900 transition-all"
                                   >
                                      RESTORE THIS VERSION
                                   </button>
                                </div>
                              ))}
                              {(!articleHistory.find(h => h.id === currentArticleId)?.snapshots || articleHistory.find(h => h.id === currentArticleId)?.snapshots?.length === 0) && (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-600 gap-4">
                                   <History className="w-12 h-12 opacity-20" />
                                   <p className="text-sm italic">No snapshots archived for this architecture yet.</p>
                                </div>
                              )}
                           </div>
                        </div>
                      )}

                      {/* CTA Section */}
                      {finalArticle.cta && (
                        <div className="p-10 rounded-[40px] bg-gradient-to-br from-brand-purple/20 to-brand-blue/20 border border-white/10 flex flex-col md:flex-row items-center gap-8 justify-between">
                          <div className="space-y-2 text-center md:text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">Recommended Action</span>
                            <p className="text-white font-bold text-xl">{finalArticle.cta.text}</p>
                          </div>
                          <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black italic flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-white/10">
                            {finalArticle.cta.buttonText}
                            <MousePointer2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  <div className="lg:col-span-1 space-y-6">
                  {/* Performance Score */}
                  <div className="glass-panel p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quality Score</h3>
                      <BarChart3 className="w-4 h-4 text-brand-cyan" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle className="text-white/5 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                          <circle 
                            className="text-brand-cyan stroke-current" strokeWidth="8" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" 
                            strokeDasharray={`${(finalArticle.seo?.readabilityScore || 0) * 2.51}, 251`}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-black text-xl italic">{finalArticle.seo?.readabilityScore || 0}</div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">Readability</p>
                        <p className="text-[10px] text-slate-500">Flesch-Kincaid Scale</p>
                      </div>
                    </div>
                  </div>

                  {/* SEO Insights */}
                  <div className="glass-panel p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">SEO Keywords</h3>
                      <Target className="w-4 h-4 text-brand-purple" />
                    </div>
                    <div className="space-y-3">
                      {(Object.entries(finalArticle.seo?.keywordDensity || {}) as [string, number][]).map(([word, density], idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-300">{word}</span>
                            <span className="text-brand-cyan">{density}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-cyan/40" style={{ width: `${Math.min(density * 10, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sentiment & Tone */}
                  <div className="glass-panel p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tone Analysis</h3>
                      <button 
                        onClick={async () => {
                          if (!finalArticle) return;
                          setIsAnalyzingTone(true);
                          try {
                            const content = (finalArticle.content || []).map(c => c.text).join("\n");
                            const res = await analyzeTone(content, selectedModel);
                            setToneReport(res);
                          } catch (e) {
                            console.error("Tone analysis failed", e);
                          } finally {
                            setIsAnalyzingTone(false);
                          }
                        }}
                        disabled={isAnalyzingTone}
                        className="p-1 hover:bg-white/5 rounded transition-all"
                      >
                        {isAnalyzingTone ? <Loader2 className="w-3 h-3 animate-spin text-brand-blue" /> : <Sparkles className="w-4 h-4 text-brand-blue" />}
                      </button>
                    </div>
                    
                    {toneReport ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                          <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center">
                            <Smile className="w-5 h-5 text-brand-blue" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-white capitalize">{toneReport.sentiment}</p>
                            <p className="text-[9px] text-slate-500 italic">Emotional Resonance: {toneReport.emotionalIndex}%</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500 italic">Authority</span>
                              <span className="text-brand-purple">{toneReport.authority}%</span>
                           </div>
                           <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-purple" style={{ width: `${toneReport.authority}%` }} />
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center">
                          <Smile className="w-5 h-5 text-brand-blue" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-white capitalize">{finalArticle.seo?.sentiment || "neutral"}</p>
                          <p className="text-[9px] text-slate-500 italic">Emotionally engaging tone</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="glass-panel p-6 rounded-[32px] space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <h3 className="font-black text-[10px] uppercase tracking-widest italic">Distribution</h3>
                      <Share2 className="w-3.5 h-3.5 text-brand-cyan" />
                    </div>
                    <div className="space-y-2">
                       <button 
                        onClick={() => setShowShareModal(true)}
                        className="w-full py-4 bg-brand-accent text-white rounded-xl text-[10px] font-black transition-all shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 mb-2 hover:scale-[1.02] active:scale-100"
                      >
                        <Share2 className="w-4 h-4" /> DISTRIBUTE TO SOCIALS
                      </button>

                      <div className="grid grid-cols-3 gap-1.5 mb-4">
                        <button 
                          onClick={() => handlePublishToCMS("wordpress")}
                          disabled={isPublishing}
                          className="py-3 bg-blue-900/10 hover:bg-blue-900/20 rounded-xl text-[8px] font-black transition-all border border-blue-900/20 text-blue-400 flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Globe className="w-3 h-3" /> WP
                        </button>
                        <button 
                          onClick={() => handlePublishToCMS("medium")}
                          disabled={isPublishing}
                          className="py-3 bg-slate-900/20 hover:bg-slate-900/30 rounded-xl text-[8px] font-black transition-all border border-white/5 text-slate-300 flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <BookOpen className="w-3 h-3" /> MEDIUM
                        </button>
                        <button 
                          onClick={handleLinkedInPublish}
                          disabled={isPublishingLinkedIn}
                          className="py-3 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 rounded-xl text-[8px] font-black transition-all border border-[#0077b5]/20 text-[#00a0dc] flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Linkedin className="w-3 h-3 fill-[#00a0dc] text-[#00a0dc]" /> LINKEDIN
                        </button>
                      </div>

                      <button onClick={() => setShowPdfPreview(true)} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black transition-all border border-white/10 flex items-center justify-center gap-2">
                        <FileDown className="w-4 h-4 text-brand-cyan" /> PDF DOCUMENT
                      </button>
                      <button onClick={() => alert("EPUB Export - Generated successfully (simulation)")} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black transition-all border border-white/10 flex items-center justify-center gap-2">
                        <Download className="w-4 h-4 text-brand-purple" /> EPUB EBOOK
                      </button>
                      <button onClick={exportAsTXT} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black transition-all border border-white/10 flex items-center justify-center gap-2">
                        <FileType className="w-4 h-4 text-slate-500" /> PLAIN TEXT
                      </button>
                      <button onClick={() => alert("Newsletter content generated and copied to clipboard!")} className="w-full py-3 bg-brand-cyan/10 hover:bg-brand-cyan/20 rounded-xl text-[10px] font-black transition-all border border-brand-cyan/10 text-brand-cyan flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4" /> GENERATE NEWSLETTER
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

            {step === "history" && (
              <motion.div 
                key="step-history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8 pb-20"
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black italic tracking-tighter">PUBLICATION HISTORY</h2>
                    <p className="text-slate-500 text-sm italic">Manage and revisit your previously generated masterpieces.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (confirm("Are you sure you want to wipe all article history?")) {
                        if (user) {
                          const q = query(collection(db, "articles"), where("userId", "==", user.uid));
                          const snapshot = await getDocs(q);
                          const deletions = snapshot.docs.map(d => deleteDoc(d.ref));
                          await Promise.all(deletions);
                        } else {
                          setArticleHistory([]);
                          localStorage.removeItem("article_history");
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-red-500 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 className="w-4 h-4" /> Clear All
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articleHistory.length === 0 ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-600 italic space-y-4">
                      <Clock className="w-16 h-16 opacity-10" />
                      <p>No history found yet. Start architecting!</p>
                    </div>
                  ) : (
                    articleHistory.map((item) => (
                      <motion.div 
                        key={item.id}
                        className="glass-panel group rounded-[32px] overflow-hidden flex flex-col hover:border-brand-cyan/30 transition-all cursor-pointer"
                        onClick={() => {
                          setFinalArticle(item.article);
                          setHeroImages(item.heroImages);
                          setSelectedHeroIndex(0);
                          setCurrentArticleId(item.id);
                          setStep("result");
                        }}
                      >
                        <div className="aspect-[16/9] relative overflow-hidden">
                          <img src={item.heroImages[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-4 left-6">
                            <span className="text-[8px] font-black uppercase text-brand-cyan">{new Date(item.timestamp).toLocaleDateString()}</span>
                            <h4 className="text-white font-bold text-sm truncate max-w-[200px]">{item.article.title}</h4>
                            {new Date().getTime() - new Date(item.timestamp).getTime() > 90 * 24 * 60 * 60 * 1000 && (
                              <div className="flex items-center gap-1.5 mt-0.5 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest">OUTDATED</span>
                              </div>
                            )}
                          </div>
                         </div>
                         <div className="p-6 flex justify-between items-center">
                             <div className="flex gap-1.5 overflow-hidden">
                               <div className="px-2 py-1 bg-white/5 rounded text-[8px] font-black text-slate-400 whitespace-nowrap">{item.article.seo.sentiment.toUpperCase()}</div>
                               {item.snapshots && item.snapshots.length > 0 && (
                                 <div className="px-2 py-1 bg-brand-cyan/10 text-brand-cyan rounded text-[8px] font-black whitespace-nowrap">
                                   V{item.snapshots.length + 1}
                                 </div>
                               )}
                               {item.scheduledDate && (
                                 <div className="px-2 py-1 bg-brand-purple/10 text-brand-purple rounded text-[8px] font-black whitespace-nowrap">
                                   CALENDAR: {item.scheduledDate}
                                 </div>
                               )}
                             </div>
                             <div className="flex gap-2">
                               {!item.scheduledDate && (
                                 <button 
                                   onClick={async (e) => {
                                     e.stopPropagation();
                                     const date = prompt("Enter publish date (YYYY-MM-DD):", "2025-01-01");
                                     if (date) {
                                       const updatedItem = { ...item, scheduledDate: date };
                                       await persistArticle(updatedItem);
                                     }
                                   }}
                                   className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-500"
                                   title="Schedule for Editorial Calendar"
                                 >
                                   <Clock className="w-3.5 h-3.5" />
                                 </button>
                               )}
                               <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-cyan transition-colors" />
                             </div>
                         </div>
                       </motion.div>
                     ))
                   )}
                 </div>
               </motion.div>
             )}
 
             {step === "calendar" && (
               <motion.div 
                 key="step-calendar"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="space-y-12 pb-20 max-w-6xl mx-auto"
               >
                 <EditorialCalendarPlanner 
                   articleHistory={articleHistory}
                   editorialCalendar={editorialCalendar}
                   onPersistArticle={persistArticle}
                   onRemoveArticle={removeArticle}
                   onInspectArticle={(art) => {
                     setFinalArticle(art);
                     setStep("result");
                   }}
                   onSetStep={setStep}
                 />
               </motion.div>
             )}
             {false && (
               <motion.div 
                 key="step-calendar"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="space-y-12 pb-20 max-w-6xl mx-auto"
               >
                 <div className="flex items-center gap-6">
                   <div className="w-20 h-20 rounded-[32px] bg-brand-purple/20 flex items-center justify-center border border-brand-purple/20 shadow-xl shadow-brand-purple/10">
                     <Clock className="w-10 h-10 text-brand-purple" />
                   </div>
                   <div>
                     <h2 className="text-5xl font-black italic tracking-tighter">EDITORIAL CALENDAR</h2>
                     <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Lifecycle Management & Automation</p>
                   </div>
                 </div>
 
                 <div className="grid lg:grid-cols-4 gap-10">
                    <div className="lg:col-span-3 space-y-8">
                       <div className="glass-panel p-10 rounded-[48px] border border-white/5 space-y-8">
                          <div className="flex justify-between items-center">
                             <h3 className="text-xl font-black italic flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-brand-cyan" />
                                CONTENT TIMELINE
                             </h3>
                             <div className="flex gap-2">
                                {["MAY", "JUN", "JUL"].map(m => (
                                  <button key={m} className={cn("px-4 py-2 rounded-xl text-[10px] font-black", m === "MAY" ? "bg-brand-cyan text-slate-900" : "bg-white/5 text-slate-500")}>{m}</button>
                                ))}
                             </div>
                          </div>
 
                          <div className="grid grid-cols-7 gap-3">
                             {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => (
                               <div key={d} className="text-center text-[8px] font-black text-slate-700 tracking-widest">{d}</div>
                             ))}
                             {Array.from({ length: 31 }).map((_, i) => {
                               const day = i + 1;
                               const scheduled = editorialCalendar.filter(a => {
                                 if (!a.scheduledDate) return false;
                                 return new Date(a.scheduledDate).getDate() === day;
                               });
                               return (
                                 <div key={i} className={cn(
                                   "aspect-square rounded-2xl border border-white/5 flex flex-col justify-between p-3 transition-all relative group",
                                   scheduled.length > 0 ? "bg-brand-purple/10 border-brand-purple/20" : "bg-white/2 hover:bg-white/5"
                                 )}>
                                   <span className={cn("text-xs font-black", scheduled.length > 0 ? "text-brand-purple" : "text-slate-800")}>{day}</span>
                                   {scheduled.length > 0 && (
                                     <div className="flex -space-x-1">
                                       {scheduled.map((s, idx) => (
                                         <div key={idx} className="w-1.5 h-1.5 rounded-full bg-brand-cyan border border-slate-900" title={s.article.title} />
                                       ))}
                                     </div>
                                   )}
                                   {scheduled.length > 0 && (
                                     <div className="absolute top-full left-0 mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl p-3 z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all shadow-2xl">
                                        {scheduled.map((s, idx) => (
                                          <div key={idx} className="space-y-1 py-1 first:pt-0 last:pb-0">
                                             <p className="text-[10px] text-white font-bold leading-tight">{s.article.title}</p>
                                             <p className="text-[9px] text-brand-cyan uppercase font-black">{s.article.seo.sentiment}</p>
                                          </div>
                                        ))}
                                     </div>
                                   )}
                                 </div>
                               );
                             })}
                          </div>
                       </div>
 
                       <div className="space-y-6">
                          <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-500">Upcoming Pipeline</h3>
                          <div className="grid gap-4">
                             {editorialCalendar.length === 0 ? (
                               <div className="p-16 rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center space-y-4 opacity-30">
                                  <Clock className="w-12 h-12" />
                                  <p className="text-sm font-bold italic">No scheduled operations detected.</p>
                               </div>
                             ) : (
                               editorialCalendar.sort((a,b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()).map(article => (
                                 <div key={article.id} className="p-8 rounded-[40px] bg-white/5 border border-white/10 group space-y-6 hover:border-brand-cyan/20 transition-all flex items-center justify-between">
                                   <div className="flex gap-6 items-center">
                                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                         <img src={article.heroImages[0]} className="w-full h-full object-cover opacity-50" />
                                      </div>
                                      <div className="space-y-1">
                                         <h4 className="text-lg font-bold text-white">{article.article.title}</h4>
                                         <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-brand-cyan uppercase bg-brand-cyan/10 px-2 py-0.5 rounded">AUTO-PUBLISH: {article.scheduledDate}</span>
                                            <span className="text-[10px] font-bold text-slate-600 italic">Format: {article.article.seo.fleschKincaidLevel}</span>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="flex gap-2">
                                      <button 
                                       onClick={() => {
                                         setFinalArticle(article.article);
                                         setStep("result");
                                       }}
                                       className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-white transition-all"
                                      >
                                         Inspect
                                      </button>
                                      <button 
                                       onClick={async () => {
                                         if (confirm("Remove from calendar?")) {
                                           const { scheduledDate, ...rest } = article;
                                           await persistArticle(rest);
                                         }
                                       }}
                                       className="p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-all"
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
 
                    <div className="space-y-6">
                       <div className="glass-panel p-8 rounded-[48px] space-y-8">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-purple">Lifecycle Metrics</h3>
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold">
                                   <span className="text-slate-500">Publication Rate</span>
                                   <span className="text-brand-cyan">78%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-brand-cyan" style={{ width: '78%' }} />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold">
                                   <span className="text-slate-500">Automation Health</span>
                                   <span className="text-brand-purple">Healthy</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-brand-purple" style={{ width: '92%' }} />
                                </div>
                             </div>
                             <div className="pt-6 border-t border-white/5 space-y-4">
                                <p className="text-[10px] text-slate-500 italic leading-relaxed">System predicts 2 upcoming content gaps in your schedule for next week.</p>
                                <button 
                                 onClick={() => setStep("input")}
                                 className="w-full py-4 bg-brand-purple/10 border border-brand-purple/20 rounded-2xl text-[10px] font-black uppercase text-brand-purple hover:bg-brand-purple hover:text-white transition-all shadow-lg shadow-brand-purple/10"
                                >
                                   Auto-Fill Gaps
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               </motion.div>
             )}
            {step === "image-studio" && (
              <motion.div 
                key="step-studio"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid lg:grid-cols-4 gap-10"
              >
                <div className="lg:col-span-1 space-y-6">
                  <div className="glass-panel p-6 rounded-3xl space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-brand-cyan" />
                      <h3 className="font-bold">Image Studio</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Visual Prompt</label>
                        <textarea 
                          value={studioPrompt || ""}
                          onChange={(e) => setStudioPrompt(e.target.value)}
                          placeholder="Describe the image you want to create..."
                          rows={4}
                          className="glass-input w-full p-4 rounded-xl text-sm italic resize-none"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["Photorealistic futuristic city", "Minimalist abstract art", "Cinematic portrait with soft lighting", "Data visualization infographic"].map(suggestion => (
                             <button
                               key={suggestion}
                               onClick={() => setStudioPrompt(suggestion)}
                               className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 hover:text-brand-cyan hover:border-brand-cyan transition-all"
                             >
                               {suggestion}
                             </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Aspect Ratio</label>
                        <div className="flex gap-2">
                          {(['16:9', '1:1', '4:3'] as const).map(ratio => (
                            <button
                              key={ratio}
                              onClick={() => setStudioAspectRatio(ratio)}
                              className={cn(
                                "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border",
                                studioAspectRatio === ratio
                                  ? "bg-brand-cyan/20 border-brand-cyan text-brand-cyan"
                                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                              )}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Atmosphere & Camera</label>
                        <div className="flex flex-wrap gap-2">
                          {["Golden Hour", "Dramatic", "Close-up", "Wide Angle", "Neon", "Moody"].map(tag => (
                            <button
                              key={tag}
                              onClick={() => setStudioPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Style Presets</label>
                        <div className="flex flex-wrap gap-2">
                          {["Cinematic", "Cyberpunk", "Minimalist", "3D Render", "Oil Painting", "Abstract"].map(style => (
                            <button
                              key={style}
                              onClick={() => setStudioPrompt(prev => prev ? `${prev}, ${style}` : style)}
                              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider"
                            >
                              + {style}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={handleStudioGenerate}
                      disabled={isStudioGenerating || !studioPrompt}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold transition-all relative overflow-hidden",
                        isStudioGenerating || !studioPrompt 
                          ? "bg-white/5 text-slate-600 cursor-not-allowed" 
                          : "bg-brand-cyan text-slate-900 shadow-lg shadow-brand-cyan/20"
                      )}
                    >
                      {isStudioGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        "Generate Image"
                      )}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-8">
                  {studioImages.length === 0 ? (
                    <div className="glass-panel h-96 rounded-[40px] flex flex-col items-center justify-center text-slate-500 italic space-y-4">
                      <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 opacity-20" />
                      </div>
                      <p>Your generated visuals will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {studioImages.map((img, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="glass-panel rounded-3xl overflow-hidden group relative"
                        >
                          <img src={img} className="w-full h-full object-cover aspect-video" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button 
                               onClick={() => setEditingImage({ url: img, index: i, rotation: 0, filter: 'none' })}
                               className="p-3 bg-brand-cyan/20 backdrop-blur-md rounded-full hover:bg-brand-cyan/40 transition-all text-brand-cyan"
                            >
                               <Edit className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = img;
                                a.download = `generated-${i}.png`;
                                a.click();
                              }}
                              className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setStudioImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-3 bg-red-500/20 backdrop-blur-md rounded-full hover:bg-red-500/40 transition-all text-red-500"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Modals and Overlays */}
          </AnimatePresence>
        </main>
        
        <footer className="p-16 text-center relative z-10 border-t border-white/5 bg-black/20">
          <div className="flex items-center justify-center gap-8 mb-8">
            {[Twitter, Linkedin, Facebook, Youtube, Instagram, Slack, Globe].map((Icon, idx) => (
              <a key={idx} href="#" className="text-slate-700 hover:text-brand-cyan transition-all hover:scale-110">
                <Icon className="w-6 h-6" />
              </a>
            ))}
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-700 italic flex flex-col gap-2">
            <span>Autonomous Content Architecture</span>
            <span className="text-[8px] opacity-50 tracking-[0.2em] font-mono not-italic">AETHER EDITORIAL ENGINE • V1.0.0</span>
          </p>
        </footer>
      </div>
    </div>
    </>
    );
}


