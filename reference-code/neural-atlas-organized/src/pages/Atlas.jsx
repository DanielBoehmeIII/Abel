import { useState } from 'react';
import Sidebar from '@/components/atlas/Sidebar';
import SkillTreeCanvas from '@/components/atlas/SkillTreeCanvas';
import HudOverlay from '@/components/atlas/HudOverlay';
import NodeDetailPanel from '@/components/atlas/NodeDetailPanel';
// StarsBackground is now embedded inside SkillTreeCanvas SVG
export default function Atlas() {
const [activeTab, setActiveTab] = useState('atlas');
const [selectedNode, setSelectedNode] = useState(null);
return (
<div className="h-screen w-screen overflow-hidden bg-background relative">
{/* Sidebar */}
<Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
{/* Main content area */}
<div className="absolute inset-0 ml-20">
{/* Header text */}
<div className="absolute top-8 left-10 z-30 pointer-events-none">
<p className="text-[9px] font-mono tracking-[0.35em] text-muted-foreground/40 uppercase mb-3">
Every insight connects.
</p>
<h1 className="font-space text-5xl font-bold text-foreground/90 tracking-tight leading-[1.05]">
ATLAS
</h1>
<h1 className="font-space text-5xl font-bold text-foreground/50 tracking-tight leading-[1.05]">
OF BEING
</h1>
<p className="text-sm font-mono text-muted-foreground/35 mt-4 max-w-[280px] leading-relaxed">
A living map of what you know, feel, and are becoming.
</p>
</div>
{/* Skill Tree Canvas */}
<SkillTreeCanvas
onSelectNode={setSelectedNode}
selectedNode={selectedNode}
/>
{/* HUD elements — hide drift/quote when detail panel open */}
<HudOverlay hidden={!!selectedNode} />
{/* Node Detail Panel */}
<NodeDetailPanel
node={selectedNode}
onClose={() => setSelectedNode(null)}
/>
</div>
</div>
);
}
