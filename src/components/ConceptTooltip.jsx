import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Sparkles, BookOpen, X } from 'lucide-react';
import { FINANCIAL_GLOSSARY } from '../utils/financialGlossary';

export default function ConceptTooltip({
  termKey,
  children,
  showIcon = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const entry = FINANCIAL_GLOSSARY[termKey];
  if (!entry) {
    return <span className={className}>{children}</span>;
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center group cursor-help font-inherit"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen(prev => !prev);
      }}
    >
      <span className={`border-b border-dotted border-indigo-400/60 hover:border-indigo-400 transition-colors ${className}`}>
        {children || entry.term}
      </span>
      {showIcon && (
        <HelpCircle className="w-3 h-3 ml-0.5 text-indigo-400/70 hover:text-indigo-300 inline shrink-0" />
      )}

      {/* Floating Plain-Language Card */}
      {isOpen && (
        <div
          data-testid={`concept-tooltip-${termKey}`}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3 bg-[#0d1321] text-slate-200 border border-indigo-500/35 rounded-xl shadow-2xl z-50 text-left font-sans animate-fade-in pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 mb-2 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {entry.tag}
              </span>
              <strong className="text-xs text-white tracking-tight">{entry.term}</strong>
            </div>
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
              {entry.en}
            </span>
          </div>

          {/* 3-Point Intuitive Breakdown */}
          <div className="space-y-1.5 text-xs leading-relaxed">
            <div>
              <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                <span>🗣️</span> <span>人话解释:</span>
              </span>
              <p className="text-slate-200 mt-0.5 text-[11px]">{entry.plainText}</p>
            </div>

            <div className="bg-[#131b2e]/90 p-1.5 rounded-lg border border-white/[0.05]">
              <span className="text-amber-300 font-semibold flex items-center gap-1 text-[11px]">
                <span>🎯</span> <span>现实比喻:</span>
              </span>
              <p className="text-slate-300 mt-0.5 text-[11px] italic">{entry.metaphor}</p>
            </div>

            <div>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                <span>📈</span> <span>判读法则:</span>
              </span>
              <p className="text-slate-300 mt-0.5 text-[11px]">{entry.readingRule}</p>
            </div>
          </div>

          {/* Pointer tail */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[#0d1321] border-r border-b border-indigo-500/35 rotate-45" />
        </div>
      )}
    </span>
  );
}
