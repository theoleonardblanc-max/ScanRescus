import "@/App.css";
import { useEffect, useRef } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth, API } from "@/context/AuthContext";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";

function AuthCallback() {
  const processed = useRef(false);
  const { setUser } = useAuth();

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.replace("#", "")).get("session_id");
    (async () => {
      try {
        const { data } = await axios.post(`${API}/auth/google/session`, {}, { headers: { "X-Session-ID": sessionId } });
        setUser(data);
      } catch { setUser(false); }
      window.history.replaceState(null, "", window.location.pathname);
    })();
  }, [setUser]);

  return <Splash text="Connexion Google en cours…" />;
}

function Splash({ text }) {
  return (
    <div className="min-h-screen rgb-grid flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-[#22D3EE] animate-spin" />
      <p className="text-[#8B85A8]">{text || "Chargement…"}</p>
    </div>
  );
}

function Gate() {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  if (loading || user === null) return <Splash />;
  return user ? <Home /> : <Auth />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

export default App;
