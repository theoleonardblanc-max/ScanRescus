import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  Cpu, Upload, ScanLine, Loader2, Pencil, Check, X, Trash2, Tag, Euro,
  FileText, Gauge, ImagePlus, Zap, LogOut, ShoppingCart, Star, ExternalLink,
  FileDown, Search, Sparkles, Share2, Volume2, VolumeX, GitCompare, PlayCircle, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth, API, ASSET } from "@/context/AuthContext";
import { sfx, isSfxEnabled, setSfxEnabled } from "@/lib/sfx";
import StatsBar from "@/components/StatsBar";
import CompareModal from "@/components/CompareModal";

const fileToDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});

const imgSrc = (item, preview) => preview || (item?.image_url ? `${ASSET}${item.image_url}` : "");

function ConfidenceBadge({ level }) {
  const map = {
    "Élevée": "text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10",
    "Moyenne": "text-neon-cyan border-neon-cyan/40 bg-neon-cyan/10",
    "Faible": "text-neon-yuzu border-neon-yuzu/40 bg-neon-yuzu/10",
  };
  return (
    <span data-testid="confidence-badge" className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-[0.2em] border rounded-full ${map[level] || "text-slate-400 border-white/10 bg-white/5"}`}>
      <Gauge className="w-3 h-3" /> {level || "—"}
    </span>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.2em] font-head">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}

function Offers({ item }) {
  const [offers, setOffers] = useState(item.offers || []);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOffers(item.offers || []); }, [item]);

  const load = async () => {
    sfx.click(); setBusy(true);
    try {
      const { data } = await axios.post(`${API}/analysis/${item.id}/offers`);
      setOffers(data.offers || []); sfx.success(); toast.success("Offres générées !");
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur lors de la génération des offres."); }
    finally { setBusy(false); }
  };

  const q = encodeURIComponent(item.name);
  const shops = [
    { label: "Amazon", url: `https://www.amazon.fr/s?k=${q}` },
    { label: "LDLC", url: `https://www.ldlc.com/recherche/${q}/` },
    { label: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${q}` },
  ];

  return (
    <div data-testid="offers-block" className="mt-8 border-t border-white/10 pt-8">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-neon-purple" /><h3 className="font-head text-xl font-bold tracking-wide">MEILLEURES OFFRES</h3></div>
        <Button data-testid="find-offers-btn" size="sm" onClick={load} disabled={busy} onMouseEnter={sfx.hover}
          className="rounded-md bg-neon-purple text-white hover:bg-neon-purple/80 font-head tracking-wide">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> TROUVER LES OFFRES</>}
        </Button>
      </div>
      {offers.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {offers.map((o, i) => (
            <motion.div key={i} data-testid="offer-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="p-4 rounded-lg border border-white/10 bg-black/40 hover:border-neon-purple/50 hover:-translate-y-1 transition-[transform,border-color] duration-200">
              <div className="flex items-center justify-between">
                <span className="font-data font-bold text-white">{o.seller}</span>
                <span className="text-[#22C55E] font-data font-bold text-lg">{o.price}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full border border-neon-cyan/30 text-neon-cyan">{o.quality}</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-neon-yuzu fill-neon-yuzu" /> {o.rating}</span>
              </div>
              {o.note && <p className="text-sm text-slate-300 mt-2">{o.note}</p>}
            </motion.div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] self-center flex items-center gap-1 font-head"><Search className="w-3 h-3" /> Rechercher :</span>
        {shops.map((s) => (
          <a key={s.label} data-testid={`shop-${s.label}`} href={s.url} target="_blank" rel="noopener noreferrer" onMouseEnter={sfx.hover}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-white/15 text-white hover:bg-neon-cyan hover:text-black hover:-translate-y-0.5 transition-[transform,background-color,color] duration-200">
            {s.label} <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ item, preview, onSave, onDelete, onToggleFav }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(item);
  const [sharing, setSharing] = useState(false);
  useEffect(() => { setForm(item); }, [item]);

  const save = async () => {
    await onSave(item.id, { name: form.name, category: form.category, price_estimate: form.price_estimate, description: form.description });
    setEditing(false);
  };

  const share = async () => {
    sfx.click(); setSharing(true);
    try {
      const { data } = await axios.post(`${API}/analysis/${item.id}/share`);
      const url = `${window.location.origin}/c/${data.share_id}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Lien de partage copié !", { description: url });
    } catch { toast.error("Impossible de créer le lien."); }
    finally { setSharing(false); }
  };

  const exportPdf = () => {
    sfx.click();
    const doc = new jsPDF();
    doc.setFillColor(5, 5, 5); doc.rect(0, 0, 210, 297, "F");
    doc.setTextColor(0, 240, 255); doc.setFontSize(22); doc.text("ScanRescue — Fiche composant", 15, 22);
    doc.setDrawColor(176, 38, 255); doc.line(15, 27, 195, 27);
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text(item.name || "", 15, 42);
    doc.setFontSize(11); doc.setTextColor(180, 180, 200); doc.text(`Catégorie : ${item.category || "-"}`, 15, 54);
    doc.setTextColor(34, 197, 94); doc.text(`Prix estimé : ${item.price_estimate || "-"}`, 15, 63);
    doc.setTextColor(180, 180, 200); doc.text(`Confiance : ${item.confidence || "-"}`, 15, 72);
    doc.setTextColor(230, 230, 240); doc.setFontSize(12); doc.text("Description / Utilité :", 15, 86);
    doc.setFontSize(11); doc.setTextColor(200, 200, 215);
    const lines = doc.splitTextToSize(item.description || "-", 180);
    doc.text(lines, 15, 94);
    doc.setTextColor(120, 120, 150); doc.setFontSize(9); doc.text("fait par theo pour le bac 2026-2027 — ScanRescue", 15, 285);
    doc.save(`scanrescue-${(item.name || "fiche").replace(/\s+/g, "-").toLowerCase()}.pdf`);
  };

  return (
    <motion.div data-testid="result-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 glass glow-cyan rounded-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-neon-purple/15 blur-3xl pointer-events-none" />
      <div className="absolute top-6 right-8 vertical-text font-display text-white/5 text-3xl select-none pointer-events-none">部品</div>
      <div className="grid md:grid-cols-2 gap-8 relative">
        <div className="relative">
          <img src={imgSrc(item, preview)} alt={item.name} className="w-full aspect-square object-cover rounded-xl border border-white/10" />
          <button data-testid="favorite-btn" onClick={() => { sfx.click(); onToggleFav(item); }}
            className="absolute top-3 left-3 w-9 h-9 rounded-full glass flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <Heart className={`w-4 h-4 ${item.is_favorite ? "text-neon-crimson fill-neon-crimson" : "text-white"}`} />
          </button>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <ConfidenceBadge level={item.confidence} />
            <div className="flex gap-1.5">
              <Button data-testid="share-btn" size="sm" variant="ghost" onClick={share} disabled={sharing} className="text-neon-cyan hover:bg-neon-cyan hover:text-black">
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              </Button>
              <Button data-testid="export-pdf-btn" size="sm" variant="ghost" onClick={exportPdf} className="text-neon-crimson hover:bg-neon-crimson hover:text-white"><FileDown className="w-4 h-4" /></Button>
              {!editing ? (
                <>
                  <Button data-testid="edit-btn" size="sm" variant="ghost" onClick={() => { sfx.click(); setEditing(true); }} className="text-neon-cyan hover:bg-neon-cyan hover:text-black"><Pencil className="w-4 h-4" /></Button>
                  <Button data-testid="delete-result-btn" size="sm" variant="ghost" onClick={() => onDelete(item.id)} className="text-red-400 hover:bg-red-500 hover:text-white"><Trash2 className="w-4 h-4" /></Button>
                </>
              ) : (
                <>
                  <Button data-testid="save-btn" size="sm" onClick={save} className="bg-[#22C55E] text-black hover:bg-[#22C55E]/80"><Check className="w-4 h-4" /></Button>
                  <Button data-testid="cancel-btn" size="sm" variant="ghost" onClick={() => { setForm(item); setEditing(false); }} className="text-slate-300 hover:bg-white/10"><X className="w-4 h-4" /></Button>
                </>
              )}
            </div>
          </div>
          <Field icon={Tag} label="Nom du composant">
            {editing ? <Input data-testid="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black/50 border-white/10 text-white font-head text-lg" />
              : <h2 data-testid="result-name" className="font-head text-2xl md:text-3xl font-bold tracking-tight text-white">{item.name}</h2>}
          </Field>
          <Field icon={Cpu} label="Catégorie">
            {editing ? <Input data-testid="edit-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-black/50 border-white/10 text-white" />
              : <p className="text-slate-300">{item.category || "—"}</p>}
          </Field>
          <Field icon={Euro} label="Prix estimé">
            {editing ? <Input data-testid="edit-price" value={form.price_estimate} onChange={(e) => setForm({ ...form, price_estimate: e.target.value })} className="bg-black/50 border-white/10 text-[#22C55E] font-data" />
              : <p data-testid="result-price" className="text-2xl font-data font-bold text-[#22C55E] neon-cyan">{item.price_estimate || "—"}</p>}
          </Field>
          <Field icon={FileText} label="Description / Utilité">
            {editing ? <Textarea data-testid="edit-description" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-black/50 border-white/10 text-white resize-none" />
              : <p className="text-slate-300 leading-relaxed">{item.description || "—"}</p>}
          </Field>
        </div>
      </div>
      <Offers item={item} />
    </motion.div>
  );
}

function HistoryItem({ item, onSelect, index, selectable, selected, onToggleSelect }) {
  return (
    <motion.div data-testid="history-item" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className={`group relative border rounded-xl overflow-hidden bg-[#0B0C10] hover:-translate-y-1 transition-[transform,border-color] duration-200 ${selected ? "border-neon-cyan" : "border-white/10 hover:border-neon-cyan/60"}`}>
      {item.is_favorite && <Heart className="absolute top-2 right-2 z-10 w-4 h-4 text-neon-crimson fill-neon-crimson drop-shadow" />}
      {selectable && (
        <button data-testid="compare-select" onClick={() => onToggleSelect(item)}
          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md border flex items-center justify-center ${selected ? "bg-neon-cyan border-neon-cyan text-black" : "bg-black/60 border-white/30 text-transparent"}`}>
          <Check className="w-4 h-4" />
        </button>
      )}
      <button className="w-full text-left" onClick={() => { sfx.hover(); onSelect(item); }} onMouseEnter={sfx.hover}>
        <div className="aspect-square overflow-hidden">
          <img src={imgSrc(item)} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
        <div className="p-4 space-y-1">
          <p className="font-head font-bold text-white truncate">{item.name}</p>
          <p className="text-[#22C55E] font-data text-sm">{item.price_estimate || "—"}</p>
        </div>
      </button>
    </motion.div>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [sound, setSound] = useState(isSfxEnabled());
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState("recent");
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([axios.get(`${API}/history`), axios.get(`${API}/stats`)]);
      setHistory(h.data); setStats(s.data);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const runUpload = async (dataUrl) => {
    setCurrent(null); setLoading(true); sfx.scan();
    try {
      const res = await axios.post(`${API}/analyze`, { image_base64: dataUrl });
      setCurrent(res.data); sfx.success(); toast.success("Composant détecté !"); refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Échec de l'analyse."); setPreview(null); }
    finally { setLoading(false); }
  };

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) { toast.error("Veuillez choisir une image valide."); return; }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    runUpload(dataUrl);
  };

  const runDemo = async () => {
    sfx.click(); setPreview(null); setCurrent(null); setLoading(true); sfx.scan();
    try {
      const res = await axios.post(`${API}/analyze/demo`);
      setCurrent(res.data); sfx.success(); toast.success("Exemple analysé !"); refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Échec de l'exemple."); }
    finally { setLoading(false); }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); };

  const saveEdit = async (id, fields) => {
    const res = await axios.put(`${API}/analysis/${id}`, fields);
    setCurrent(res.data); toast.success("Modifications enregistrées."); refresh();
  };
  const deleteItem = async (id) => {
    sfx.click(); await axios.delete(`${API}/analysis/${id}`);
    if (current?.id === id) { setCurrent(null); setPreview(null); }
    toast.success("Analyse supprimée."); refresh();
  };
  const toggleFav = async (item) => {
    const res = await axios.put(`${API}/analysis/${item.id}`, { is_favorite: !item.is_favorite });
    if (current?.id === item.id) setCurrent(res.data);
    refresh();
  };

  const toggleSound = () => { const v = !sound; setSound(v); setSfxEnabled(v); if (v) sfx.click(); };

  const toggleSelect = (item) => {
    setSelected((prev) => {
      if (prev.find((p) => p.id === item.id)) return prev.filter((p) => p.id !== item.id);
      if (prev.length >= 3) { toast.info("3 composants maximum."); return prev; }
      return [...prev, item];
    });
  };

  const categories = useMemo(() => Array.from(new Set(history.map((h) => h.category).filter(Boolean))), [history]);

  const filtered = useMemo(() => {
    let list = history.filter((h) =>
      (!query || h.name.toLowerCase().includes(query.toLowerCase())) &&
      (cat === "all" || h.category === cat) &&
      (!favOnly || h.is_favorite));
    if (sort === "price_asc") list = [...list].sort((a, b) => (a.price_value || 0) - (b.price_value || 0));
    else if (sort === "price_desc") list = [...list].sort((a, b) => (b.price_value || 0) - (a.price_value || 0));
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [history, query, cat, favOnly, sort]);

  return (
    <div className="min-h-screen text-white cyber-grid">
      <nav className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neon-cyan flex items-center justify-center animate-pulse-glow"><ScanLine className="w-5 h-5 text-black" /></div>
            <span className="font-display tracking-widest text-lg neon-cyan">SCAN<span className="text-neon-crimson neon-crimson">RESCUE</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Button data-testid="sound-toggle" size="sm" variant="ghost" onClick={toggleSound} className="text-muted-foreground hover:text-white hover:bg-white/10">
              {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <span className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-neon-purple flex items-center justify-center text-[10px] text-white font-bold">{(user?.name || "?").charAt(0).toUpperCase()}</div>
              {user?.name}
            </span>
            <Button data-testid="logout-btn" size="sm" variant="ghost" onClick={() => { sfx.click(); logout(); }} className="text-muted-foreground hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-14 md:pt-20 pb-10 relative">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-neon-crimson/10 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute top-4 right-8 vertical-text font-display text-white/5 text-6xl select-none pointer-events-none hidden md:block">スキャン</div>
        <div className="max-w-3xl relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs uppercase tracking-[0.2em] border border-neon-cyan/30 rounded-full text-neon-cyan font-head"><Zap className="w-3.5 h-3.5" /> IA Vision Pro · GPT-5.4</div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
            Scanne. Identifie.<br /><span className="text-neon-cyan neon-cyan">Trouve</span> <span className="text-neon-crimson neon-crimson">le meilleur prix.</span>
          </h1>
          <p className="mt-6 text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl">
            Importe un fichier ou prends une photo d'un composant. L'IA l'identifie, estime son prix, explique son utilité et te trouve les meilleures offres.
          </p>
        </div>

        <div className="mt-10"><StatsBar stats={stats} /></div>

        <div data-testid="upload-zone" onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
          className={`mt-8 cursor-pointer rounded-2xl border-2 border-dashed p-10 md:p-14 flex flex-col items-center justify-center text-center transition-colors duration-200 ${dragging ? "border-neon-cyan bg-neon-cyan/5" : "border-white/15 bg-black/30 hover:border-neon-purple/60"}`}>
          <input ref={inputRef} data-testid="file-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="w-16 h-16 rounded-xl bg-black/60 border border-neon-cyan/20 flex items-center justify-center mb-5">
            {loading ? <Loader2 className="w-7 h-7 text-neon-cyan animate-spin" /> : <ImagePlus className="w-7 h-7 text-neon-cyan" />}
          </div>
          <p className="font-head text-xl font-bold tracking-wide">{loading ? "ANALYSE EN COURS…" : "GLISSE UN FICHIER OU CLIQUE"}</p>
          <p className="text-muted-foreground text-sm mt-2 font-data">JPG · PNG · WEBP</p>
          {!loading && (
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Button data-testid="upload-btn" type="button" onMouseEnter={sfx.hover} className="rounded-md bg-neon-cyan text-black font-head font-bold tracking-wide hover:bg-neon-cyan/80 glow-cyan px-6"><Upload className="w-4 h-4 mr-2" /> IMPORTER</Button>
              <Button data-testid="demo-btn" type="button" variant="outline" onClick={(e) => { e.stopPropagation(); runDemo(); }} onMouseEnter={sfx.hover} className="rounded-md border-neon-purple/40 text-neon-purple hover:bg-neon-purple hover:text-white font-head tracking-wide px-6"><PlayCircle className="w-4 h-4 mr-2" /> ESSAYER UN EXEMPLE</Button>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-12">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid md:grid-cols-2 gap-8 p-8 glass glow-cyan rounded-2xl">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 aspect-square">
                {preview ? <img src={preview} alt="aperçu" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ScanLine className="w-16 h-16 text-neon-cyan/40" /></div>}
                <div className="absolute left-0 right-0 h-0.5 bg-neon-cyan shadow-[0_0_16px_#00F0FF] scanline" />
              </div>
              <div className="flex flex-col justify-center items-start gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
                <p className="font-head text-xl text-white tracking-wide">L'IA ANALYSE TON COMPOSANT…</p>
                <p className="text-sm">Identification, estimation du prix et description.</p>
              </div>
            </motion.div>
          )}
          {!loading && current && (
            <ResultCard key={current.id} item={current} preview={history.find((h) => h.id === current.id) ? null : preview} onSave={saveEdit} onDelete={deleteItem} onToggleFav={toggleFav} />
          )}
        </AnimatePresence>
      </section>

      {history.length > 0 && (
        <section data-testid="history-section" className="max-w-6xl mx-auto px-6 pb-24">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <h2 className="font-head text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">HISTORIQUE <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-data">{filtered.length}</span></h2>
            <div className="flex items-center gap-2">
              <Button data-testid="compare-toggle" size="sm" variant={compareMode ? "default" : "outline"} onClick={() => { sfx.click(); setCompareMode(!compareMode); setSelected([]); }} className={compareMode ? "bg-neon-cyan text-black" : "border-white/15 text-white hover:bg-white/10"}><GitCompare className="w-4 h-4 mr-2" /> Comparer</Button>
              {compareMode && <Button data-testid="open-compare" size="sm" disabled={selected.length < 2} onClick={() => { sfx.click(); setCompareOpen(true); }} className="bg-neon-purple text-white hover:bg-neon-purple/80">Voir ({selected.length})</Button>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-cyan" />
              <Input data-testid="history-search" placeholder="Rechercher un composant…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 bg-black/40 border-white/10 text-white" />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger data-testid="filter-category" className="w-[180px] bg-black/40 border-white/10 text-white"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent className="bg-[#0B0C10] border-white/10 text-white">
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger data-testid="filter-sort" className="w-[160px] bg-black/40 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0B0C10] border-white/10 text-white">
                <SelectItem value="recent">Plus récent</SelectItem>
                <SelectItem value="price_asc">Prix croissant</SelectItem>
                <SelectItem value="price_desc">Prix décroissant</SelectItem>
                <SelectItem value="name">Nom (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="filter-fav" size="sm" variant={favOnly ? "default" : "outline"} onClick={() => { sfx.click(); setFavOnly(!favOnly); }} className={favOnly ? "bg-neon-crimson text-white" : "border-white/15 text-white hover:bg-white/10"}><Heart className={`w-4 h-4 mr-2 ${favOnly ? "fill-white" : ""}`} /> Favoris</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((item, i) => (
              <HistoryItem key={item.id} item={item} index={i} selectable={compareMode} selected={!!selected.find((s) => s.id === item.id)} onToggleSelect={toggleSelect}
                onSelect={(it) => { setCurrent(it); setPreview(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            ))}
          </div>
        </section>
      )}

      <CompareModal open={compareOpen} onOpenChange={setCompareOpen} items={selected} />

      <footer className="border-t border-white/10 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-black/60 border border-neon-cyan/30 flex items-center justify-center animate-flicker"><ScanLine className="w-5 h-5 text-neon-cyan" /></div>
          <p data-testid="footer-credit" className="font-display text-lg md:text-2xl tracking-tight text-white neon-cyan">fait par theo pour le bac 2026-2027</p>
          <p className="text-muted-foreground text-sm font-data">ScanRescue — 部品スキャナー · Détection de composants par IA</p>
        </div>
      </footer>
    </div>
  );
}
