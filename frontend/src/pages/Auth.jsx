import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Shield, Lock, Mail, User, ArrowRight, Cpu, Camera, Upload, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sfx } from "@/lib/sfx";

// Image de Tokyo de nuit ultra-lumineuse avec des néons multicolores (style de ta photo)
const TOKYO_NEON_STREET = "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=2560&auto=format&fit=crop";

export default function Auth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  // États pour l'IA d'analyse photo des composants PC
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedParts, setDetectedParts] = useState(null);

  const handleAuthAction = (type) => {
    setBusy(true);
    sfx.click?.();
    setTimeout(() => {
      localStorage.setItem("scanrescue_token", "session-" + Date.now());
      localStorage.setItem("scanrescue_user", JSON.stringify({ name: form.name || "Théo", email: form.email || "theo@bacpro.ai" }));
      setBusy(false);
      setIsLoggedIn(true);
      toast.success(type === "login" ? "Connexion réussie !" : "Compte créé avec succès !");
    }, 600);
  };

  const handleGoogleAuth = () => {
    sfx.click?.();
    localStorage.setItem("scanrescue_token", "google-session-" + Date.now());
    setIsLoggedIn(true);
    toast.success("Connexion Google établie !");
  };

  const handleLogout = () => {
    localStorage.removeItem("scanrescue_token");
    setIsLoggedIn(false);
    setDetectedParts(null);
    setSelectedImage(null);
    toast.info("Déconnexion effectuée.");
  };

  // Simulation de l'IA qui analyse la photo du PC (câbles, RAM, composants)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      runAiAnalysis();
    }
  };

  const runAiAnalysis = () => {
    setAnalyzing(true);
    setDetectedParts(null);
    sfx.click?.();
    
    setTimeout(() => {
      setDetectedParts([
        { category: "Mémoire Vive (RAM)", item: "Corsair Vengeance RGB 16GB", status: "Parfait état", confidence: "99.4%" },
        { category: "Câblage & Alimentation", item: "Câbles d'alimentation 24-pin mal rangés", status: "Attention : Risque de surchauffe", confidence: "95.1%" },
        { category: "Processeur (CPU)", item: "Intel Core i7-13700KF", status: "Optimisé / Ventirad détecté", confidence: "98.2%" },
        { category: "Carte Graphique (GPU)", item: "NVIDIA GeForce RTX 4070", status: "Connectique stable", confidence: "97.8%" },
        { category: "Carte Mère", item: "ASUS ROG Strix Z790-E", status: "Aucun court-circuit détecté", confidence: "96.5%" }
      ]);
      setAnalyzing(false);
      sfx.success?.();
      toast.success("Analyse IA terminée avec succès !");
    }, 2000);
  };

  // --- ESPACE CONNECTÉ AVEC L'IA DE DETECTION DES COMPOSANTS ---
  if (isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-black text-white relative overflow-x-hidden font-sans">
        {/* Fond Tokyo néons multicolores */}
        <div className="absolute inset-0 z-0">
          <img src={TOKYO_NEON_STREET} alt="Tokyo Neon Night" className="w-full h-full object-cover opacity-65 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50 backdrop-blur-[2px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between p-6 md:px-12 border-b border-pink-500/20 bg-black/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)]">
              <Shield className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-xl tracking-wider text-white bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">ScanRescue</span>
          </div>
          <button onClick={handleLogout} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm transition-all font-semibold">
            Déconnexion
          </button>
        </header>

        {/* Dashboard IA Analyse PC */}
        <main className="relative z-10 flex-1 p-6 md:p-12 max-w-5xl mx-auto w-full space-y-8">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-black/80 border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.15)] backdrop-blur-xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black flex items-center justify-center gap-3 text-white">
                <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
                IA de Détection des Composants PC & Câbles
              </h1>
              <p className="text-gray-400 text-sm">Importez ou prenez en photo l'intérieur de votre unité centrale pour une analyse complète par l'IA.</p>
            </div>

            {/* Zone d'import / capture de photo */}
            <div className="border-2 border-dashed border-pink-500/40 bg-pink-500/5 hover:bg-pink-500/10 p-8 rounded-2xl text-center transition-all cursor-pointer relative group">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20" />
              <div className="space-y-3 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Cliquez pour importer ou prendre en photo le PC</p>
                  <p className="text-xs text-gray-400 mt-1">Formats acceptés : JPG, PNG (Détection automatique RAM, câbles, GPU, CPU...)</p>
                </div>
              </div>
            </div>

            {/* Aperçu de l'image sélectionnée et chargement de l'IA */}
            {selectedImage && (
              <div className="space-y-6 pt-4 border-t border-white/10">
                <div className="flex flex-col md:flex-row gap-6 items-center bg-white/5 p-4 rounded-xl border border-white/10">
                  <img src={selectedImage} alt="PC Preview" className="w-48 h-36 object-cover rounded-lg border border-cyan-400/40 shadow-md" />
                  <div className="space-y-2 flex-1 text-center md:text-left">
                    <h3 className="font-bold text-cyan-300 flex items-center justify-center md:justify-start gap-2">
                      <ImageIcon className="w-4 h-4" /> Photo chargée avec succès
                    </h3>
                    <p className="text-xs text-gray-300">L'intelligence artificielle analyse la topologie du matériel, l'état des câbles et l'agencement interne.</p>
                    {analyzing && (
                      <div className="flex items-center justify-center md:justify-start gap-2 text-pink-400 text-xs font-mono pt-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyse des composants en cours...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Résultats de l'analyse IA */}
                <AnimatePresence>
                  {detectedParts && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 10 }} className="space-y-4">
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" /> Composants & Anomalies Détectés par l'IA :
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {detectedParts.map((part, index) => (
                          <div key={index} className="bg-black/60 border border-white/10 p-4 rounded-xl space-y-2 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-cyan-400">{part.category}</span>
                              <span className="text-xs font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">Confiance {part.confidence}</span>
                            </div>
                            <p className="font-bold text-white text-base">{part.item}</p>
                            <div className="flex items-center gap-2 text-xs pt-1">
                              {part.status.includes("Attention") ? (
                                <span className="flex items-center gap-1 text-yellow-400 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> {part.status}</span>
                              ) : (
                                <span className="flex items-center gap-1 text-green-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> {part.status}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </main>

        {/* Pied de page obligatoire */}
        <footer className="relative z-10 py-4 text-center text-xs text-gray-400 border-t border-white/10 bg-black/60 backdrop-blur-md">
          projets bac pro Théo Léonard 2026-2027
        </footer>
      </div>
    );
  }

  // --- PAGE D'AUTHENTIFICATION AVEC LE STYLE TOKYO NÉON MULTICOLORE ---
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-black text-white relative overflow-hidden">
      {/* Fond Tokyo de nuit avec des néons multicolores vibrants */}
      <div className="absolute inset-0 z-0">
        <img src={TOKYO_NEON_STREET} alt="Tokyo Neon City" className="w-full h-full object-cover opacity-80 scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/80 backdrop-blur-[1px]" />
      </div>

      {/* Header simple */}
      <div className="relative z-10 p-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.4)]">
            <Shield className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">ScanRescue</span>
        </div>
      </div>

      {/* Formulaire d'authentification central */}
      <div className="relative z-10 max-w-md w-full mx-auto px-4 my-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 bg-black/85 p-8 rounded-3xl border border-pink-500/30 shadow-[0_0_60px_rgba(236,72,153,0.2)] backdrop-blur-2xl">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">ScanRescue Tokyo</h1>
            <p className="text-sm text-gray-300">Créez votre compte pour accéder à l'IA de diagnostic.</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/15 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-cyan-400 data-[state=active]:text-black font-bold">Connexion</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-cyan-400 data-[state=active]:text-black font-bold">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <form onSubmit={(e) => { e.preventDefault(); handleAuthAction("login"); }} className="space-y-4">
                <IconInput icon={Mail} testid="login-email" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <IconInput icon={Lock} testid="login-password" type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <Button data-testid="login-submit" type="submit" disabled={busy} className="w-full bg-gradient-to-r from-cyan-400 to-pink-500 text-black hover:opacity-90 font-black h-11 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                  {busy ? "Connexion..." : "Se connecter"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 pt-4">
              <form onSubmit={(e) => { e.preventDefault(); handleAuthAction("register"); }} className="space-y-4">
                <IconInput icon={User} testid="register-name" type="text" placeholder="Nom complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <IconInput icon={Mail} testid="register-email" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <IconInput icon={Lock} testid="register-password" type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <Button data-testid="register-submit" type="submit" disabled={busy} className="w-full bg-gradient-to-r from-cyan-400 to-pink-500 text-black hover:opacity-90 font-black h-11 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                  {busy ? "Création..." : "Créer mon compte"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-white/25" />
            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">ou</span>
            <div className="h-px flex-1 bg-white/25" />
          </div>

          <Button data-testid="google-login" variant="outline" onClick={handleGoogleAuth} onMouseEnter={sfx.hover} className="w-full rounded-xl border-white/30 bg-white text-black hover:bg-gray-100 font-semibold h-11 transition-all shadow-md">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5 mr-2" />
            Continuer avec Google
          </Button>
        </motion.div>
      </div>

      {/* Pied de page obligatoire */}
      <footer className="relative z-10 py-4 text-center text-xs text-gray-400 border-t border-white/10 bg-black/60 backdrop-blur-md">
        projets bac pro Théo Léonard 2026-2027
      </footer>
    </div>
  );
}

function IconInput({ icon: Icon, testid, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
      <Input data-testid={testid} {...props} onChange={(e) => props.onChange(e)} className="pl-10 bg-black/60 border-white/25 text-white h-11 focus-visible:ring-pink-500 placeholder:text-gray-400 rounded-xl" />
    </div>
  );
}
