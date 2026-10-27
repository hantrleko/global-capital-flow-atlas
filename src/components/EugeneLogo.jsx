import React from 'react';

/**
 * EUGENE FINANCE Brand Logo Component
 * Renders the official corporate identity logo with flexible sizing and dark-mode framing.
 */
export default function EugeneLogo({ 
  size = 'md', // 'sm' | 'md' | 'lg'
  showText = true,
  subtitle = 'Global Capital Flow Atlas',
  className = ''
}) {
  const logoUrl = `${import.meta.env.BASE_URL}eugene-logo.jpg`.replace('//', '/');

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const textClasses = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  const subClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs'
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Container */}
      <div className={`${sizeClasses[size] || sizeClasses.md} rounded-lg overflow-hidden bg-white p-0.5 border border-slate-600/60 shadow-md flex items-center justify-center shrink-0 transition-transform hover:scale-105`}>
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
            <span className={`${textClasses[size] || textClasses.md} font-black tracking-wider text-white uppercase font-sans`}>
              EUGENE FINANCE
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 tracking-normal">
              ATLAS
            </span>
          </div>
          {subtitle && (
            <span className={`${subClasses[size] || subClasses.md} text-slate-400 font-medium tracking-tight truncate`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
