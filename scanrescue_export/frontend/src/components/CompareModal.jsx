import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ASSET } from "@/context/AuthContext";

const ROWS = [
  { key: "category", label: "Catégorie" },
  { key: "price_estimate", label: "Prix estimé" },
  { key: "confidence", label: "Confiance" },
  { key: "description", label: "Utilité" },
];

export default function CompareModal({ open, onOpenChange, items }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="compare-modal" className="max-w-4xl glass border-neon-cyan/30 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl tracking-wide neon-cyan">Comparateur de composants</DialogTitle>
          <DialogDescription className="text-muted-foreground font-data text-xs">Comparaison côte à côte des composants sélectionnés</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
          {items.map((it) => (
            <div key={it.id} className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
              <img src={`${ASSET}${it.image_url}`} alt={it.name} className="w-full aspect-square object-cover" />
              <div className="p-3"><p className="font-head font-bold text-white truncate">{it.name}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {ROWS.map((row) => (
            <div key={row.key} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
              <div className="col-span-full text-xs uppercase tracking-[0.2em] text-neon-purple font-head">{row.label}</div>
              {items.map((it) => (
                <div key={it.id} className={`text-sm ${row.key === "price_estimate" ? "text-[#22C55E] font-data font-bold" : "text-slate-300"}`}>
                  {it[row.key] || "—"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
