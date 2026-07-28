import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Cpu, Upload, ScanLine, Loader2, Pencil, Check, X, Trash2,
  Tag, Euro, FileText, Gauge, ImagePlus, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function ConfidenceBadge({ level }) {
  const map = {
    "Élevée": "text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10",
    "Moyenne": "text-[#22D3EE] border-[#22D3EE]/40 bg-[#22D3EE]/10",
    "Faible": "text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10",
  };
  const cls = map[level] || "text-slate-400 border-white/10 bg-white/5";
  return (
    <span data-testid="confidence-badge" className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-[0.2em] border rounded-full ${cls}`}>
      <Gauge className="w-3 h-3" /> {level || "—"}
    </span>
  );
}

function ResultCard({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(item);

  useEffect(() => { setForm(item); }, [item]);

  const save = async () => {
    await onSave(item.id, {
      name: form.name, category: form.category,
      price_estimate: form.price_estimate, description: form.description,
    });
    setEditing(false);
  };

  return (
    <motion.div
      data-testid="result-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="grid md:grid-cols-2 gap-8 p-6 md:p-8 border border-white/10 rounded-2xl bg-[#111116] relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#22D3EE]/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <img src={item.image_base64} alt={item.name} className="w-full aspect-square object-cover rounded-xl border border-white/10" />
      </div>

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <ConfidenceBadge level={item.confidence} />
          <div className="flex gap-2">
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
          {editing ? (
            <Input data-testid="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black/40 border-white/10 text-white font-display" />
          ) : (
            <h2 data-testid="result-name" className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">{item.name}</h2>
          )}
        </Field>

        <Field icon={Cpu} label="Catégorie">
          {editing ? (
            <Input data-testid="edit-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-black/40 border-white/10 text-white" />
          ) : (
            <p className="text-slate-300">{item.category || "—"}</p>
          )}
        </Field>

        <Field icon={Euro} label="Prix estimé">
          {editing ? (
            <Input data-testid="edit-price" value={form.price_estimate} onChange={(e) => setForm({ ...form, price_estimate: e.target.value })} className="bg-black/40 border-white/10 text-[#22C55E]" />
          ) : (
            <p data-testid="result-price" className="text-2xl font-bold text-[#22C55E]">{item.price_estimate || "—"}</p>
          )}
        </Field>

        <Field icon={FileText} label="Description / Utilité">
          {editing ? (
            <Textarea data-testid="edit-description" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-black/40 border-white/10 text-white resize-none" />
          ) : (
            <p className="text-slate-300 leading-relaxed">{item.description || "—"}</p>
          )}
        </Field>
      </div>
    </motion.div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[#94A3B8] text-xs uppercase tracking-[0.2em]">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}

function HistoryItem({ item, onSelect, index }) {
  return (
    <motion.button
      data-testid="history-item"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onSelect(item)}
      className="group text-left border border-white/10 rounded-xl overflow-hidden bg-[#111116] hover:border-[#22D3EE]/50 transition-colors duration-200"
    >
      <div className="aspect-square overflow-hidden">
        <img src={item.image_base64} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="p-4 space-y-1">
        <p className="font-display text-sm font-medium text-white truncate">{item.name}</p>
        <p className="text-[#22C55E] text-sm">{item.price_estimate || "—"}</p>
      </div>
    </motion.button>
  );
}

export default function Home() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image valide.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setCurrent(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/analyze`, { image_base64: dataUrl });
      setCurrent(res.data);
      toast.success("Composant détecté !");
      loadHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Échec de l'analyse.");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const saveEdit = async (id, fields) => {
    const res = await axios.put(`${API}/analysis/${id}`, fields);
    setCurrent(res.data);
    toast.success("Modifications enregistrées.");
    loadHistory();
  };

  const deleteItem = async (id) => {
    await axios.delete(`${API}/analysis/${id}`);
    if (current?.id === id) { setCurrent(null); setPreview(null); }
    toast.success("Analyse supprimée.");
    loadHistory();
  };

  return (
    <div className="min-h-screen text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#22D3EE] flex items-center justify-center animate-pulse-glow">
              <ScanLine className="w-5 h-5 text-black" />
            </div>
            <span className="font-display font-bold tracking-tight text-lg">COMPO<span className="text-[#22D3EE]">SCAN</span></span>
          </div>
          <span className="hidden sm:flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
            <Zap className="w-3.5 h-3.5 text-[#A855F7]" /> IA Vision Pro
          </span>
        </div>
      </nav>

      {/* Hero + Upload */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs uppercase tracking-[0.2em] border border-white/10 rounded-full text-[#22D3EE]">
            <Cpu className="w-3.5 h-3.5" /> Détection intelligente de composants
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none">
            Scanne un composant.<br />
            <span className="text-[#22D3EE]">Obtiens tout</span> en un instant.
          </h1>
          <p className="mt-6 text-[#94A3B8] text-base md:text-lg leading-relaxed max-w-xl">
            Prends une photo d'un composant électronique ou d'une pièce informatique.
            L'IA identifie l'objet, estime son prix et explique son utilité.
          </p>
        </div>

        <div
          data-testid="upload-zone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-12 cursor-pointer rounded-3xl border-2 border-dashed p-10 md:p-16 flex flex-col items-center justify-center text-center transition-colors duration-200 ${
            dragging ? "border-[#22D3EE] bg-[#22D3EE]/5 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "border-white/15 bg-[#111116] hover:border-[#22D3EE]/60"
          }`}
        >
          <input ref={inputRef} data-testid="file-input" type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="w-16 h-16 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-5">
            {loading ? <Loader2 className="w-7 h-7 text-[#22D3EE] animate-spin" /> : <ImagePlus className="w-7 h-7 text-[#22D3EE]" />}
          </div>
          <p className="font-display text-xl font-medium tracking-tight">
            {loading ? "Analyse en cours…" : "Glisse une photo ou clique pour importer"}
          </p>
          <p className="text-[#94A3B8] text-sm mt-2">JPG, PNG ou WEBP — un composant par photo</p>
          {!loading && (
            <Button data-testid="upload-btn" className="mt-6 rounded-full bg-[#22D3EE] text-black hover:bg-[#22D3EE]/80 px-6" type="button">
              <Upload className="w-4 h-4 mr-2" /> Importer une image
            </Button>
          )}
        </div>
      </section>

      {/* Loading preview / Result */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <AnimatePresence mode="wait">
          {loading && preview && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-8 p-8 border border-white/10 rounded-2xl bg-[#111116]">
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                <img src={preview} alt="aperçu" className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#22D3EE]/10 to-transparent">
                  <div className="h-1 bg-[#22D3EE] shadow-[0_0_16px_#22D3EE] animate-[fade-up_1.4s_ease-in-out_infinite]" />
                </div>
              </div>
              <div className="flex flex-col justify-center items-start gap-4 text-[#94A3B8]">
                <Loader2 className="w-8 h-8 text-[#22D3EE] animate-spin" />
                <p className="font-display text-xl text-white">L'IA analyse ton composant…</p>
                <p className="text-sm">Identification, estimation du prix et rédaction de la description.</p>
              </div>
            </motion.div>
          )}
          {!loading && current && (
            <ResultCard key={current.id} item={current} onSave={saveEdit} onDelete={deleteItem} />
          )}
        </AnimatePresence>
      </section>

      {/* History */}
      {history.length > 0 && (
        <section data-testid="history-section" className="max-w-6xl mx-auto px-6 pb-24">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Historique</h2>
            <span className="text-xs text-[#94A3B8] uppercase tracking-[0.2em]">{history.length} analyses</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {history.map((item, i) => (
              <HistoryItem key={item.id} item={item} index={i} onSelect={(it) => { setCurrent(it); setPreview(it.image_base64); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0A0F]">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-[#22D3EE]" />
          </div>
          <p data-testid="footer-credit" className="font-display text-xl md:text-2xl font-bold tracking-tight text-white">
            fait par theo pour le bac 2026-2027
          </p>
          <p className="text-[#94A3B8] text-sm">CompoScan — Détection de composants par IA</p>
        </div>
      </footer>
    </div>
  );
}
