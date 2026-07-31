import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Shield, Lock, Mail, User, ArrowRight, Cpu, Zap, Activity, CheckCircle2, RefreshCw, Terminal, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sfx } from "@/lib/sfx";

// Image de Tokyo de nuit ultra-lumineuse et multicolore (Néons vibrants Shibuya/Shinjuku)
const TOKYO_VIBRANT_NEONS = "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=2560&auto=format&fit=crop";

export default function Auth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  
  // États pour l'IA et l'analyse des composants
  const [scanning, setScanning] = useState(false);
  const [scannedComponents, setScannedComponents] = useState([]);

  // Vérifie si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const token = localStorage.getItem("scanrescue_token");
    if (token) {
      setIsLoggedIn(true);
      loadAiComponents();
    }
  }, []);

  const handleAuthAction = (type) => {
    setBusy(true);
    sfx.click?.();
    
    setTimeout(() => {
      // Sauvegarde locale pour maintenir la session active sur la même page
      localStorage.setItem("scanrescue_token", "active-session-token-" + Date.now());
      localStorage.setItem("scanrescue_user", JSON.stringify({ name: form.name || "CyberAgent", email: form.email || "agent@tokyo.ai" }));
      
      setBusy(false);
      setIsLoggedIn(true);
      toast.success(type === "login" ? "Connexion établie avec succès !" : "Compte créé ! Bienvenue dans le réseau.");
      loadAiComponents();
    }, 600);
  };

  const handleGoogleAuth = () => {
    sfx.click?.();
    localStorage.setItem("scanrescue_token", "google-token-" + Date.now());
    setIsLoggedIn(true);
    toast.success("Authentification Google validée !");
    loadAiComponents();
  };

  const handleLogout = () => {
    localStorage.removeItem("scanrescue_token");
    setIsLoggedIn(false);
    setScannedComponents([]);
    toast.info("Déconnecté de la session.");
  };

  const loadAiComponents = () => {
    setScanning(true);
    sfx.success?.();
    setTimeout(() => {
      setScannedComponents([
        { id: 1, name: "Neural Core Matrix v4.2", status: "Optimal", health: "98%", type: "Processeur IA" },
        { id: 2, name: "Quantum Shader Subsystem", status: "Actif", health: "95%", type: "Rendu Graphique" },
        { id: 3, name: "Cyber-Shield Firewall Protocol", status: "Sécurisé", health: "100%", type: "Sécurité Réseau" },
        { id: 4, name: "Tokyo Neon Voltage Regulator", status: "Stable", health: "91%", type: "Alimentation Énergétique" },
      ]);
      setScanning(false);
    }, 1000);
  };

  // --- SI CONNECTÉ : AFFICHE DIRECTEMENT L'IA ET LES COMPOSANTS SUR LA MÊME PAGE SANS REDIRECTION ---
  if (isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-black text-white relative overflow-x-hidden font-sans">
        {/* Fond Tokyo Néons Multicolores */}
        <div className="absolute inset-0 z-0">
          <img src={TOKYO_VIBRANT_NEONS} alt="Tokyo Neon City" className="w-full h-full object-cover opacity-60 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50 backdrop-blur-[2px]" />
        </div>

        {/* Header Dashboard */}
        <header className="relative z-10 flex items-center justify-between p-6 md:px-12 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-wider text-white">ScanRescue</span>
              <span className="text-xs text-cyan-400 block font-mono">TOKYO_AI_CORE_ONLINE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={loadAiComponents} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-sm transition-all">
              <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin text-cyan-400" : ""}`} />
              <span>Relancer l'IA</span>
            </button>
            <button onClick={handleLogout} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm transition-all">
              Déconnexion
            </button>
          </div>
        </header>

        {/* Contenu Principal IA & Composants */}
        <main className="relative z-10 flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/70 border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.15)] backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                  <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
                  Centre d'Analyse des Composants IA
                </h1>
                <p className="text-gray-400 mt-1">Surveillance en temps réel des sous-systèmes connectés à Tokyo Grid.</p>
              </div>
              <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 rounded-xl text-cyan-300 text-sm">
                <Activity className="w-4 h-4 text-cyan-400 animate-ping" />
                <span>État du réseau : 100% Opérationnel</span>
              </div>
            </div>

            {/* Grille des composants détectés */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {scanning ? (
                <div className="col-span-full py-16 text-center space-y-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-cyan-400 mx-auto" />
                  <p className="text-cyan-300 font-mono tracking-widest">L'IA scanne les composants en cours...</p>
                </div>
              ) : (
                scannedComponents.map((comp) => (
                  <motion.div key={comp.id} whileHover={{ scale: 1.03 }} className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-md space-y-3 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/15 transition-all" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">{comp.type}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <h3 className="font-bold text-lg text-white">{comp.name}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
                      <span>Statut: <strong className="text-green-300">{comp.status}</strong></span>
                      <span>Intégrité: <strong className="text-cyan-300">{comp.health}</strong></span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Console de Diagnostic IA */}
          <div className="bg-black/80 border border-white/15 p-6 rounded-2xl backdrop-blur-xl font-mono text-sm space-y-3">
            <div className="flex items-center gap-2 text-gray-400 border-b border-white/10 pb-3">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Tokyo_Neural_Terminal_v2.log</span>
            </div>
            <div className="space-y-1 text-xs text-gray-300">
              <p className="text-cyan-400">[03:22:45] SYSTEM: Session utilisateur active et authentifiée sans redirection.</p>
              <p className="text-green-400">[03:22:46] AI_CORE: Analyse de tous les composants matériels et virtuels réussie.</p>
              <p className="text-white">[03:22:47] READY: Prêt pour le déploiement des patches de sécurité ScanRescue.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- SI NON CONNECTÉ : PAGE D'AUTHENTIFICATION AVEC LE FOND TOKYO MULTICOLORE ---
  return (
    <div className="min-h-screen w-full flex bg-black text-white relative overflow-hidden">
      {/* Fond Tokyo de nuit multicolore ultra-lumineux */}
      <div className="absolute inset-0 z-0">
        <img src={TOKYO_VIBRANT_NEONS} alt="Tokyo Neon City Night" className="w-full h-full object-cover opacity-75 scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/80 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between p-8 md:p-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.4)]">
              <Shield className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl tracking-wider text-white">ScanRescue</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-cyan-300 bg-black/60 px-3 py-1.5 rounded-full border border-cyan-400/30">
            <Cpu className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>IA de Détection : Active</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 bg-black/85 p-8 rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Tokyo Nexus</h1>
              <p className="text-sm text-gray-300 mt-1">Connectez-vous pour débloquer l'IA instantanément.</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/15 p-1 rounded-lg">
                <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-cyan-400 data-[state=active]:text-black font-bold">Connexion</TabsTrigger>
                <TabsTrigger value="register" className="rounded-md data-[state=active]:bg-cyan-400 data-[state=active]:text-black font-bold">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 pt-4">
                <form onSubmit={(e) => { e.preventDefault(); handleAuthAction("login"); }} className="space-y-4">
                  <IconInput icon={Mail} testid="login-email" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <IconInput icon={Lock} testid="login-password" type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  <Button data-testid="login-submit" type="submit" disabled={busy} className="w-full bg-cyan-400 text-black hover:bg-cyan-300 font-bold h-11 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                    {busy ? "Connexion..." : "Se connecter et lancer l'IA"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 pt-4">
                <form onSubmit={(e) => { e.preventDefault(); handleAuthAction("register"); }} className="space-y-4">
                  <IconInput icon={User} testid="register-name" type="text" placeholder="Nom complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  <IconInput icon={Mail} testid="register-email" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <IconInput icon={Lock} testid="register-password" type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  <Button data-testid="register-submit" type="submit" disabled={busy} className="w-full bg-cyan-400 text-black hover:bg-cyan-300 font-bold h-11 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                    {busy ? "Création..." : "Créer un compte instantané"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-white/20" />
              <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">ou</span>
              <div className="h-px flex-1 bg-white/20" />
            </div>

            <Button data-testid="google-login" variant="outline" onClick={handleGoogleAuth} onMouseEnter={sfx.hover} className="w-full rounded-md border-white/30 bg-white text-black hover:bg-gray-100 font-semibold h-11 transition-all shadow-md">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5 mr-2" />
              Continuer avec Google (Accès Direct)
            </Button>
          </motion.div>
        </div>

        <div className="text-xs text-gray-400 text-center font-medium">
          ScanRescue Tokyo &copy; 2026 - Tous droits réservés
        </div>
      </div>
    </div>
  );
}

function IconInput({ icon: Icon, testid, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
      <Input data-testid={testid} {...props} onChange={(e) => props.onChange(e)} className="pl-10 bg-black/60 border-white/25 text-white h-11 focus-visible:ring-cyan-400 placeholder:text-gray-400" />
    </div>
  );
}
