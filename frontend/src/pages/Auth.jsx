import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ScanLine, Mail, Lock, User, LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { sfx } from "@/lib/sfx";

const TOKYO_IMG = "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?crop=entropy&cs=srgb&fm=jpg&w=1400&q=85";

export default function Auth() {
  const { login, register } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const googleLogin = () => {
    sfx.click();
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const redirectUrl = window.location.origin + "/";
window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

  const submit = async (mode) => {
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      sfx.success();
      toast.success("Bienvenue sur ScanRescue !");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#050505]">
      {/* Left: Tokyo image */}
      <div className="relative hidden lg:block overflow-hidden">
        <img src={TOKYO_IMG} alt="Tokyo néon" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#050505]/55" />
        <div className="absolute inset-0 cyber-grid opacity-40" />
        <div className="absolute top-10 left-10 vertical-text font-display text-white/10 text-5xl select-none">スキャン</div>
        <div className="absolute bottom-10 right-12 vertical-text font-display text-neon-crimson/30 text-4xl select-none animate-flicker">東京</div>
        <div className="absolute bottom-12 left-12 max-w-sm">
          <h2 className="font-display text-3xl text-white leading-tight neon-cyan">SCAN<span className="text-neon-crimson neon-crimson">RESCUE</span></h2>
          <p className="font-data text-neon-cyan/80 text-sm mt-3 tracking-wide">// IA de détection de composants — Tokyo edition</p>
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex items-center justify-center p-6 cyber-grid">
        <div className="absolute top-1/3 right-0 w-80 h-80 rounded-full bg-neon-purple/20 blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-neon-cyan/15 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md glass glow-cyan rounded-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-neon-cyan flex items-center justify-center animate-pulse-glow mb-4">
              <ScanLine className="w-7 h-7 text-black" />
            </div>
            <h1 className="font-display text-xl tracking-widest neon-cyan">SCAN<span className="text-neon-crimson neon-crimson">RESCUE</span></h1>
            <p className="text-muted-foreground text-sm mt-2 font-data">スキャンレスキュー</p>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full bg-black/50 border border-white/10">
              <TabsTrigger data-testid="tab-login" value="login" onClick={sfx.hover} className="font-head tracking-wide data-[state=active]:bg-neon-cyan data-[state=active]:text-black">CONNEXION</TabsTrigger>
              <TabsTrigger data-testid="tab-register" value="register" onClick={sfx.hover} className="font-head tracking-wide data-[state=active]:bg-neon-purple data-[state=active]:text-white">INSCRIPTION</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <IconInput testid="login-email" icon={Mail} type="email" placeholder="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <IconInput testid="login-password" icon={Lock} type="password" placeholder="Mot de passe" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <Button data-testid="login-submit" disabled={busy} onClick={() => submit("login")} onMouseEnter={sfx.hover}
                className="w-full rounded-md bg-neon-cyan text-black hover:bg-neon-cyan/80 font-head font-bold tracking-widest glow-cyan">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4 mr-2" /> SE CONNECTER</>}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <IconInput testid="register-name" icon={User} placeholder="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <IconInput testid="register-email" icon={Mail} type="email" placeholder="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <IconInput testid="register-password" icon={Lock} type="password" placeholder="Mot de passe (6+ caractères)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <Button data-testid="register-submit" disabled={busy} onClick={() => submit("register")} onMouseEnter={sfx.hover}
                className="w-full rounded-md bg-neon-purple text-white hover:bg-neon-purple/80 font-head font-bold tracking-widest">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> CRÉER MON COMPTE</>}
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
