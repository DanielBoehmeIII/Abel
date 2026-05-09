import { useState, useMemo } from 'react';
// Seeded RNG per node for stable constellation specks
function nodeRng(seed) {
let s = seed;
return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}
export default function SkillNode({ node, isRoot, onSelect, isSelected }) {
const [hovered, setHovered] = useState(false);
const isLocked = node.status === 'locked';
const isMastered = node.status === 'mastered';
const r = (node.size || 80) / 2;
// Inner constellation specks — stable per node
const specks = useMemo(() => {
const rng = nodeRng(node.id.charCodeAt(0) * 997 + node.id.charCodeAt(1) * 31);
const count = isRoot ? 28 : isLocked ? 8 : 16;
return Array.from({ length: count }, () => {
const angle = rng() * Math.PI * 2;
const dist = rng() * (r - 6) * 0.88;
return {
cx: node.x + Math.cos(angle) * dist,
cy: node.y + Math.sin(angle) * dist,
sr: rng() * 1.4 + 0.3,
op: rng() * (isLocked ? 0.18 : 0.52) + (isLocked ? 0.04 : 0.12),
dur: 1.6 + rng() * 3.5,
del: rng() * 5,
};
});
}, [node.id, node.x, node.y, r, isRoot, isLocked]);
// Micro-dust ring just inside the rim
const rimDust = useMemo(() => {
const rng = nodeRng(node.id.charCodeAt(0) * 113 + 7);
const count = isRoot ? 18 : 10;
return Array.from({ length: count }, () => {
const angle = rng() * Math.PI * 2;
const dist = r - 4 - rng() * 5;
return {
cx: node.x + Math.cos(angle) * dist,
cy: node.y + Math.sin(angle) * dist,
sr: rng() * 0.8 + 0.2,
op: rng() * 0.3 + 0.05,
dur: 2 + rng() * 4,
del: rng() * 6,
};
});
}, [node.id, node.x, node.y, r, isRoot]);
const topAnchor = { cx: node.x, cy: node.y - r };
const bottomAnchor = { cx: node.x, cy: node.y + r };
const rimOpacity = isLocked ? 0.16 : isMastered ? 0.70 : hovered ? 0.75 : 0.50;
const rimColor = isMastered ? `rgba(255,180,180,${rimOpacity})` : `rgba(255,255,255,${rimOpacity})`;
const glowAlpha = isLocked ? 0.02 : isRoot ? 0.18 : hovered ? 0.14 : 0.10;
const glowR = r + (isRoot ? 42 : 26);
return (
<g
style={{ cursor: isLocked ? 'default' : 'pointer' }}
onMouseEnter={() => setHovered(true)}
onMouseLeave={() => setHovered(false)}
onClick={() => !isLocked && onSelect(node)}
>
{/* ── Wide outer bloom ── */}
{!isLocked && (
<circle cx={node.x} cy={node.y} r={glowR}
fill={`rgba(255,255,255,${glowAlpha * 0.5})`}
filter="url(#bloom)"
>
<animate attributeName="r"
values={`${glowR - 10};${glowR + 10};${glowR - 10}`}
dur={isRoot ? '5s' : '8s'} repeatCount="indefinite" />
<animate attributeName="opacity"
values={`${glowAlpha * 0.4};${glowAlpha};${glowAlpha * 0.4}`}
dur={isRoot ? '5s' : '8s'} repeatCount="indefinite" />
</circle>
)}
{/* ── Tighter inner glow ring (rim luminance) ── */}
{!isLocked && (
<circle cx={node.x} cy={node.y} r={r + 5}
fill="none"
stroke={isMastered ? 'rgba(255,160,160,0.18)' : 'rgba(255,255,255,0.16)'}
strokeWidth={isRoot ? 10 : 6}
filter="url(#rim-glow)"
>
<animate attributeName="opacity"
values="0.35;0.95;0.35" dur={isRoot ? '4s' : '6s'} repeatCount="indefinite" />
</circle>
)}
{/* ── Main disc — dark translucent fill ── */}
<circle
cx={node.x} cy={node.y} r={r}
fill="rgba(14,17,26,0.82)"
stroke={rimColor}
strokeWidth={isRoot ? 1.6 : isLocked ? 0.55 : 1.1}
style={{ transition: 'stroke 0.3s ease, stroke-width 0.3s ease' }}
/>
{/* ── Second slightly-inset rim ring for depth ── */}
<circle
cx={node.x} cy={node.y} r={r - 4}
fill="none"
stroke={isLocked ? 'rgba(255,255,255,0.04)' : isMastered ? 'rgba(255,180,180,0.08)' : 'rgba(255,255,255,0.07)'}
strokeWidth="0.6"
/>
{/* ── Rim dust (micro-sparkles near edge) ── */}
{!isLocked && rimDust.map((s, i) => (
<circle key={`rd-${i}`} cx={s.cx} cy={s.cy} r={s.sr} fill="white" opacity={s.op}>
<animate attributeName="opacity"
values={`${s.op * 0.15};${s.op};${s.op * 0.15}`}
dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
</circle>
))}
{/* ── Constellation specks inside disc ── */}
{specks.map((s, i) => (
<circle key={`sp-${i}`} cx={s.cx} cy={s.cy} r={s.sr} fill="rgba(255,255,255,0.9)" opacity={s.op}>
<animate attributeName="opacity"
values={`${s.op * 0.15};${s.op};${s.op * 0.15}`}
dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
</circle>
))}
{/* ── Anchor lights where wires meet the node rim ── */}
<circle cx={topAnchor.cx} cy={topAnchor.cy} r={isRoot ? 2.8 : isLocked ? 1.2 : 2.2}
fill="white" filter="url(#pt-glow)">
<animate attributeName="opacity"
values={isRoot ? '0.6;1;0.6' : isLocked ? '0.08;0.22;0.08' : '0.35;0.85;0.35'}
dur={isRoot ? '2.5s' : '3.5s'} repeatCount="indefinite" />
</circle>
<circle cx={bottomAnchor.cx} cy={bottomAnchor.cy} r={isRoot ? 2.2 : isLocked ? 1.0 : 1.8}
fill="white" filter="url(#pt-glow)">
<animate attributeName="opacity"
values={isLocked ? '0.05;0.18;0.05' : '0.22;0.65;0.22'}
dur="4s" repeatCount="indefinite" />
</circle>
{/* ── Root node gets extra 4-point star flares on rim ── */}
{isRoot && [0, 90, 180, 270].map((deg, i) => {
const rad = (deg * Math.PI) / 180;
return (
<g key={`rf-${i}`}>
<line
x1={node.x + Math.cos(rad) * r} y1={node.y + Math.sin(rad) * r}
x2={node.x + Math.cos(rad) * (r + 12)} y2={node.y + Math.sin(rad) * (r + 12)}
stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" strokeLinecap="round"
>
<animate attributeName="opacity" values="0.15;0.55;0.15" dur="3.5s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
</line>
<circle cx={node.x + Math.cos(rad) * (r + 1)} cy={node.y + Math.sin(rad) * (r + 1)}
r="1.8" fill="white" filter="url(#pt-glow)">
<animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.5s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
</circle>
</g>
);
})}
{/* ── Labels — shadow layer for readability ── */}
<text
x={node.x} y={node.y - (node.subtitle ? (isRoot ? 10 : 7) : 0)}
textAnchor="middle" dominantBaseline="middle"
fill="rgba(0,0,0,0.6)"
fontSize={isRoot ? 15 : 12}
fontFamily="var(--font-space)"
fontWeight={isRoot ? 600 : 500}
dx="0.5" dy="0.5"
style={{ pointerEvents: 'none' }}
>{node.label}</text>
<text
x={node.x} y={node.y - (node.subtitle ? (isRoot ? 10 : 7) : 0)}
textAnchor="middle" dominantBaseline="middle"
fill={`rgba(255,255,255,${isLocked ? 0.35 : hovered ? 1 : 0.93})`}
fontSize={isRoot ? 15 : 12}
fontFamily="var(--font-space)"
fontWeight={isRoot ? 600 : 500}
style={{ pointerEvents: 'none', transition: 'fill 0.3s ease' }}
>{node.label}</text>
{node.subtitle && (
<text
x={node.x} y={node.y + (isRoot ? 11 : 9)}
textAnchor="middle" dominantBaseline="middle"
fill={`rgba(200,210,230,${isLocked ? 0.22 : 0.60})`}
fontSize={isRoot ? 10 : 8.5}
fontFamily="var(--font-mono)"
fontWeight={300}
letterSpacing="0.09em"
style={{ pointerEvents: 'none' }}
>{node.subtitle}</text>
)}
{/* ── Selected dashed ring ── */}
{isSelected && (
<circle cx={node.x} cy={node.y} r={r + 14}
fill="none" stroke="rgba(255,255,255,0.22)"
strokeWidth="0.7" strokeDasharray="3 6"
>
<animateTransform attributeName="transform" type="rotate"
from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
dur="18s" repeatCount="indefinite" />
</circle>
)}
</g>
);
}
