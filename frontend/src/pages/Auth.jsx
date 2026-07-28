import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ScanLine, Mail, Lock, User, LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, formatApiError } from "@/context/AuthContext";

export default function Auth() {
  const { login, register } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const submit = async (mode) => {
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      toast.success("Bienvenue sur ScanRescue !");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen rgb-grid flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[#22D3EE]/20 blur-3xl animate-blob" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[#A855F7]/20 blur-3xl animate-blob" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full bg-[#EC4899]/10 blur-3xl animate-blob" style={{ animationDelay: "6s" }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-[#0B0819]/80 backdrop-blur-xl neon-border rounded-3xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22D3EE] to-[#A855F7] flex items-center justify-center animate-pulse-glow mb-4">
            <ScanLine className="w-7 h-7 text-black" />
          </div>
          <h1 className="font-tech text-2xl font-900 tracking-widest neon-text-cyan">SCAN<span className="text-[#A855F7] neon-text-purple">RESCUE</span></h1>
          <p className="text-[#8B85A8] text-sm mt-1">Détection de composants par IA</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full bg-black/40 border border-white/10">
            <TabsTrigger data-testid="tab-login" value="login" className="data-[state=active]:bg-[#22D3EE] data-[state=active]:text-black">Connexion</TabsTrigger>
            <TabsTrigger data-testid="tab-register" value="register" className="data-[state=active]:bg-[#A855F7] data-[state=active]:text-white">Inscription</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-6">
            <IconInput testid="login-email" icon={Mail} type="email" placeholder="Email"
              value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <IconInput testid="login-password" icon={Lock} type="password" placeholder="Mot de passe"
              value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            <Button data-testid="login-submit" disabled={busy} onClick={() => submit("login")}
              className="w-full rounded-full bg-[#22D3EE] text-black hover:bg-[#22D3EE]/80 font-bold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4 mr-2" /> Se connecter</>}
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-6">
            <IconInput testid="register-name" icon={User} placeholder="Nom"
              value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <IconInput testid="register-email" icon={Mail} type="email" placeholder="Email"
              value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <IconInput testid="register-password" icon={Lock} type="password" placeholder="Mot de passe (6+ caractères)"
              value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            <Button data-testid="register-submit" disabled={busy} onClick={() => submit("register")}
              className="w-full rounded-full bg-[#A855F7] text-white hover:bg-[#A855F7]/80 font-bold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> Créer mon compte</>}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-[#8B85A8] uppercase tracking-widest">ou</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Button data-testid="google-login" variant="outline" onClick={googleLogin}
          className="w-full rounded-full border-white/20 bg-white text-black hover:bg-white/90 font-medium">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5 mr-2" />
          Continuer avec Google
        </Button>
      </motion.div>
    </div>
  );
}

function IconInput({ icon: Icon, testid, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#22D3EE]" />
      <Input data-testid={testid} {...props} onChange={(e) => props.onChange(e.target.value)}
        className="pl-10 bg-black/40 border-white/10 text-white h-11 focus-visible:ring-[#22D3EE]" />
    </div>
  );
}
