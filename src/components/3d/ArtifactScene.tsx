import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function ArtifactScene({ className, style }: Props) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // ── Renderer ──────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
    });

    // ── Scene / Camera ────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0.5, 0.3, 6.2);
    camera.lookAt(0, 0, 0);

    function resize() {
      const W = el!.clientWidth || 800;
      const H = el!.clientHeight || 600;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
    resize();

    // ── Materials ─────────────────────────────────────────────────
    const line = (c: number, op: number) =>
      new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op });

    const purpleMat = line(0x8b5cf6, 0.92);
    const cyanMat   = line(0x22d3ee, 0.68);
    const dimMat    = line(0xc4b5fd, 0.30);
    const glassMat  = new THREE.MeshBasicMaterial({
      color: 0x2a0860, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
    });

    // ── Outer cube ─────────────────────────────────────────────────
    const outerGeo  = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const outerWire = new THREE.LineSegments(new THREE.EdgesGeometry(outerGeo), purpleMat);
    const outerFace = new THREE.Mesh(outerGeo, glassMat);
    const outerGrp  = new THREE.Group();
    outerGrp.add(outerWire, outerFace);
    scene.add(outerGrp);

    // ── Inner cube (rotated) ────────────────────────────────────────
    const innerGeo  = new THREE.BoxGeometry(1.45, 1.45, 1.45);
    const innerWire = new THREE.LineSegments(new THREE.EdgesGeometry(innerGeo), cyanMat);
    const innerGrp  = new THREE.Group();
    innerGrp.add(innerWire);
    innerGrp.rotation.set(0.4, 0.9, 0.2);
    scene.add(innerGrp);

    // ── Diagonal structural lines ───────────────────────────────────
    const h = 1.1;
    const diagPos = new Float32Array([
      -h, -h, -h,   h,  h,  h,
       h, -h, -h,  -h,  h,  h,
      -h,  h, -h,   h, -h,  h,
       h,  h, -h,  -h, -h,  h,
    ]);
    const diagBuf = new THREE.BufferGeometry();
    diagBuf.setAttribute('position', new THREE.BufferAttribute(diagPos, 3));
    const diagLines = new THREE.LineSegments(diagBuf, dimMat);
    scene.add(diagLines);

    // ── Orbital torus rings ─────────────────────────────────────────
    function makeTorus(r: number, t: number, c: number, op: number, rx: number, ry: number, rz: number) {
      const g = new THREE.TorusGeometry(r, t, 3, 128);
      const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.set(rx, ry, rz);
      return mesh;
    }
    const ring1 = makeTorus(3.1, 0.007, 0x8b5cf6, 0.22, Math.PI / 2.3, 0, 0);
    const ring2 = makeTorus(3.7, 0.005, 0x22d3ee, 0.14, Math.PI / 1.7, 0, Math.PI / 4);
    scene.add(ring1, ring2);

    // ── Lights ─────────────────────────────────────────────────────
    const goldLight = new THREE.PointLight(0xf5c518, 5.5, 7, 2);
    const purpLight = new THREE.PointLight(0x8b5cf6, 2.2, 10, 2);
    scene.add(goldLight, purpLight, new THREE.AmbientLight(0x0a0520, 1.2));

    // ── Core glow sphere ────────────────────────────────────────────
    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfffde0 }),
    );
    scene.add(coreMesh);

    // ── Particles ──────────────────────────────────────────────────
    function makePoints(n: number, rMin: number, rMax: number, c: number, sz: number, op: number) {
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = rMin + Math.random() * (rMax - rMin);
        const phi   = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return new THREE.Points(geo, new THREE.PointsMaterial({ color: c, size: sz, transparent: true, opacity: op, sizeAttenuation: true }));
    }
    const pp = makePoints(300, 3.5, 7.5, 0x8b5cf6, 0.036, 0.65);
    const cp = makePoints(100, 2.8, 5.0, 0x22d3ee, 0.026, 0.50);
    const gp = makePoints(50,  1.8, 3.8, 0xf5c518, 0.022, 0.38);
    scene.add(pp, cp, gp);

    // ── Animation ──────────────────────────────────────────────────
    let raf = 0, last = performance.now(), t = 0;

    function tick() {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      t += (now - last) / 1000;
      last = now;

      outerGrp.rotation.y = t * 0.16;
      outerGrp.rotation.x = Math.sin(t * 0.09) * 0.08;

      innerGrp.rotation.y = 0.9 - t * 0.26;
      innerGrp.rotation.z = 0.2 + t * 0.13;
      innerGrp.rotation.x = 0.4 + Math.sin(t * 0.07) * 0.05;

      diagLines.rotation.y = t * 0.16;
      diagLines.rotation.x = Math.sin(t * 0.09) * 0.08;

      ring1.rotation.z = t * 0.05;
      ring2.rotation.z = -t * 0.034;

      pp.rotation.y =  t * 0.022;
      cp.rotation.y = -t * 0.030;
      gp.rotation.y =  t * 0.045;

      const pulse = 0.75 + Math.sin(t * 2.2) * 0.32;
      goldLight.intensity = 5.5 * pulse;
      coreMesh.scale.setScalar(0.70 + Math.sin(t * 2.5) * 0.26);

      camera.position.x = 0.5 + Math.sin(t * 0.07) * 0.14;
      camera.position.y = 0.3 + Math.sin(t * 0.05) * 0.10;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    tick();

    const ro = new ResizeObserver(resize);
    ro.observe(el!);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      if (el!.contains(renderer.domElement)) el!.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={elRef} className={className} style={{ position: 'relative', ...style }} />;
}
