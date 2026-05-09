});
}
// Layer 2: mid stars
for (let i = 0; i < 80; i++) {
layers.push({
x: Math.random() * 3000 - 500,
y: Math.random() * 2000 - 500,
size: Math.random() * 2 + 1,
opacity: Math.random() * 0.3 + 0.15,
parallax: 0.15,
delay: Math.random() * 6,
});
}
// Layer 3: close bright stars
for (let i = 0; i < 20; i++) {
layers.push({
x: Math.random() * 3000 - 500,
y: Math.random() * 2000 - 500,
size: Math.random() * 2.5 + 1.5,
opacity: Math.random() * 0.5 + 0.3,
parallax: 0.3,
delay: Math.random() * 6,
});
}
return layers;
}, []);
return (
<div className="absolute inset-0 overflow-hidden pointer-events-none">
{stars.map((star, i) => (
<div
key={i}
className="absolute rounded-full bg-white"
style={{
left: star.x + panOffset.x * star.parallax,
top: star.y + panOffset.y * star.parallax,
width: star.size,
height: star.size,
opacity: star.opacity,
animation: `pulse-glow ${3 + star.delay}s ease-in-out ${star.delay}s infinite`,
}}
/>
))}
</div>
);
}
