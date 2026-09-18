import React from 'react';

export const HeroIllustration: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'var(--radius-card)',
        backgroundColor: '#1d1928',
      }}
    >
      {/* Background Gradient & Vector Dunes */}
      <svg
        viewBox="0 0 500 700"
        preserveAspectRatio="xMidYMid slice"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        aria-hidden="true"
      >
        <defs>
          {/* Sky Gradient */}
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4c3d82" />
            <stop offset="35%" stopColor="#3b2f68" />
            <stop offset="70%" stopColor="#251e42" />
            <stop offset="100%" stopColor="#141122" />
          </linearGradient>

          {/* Dune Front Gradient */}
          <linearGradient id="duneFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2c2448" />
            <stop offset="40%" stopColor="#1c1730" />
            <stop offset="100%" stopColor="#0f0c1a" />
          </linearGradient>

          {/* Dune Mid Gradient */}
          <linearGradient id="duneMidGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#584898" />
            <stop offset="45%" stopColor="#372c60" />
            <stop offset="100%" stopColor="#17122b" />
          </linearGradient>

          {/* Ambient Glow */}
          <radialGradient id="twilightGlow" cx="65%" cy="30%" r="55%">
            <stop offset="0%" stopColor="#705ABF" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#463B8C" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#141122" stopOpacity="0" />
          </radialGradient>

          {/* Sand Crest Highlight */}
          <linearGradient id="crestHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8d77de" stopOpacity="0.1" />
            <stop offset="45%" stopColor="#a392ec" stopOpacity="0.75" />
            <stop offset="85%" stopColor="#705ABF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#312D40" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect width="500" height="700" fill="url(#skyGrad)" />

        {/* Atmospheric Glow */}
        <circle cx="320" cy="220" r="260" fill="url(#twilightGlow)" />

        {/* Star speckles */}
        <circle cx="80" cy="90" r="1" fill="#FFFFFF" opacity="0.6" />
        <circle cx="160" cy="60" r="1.5" fill="#FFFFFF" opacity="0.8" />
        <circle cx="280" cy="110" r="1.2" fill="#FFFFFF" opacity="0.7" />
        <circle cx="410" cy="80" r="1" fill="#FFFFFF" opacity="0.5" />
        <circle cx="370" cy="150" r="1.4" fill="#FFFFFF" opacity="0.65" />
        <circle cx="120" cy="180" r="0.9" fill="#FFFFFF" opacity="0.4" />
        <circle cx="230" cy="220" r="1.2" fill="#FFFFFF" opacity="0.6" />
        <circle cx="450" cy="190" r="1" fill="#FFFFFF" opacity="0.5" />

        {/* Distant Dune / Mountains */}
        <path
          d="M-20 420 Q120 310 260 360 T520 330 L520 700 L-20 700 Z"
          fill="url(#duneMidGrad)"
          opacity="0.85"
        />

        {/* Dune Crest Highlight Curve */}
        <path
          d="M-20 420 Q120 310 260 360 T520 330"
          fill="none"
          stroke="url(#crestHighlight)"
          strokeWidth="2.5"
          opacity="0.6"
        />

        {/* Mid-ground Sand Dune */}
        <path
          d="M-20 470 Q140 370 290 430 T520 410 L520 700 L-20 700 Z"
          fill="#1b152e"
        />
        <path
          d="M-20 470 Q140 370 290 430 T520 410"
          fill="none"
          stroke="url(#crestHighlight)"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Majestic Foreground Sand Dune */}
        <path
          d="M-30 520 Q180 430 330 510 Q430 560 530 500 L530 720 L-30 720 Z"
          fill="url(#duneFrontGrad)"
        />

        {/* Foreground Crest Rim Light */}
        <path
          d="M-30 520 Q180 430 330 510 Q430 560 530 500"
          fill="none"
          stroke="url(#crestHighlight)"
          strokeWidth="3"
          opacity="0.8"
        />

        {/* Atmospheric vignette on bottom */}
        <rect
          y="420"
          width="500"
          height="280"
          fill="url(#duneFrontGrad)"
          opacity="0.75"
        />
      </svg>

      {/* Dark overlay for contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(30, 24, 48, 0.25) 0%, rgba(20, 16, 32, 0.4) 40%, rgba(15, 12, 26, 0.85) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
