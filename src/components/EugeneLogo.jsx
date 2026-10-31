import React from 'react';

/**
 * EUGENE FINANCE Brand Logo Component
 * Pixel-perfect SVG vector recreation of the official Eugene Finance geometric emblem.
 */
export function EugeneFinanceEmblem({ className = "w-6 h-6", glow = false }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.35)]' : ''}`}
    >
      <path 
        d="M60 22 H24 V76 H78 V40" 
        stroke="currentColor" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M44 54 L76 22 M76 22 H60 M76 22 V38" 
        stroke="currentColor" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M24 50 L40 34 L54 48 L68 34" 
        stroke="currentColor" 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <rect x="50" y="58" width="8" height="18" rx="2" fill="currentColor" />
      <rect x="64" y="48" width="8" height="28" rx="2" fill="currentColor" />
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
  size = 'md',
  showText = true,
  subtitle = 'BIS 宏观审慎投研终端',
  className = ''
}) {
  const logoUrl = `${import.meta.env.BASE_URL}eugene-logo.jpg`.replace('//', '/');

  const sizeMap = {
    sm: { box: 'w-7 h-7 p-0.5', title: 'text-xs', sub: 'text-[11px]' },
    md: { box: 'w-8 h-8 p-0.5', title: 'text-xs sm:text-sm', sub: 'text-[11px]' },
    lg: { box: 'w-10 h-10 p-1', title: 'text-base', sub: 'text-xs' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        data-testid="eugene-logo"
        className={`${currentSize.box} rounded-lg overflow-hidden bg-white border border-white/20 shadow-sm flex items-center justify-center shrink-0 transition-transform hover:scale-105`}
        title="EUGENE FINANCE · Global Capital Flow Atlas"
      >
        <img 
          src={logoUrl} 
          alt="EUGENE FINANCE" 
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight select-none min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`${currentSize.title} font-extrabold tracking-wider text-white uppercase font-sans whitespace-nowrap`}>
              EUGENE FINANCE
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 tracking-normal whitespace-nowrap">
              ATLAS v5.0
            </span>
          </div>
          {subtitle && (
            <span className={`hidden xl:block ${currentSize.sub} text-slate-400 font-medium tracking-tight truncate`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
