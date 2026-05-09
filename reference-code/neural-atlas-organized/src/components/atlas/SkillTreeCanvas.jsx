import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import TreeWires from './TreeWires';
import SkillNode from './SkillNode';
const CANVAS_W = 1200;
const CANVAS_H = 980;
const ROOT_X = 600;
const ROOT_Y = 140;
const RAW_NODES = [
{ id: 'purpose', rx: 0, ry: 0, label: 'Purpose', subtitle: 'Creative Expression', status: 'active', size: 118, progress: 72, delay: 0, description: 'Your central north star — the driving force behind all creative endeavors.', quests: [{ label: 'Define your core mission', done: true }, { label: 'Write a personal manifesto', done: true }, { label: 'Create a vision board', done: false }] },
{ id: 'curiosity', rx: -195, ry: 185, label: 'Curiosity', subtitle: 'Spark', status: 'unlocked', size: 84, progress: 45, delay: 0.1, description: 'The relentless drive to question, explore, and discover new frontiers.', quests: [{ label: 'Read 3 books outside your field', done: true }, { label: 'Attend a workshop on an unknown topic', done: false }] },
{ id: 'clarity', rx: 195, ry: 185, label: 'Clarity', subtitle: 'Wisdom', status: 'unlocked', size: 84, progress: 60, delay: 0.15, description: 'The art of distilling complexity into simple, actionable understanding.', quests: [{ label: 'Practice daily journaling for 30 days', done: true }, { label: 'Teach a complex concept simply', done: true }, { label: 'Complete a decision-making framework', done: false }] },
{ id: 'emotion', rx: -275, ry: 370, label: 'Emotion', subtitle: 'Mastery', status: 'unlocked', size: 78, progress: 30, delay: 0.2, description: 'Understanding and channeling the full spectrum of human emotion.', quests: [{ label: 'Complete emotional mapping exercise', done: true }, { label: 'Practice mindful observation daily', done: false }] },
{ id: 'discipline', rx: 275, ry: 370, label: 'Discipline', subtitle: '& Flow', status: 'locked', size: 78, progress: 0, delay: 0.25, description: 'The balance between structured practice and effortless flow state.' },
{ id: 'connection', rx: -155, ry: 545, label: 'Connection', subtitle: 'Legacy', status: 'locked', size: 76, progress: 0, delay: 0.3, description: 'Building meaningful relationships and leaving a lasting impact.' },
{ id: 'growth', rx: 0, ry: 710, label: 'Growth', subtitle: 'Evolution', status: 'locked', size: 84, progress: 0, delay: 0.35, description: 'The continuous cycle of learning, adapting, and transcending limitations.' },
];
const EDGES = [
{ from: 'purpose', to: 'curiosity' },
{ from: 'purpose', to: 'clarity' },
{ from: 'curiosity', to: 'emotion' },
{ from: 'clarity', to: 'discipline' },
{ from: 'emotion', to: 'connection' },
{ from: 'discipline', to: 'connection' },
{ from: 'connection', to: 'growth' },
{ from: 'purpose', to: 'growth' },
];
// ── Stable starfield ─────────────────────────────────────────────────────────
function buildStars() {
let seed = 54321;
const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const stars = [];
// Wide quiet background
for (let i = 0; i < 260; i++) {
stars.push({
cx: rng() * CANVAS_W, cy: rng() * CANVAS_H,
r: rng() * 1.0 + 0.2, op: rng() * 0.20 + 0.03,
dur: 4 + rng() * 6, del: rng() * 9, kind: 'bg',
});
}
// Dense halo around root — energetic source, two layers
for (let i = 0; i < 140; i++) {
const a = rng() * Math.PI * 2;
const d = i < 80 ? rng() * 95 + 10 : rng() * 180 + 80; // inner + outer ring
stars.push({
cx: ROOT_X + Math.cos(a) * d, cy: ROOT_Y + Math.sin(a) * d,
r: rng() * (i < 80 ? 2.0 : 1.4) + 0.3,
op: rng() * (i < 80 ? 0.65 : 0.38) + (i < 80 ? 0.20 : 0.10),
dur: 1.0 + rng() * 2.5, del: rng() * 4, kind: 'root',
});
}
// Spine column stars — heavily weighted to lower half
for (let i = 0; i < 130; i++) {
const t = rng();
const cy = ROOT_Y + (t < 0.3 ? t * 300 : 300 + (t - 0.3) * 900);
const distFromSpine = (rng() - 0.5) * (cy > ROOT_Y + 450 ? 280 : 180);
stars.push({
cx: ROOT_X + distFromSpine, cy,
r: rng() * 1.5 + 0.25,
op: rng() * (cy > ROOT_Y + 400 ? 0.40 : 0.28) + 0.06,
dur: 2.0 + rng() * 4, del: rng() * 7, kind: 'spine',
});
}
// Side scatter — more than before, especially mid-tree area
for (let i = 0; i < 110; i++) {
stars.push({
cx: rng() * CANVAS_W, cy: ROOT_Y + rng() * 720,
r: rng() * 1.2 + 0.18, op: rng() * 0.22 + 0.04,
dur: 3 + rng() * 5, del: rng() * 8, kind: 'side',
});
}
return stars;
}
const STARS = buildStars();
function Starfield() {
return (
<g>
{STARS.map((s, i) => (
<circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white">
<animate attributeName="opacity"
values={`${s.op * 0.2};${s.op};${s.op * 0.2}`}
dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
{s.kind !== 'bg' && (
<animate attributeName="r"
values={`${s.r * 0.5};${s.r * 1.5};${s.r * 0.5}`}
dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
)}
</circle>
))}
</g>
);
}
// ── Decorative filament lace — generated from node positions ─────────────────
function DecorativeFilaments({ nodes }) {
const nodeMap = useMemo(() => {
const m = {};
nodes.forEach((n) => { m[n.id] = n; });
return m;
}, [nodes]);
// Generate thin branching filaments from each node outward
const filaments = useMemo(() => {
const list = [];
let seed = 9999;
const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// Lower nodes get many more filaments
const countMap = { purpose: 28, curiosity: 18, clarity: 18, emotion: 22, discipline: 22, connection: 26, growth: 28 };
nodes.forEach((node) => {
const count = countMap[node.id] || 16;
const isLower = node.ry > 350;
for (let i = 0; i < count; i++) {
const baseAngle = (i / count) * Math.PI * 2;
const a = baseAngle + (rng() - 0.5) * 0.7;
const r1 = (node.size / 2) + 2;
const r2 = r1 + rng() * 65 + 22;
const r3 = r2 + rng() * 40 + 12;
const x1 = node.x + Math.cos(a) * r1;
const y1 = node.y + Math.sin(a) * r1;
const x2 = node.x + Math.cos(a + (rng() - 0.5) * 0.5) * r2;
const y2 = node.y + Math.sin(a + (rng() - 0.5) * 0.5) * r2;
const x3 = node.x + Math.cos(a + (rng() - 0.5) * 0.7) * r3;
const y3 = node.y + Math.sin(a + (rng() - 0.5) * 0.7) * r3;
const op = node.id === 'purpose'
? rng() * 0.25 + 0.12
: isLower
? rng() * 0.20 + 0.08
: rng() * 0.15 + 0.05;
list.push({ x1, y1, x2, y2, x3, y3, op, dur: 2.2 + rng() * 4, del: rng() * 6 });
// Every other filament gets a secondary branch off it (denser lace)
if (i % 2 === 0) {
const ba = a + (rng() - 0.5) * 0.8;
const bx1 = x2, by1 = y2;
const bx2 = bx1 + Math.cos(ba) * (rng() * 30 + 10);
const by2 = by1 + Math.sin(ba) * (rng() * 30 + 10);
list.push({
x1: bx1, y1: by1,
x2: bx2, y2: by2,
x3: bx2 + (rng() - 0.5) * 15, y3: by2 + rng() * 15,
op: op * 0.55,
dur: 2.5 + rng() * 3.5, del: rng() * 6,
isMicro: true,
});
}
}
});
return list;
}, [nodes]);
// Lace background between curiosity ↔ clarity and lower branches
const lacePaths = useMemo(() => {
const paths = [];
const p = nodeMap;
if (!p.curiosity || !p.clarity) return paths;
let seed2 = 4242;
const rng2 = () => { seed2 = (seed2 * 16807) % 2147483647; return (seed2 - 1) / 2147483646; };
const pairs = [
[p.curiosity, p.clarity, 8],
[p.curiosity, p.emotion, 10],
[p.clarity, p.discipline, 10],
[p.purpose, p.emotion, 8],
[p.purpose, p.discipline, 8],
[p.emotion, p.connection, 13],
[p.discipline, p.connection, 13],
[p.connection, p.growth, 15],
[p.emotion, p.growth, 8],
[p.discipline, p.growth, 8],
[p.purpose, p.connection, 6],
].filter(([a, b]) => a && b);
pairs.forEach(([a, b, laceCount]) => {
for (let i = 0; i < laceCount; i++) {
const t = rng2() * 0.72 + 0.14;
const mx = a.x + (b.x - a.x) * t + (rng2() - 0.5) * 80;
const my = a.y + (b.y - a.y) * t + (rng2() - 0.5) * 50;
const ex = mx + (rng2() - 0.5) * 65;
const ey = my + rng2() * 45;
const isLower = (a.ry || 0) > 280 || (b.ry || 0) > 280;
const op = rng2() * (isLower ? 0.16 : 0.11) + (isLower ? 0.06 : 0.03);
paths.push({ d: `M ${mx} ${my} Q ${(mx+ex)/2} ${my} ${ex} ${ey}`, op, dur: 3 + rng2() * 4, del: rng2() * 5 });
}
});
return paths;
}, [nodeMap]);
return (
<g>
{/* Background lace */}
{lacePaths.map((lp, i) => (
<path key={`lp-${i}`} d={lp.d} fill="none"
stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" strokeLinecap="round">
<animate attributeName="opacity"
values={`${lp.op * 0.3};${lp.op};${lp.op * 0.3}`}
dur={`${lp.dur}s`} begin={`${lp.del}s`} repeatCount="indefinite" />
</path>
))}
{/* Radial filaments from each node */}
{filaments.map((f, i) => (
<g key={`f-${i}`}>
<path
d={`M ${f.x1} ${f.y1} Q ${f.x2} ${f.y2} ${f.x3} ${f.y3}`}
fill="none" stroke={`rgba(255,255,255,${f.op})`}
strokeWidth={f.isMicro ? '0.35' : '0.55'} strokeLinecap="round"
>
<animate attributeName="opacity"
values={`${f.op * 0.15};${f.op};${f.op * 0.15}`}
dur={`${f.dur}s`} begin={`${f.del}s`} repeatCount="indefinite" />
</path>
{/* Tiny tip star — skip for micro branches */}
{!f.isMicro && (
<circle cx={f.x3} cy={f.y3} r="1.0" fill="rgba(255,255,255,0.65)" filter="url(#pt-glow)">
<animate attributeName="opacity"
values="0.04;0.75;0.04"
dur={`${f.dur}s`} begin={`${f.del}s`} repeatCount="indefinite" />
</circle>
)}
</g>
))}
</g>
);
}
// ── Junction stars at branching points along wires ───────────────────────────
function JunctionStars({ nodes }) {
const nodeMap = useMemo(() => {
const m = {}; nodes.forEach((n) => { m[n.id] = n; }); return m;
}, [nodes]);
// Compute midpoints along each edge and add a cluster of 2-4 tiny stars
const points = useMemo(() => {
const pts = [];
const edgePairs = [
['purpose', 'curiosity'], ['purpose', 'clarity'],
['curiosity', 'emotion'], ['clarity', 'discipline'],
['emotion', 'connection'], ['discipline', 'connection'],
['connection', 'growth'], ['purpose', 'growth'],
];
let seed = 7777;
const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
edgePairs.forEach(([fromId, toId]) => {
const f = nodeMap[fromId]; const t = nodeMap[toId];
if (!f || !t) return;
// 3 stars per edge: at 30%, 55%, 78% along the path
[0.28, 0.52, 0.76].forEach((frac) => {
const mx = f.x + (t.x - f.x) * frac + (rng() - 0.5) * 18;
const my = f.y + (t.y - f.y) * frac + (rng() - 0.5) * 18;
pts.push({ cx: mx, cy: my, r: rng() * 1.5 + 0.8, op: rng() * 0.55 + 0.25, dur: 1.5 + rng() * 2.5, del: rng() * 4 });
});
});
return pts;
}, [nodeMap]);
return (
<g>
{points.map((p, i) => (
<circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="white" filter="url(#pt-glow)">
<animate attributeName="opacity" values={`${p.op * 0.15};${p.op};${p.op * 0.15}`}
dur={`${p.dur}s`} begin={`${p.del}s`} repeatCount="indefinite" />
<animate attributeName="r" values={`${p.r * 0.5};${p.r * 1.6};${p.r * 0.5}`}
dur={`${p.dur}s`} begin={`${p.del}s`} repeatCount="indefinite" />
</circle>
))}
</g>
);
}
// ── Spine glow column — layered luminous column along the trunk ───────────────
function SpineColumn() {
const x = ROOT_X;
const y1 = ROOT_Y - 55;
const y2 = ROOT_Y + 710; // down to growth node
return (
<g>
{/* Broad outer soft glow */}
<line x1={x} y1={y1} x2={x} y2={y2}
stroke="rgba(255,255,255,0.04)" strokeWidth="60" strokeLinecap="round"
filter="url(#bloom)" />
{/* Medium glow */}
<line x1={x} y1={y1} x2={x} y2={y2}
stroke="rgba(255,255,255,0.07)" strokeWidth="22" strokeLinecap="round"
filter="url(#bloom)" />
{/* Inner narrow glow */}
<line x1={x} y1={y1} x2={x} y2={y2}
stroke="rgba(255,255,255,0.12)" strokeWidth="6" strokeLinecap="round"
filter="url(#wire-glow)" />
</g>
);
}
// ── Top spine cap — bright anchor at the very top of the vertical spine ──────
function SpineCap() {
const cx = ROOT_X;
const cy = ROOT_Y - 66;
return (
<g>
{/* Wide halo bloom */}
<circle cx={cx} cy={cy} r="28" fill="rgba(255,255,255,0.08)" filter="url(#bloom)">
<animate attributeName="r" values="20;34;20" dur="4s" repeatCount="indefinite" />
<animate attributeName="opacity" values="0.05;0.15;0.05" dur="4s" repeatCount="indefinite" />
</circle>
{/* Cap line */}
<line x1={cx} y1={cy + 10} x2={cx} y2={ROOT_Y - 59}
stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" strokeLinecap="round" />
{/* Bright center point */}
<circle cx={cx} cy={cy} r="3.2" fill="white" filter="url(#pt-glow)">
<animate attributeName="opacity" values="0.55;1;0.55" dur="2.8s" repeatCount="indefinite" />
<animate attributeName="r" values="2.2;4;2.2" dur="2.8s" repeatCount="indefinite" />
</circle>
{/* 4-ray cross flare */}
{[0, 90, 45, 135].map((angle, i) => {
const rad = (angle * Math.PI) / 180;
const len = i < 2 ? 13 : 8;
return (
<line key={i}
x1={cx + Math.cos(rad) * 3.5} y1={cy + Math.sin(rad) * 3.5}
x2={cx + Math.cos(rad) * len} y2={cy + Math.sin(rad) * len}
stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" strokeLinecap="round">
<animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
</line>
);
})}
</g>
);
}
// ── Main Canvas ───────────────────────────────────────────────────────────────
export default function SkillTreeCanvas({ onSelectNode, selectedNode }) {
const containerRef = useRef(null);
const [size, setSize] = useState({ w: 0, h: 0 });
const [pan, setPan] = useState({ x: 0, y: 0 });
const [isDragging, setDrag] = useState(false);
const [dragStart, setDS] = useState({ x: 0, y: 0 });
const [scale, setScale] = useState(1);
useEffect(() => {
const el = containerRef.current;
if (!el) return;
const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
ro.observe(el);
setSize({ w: el.clientWidth, h: el.clientHeight });
return () => ro.disconnect();
}, []);
const nodes = useMemo(() =>
RAW_NODES.map((n) => ({ ...n, x: ROOT_X + n.rx, y: ROOT_Y + n.ry })),
[]);
const onMD = useCallback((e) => {
if (e.button === 0 || e.button === 1) {
setDrag(true);
setDS({ x: e.clientX - pan.x, y: e.clientY - pan.y });
}
}, [pan]);
const onMM = useCallback((e) => {
if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
}, [isDragging, dragStart]);
const onMU = useCallback(() => setDrag(false), []);
const onW = useCallback((e) => {
e.preventDefault();
setScale((s) => Math.min(Math.max(s + (e.deltaY < 0 ? 0.07 : -0.07), 0.3), 2.4));
}, []);
useEffect(() => {
const el = containerRef.current;
if (el) { el.addEventListener('wheel', onW, { passive: false }); return () => el.removeEventListener('wheel', onW); }
}, [onW]);
const treeOffX = size.w > 0 ? size.w / 2 - ROOT_X : 0;
const treeOffY = size.h > 0 ? size.h / 2 - ROOT_Y - 140 : 0;
return (
<div
ref={containerRef}
className="absolute inset-0 overflow-hidden"
onMouseDown={onMD}
onMouseMove={onMM}
onMouseUp={onMU}
onMouseLeave={onMU}
style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
>
{/* Faint parallax grid */}
<div className="absolute inset-0 pointer-events-none" style={{
opacity: 0.014,
backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)`,
backgroundSize: '70px 70px',
transform: `translate(${pan.x * 0.06}px,${pan.y * 0.06}px)`,
}} />
<svg width={size.w} height={size.h} style={{ position: 'absolute', inset: 0, display: 'block' }}>
<defs>
{/* Broad soft bloom — used for wide halos */}
<filter id="bloom" x="-200%" y="-200%" width="500%" height="500%">
<feGaussianBlur stdDeviation="26" result="b1" />
<feGaussianBlur stdDeviation="9" result="b2" in="SourceGraphic" />
<feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
{/* Wire soft glow */}
<filter id="wire-glow" x="-100%" y="-100%" width="300%" height="300%">
<feGaussianBlur stdDeviation="5.5" result="b" />
<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
{/* Tight point glow */}
<filter id="pt-glow" x="-250%" y="-250%" width="600%" height="600%">
<feGaussianBlur stdDeviation="3.5" result="b" />
<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
{/* Rim glow for nodes */}
<filter id="rim-glow" x="-60%" y="-60%" width="220%" height="220%">
<feGaussianBlur stdDeviation="4" result="b" />
<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
</defs>
<g transform={`translate(${treeOffX + pan.x}, ${treeOffY + pan.y}) scale(${scale})`}>
<Starfield />
<SpineColumn />
<DecorativeFilaments nodes={nodes} />
<TreeWires nodes={nodes} edges={EDGES} />
<JunctionStars nodes={nodes} />
<SpineCap />
{nodes.map((node) => (
<SkillNode
key={node.id}
node={node}
isRoot={node.id === 'purpose'}
onSelect={onSelectNode}
isSelected={selectedNode?.id === node.id}
/>
))}
</g>
</svg>
</div>
);
}
