import { useMemo } from 'react';
// Cubic bezier path flowing downward between two points
function cubicDown(from, to) {
const dy = to.y - from.y;
return `M ${from.x} ${from.y} C ${from.x} ${from.y + dy * 0.42}, ${to.x} ${to.y - dy * 0.42}, ${to.x} ${to.y}`;
}
// Generate faint secondary hair-lines peeling off a wire
function generateRootHairs(from, to, count = 8) {
const hairs = [];
for (let i = 0; i < count; i++) {
const t = (i + 1) / (count + 1);
const mx = from.x + (to.x - from.x) * t;
const my = from.y + (to.y - from.y) * t;
const spread = (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 7);
const len = 20 + (i % 5) * 10;
const angle = ((i * 43) % 80) - 40;
const rad = (angle * Math.PI) / 180;
hairs.push({
x1: mx, y1: my,
x2: mx + Math.cos(rad + Math.PI / 2) * spread,
y2: my + Math.sin(rad + Math.PI / 2) * spread + len * 0.35,
});
// Sub-hair branching off the hair
if (i % 2 === 0) {
hairs.push({
x1: mx + Math.cos(rad + Math.PI / 2) * spread * 0.5,
y1: my + Math.sin(rad + Math.PI / 2) * spread * 0.5 + len * 0.15,
x2: mx + Math.cos(rad + Math.PI / 2) * spread * 0.5 + (i % 2 === 0 ? 12 : -12),
y2: my + Math.sin(rad + Math.PI / 2) * spread * 0.5 + len * 0.15 + 14,
isSub: true,
});
}
}
return hairs;
}
// Spine-only dense hair structure
function generateSpineHairs(from, to) {
const hairs = [];
const steps = 22;
for (let i = 0; i < steps; i++) {
const t = (i + 1) / (steps + 1);
const mx = from.x + (to.x - from.x) * t;
const my = from.y + (to.y - from.y) * t;
const side = i % 2 === 0 ? 1 : -1;
const angle = ((i * 31) % 50) - 25;
const rad = (angle * Math.PI) / 180;
const len = 25 + (i % 6) * 12;
hairs.push({
x1: mx, y1: my,
x2: mx + Math.cos(rad + Math.PI / 2) * side * (18 + (i % 4) * 8),
y2: my + Math.sin(rad + Math.PI / 2) * side * (18 + (i % 4) * 8) + len * 0.3,
});
}
return hairs;
}
// Small glowing star point
function StarPoint({ cx, cy, r = 2, dur = '3s', begin = '0s' }) {
return (
<circle cx={cx} cy={cy} r={r} fill="white" filter="url(#pt-glow)">
<animate attributeName="opacity" values="0.08;0.9;0.08" dur={dur} begin={begin} repeatCount="indefinite" />
<animate attributeName="r" values={`${r * 0.5};${r * 1.7};${r * 0.5}`} dur={dur} begin={begin} repeatCount="indefinite" />
</circle>
);
}
function WirePath({ from, to, status, isSpine, idx }) {
const path = cubicDown(from, to);
const isActive = status === 'unlocked' || status === 'active';
const isMastered = status === 'mastered';
const isVisible = isActive || isMastered || isSpine;
const regularHairs = useMemo(() => generateRootHairs(from, to, isSpine ? 14 : 8), [from, to, isSpine]);
const spineHairs = useMemo(() => isSpine ? generateSpineHairs(from, to) : [], [from, to, isSpine]);
// Star points distributed along the wire
const wireStars = useMemo(() => {
if (!isVisible) return [];
const count = isSpine ? 7 : 3;
return Array.from({ length: count }, (_, i) => {
const t = (i + 1) / (count + 1);
return {
cx: from.x + (to.x - from.x) * t,
cy: from.y + (to.y - from.y) * t,
r: isSpine ? (1.2 + (i % 3) * 0.5) : 0.9,
dur: `${2 + i * 0.35}s`,
begin: `${i * 0.4 + idx * 0.15}s`,
};
});
}, [from, to, isVisible, isSpine, idx]);
const coreColor = isMastered ? 'rgba(255,160,160,0.75)' : isVisible ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.07)';
const particleDur = `${1.4 + idx * 0.2}s`;
return (
<g>
{/* ── Regular root hairs off this wire ── */}
{isVisible && regularHairs.map((h, i) => (
<line key={`rh-${i}`}
x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2}
stroke={h.isSub ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)'}
strokeWidth={h.isSub ? '0.35' : '0.5'}
strokeLinecap="round"
>
<animate attributeName="opacity"
values={h.isSub ? '0.02;0.12;0.02' : '0.04;0.22;0.04'}
dur={`${2.2 + i * 0.35}s`} begin={`${i * 0.28}s`} repeatCount="indefinite" />
</line>
))}
{/* ── Dense spine-specific branching ── */}
{isSpine && spineHairs.map((h, i) => (
<line key={`sh-${i}`}
x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2}
stroke="rgba(255,255,255,0.11)" strokeWidth="0.45" strokeLinecap="round"
>
<animate attributeName="opacity"
values="0.03;0.19;0.03"
dur={`${3 + i * 0.25}s`} begin={`${i * 0.2}s`} repeatCount="indefinite" />
</line>
))}
{/* ── Wide outer bloom (spine) ── */}
{isSpine && (
<>
<path d={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="38" strokeLinecap="round" filter="url(#bloom)" />
<path d={path} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="16" strokeLinecap="round" filter="url(#bloom)" />
</>
)}
{/* ── Medium soft glow ── */}
{isVisible && (
<path d={path} fill="none"
stroke={isMastered ? 'rgba(255,160,160,0.15)' : isSpine ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)'}
strokeWidth={isSpine ? 9 : 5}
strokeLinecap="round"
filter="url(#wire-glow)" />
)}
{/* ── Thin inner glow layer ── */}
{isVisible && (
<path d={path} fill="none"
stroke={isSpine ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)'}
strokeWidth={isSpine ? 2.5 : 1.5}
strokeLinecap="round"
filter="url(#wire-glow)" />
)}
{/* ── Core filament ── */}
<path d={path} fill="none"
stroke={coreColor}
strokeWidth={isSpine ? 1.1 : isVisible ? 0.75 : 0.4}
strokeLinecap="round"
strokeDasharray={!isVisible ? '2 10' : undefined}
opacity={isVisible ? 1 : 0.3}
/>
{/* ── Stars distributed along wire ── */}
{wireStars.map((s, i) => (
<StarPoint key={`ws-${i}`} cx={s.cx} cy={s.cy} r={s.r} dur={s.dur} begin={s.begin} />
))}
{/* ── Flow particle (visible wires only) ── */}
{isVisible && (
<circle r={isSpine ? 2.0 : 1.3} fill="rgba(255,255,255,0.8)" filter="url(#pt-glow)">
<animateMotion dur={particleDur} repeatCount="indefinite" path={path} />
<animate attributeName="opacity" values="0;0.9;0" dur={particleDur} repeatCount="indefinite" />
</circle>
)}
{/* ── Second counter-flowing particle on spine ── */}
{isSpine && (
<circle r="1.4" fill="rgba(255,255,255,0.55)" filter="url(#pt-glow)">
<animateMotion dur={`${parseFloat(particleDur) * 1.7}s`} repeatCount="indefinite" path={path} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
<animate attributeName="opacity" values="0;0.6;0" dur={`${parseFloat(particleDur) * 1.7}s`} repeatCount="indefinite" />
</circle>
)}
</g>
);
}
export default function TreeWires({ nodes, edges }) {
const nodeMap = useMemo(() => {
const m = {};
nodes.forEach((n) => { m[n.id] = n; });
return m;
}, [nodes]);
return (
<>
{edges.map((edge, i) => {
const from = nodeMap[edge.from];
const to = nodeMap[edge.to];
if (!from || !to) return null;
const isSpine = edge.from === 'purpose' && edge.to === 'growth';
return (
<WirePath key={`${edge.from}-${edge.to}`}
from={{ x: from.x, y: from.y }}
to={{ x: to.x, y: to.y }}
status={to.status}
isSpine={isSpine}
idx={i}
/>
);
})}
</>
);
}
