import React from 'react';

interface G5MekaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const G5MekaLogo: React.FC<G5MekaLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  className = '',
}) => {
  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Geometric G5 Monogram Icon */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 p-1.5 shadow-md border border-zinc-700/80 group shrink-0`}
      >
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="g5-silver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e4e4e7" />
              <stop offset="100%" stopColor="#71717a" />
            </linearGradient>
            <linearGradient id="g5-dark-facet" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#3f3f46" />
            </linearGradient>
          </defs>

          {/* Precision Geometric G Mark */}
          <path
            d="M 148 136 L 374 136 L 374 192 L 204 192 L 204 220 L 324 220 L 324 268 L 204 268 L 204 320 L 364 320 L 364 240 L 412 240 L 412 376 L 148 376 Z"
            fill="url(#g5-silver)"
          />
          <path
            d="M 374 136 L 412 174 L 412 240 L 364 240 L 364 192 L 374 136 Z"
            fill="url(#g5-dark-facet)"
            opacity="0.9"
          />
          <polygon points="148,136 204,192 148,192" fill="#71717a" opacity="0.6" />
          <polygon points="148,320 204,320 148,376" fill="#27272a" opacity="0.8" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-white font-mono ${textSizes[size]}`}
            >
              G<span className="text-zinc-400">5</span>MEKA
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] font-medium tracking-wider uppercase text-zinc-400 mt-1">
              Gym Management System
            </span>
          )}
        </div>
      )}
    </div>
  );
};
