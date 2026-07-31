import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ScanLine, Mail, Lock, User, LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { sfx } from "@/lib/sfx";

const TOKYO_IMG = "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w-14008z&ixlib=rb-4.0.3&q=85";

export default function Auth() {
  const { login, register } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const googleLogin = () => {
    sfx.click();
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
window.location.href = "https://scanrescue-backend.onrender.com/api/auth/google";

  const submit = async (mode) => {
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      sfx.success();
      toast.success(mode === "login" ? "Connexion réussie !" : "Compte créé !");
    } catch (err) {
      sfx.error();
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden font-mono">
      <div className="absolute inset-0 z-0 opacity-40">
        <img src={TOKYO_IMG} alt="Tokyo" className="w-full h-full object-cover filter brightness-50 contrast-125" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
              <ScanLine className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white">SCANRESCUE</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Secure Terminal</p>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 bg-white/5 border border-white/10 mb-6 p-1 rounded-xl">
              <TabsTrigger value="login" className="data-[state=active]:bg-neon-cyan data-[state=active]:text-black rounded-lg">Connexion</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-neon-cyan data-[state=active]:text-black rounded-lg">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <IconInput icon={Mail} type="email" placeholder="Email" value={form.email} onChange={(val) => setForm({ ...form, email: val })} data-testid="login-email" />
              <IconInput icon={Lock} type="password" placeholder="Mot de passe" value={form.password} onChange={(val) => setForm({ ...form, password: val })} data-testid="login-password" />
              <Button data-testid="login-submit" onClick={() => submit("login")} disabled={busy} className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/90 font-bold h-11 shadow-lg shadow-neon-cyan/20">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 mr-2" /> Se connecter</>}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <IconInput icon={User} type="text" placeholder="Nom complet" value={form.name} onChange={(val) => setForm({ ...form, name: val })} data-testid="register-name" />
              <IconInput icon={Mail} type="email" placeholder="Email" value={form.email} onChange={(val) => setForm({ ...form, email: val })} data-testid="register-email" />
              <IconInput icon={Lock} type="password" placeholder="Mot de passe" value={form.password} onChange={(val) => setForm({ ...form, password: val })} data-testid="register-password" />
              <Button data-testid="register-submit" onClick={() => submit("register")} disabled={busy} className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/90 font-bold h-11 shadow-lg shadow-neon-cyan/20">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5 mr-2" /> Créer un compte</>}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-data">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Button data-testid="google-login" variant="outline" onClick={googleLogin} onMouseEnter={sfx.hover}
            className="w-full rounded-md border-white/20 bg-white text-black hover:bg-white/90 font-medium">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5 mr-2" />
            Continuer avec Google
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function IconInput({ icon: Icon, testid, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-cyan" />
      <Input data-testid={testid} {...props} onChange={(e) => props.onChange(e.target.value)}
        className="pl-10 bg-black/50 border-white/10 text-white h-11 focus-visible:ring-neon-cyan" />
    </div>
  );
}
