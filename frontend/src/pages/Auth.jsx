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
  };

  const submit = async (mode) => {
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      sfx.success();
      toast.success("Bienvenue sur ScanRescue !");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#050505]">
      {/* Left: Tokyo image */}
      <div className="relative hidden lg:block overflow-hidden">
        <img src={TOKYO_IMG} alt="Tokyo néon" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#050505]/55" />
        <div className="absolute inset-0 cyber-grid opacity-40" />
        <div className="absolute top-10 left-10 vertical-text font-display text-white/10 text-5xl select-none">スキャン</div>
      </div>

      {/* Right: Auth form */}
      <div className="flex flex-col justify-center items-center p-8 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 mb-2">
              <ScanLine className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Compo-Scan</h1>
            <p className="text-sm text-zinc-400">Identifiez vos composants PC et électroniques par IA</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={(e) => { e.preventDefault(); submit("login"); }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input
                      type="email"
                      placeholder="nom@exemple.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={busy} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                  Se connecter
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-4">
              <form onSubmit={(e) => { e.preventDefault(); submit("register"); }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="Jean Dupont"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input
                      type="email"
                      placeholder="nom@exemple.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={busy} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Créer un compte
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-zinc-500 text-xs uppercase">ou</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <Button type="button" variant="outline" onClick={googleLogin} className="w-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-white">
            Continuer avec Google
          </Button>
        </div>
      </div>
    </div>
  );
}
