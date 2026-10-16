import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  RotateCw, Play, Pause, ZoomIn, ZoomOut, Compass, 
  Sparkles, Layers, Shield, DollarSign, Target, Globe
} from 'lucide-react';
import soundFx from '../utils/soundEffects';

export default function GlobalFlowGlobe3D({
  countries = [],
  currentLinks = [],
  selectedQuarter,
  selectedCountry,
  onSelectCountry,
  focusCountry = 'ALL',
  corridorDensity = 'backbone',
  metricView = 'claims',
  onSelectCorridor
}) {
  const canvasRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);

  // Rotation angles (degrees)
  const rotationRef = useRef({ yaw: 0, pitch: 18 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animFrameIdRef = useRef(null);
  const particleOffsetRef = useRef(0);
  const targetFlightRef = useRef(null);

  // Background starfield particles
  const starsRef = useRef(
    Array.from({ length: 95 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      twinkleSpeed: Math.random() * 0.03 + 0.01
    }))
  );

  const countryMap = useMemo(() => {
    return Object.fromEntries(countries.map(c => [c.code, c]));
  }, [countries]);

  // Trigger smooth orbital flight camera when selectedCountry changes
  useEffect(() => {
    if (selectedCountry && countryMap[selectedCountry]) {
      const c = countryMap[selectedCountry];
      targetFlightRef.current = {
        yaw: -c.lng,
        pitch: Math.max(-50, Math.min(50, c.lat))
      };
      setIsRotating(false);
    }
  }, [selectedCountry, countryMap]);

  // Filter links
  const filteredLinks = useMemo(() => {
    return currentLinks.filter(l => {
      if (focusCountry !== 'ALL') {
        return l.source === focusCountry || l.target === focusCountry;
      }
      if (corridorDensity === 'backbone') {
        return l.claims_usd_bn >= 160;
      }
      if (corridorDensity === 'usd_dominant') {
        return (l.usd_denominated_bn / l.claims_usd_bn) >= 0.7;
      }
      return true;
    });
  }, [currentLinks, focusCountry, corridorDensity]);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    targetFlightRef.current = null;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleClickCanvas = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.38 * zoom;

    // Hit test on countries
    for (const c of countries) {
      const pt = projectTo3D(c.lng, c.lat, baseRadius, rotationRef.current.yaw, rotationRef.current.pitch);
      if (pt.isFront) {
        const dx = (cx + pt.x) - mouseX;
        const dy = (cy + pt.y) - mouseY;
        if (Math.sqrt(dx * dx + dy * dy) <= 12) {
          soundFx.playChime();
          onSelectCountry?.(c.code);
          return;
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      rotationRef.current.yaw += dx * 0.45;
      rotationRef.current.pitch = Math.max(-65, Math.min(65, rotationRef.current.pitch - dy * 0.45));
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.7, Math.min(2.2, prev - e.deltaY * 0.0015)));
  };

  // Convert Lon/Lat into 3D Cartesian coordinates on sphere
  const projectTo3D = (lng, lat, radius, yawDeg, pitchDeg) => {
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const lambda = (lng * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;

    // Unit sphere coordinates (standard earth)
    const x0 = Math.cos(phi) * Math.sin(lambda);
    const y0 = Math.sin(phi);
    const z0 = Math.cos(phi) * Math.cos(lambda);

    // Apply Yaw (Y-axis rotation)
    const x1 = x0 * Math.cos(yaw) + z0 * Math.sin(yaw);
    const y1 = y0;
    const z1 = -x0 * Math.sin(yaw) + z0 * Math.cos(yaw);

    // Apply Pitch (X-axis rotation)
    const x2 = x1;
    const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);

    return {
      x: x2 * radius,
      y: -y2 * radius, // Canvas Y is inverted
      z: z2 * radius,
      isFront: z2 > -0.05
    };
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.38 * zoom;

      // Handle Smooth Orbital Flight Camera Interpolation
      if (targetFlightRef.current) {
        const dyaw = targetFlightRef.current.yaw - rotationRef.current.yaw;
        const dpitch = targetFlightRef.current.pitch - rotationRef.current.pitch;
        rotationRef.current.yaw += dyaw * 0.085;
        rotationRef.current.pitch += dpitch * 0.085;

        if (Math.abs(dyaw) < 0.25 && Math.abs(dpitch) < 0.25) {
          targetFlightRef.current = null;
        }
      } else if (isRotating && !isDraggingRef.current) {
        rotationRef.current.yaw += 0.22;
      }
      particleOffsetRef.current = (particleOffsetRef.current + 0.008) % 1;

      ctx.clearRect(0, 0, width, height);

      // 0. Starfield Cosmic Background
      starsRef.current.forEach(star => {
        star.alpha += star.twinkleSpeed;
        if (star.alpha > 0.8 || star.alpha < 0.2) star.twinkleSpeed = -star.twinkleSpeed;
        ctx.fillStyle = `rgba(224, 242, 254, ${star.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 1. Atmosphere Halo Gradient
      const atmosGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.85, cx, cy, baseRadius * 1.25);
      atmosGrad.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
      atmosGrad.addColorStop(0.4, 'rgba(30, 58, 138, 0.09)');
      atmosGrad.addColorStop(1, 'rgba(6, 9, 19, 0)');
      ctx.fillStyle = atmosGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // 2. Globe Sphere Base (Velvet Dark Navy)
      const globeGrad = ctx.createRadialGradient(
        cx - baseRadius * 0.35, 
        cy - baseRadius * 0.35, 
        baseRadius * 0.1, 
        cx, 
        cy, 
        baseRadius
      );
      globeGrad.addColorStop(0, '#101d36');
      globeGrad.addColorStop(0.7, '#070c18');
      globeGrad.addColorStop(1, '#03060c');

      ctx.fillStyle = globeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Globe Rim Edge
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Latitude & Longitude Meridians
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';

      // Latitudes (-60 to +60 by 30)
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 10) {
          const pt = projectTo3D(lng, lat, baseRadius, rotationRef.current.yaw, rotationRef.current.pitch);
          if (pt.isFront) {
            if (first) {
              ctx.moveTo(cx + pt.x, cy + pt.y);
              first = false;
            } else {
              ctx.lineTo(cx + pt.x, cy + pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Longitudes (-180 to 180 by 30)
      for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -80; lat <= 80; lat += 8) {
          const pt = projectTo3D(lng, lat, baseRadius, rotationRef.current.yaw, rotationRef.current.pitch);
          if (pt.isFront) {
            if (first) {
              ctx.moveTo(cx + pt.x, cy + pt.y);
              first = false;
            } else {
              ctx.lineTo(cx + pt.x, cy + pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // 4. Draw Bilateral 3D Great-Circle Arcs
      filteredLinks.forEach(link => {
        const src = countryMap[link.source];
        const dst = countryMap[link.target];
        if (!src || !dst) return;

        const p1 = projectTo3D(src.lng, src.lat, baseRadius, rotationRef.current.yaw, rotationRef.current.pitch);
        const p2 = projectTo3D(dst.lng, dst.lat, baseRadius, rotationRef.current.yaw, rotationRef.current.pitch);

        // If at least one endpoint is on front, or the arc passes through the front
        const isArcVisible = p1.isFront || p2.isFront;
        if (!isArcVisible) return;

        // Midpoint with orbital elevation
        const midLng = (src.lng + dst.lng) / 2;
        const midLat = (src.lat + dst.lat) / 2;
        const elevation = baseRadius * (1.18 + Math.min(0.25, link.claims_usd_bn / 4000));
        const pMid = projectTo3D(midLng, midLat, elevation, rotationRef.current.yaw, rotationRef.current.pitch);

        const isDollar = (link.usd_denominated_bn / link.claims_usd_bn) >= 0.75;
        const arcColor = link.source === focusCountry
          ? '#34d399'
          : link.target === focusCountry
          ? '#f43f5e'
          : isDollar
          ? '#38bdf8'
          : '#a78bfa';

        // Draw Quadratic Curved Arc
        ctx.beginPath();
        ctx.moveTo(cx + p1.x, cy + p1.y);
        ctx.quadraticCurveTo(cx + pMid.x, cy + pMid.y, cx + p2.x, cy + p2.y);
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = Math.max(1, Math.min(3, Math.sqrt(link.claims_usd_bn) / 18));
        ctx.globalAlpha = p1.isFront && p2.isFront ? 0.65 : 0.25;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Animated Particle Photon traveling on arc
        const t = (particleOffsetRef.current + (link.claims_usd_bn % 100) / 100) % 1;
        const invT = 1 - t;
        // Quadratic Bezier Formula: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        const partX = invT * invT * p1.x + 2 * invT * t * pMid.x + t * t * p2.x;
        const partY = invT * invT * p1.y + 2 * invT * t * pMid.y + t * t * p2.y;
        const partZ = invT * invT * p1.z + 2 * invT * t * pMid.z + t * t * p2.z;

        if (partZ > -baseRadius * 0.1) {
          ctx.beginPath();
          ctx.arc(cx + partX, cy + partY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = arcColor;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 5. Draw Country Nodes & Glowing Halos
      countries.forEach(c => {
        const pt = projectTo3D(c.lng, c.lat, baseRadius, rotationRef.current.yaw, rotationRef.current.pitch);
        if (!pt.isFront) return;

        const isSelected = selectedCountry === c.code || focusCountry === c.code;
        const themeColor = c.type === 'offshore_conduit' ? '#fbbf24' : '#38bdf8';
        const nodeSize = isSelected ? 7 : 4;

        // Outer glow
        ctx.beginPath();
        ctx.arc(cx + pt.x, cy + pt.y, nodeSize + (isSelected ? 6 : 3), 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.15)';
        ctx.fill();

        // Inner solid core
        ctx.beginPath();
        ctx.arc(cx + pt.x, cy + pt.y, nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ffffff' : themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = isSelected ? 12 : 5;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Country Text Label
        ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(226, 232, 240, 0.85)';
        ctx.fillText(c.name_zh, cx + pt.x + 7, cy + pt.y + 3);
      });

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [countries, filteredLinks, zoom, isRotating, selectedCountry, focusCountry, countryMap]);

  return (
    <div className="relative w-full h-[640px] bg-[#050811] rounded-2xl overflow-hidden select-none flex items-center justify-center">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        width={960}
        height={640}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClickCanvas}
      />

      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 text-xs shadow-xl">
        <button
          onClick={() => {
            soundFx.playTick();
            setIsRotating(!isRotating);
          }}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all font-semibold ${
            isRotating
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="开启或暂停地球仪自转"
        >
          {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRotating ? '自转巡航中' : '静态观察'}</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={() => {
            soundFx.playTick();
            setZoom(prev => Math.min(2.2, prev + 0.15));
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="放大"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            soundFx.playTick();
            setZoom(prev => Math.max(0.7, prev - 0.15));
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Floating Info Pill */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 font-mono flex items-center gap-2 shadow-xl">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
        <span>3D 极坐标投影 · 鼠标拖拽自由旋转 · 滚轮缩放</span>
      </div>
    </div>
  );
}
