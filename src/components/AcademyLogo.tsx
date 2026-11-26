import React from 'react';

interface AcademyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  lightText?: boolean;
}

export const AcademyLogo: React.FC<AcademyLogoProps> = ({
  size = 'md',
  showWordmark = true,
  lightText = false,
}) => {
  const iconDimensions =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';

  return (
    <span className="inline-flex items-center gap-2.5 shrink-0">
      <svg
        className={`${iconDimensions} shrink-0`}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="14" fill="#065F46" />
        {/* 8-point Rub el Hizb geometric star */}
        <rect
          x="16"
          y="16"
          width="32"
          height="32"
          rx="2"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
        <rect
          x="16"
          y="16"
          width="32"
          height="32"
          rx="2"
          transform="rotate(45 32 32)"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
        {/* Open Holy Quran */}
        <path
          d="M32 24C28.5 21.5 23 21 19 22.4V41.2C23 39.8 28.5 40.3 32 42.8C35.5 40.3 41 39.8 45 41.2V22.4C41 21 35.5 21.5 32 24Z"
          fill="#FFFFFF"
        />
        <path d="M32 24V42.8" stroke="#065F46" strokeWidth="1.4" strokeLinecap="round" />
        <path
          d="M22.5 27.5C25.5 26.8 28.2 27.2 30 28.5M22.5 32.5C25.5 31.8 28.2 32.2 30 33.5M41.5 27.5C38.5 26.8 35.8 27.2 34 28.5M41.5 32.5C38.5 31.8 35.8 32.2 34 33.5"
          stroke="#065F46"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        {/* Gold Rehal base */}
        <path
          d="M25 45.5L32 42.2L39 45.5"
          stroke="#D4AF37"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span
          className={`font-display font-bold tracking-tight whitespace-nowrap ${
            size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
          } ${lightText ? 'text-white' : 'text-[#0F1F1A]'}`}
        >
          ZARTHOUGHTS QURAN ACADEMY
        </span>
      )}
    </span>
  );
};
