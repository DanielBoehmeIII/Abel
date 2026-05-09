import { X, Zap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
export default function NodeDetailPanel({ node, onClose }) {
if (!node) return null;
const progressPercent = node.progress || 0;
return (
<AnimatePresence>
{node && (
<motion.div
initial={{ opacity: 0, x: 40 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: 40 }}
transition={{ duration: 0.3, ease: 'easeOut' }}
className="fixed right-6 top-1/2 -translate-y-1/2 z-50 w-[320px]"
>
<div className="bg-card/80 backdrop-blur-2xl border border-border/40 rounded-2xl overflow-hidden">
{/* Header */}
<div className="px-6 pt-6 pb-4 border-b border-border/20">
<div className="flex items-start justify-between mb-4">
<div>
<p className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground/50 uppercase mb-1">
{node.status === 'mastered' ? 'Mastered' : node.status === 'active' ? 'In Progress' : 'Unlocked'}
</p>
<h2 className="text-lg font-space font-semibold text-foreground tracking-tight">
{node.label}
</h2>
{node.subtitle && (
<p className="text-xs font-mono text-muted-foreground/50 mt-0.5">{node.subtitle}</p>
)}
</div>
<button
onClick={onClose}
className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
>
<X className="w-4 h-4 text-muted-foreground/50" />
</button>
</div>
{/* Progress bar */}
<div className="w-full h-1 bg-secondary/60 rounded-full overflow-hidden">
<motion.div
className="h-full rounded-full"
style={{
background: node.status === 'mastered'
? 'linear-gradient(90deg, #FF007A, #FF007A)'
: 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))',
}}
initial={{ width: 0 }}
animate={{ width: `${progressPercent}%` }}
transition={{ duration: 0.8, ease: 'easeOut' }}
/>
</div>
<p className="text-[10px] font-mono text-muted-foreground/40 mt-2">{progressPercent}% Complete</p>
</div>
{/* Description */}
<div className="px-6 py-4">
<p className="text-xs font-mono text-muted-foreground/60 leading-relaxed">
{node.description || 'Explore this branch of knowledge to unlock deeper understanding and connected skills.'}
</p>
</div>
{/* Sub-quests */}
{node.quests && node.quests.length > 0 && (
<div className="px-6 pb-4">
<p className="text-[9px] font-mono tracking-[0.15em] text-muted-foreground/40 uppercase mb-3">
Quests
</p>
<div className="space-y-2">
{node.quests.map((quest, i) => (
<div
key={i}
className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/20"
>
<div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
quest.done ? 'border-accent/50 bg-accent/10' : 'border-border/40'
}`}>
{quest.done && <Zap className="w-2.5 h-2.5 text-accent" />}
</div>
<span className={`text-[11px] font-mono ${
quest.done ? 'text-muted-foreground/40 line-through' : 'text-foreground/70'
}`}>
{quest.label}
</span>
</div>
))}
</div>
</div>
)}
{/* Action */}
<div className="px-6 pb-6">
<Button
className="w-full bg-foreground/10 hover:bg-foreground/15 text-foreground/80 border border-border/30 font-mono text-xs tracking-wide"
variant="ghost"
>
{node.status === 'mastered' ? 'Review' : 'Start Quest'}
<ChevronRight className="w-3.5 h-3.5 ml-2" />
</Button>
</div>
</div>
</motion.div>
)}
</AnimatePresence>
);
}
