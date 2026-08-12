'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  value: number; // 0 - 100
  size?: number;
  label?: string;
}

function scoreColor(v: number): string {
  if (v >= 80) return 'hsl(var(--success))';
  if (v >= 60) return 'hsl(var(--accent))';
  if (v >= 40) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function scoreLabel(v: number): string {
  if (v >= 80) return 'Excellent';
  if (v >= 60) return 'Healthy';
  if (v >= 40) return 'Fair';
  return 'Needs work';
}

export function HealthGauge({ value, size = 200, label }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = size * 0.09;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const color = scoreColor(clamped);

  // Animate the number counting up
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 900;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * clamped));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="hg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#hg-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label ?? 'Score'}
          </p>
          <p
            className="text-5xl font-semibold num"
            style={{ color, textShadow: `0 0 24px ${color}55` }}
          >
            {display}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color }}>
            {scoreLabel(clamped)}
          </p>
        </div>
      </div>
    </div>
  );
}
