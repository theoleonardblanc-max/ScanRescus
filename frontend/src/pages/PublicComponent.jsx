import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanLine, Loader2, Gauge, Euro, Cpu, FileText, ShoppingCart, Star } from "lucide-react";
import { API, ASSET } from "@/context/AuthContext";

export default function PublicComponent() {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`${API}/public/component/${shareId}`, { withCredentials: false })
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, [shareId]);

  if (error) return <Center>Fiche introuvable.</Center>;
  if (!data) return <Center><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></Center>;

  return (
    <div className="min-h-screen cyber-grid text-white">
      <nav className="border-b border-white/10 glass">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan flex items-center justify-center"><ScanLine className="w-4 h-4 text-black" /></div>
          <span className="font-display tracking-widest neon-cyan">SCAN<span className="text-neon-crimson">RESCUE</span></span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass glow-cyan rounded-2xl p-6 md:p-8 grid md:grid-cols-2 gap-8">
          <img src={`${ASSET}${data.image_url}`} alt={data.name} className="w-full aspect-square object-cover rounded-xl border border-white/10" />
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-[0.2em] border border-neon-cyan/40 text-neon-cyan rounded-full"><Gauge className="w-3 h-3" /> {data.confidence}</span>
            <h1 className="font-head text-3xl font-bold text-white">{data.name}</h1>
            <p className="flex items-center gap-2 text-muted-foreground"><Cpu className="w-4 h-4 text-neon-purple" /> {data.category}</p>
            <p className="font-data text-3xl text-[#22C55E] neon-cyan flex items-center gap-2"><Euro className="w-6 h-6" /> {data.price_estimate}</p>
            <div>
              <p className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.2em] mb-2"><FileText className="w-3.5 h-3.5" /> Description</p>
              <p className="text-slate-300 leading-relaxed">{data.description}</p>
            </div>
          </div>
        </motion.div>

        {data.offers?.length > 0 && (
          <div className="mt-8">
            <h3 className="font-head text-xl font-bold flex items-center gap-2 mb-4"><ShoppingCart className="w-5 h-5 text-neon-purple" /> Meilleures offres</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.offers.map((o, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/10 bg-black/30">
                  <div className="flex justify-between items-center"><span className="font-data font-bold">{o.seller}</span><span className="text-[#22C55E] font-bold">{o.price}</span></div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full border border-neon-cyan/30 text-neon-cyan">{o.quality}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-neon-yuzu fill-neon-yuzu" /> {o.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center font-display text-lg text-white mt-16 neon-cyan">fait par theo pour le bac 2026-2027</p>
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div className="min-h-screen cyber-grid flex items-center justify-center text-muted-foreground">{children}</div>;
}
