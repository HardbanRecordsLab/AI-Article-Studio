import React, { useState, useRef } from "react";
import { 
  Search, 
  Download, 
  Copy, 
  Trash2, 
  UploadCloud, 
  Check, 
  ImageIcon, 
  X, 
  Grid, 
  List, 
  Tag, 
  Calendar,
  AlertCircle,
  FileImage,
  Sparkles,
  Info
} from "lucide-react";

export interface MediaAsset {
  id: string;
  url: string;
  title: string;
  category: "Zdjęcia" | "Grafiki" | "Promocyjne" | "Własne";
  size: string;
  dimensions: string;
  uploadedAt: string;
  description: string;
}

interface MediaLibraryManagerProps {
  mediaList: string[];
  onChangeMediaList: (newList: string[]) => void;
}

// Beautiful initial mock assets to make the library feel populated and professional
const INITIAL_ASSETS: MediaAsset[] = [
  {
    id: "mock-1",
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    title: "Wydajność Marketingu B2B - Wykres",
    category: "Grafiki",
    size: "420 KB",
    dimensions: "1200 x 800 px",
    uploadedAt: "2026-05-24 10:30",
    description: "Infografika przedstawiająca stopę zwrotu z inwestycji (ROI) dla systemów CRM w sektorze B2B."
  },
  {
    id: "mock-2",
    url: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=800&q=80",
    title: "Burza Mózgów Zespołu Redakcyjnego",
    category: "Zdjęcia",
    size: "1.2 MB",
    dimensions: "1920 x 1080 px",
    uploadedAt: "2026-05-25 15:45",
    description: "Zdjęcie zespołu Lumina omawiającego plany publikacji na tablicy suchościeralnej w biurze."
  },
  {
    id: "mock-3",
    url: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
    title: "Baner Promocyjny - Konferencja 2026",
    category: "Promocyjne",
    size: "680 KB",
    dimensions: "1200 x 630 px",
    uploadedAt: "2026-05-27 08:15",
    description: "Oficjalny baner graficzny zapowiadający nadchodzący Kongres Content Creatorów."
  },
  {
    id: "mock-4",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    title: "Ilustracja - Kolaboracja Online/SaaS",
    category: "Grafiki",
    size: "350 KB",
    dimensions: "1000 x 1000 px",
    uploadedAt: "2026-05-28 11:00",
    description: "Minimalistyczna ilustracja przedstawiająca cyfrowe środowisko pracy zespołu projektowego."
  }
];

export const MediaLibraryManager: React.FC<MediaLibraryManagerProps> = ({
  mediaList,
  onChangeMediaList
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Wszystkie");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse media list items safely
  const parsedAssets: MediaAsset[] = React.useMemo(() => {
    // Collect preloaded custom assets first
    const items: MediaAsset[] = [...INITIAL_ASSETS];
    
    mediaList.forEach((item, index) => {
      if (!item) return;
      
      // Check if it's serialized JSON
      if (item.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(item) as MediaAsset;
          // De-duplicate if already exists
          if (!items.some(i => i.id === parsed.id)) {
            items.push(parsed);
          }
        } catch (e) {
          // Fallback if parsing fails
          items.push({
            id: `ai-${index}`,
            url: item,
            title: `Generowana Grafika AI #${index + 1}`,
            category: "Grafiki",
            size: "520 KB",
            dimensions: "1024 x 1024 px",
            uploadedAt: "Dziś, " + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            description: "Asset utworzony automatycznie."
          });
        }
      } else {
        // Flat string URL
        if (!items.some(i => i.url === item)) {
          items.push({
            id: `ai-${index}`,
            url: item,
            title: `Wygenerowany Obraz #${index + 1}`,
            category: "Grafiki",
            size: "640 KB",
            dimensions: "1024 x 1024 px",
            uploadedAt: "Dziś, " + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            description: "Wygenerowany materiał ilustracyjny powiązany z artykułem."
          });
        }
      }
    });
    
    return items;
  }, [mediaList]);

  // Filter and search
  const filteredAssets = React.useMemo(() => {
    return parsedAssets.filter(asset => {
      const matchesSearch = 
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        asset.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === "Wszystkie" || 
        asset.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [parsedAssets, searchQuery, selectedCategory]);

  // Handle mock upload
  const simulateUpload = (fileName: string) => {
    setUploadingName(fileName);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Add new asset
            const newAsset: MediaAsset = {
              id: Math.random().toString(36).substring(2, 11),
              url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80", // Stylish abstract placeholder
              title: fileName.split(".")[0],
              category: "Własne",
              size: `${(Math.random() * 2 + 0.1).toFixed(1)} MB`,
              dimensions: "1440 x 900 px",
              uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              description: "Ręcznie przesłany plik graficzny."
            };
            
            onChangeMediaList([...mediaList, JSON.stringify(newAsset)]);
            setUploadProgress(null);
            setUploadingName("");
          }, 400);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateUpload(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      simulateUpload(file.name);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteAsset = (idToDelete: string) => {
    // If it's one of the static mock files, we just hide/filter it from state or prevent deletions
    if (idToDelete.startsWith("mock-")) {
      alert("Elementy demonstracyjne biblioteki są chronione przed usunięciem.");
      return;
    }
    
    const indexToRemove = mediaList.findIndex(item => {
      if (item.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(item);
          return parsed.id === idToDelete;
        } catch {
          return false;
        }
      }
      return false;
    });

    if (indexToRemove > -1) {
      const updated = [...mediaList];
      updated.splice(indexToRemove, 1);
      onChangeMediaList(updated);
      setSelectedAsset(null);
    } else {
      // It might be a flat string URL in the library
      const updated = mediaList.filter(item => item !== idToDelete);
      onChangeMediaList(updated);
      setSelectedAsset(null);
    }
  };

  const handleUpdateAssetProperties = (updated: MediaAsset) => {
    const itemString = JSON.stringify(updated);
    
    // Check if the asset was pre-existing as a JSON string
    const indexToUpdate = mediaList.findIndex(item => {
      if (item.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(item);
          return parsed.id === updated.id;
        } catch {
          return false;
        }
      }
      return false;
    });

    if (indexToUpdate > -1) {
      const updatedList = [...mediaList];
      updatedList[indexToUpdate] = itemString;
      onChangeMediaList(updatedList);
    } else {
      // Save it as a new JSON record replacing flat string if needed
      onChangeMediaList([...mediaList, itemString]);
    }
    
    setSelectedAsset(updated);
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Upload Banner & Header */}
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter text-white flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-brand-cyan" />
            BIBLIOTEKA MULTIMEDIALNA
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Centralne Archiwum Zasobów Wizualnych & Promocyjnych
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3 bg-brand-cyan text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-brand-cyan/20 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" /> Prześlij Grafiki
          </button>
        </div>
      </div>

      {/* Drag & Drop Simulation */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-10 border-2 border-dashed rounded-[32px] transition-all flex flex-col items-center justify-center text-center gap-3 ${
          isDragging 
            ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan scale-[0.99]" 
            : "border-white/10 bg-white/2 text-slate-400 hover:border-white/20 hover:bg-white/3"
        }`}
      >
        {uploadProgress !== null ? (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center text-xs font-mono text-brand-cyan">
              <span className="truncate max-w-[200px] font-bold">Wgrywanie: {uploadingName}</span>
              <span className="font-black">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-cyan transition-all duration-150" 
                style={{ width: `${uploadProgress}%` }} 
              />
            </div>
            <p className="text-[9px] text-slate-600 uppercase font-black tracking-wider animate-pulse">
              Trwa optymalizacja i indeksowanie meta-tagów...
            </p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-cyan">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Przeciągnij i upuść plik graficzny tutaj</p>
              <p className="text-[10px] text-slate-500 mt-1">lub kliknij "Prześlij Grafiki" powyżej. Wspierane formaty: PNG, JPEG, WEBP.</p>
            </div>
          </>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Categories */}
        <div className="flex flex-wrap gap-1 bg-white/2 p-1.5 rounded-2xl border border-white/5 overflow-x-auto">
          {["Wszystkie", "Zdjęcia", "Grafiki", "Promocyjne", "Własne"].map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat 
                  ? "bg-brand-cyan text-slate-900 shadow-lg shadow-brand-cyan/10" 
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search controls */}
        <div className="flex gap-2 items-center flex-1 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wyszukaj po tytule lub specyfikacji..."
              className="w-full bg-white/2 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-xs text-white focus:ring-1 focus:ring-brand-cyan/20 outline-none"
            />
          </div>

          <div className="flex border border-white/5 rounded-2xl bg-white/2 p-1">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-600 hover:text-slate-300"}`}
              title="Siatka"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === "list" ? "bg-white/10 text-white" : "text-slate-600 hover:text-slate-300"}`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List View render */}
      {filteredAssets.length === 0 ? (
        <div className="py-24 rounded-[32px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center text-slate-600 gap-4">
          <ImageIcon className="w-16 h-16 opacity-10 text-brand-cyan" />
          <div>
            <p className="text-sm font-bold italic text-slate-400">Brak dopasowanych zasobów</p>
            <p className="text-[10px] text-slate-600 mt-1">Zmień filtry lub prześlij nowe grafiki do bazy medialnej.</p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAssets.map(asset => (
            <div 
              key={asset.id} 
              className="group bg-white/3 hover:bg-white/5 rounded-3xl overflow-hidden border border-white/5 hover:border-brand-cyan/20 transition-all flex flex-col"
            >
              {/* Image Preview Container */}
              <div className="aspect-video relative overflow-hidden bg-[#070707] border-b border-white/5 shrink-0">
                <img 
                  src={asset.url} 
                  alt={asset.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                
                {/* Category tag */}
                <span className="absolute top-3 left-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[8px] font-black uppercase text-brand-cyan tracking-wider ring-1 ring-white/10">
                  {asset.category}
                </span>

                {/* Hover Quick Actions overlay */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10 p-3">
                  <button 
                    onClick={() => setSelectedAsset(asset)}
                    className="p-3 bg-white text-slate-900 rounded-xl hover:scale-110 transition-all text-[11px] font-black uppercase"
                    title="Szczegóły"
                  >
                    Szczegóły
                  </button>
                  
                  <button 
                    onClick={() => handleCopyLink(asset.url, asset.id)}
                    className="p-3 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-brand-cyan hover:text-slate-900 transition-all"
                    title="Kopiuj link"
                  >
                    {copiedId === asset.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Asset Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white truncate italic" title={asset.title}>
                    {asset.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed">
                    {asset.description || "Brak opisu zasobu."}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono text-slate-600 border-t border-white/5 pt-3">
                  <span>{asset.dimensions}</span>
                  <span>{asset.size}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full border border-white/5 rounded-3xl overflow-hidden bg-white/2">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black tracking-widest text-slate-600 uppercase">
            <span className="col-span-6">Nazwa i Specyfikacja</span>
            <span className="col-span-2">Kategoria</span>
            <span className="col-span-2">Rozmiar</span>
            <span className="col-span-2 text-right">Akcje</span>
          </div>

          <div className="divide-y divide-white/5">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/3 transition-colors">
                
                {/* Info & Thumb */}
                <div className="col-span-6 flex gap-4 items-center min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#0c0c0c] shrink-0 border border-white/5">
                    <img src={asset.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate italic">{asset.title}</p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">{asset.description}</p>
                  </div>
                </div>

                {/* Category */}
                <div className="col-span-2">
                  <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {asset.category}
                  </span>
                </div>

                {/* File size & dimensions */}
                <div className="col-span-2 text-[10px] font-mono text-slate-500">
                  <p className="text-white">{asset.size}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">{asset.dimensions}</p>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2">
                  <button 
                    onClick={() => setSelectedAsset(asset)}
                    className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:bg-brand-cyan hover:text-slate-950 transition-colors"
                    title="Szczegóły"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleCopyLink(asset.url, asset.id)}
                    className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button 
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="p-2.5 bg-white/5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset Details Preview Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0b0b0c] border border-white/15 rounded-[40px] max-w-4xl w-full p-8 md:p-10 space-y-8 shadow-2xl relative animate-in zoom-in-95 duration-2 * select-text">
            
            {/* Close button */}
            <button 
              onClick={() => setSelectedAsset(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Content */}
            <div className="grid md:grid-cols-2 gap-8 items-start">
              
              {/* Media Preview Column */}
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 relative">
                  <img src={selectedAsset.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <a 
                    href={selectedAsset.url}
                    target="_blank"
                    rel="no-referrer"
                    className="absolute top-3 right-3 p-2 bg-black/80 rounded-lg text-white hover:text-brand-cyan transition-colors"
                    title="Otwórz w oryginalnej karcie"
                  >
                    <UploadCloud className="w-4 h-4 rotate-90" />
                  </a>
                </div>

                <div className="p-5 rounded-2xl bg-white/2 border border-white/5 space-y-3">
                  <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Właściwości pliku</div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block">Wymiary:</span>
                      <span className="text-white font-bold">{selectedAsset.dimensions}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Rozmiar:</span>
                      <span className="text-white font-bold">{selectedAsset.size}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Dodano:</span>
                      <span className="text-white font-bold">{selectedAsset.uploadedAt}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ID:</span>
                      <span className="text-slate-500 truncate block font-sans" title={selectedAsset.id}>{selectedAsset.id.substring(0, 10)}...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Properties Edit Column */}
              <div className="space-y-6">
                <div>
                  <span className="px-2.5 py-1 bg-brand-cyan/20 rounded-lg text-[9px] font-black text-brand-cyan uppercase tracking-wider">
                    {selectedAsset.category}
                  </span>
                  <h4 className="text-2xl font-black italic text-white tracking-tight mt-2">
                    Edycja Metadanych
                  </h4>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tytuł Zasobu</label>
                    <input 
                      value={selectedAsset.title}
                      onChange={(e) => handleUpdateAssetProperties({...selectedAsset, title: e.target.value})}
                      className="w-full bg-white/2 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-brand-cyan/40 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kategoria</label>
                    <select 
                      value={selectedAsset.category}
                      onChange={(e) => handleUpdateAssetProperties({...selectedAsset, category: e.target.value as any})}
                      className="w-full bg-white/2 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-brand-cyan/40 outline-none"
                    >
                      <option value="Zdjęcia" className="bg-black text-white">Zdjęcia</option>
                      <option value="Grafiki" className="bg-black text-white">Grafiki</option>
                      <option value="Promocyjne" className="bg-black text-white">Promocyjne</option>
                      <option value="Własne" className="bg-black text-white">Własne</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Krótki opis / Atrybucja</label>
                    <textarea 
                      value={selectedAsset.description}
                      onChange={(e) => handleUpdateAssetProperties({...selectedAsset, description: e.target.value})}
                      rows={3}
                      className="w-full bg-white/2 border border-white/10 rounded-xl p-4 text-xs text-white focus:ring-1 focus:ring-brand-cyan/40 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
                  <button 
                    onClick={() => handleCopyLink(selectedAsset.url, selectedAsset.id)}
                    className="flex-1 py-3.5 bg-brand-cyan text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider hover:scale-102 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedId === selectedAsset.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedId === selectedAsset.id ? "Skopiowano!" : "Kopiuj Direct Link"}
                  </button>

                  <button 
                    onClick={() => handleDeleteAsset(selectedAsset.id)}
                    className="p-3.5 border border-red-500/30 text-red-500 bg-red-500/5 rounded-2xl hover:bg-red-500/20 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Usuń zasób
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
