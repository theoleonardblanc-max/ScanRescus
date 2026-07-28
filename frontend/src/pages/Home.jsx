import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  Cpu, Upload, ScanLine, Loader2, Pencil, Check, X, Trash2, Tag, Euro,
  FileText, Gauge, ImagePlus, Zap, LogOut, ShoppingCart, Star, ExternalLink,
  FileDown, Search, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, API, ASSET } from "@/context/AuthContext";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const imgSrc = (item, preview) =>
  preview || (item?.image_url ? `${ASSET}${item.image_url}` : "");

function ConfidenceBadge({ level }) {
  const map = {
    "Élevée": "text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10",
    "Moyenne": "text-[#22D3EE] border-[#22D3EE]/40 bg-[#22D3EE]/10",
    "Faible": "text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10",
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
      <div className="flex items-center gap-2 text-[#8B85A8] text-xs uppercase tracking-[0.2em]">
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
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/analysis/${item.id}/offers`);
      setOffers(data.offers || []);
      toast.success("Offres générées !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la génération des offres.");
    } finally { setBusy(false); }
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
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-[#A855F7]" />
          <h3 className="font-display text-xl font-bold tracking-tight">Meilleures offres</h3>
        </div>
        <Button data-testid="find-offers-btn" size="sm" onClick={load} disabled={busy}
          className="rounded-full bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white hover:opacity-90">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> Trouver les meilleures offres</>}
        </Button>
      </div>

      {offers.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {offers.map((o, i) => (
            <motion.div key={i} data-testid="offer-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="p-4 rounded-xl border border-white/10 bg-black/30 hover:border-[#A855F7]/50 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="font-tech font-bold text-white">{o.seller}</span>
                <span className="text-[#22C55E] font-bold text-lg">{o.price}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#8B85A8]">
                <span className="px-2 py-0.5 rounded-full border border-[#22D3EE]/30 text-[#22D3EE]">{o.quality}</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" /> {o.rating}</span>
              </div>
              {o.note && <p className="text-sm text-slate-300 mt-2">{o.note}</p>}
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[#8B85A8] uppercase tracking-[0.2em] self-center flex items-center gap-1"><Search className="w-3 h-3" /> Rechercher sur :</span>
        {shops.map((s) => (
          <a key={s.label} data-testid={`shop-${s.label}`} href={s.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-white/15 text-white hover:bg-[#22D3EE] hover:text-black transition-colors duration-200">
            {s.label} <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ item, preview, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(item);
  useEffect(() => { setForm(item); }, [item]);

  const save = async () => {
    await onSave(item.id, { name: form.name, category: form.category, price_estimate: form.price_estimate, description: form.description });
    setEditing(false);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFillColor(5, 3, 15); doc.rect(0, 0, 210, 297, "F");
    doc.setTextColor(34, 211, 238); doc.setFontSize(22);
    doc.text("ScanRescue — Fiche composant", 15, 22);
    doc.setDrawColor(168, 85, 247); doc.line(15, 27, 195, 27);
    doc.setTextColor(255, 255, 255); doc.setFontSize(16);
    doc.text(item.name || "", 15, 42);
    doc.setFontSize(11); doc.setTextColor(180, 180, 200);
    doc.text(`Catégorie : ${item.category || "-"}`, 15, 54);
    doc.setTextColor(34, 197, 94);
    doc.text(`Prix estimé : ${item.price_estimate || "-"}`, 15, 63);
    doc.setTextColor(180, 180, 200);
    doc.text(`Confiance : ${item.confidence || "-"}`, 15, 72);
    doc.setTextColor(230, 230, 240); doc.setFontSize(12);
    doc.text("Description / Utilité :", 15, 86);
    doc.setFontSize(11); doc.setTextColor(200, 200, 215);
    doc.text(doc.splitTextToSize(item.description || "-", 180), 15, 94);
    doc.setTextColor(120, 120, 150); doc.setFontSize(9);
    doc.text("fait par theo pour le bac 2026-2027 — ScanRescue", 15, 285);
    doc.save(`compo-${(item.name || "fiche").replace(/\s+/g, "-").toLowerCase()}.pdf`);
  };

  return (
    <motion.div data-testid="result-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 neon-border rounded-2xl bg-[#0B0819]/80 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#A855F7]/15 blur-3xl pointer-events-none" />
      <div className="grid md:grid-cols-2 gap-8 relative">
        <div>
          <img src={imgSrc(item, preview)} alt={item.name} className="w-full aspect-square object-cover rounded-xl border border-white/10" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <ConfidenceBadge level={item.confidence} />
            <div className="flex gap-2">
              <Button data-testid="export-pdf-btn" size="sm" variant="ghost" onClick={exportPdf} className="text-[#EC4899] hover:bg-[#EC4899] hover:text-white">
                <FileDown className="w-4 h-4" />
              </Button>
              {!editing ? (
                <>
                  <Button data-testid="edit-btn" size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-[#22D3EE] hover:bg-[#22D3EE] hover:text-black">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button data-testid="delete-result-btn" size="sm" variant="ghost" onClick={() => onDelete(item.id)} className="text-red-400 hover:bg-red-500 hover:text-white">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button data-testid="save-btn" size="sm" onClick={save} className="bg-[#22C55E] text-black hover:bg-[#22C55E]/80">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button data-testid="cancel-btn" size="sm" variant="ghost" onClick={() => { setForm(item); setEditing(false); }} className="text-slate-300 hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <Field icon={Tag} label="Nom du composant">
            {editing ? <Input data-testid="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black/40 border-white/10 text-white font-display" />
              : <h2 data-testid="result-name" className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">{item.name}</h2>}
          </Field>
          <Field icon={Cpu} label="Catégorie">
            {editing ? <Input data-testid="edit-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-black/40 border-white/10 text-white" />
              : <p className="text-slate-300">{item.category || "—"}</p>}
          </Field>
          <Field icon={Euro} label="Prix estimé">
            {editing ? <Input data-testid="edit-price" value={form.price_estimate} onChange={(e) => setForm({ ...form, price_estimate: e.target.value })} className="bg-black/40 border-white/10 text-[#22C55E]" />
              : <p data-testid="result-price" className="text-2xl font-bold text-[#22C55E] neon-text-cyan">{item.price_estimate || "—"}</p>}
          </Field>
          <Field icon={FileText} label="Description / Utilité">
            {editing ? <Textarea data-testid="edit-description" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-black/40 border-white/10 text-white resize-none" />
              : <p className="text-slate-300 leading-relaxed">{item.description || "—"}</p>}
          </Field>
        </div>
      </div>
      <Offers item={item} />
    </motion.div>
  );
}

function HistoryItem({ item, onSelect, index }) {
  return (
    <motion.button data-testid="history-item" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      onClick={() => onSelect(item)}
      className="group text-left border border-white/10 rounded-xl overflow-hidden bg-[#0B0819] hover:border-[#22D3EE]/60 transition-colors duration-200">
      <div className="aspect-square overflow-hidden">
        <img src={imgSrc(item)} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="p-4 space-y-1">
        <p className="font-display text-sm font-medium text-white truncate">{item.name}</p>
        <p className="text-[#22C55E] text-sm">{item.price_estimate || "—"}</p>
      </div>
    </motion.button>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try { const res = await axios.get(`${API}/history`); setHistory(res.data); } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) { toast.error("Veuillez choisir une image valide."); return; }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl); setCurrent(null); setLoading(true);
    try {
      const res = await axios.post(`${API}/analyze`, { image_base64: dataUrl });
      setCurrent(res.data);
      toast.success("Composant détecté !");
      loadHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Échec de l'analyse.");
      setPreview(null);
    } finally { setLoading(false); }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); };

  const saveEdit = async (id, fields) => {
    const res = await axios.put(`${API}/analysis/${id}`, fields);
    setCurrent(res.data); toast.success("Modifications enregistrées."); loadHistory();
  };
  const deleteItem = async (id) => {
    await axios.delete(`${API}/analysis/${id}`);
    if (current?.id === id) { setCurrent(null); setPreview(null); }
    toast.success("Analyse supprimée."); loadHistory();
  };

  return (
    <div className="min-h-screen text-white rgb-grid">
      <nav className="sticky top-0 z-50 bg-[#05030F]/70 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#22D3EE] to-[#A855F7] flex items-center justify-center animate-pulse-glow">
              <ScanLine className="w-5 h-5 text-black" />
            </div>
            <span className="font-tech font-900 tracking-widest text-lg neon-text-cyan">SCAN<span className="text-[#A855F7] neon-text-purple">RESCUE</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-2 text-xs text-[#8B85A8]">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#22D3EE] to-[#A855F7] flex items-center justify-center text-[10px] text-black font-bold">
                {(user?.name || "?").charAt(0).toUpperCase()}
              </div>
              {user?.name}
            </span>
            <Button data-testid="logout-btn" size="sm" variant="ghost" onClick={logout} className="text-[#8B85A8] hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12 relative">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#A855F7]/10 blur-3xl animate-blob pointer-events-none" />
        <div className="max-w-3xl relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs uppercase tracking-[0.2em] border border-[#22D3EE]/30 rounded-full text-[#22D3EE]">
            <Zap className="w-3.5 h-3.5" /> IA Vision Pro · GPT-5.4
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none">
            Scanne un composant.<br />
            <span className="text-[#22D3EE] neon-text-cyan">Trouve</span> <span className="text-[#A855F7] neon-text-purple">le meilleur prix.</span>
          </h1>
          <p className="mt-6 text-[#8B85A8] text-base md:text-lg leading-relaxed max-w-xl">
            Importe un fichier ou prends une photo d'un composant électronique / pièce informatique.
            L'IA l'identifie, estime son prix, explique son utilité et te trouve les meilleures offres.
          </p>
        </div>

        <div data-testid="upload-zone" onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)} onDrop={onDrop}
          className={`mt-12 cursor-pointer rounded-3xl border-2 border-dashed p-10 md:p-16 flex flex-col items-center justify-center text-center transition-colors duration-200 ${
            dragging ? "border-[#22D3EE] bg-[#22D3EE]/5" : "border-white/15 bg-[#0B0819]/60 hover:border-[#A855F7]/60"
          }`}>
          <input ref={inputRef} data-testid="file-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22D3EE]/20 to-[#A855F7]/20 border border-white/10 flex items-center justify-center mb-5">
            {loading ? <Loader2 className="w-7 h-7 text-[#22D3EE] animate-spin" /> : <ImagePlus className="w-7 h-7 text-[#22D3EE]" />}
          </div>
          <p className="font-display text-xl font-medium tracking-tight">{loading ? "Analyse en cours…" : "Glisse un fichier ou clique pour importer"}</p>
          <p className="text-[#8B85A8] text-sm mt-2">JPG, PNG ou WEBP — fichier ou photo</p>
          {!loading && (
            <Button data-testid="upload-btn" type="button" className="mt-6 rounded-full bg-gradient-to-r from-[#22D3EE] to-[#A855F7] text-black font-bold hover:opacity-90 px-6">
              <Upload className="w-4 h-4 mr-2" /> Importer une image
            </Button>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <AnimatePresence mode="wait">
          {loading && preview && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-8 p-8 neon-border rounded-2xl bg-[#0B0819]/80">
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                <img src={preview} alt="aperçu" className="w-full aspect-square object-cover" />
                <div className="absolute left-0 right-0 h-0.5 bg-[#22D3EE] shadow-[0_0_16px_#22D3EE] scanline" />
              </div>
              <div className="flex flex-col justify-center items-start gap-4 text-[#8B85A8]">
                <Loader2 className="w-8 h-8 text-[#22D3EE] animate-spin" />
                <p className="font-display text-xl text-white">L'IA analyse ton composant…</p>
                <p className="text-sm">Identification, estimation du prix et description.</p>
              </div>
            </motion.div>
          )}
          {!loading && current && (
            <ResultCard key={current.id} item={current} preview={current === history.find(h => h.id === current.id) ? null : preview}
              onSave={saveEdit} onDelete={deleteItem} />
          )}
        </AnimatePresence>
      </section>

      {history.length > 0 && (
        <section data-testid="history-section" className="max-w-6xl mx-auto px-6 pb-24">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Historique</h2>
            <span className="text-xs text-[#8B85A8] uppercase tracking-[0.2em]">{history.length} analyses</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {history.map((item, i) => (
              <HistoryItem key={item.id} item={item} index={i} onSelect={(it) => { setCurrent(it); setPreview(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 bg-[#05030F]">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#22D3EE]/20 to-[#A855F7]/20 border border-[#22D3EE]/30 flex items-center justify-center rgb-anim">
            <ScanLine className="w-5 h-5 text-[#22D3EE]" />
          </div>
          <p data-testid="footer-credit" className="font-display text-xl md:text-2xl font-bold tracking-tight text-white neon-text-cyan">
            fait par theo pour le bac 2026-2027
          </p>
          <p className="text-[#8B85A8] text-sm">ScanRescue — Détection de composants par IA</p>
        </div>
      </footer>
    </div>
  );
}
