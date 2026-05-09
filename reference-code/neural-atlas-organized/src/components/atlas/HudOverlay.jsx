import { TrendingUp, Sparkles } from 'lucide-react';
export default function HudOverlay({ hidden }) {
if (hidden) return null;
return (
<>
{/* Today's Drift - Top Right */}
<div className="fixed top-6 right-6 z-40">
<div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl px-5 py-4 min-w-[180px]">
<p className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground/60 uppercase mb-1">
Today's Drift
</p>
<div className="flex items-center gap-2">
<span className="text-xl font-space font-semibold text-foreground/90 tracking-tight">
+ 12.6%
</span>
<TrendingUp className="w-3.5 h-3.5 text-foreground/40" />
</div>
{/* Mini sparkline */}
<svg className="mt-2 w-full h-6" viewBox="0 0 120 24">
<path
d="M 0 18 Q 15 16, 25 14 T 45 10 T 65 12 T 85 6 T 105 8 T 120 4"
fill="none"
stroke="rgba(255,255,255,0.2)"
strokeWidth="1.5"
strokeLinecap="round"
/>
<circle cx="120" cy="4" r="2" fill="rgba(255,255,255,0.5)">
<animate attributeName="opacity" from="1" to="0.3" dur="2s" repeatCount="indefinite" />
</circle>
</svg>
</div>
</div>
{/* Quote Card - Bottom Right */}
<div className="fixed bottom-8 right-6 z-40">
<div className="bg-card/40 backdrop-blur-xl border border-border/30 rounded-xl px-6 py-5 max-w-[260px]">
<Sparkles className="w-3 h-3 text-muted-foreground/30 mb-3" />
<p className="text-[13px] font-space text-foreground/60 leading-relaxed italic">
"To create is to remember what the soul already knows."
</p>
<p className="text-[10px] font-mono text-muted-foreground/40 mt-3">— Unknown</p>
</div>
</div>
</>
);
}
