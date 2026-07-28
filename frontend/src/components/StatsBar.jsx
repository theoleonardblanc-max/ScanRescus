import { motion } from "framer-motion";
import { Boxes, Wallet, Star, Layers } from "lucide-react";

function StatCard({ icon: Icon, label, value, color, index }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className="glass rounded-xl p-5 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ background: color }} />
      <Icon className="w-5 h-5 mb-3" style={{ color }} />
      <p className="font-data text-2xl md:text-3xl font-bold text-white">{value}</p>
      <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-1 font-head">{label}</p>
    </motion.div>
  );
}

export default function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div data-testid="stats-bar" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard index={0} icon={Boxes} label="Composants scannés" value={stats.count} color="#00F0FF" />
      <StatCard index={1} icon={Wallet} label="Valeur estimée" value={`${stats.total_value} €`} color="#22C55E" />
      <StatCard index={2} icon={Star} label="Favoris" value={stats.favorites} color="#FDE047" />
      <StatCard index={3} icon={Layers} label="Catégories" value={Object.keys(stats.categories || {}).length} color="#B026FF" />
    </div>
  );
}
