import React from 'react';

/**
 * EUGENE FINANCE Brand Logo Component
 * Pixel-perfect SVG vector recreation of the official Eugene Finance geometric emblem.
 * Features the square frame with upward diagonal arrow, trendline, and bar charts.
 * Perfectly sharp on Retina/4K displays, with dark/light mode elegance.
 */
export function EugeneFinanceEmblem({ className = "w-6 h-6", glow = false }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]' : ''}`}
    >
      {/* Outer Square Frame with top-right opening */}
      <path 
        d="M60 22 H24 V76 H78 V40" 
        stroke="currentColor" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Main Breakthrough Arrow (Points to top-right) */}
      <path 
        d="M44 54 L76 22 M76 22 H60 M76 22 V38" 
        stroke="currentColor" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Zigzag Chart Trendline */}
      <path 
        d="M24 50 L40 34 L54 48 L68 34" 
        stroke="currentColor" 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Bottom Bar Chart Columns */}
      <rect x="50" y="58" width="8" height="18" rx="2" fill="currentColor" />
      <rect x="64" y="48" width="8" height="28" rx="2" fill="currentColor" />

      {/* Bottom-left corner accent */}
      <path 
        d="M24 70 L34 60 H42" 
        stroke="currentColor" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

export default function EugeneLogo({ 
  size = 'md', // 'sm' | 'md' | 'lg'
  showText = true,
  subtitle = 'Global Capital Flow Atlas',
  className = ''
}) {
  const logoUrl = `${import.meta.env.BASE_URL}eugene-logo.jpg`.replace('//', '/');

  const sizeMap = {
    sm: { box: 'w-7 h-7 p-0.5', icon: 'w-4 h-4', title: 'text-xs', sub: 'text-[9px]' },
    md: { box: 'w-8 h-8 p-0.5', icon: 'w-5 h-5', title: 'text-sm', sub: 'text-[10px]' },
    lg: { box: 'w-10 h-10 p-1', icon: 'w-6 h-6', title: 'text-base', sub: 'text-xs' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Container */}
      <div 
        data-testid="eugene-logo"
        className={`${currentSize.box} rounded-lg overflow-hidden bg-white border border-sky-400/50 shadow-md flex items-center justify-center shrink-0 transition-transform hover:scale-105`}
        title="EUGENE FINANCE"
      >
        <img 
          src={logoUrl} 
          alt="EUGENE FINANCE" 
          className="w-full h-full object-contain"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-tight select-none">
          <div className="flex items-center gap-1.5">
            <span className={`${currentSize.title} font-black tracking-wider text-white uppercase font-sans`}>
              EUGENE FINANCE
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 tracking-normal">
              ATLAS v1.8
            </span>
          </div>
          {subtitle && (
            <span className={`${currentSize.sub} text-slate-400 font-medium tracking-tight truncate`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
