import { Sparkles, Globe, BookOpen, BarChart3, ShieldCheck } from 'lucide-react';
const navItems = [
{ id: 'atlas', label: 'Atlas', icon: Sparkles },
{ id: 'sphere', label: 'Sphere', icon: Globe },
{ id: 'journal', label: 'Journal', icon: BookOpen },
{ id: 'insights', label: 'Insights', icon: BarChart3 },
{ id: 'vault', label: 'Vault', icon: ShieldCheck },
];
export default function Sidebar({ activeTab, onTabChange }) {
return (
<div className="fixed left-0 top-0 bottom-0 w-20 z-50 flex flex-col items-center py-8 border-r border-border/30 bg-background/80 backdrop-blur-xl">
{/* Logo */}
<div className="mb-2">
<span className="font-space text-[11px] tracking-[0.35em] text-foreground/70 font-light">
A B E L
</span>
</div>
<div className="mb-10 mt-2">
<Sparkles className="w-4 h-4 text-foreground/40" />
</div>
{/* Navigation */}
<nav className="flex flex-col items-center gap-1 flex-1">
{navItems.map((item) => {
const Icon = item.icon;
const isActive = activeTab === item.id;
return (
<button
key={item.id}
onClick={() => onTabChange(item.id)}
className={`group flex flex-col items-center gap-1.5 py-3 px-3 rounded-lg transition-all duration-300 w-full ${
isActive
? 'bg-secondary/60'
: 'hover:bg-secondary/30'
}`}
>
<Icon
className={`w-[18px] h-[18px] transition-colors duration-300 ${
isActive ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
}`}
/>
<span
className={`text-[10px] font-mono tracking-wide transition-colors duration-300 ${
isActive ? 'text-foreground/90' : 'text-muted-foreground/40 group-hover:text-muted-foreground/60'
}`}
>
{item.label}
</span>
</button>
);
})}
</nav>
{/* User */}
<div className="flex flex-col items-center gap-2 mt-auto">
<div className="w-9 h-9 rounded-full bg-secondary border border-border/50 flex items-center justify-center">
<span className="text-xs font-space text-foreground/70">A</span>
</div>
<div className="text-center">
<p className="text-[10px] font-space text-foreground/70">Abel</p>
<div className="flex items-center gap-1 justify-center">
<p className="text-[8px] font-mono text-muted-foreground/40">Seeker</p>
<div className="w-1 h-1 rounded-full bg-green-500/60" />
</div>
</div>
</div>
</div>
);
}
