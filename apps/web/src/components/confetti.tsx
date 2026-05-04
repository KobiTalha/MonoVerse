'use client';

import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#f43f5e', '#06b6d4'];
const PIECES = 80;
const DURATION_MS = 5200;

interface Piece {
  id: number;
  left: number;
  delay: number;
  size: number;
  rotation: number;
  duration: number;
  color: string;
}

export function Confetti({ active }: { active: boolean }) {
  const [armed, setArmed] = useState(active);

  useEffect(() => {
    if (active) {
      setArmed(true);
      const timer = window.setTimeout(() => setArmed(false), DURATION_MS);
      return () => window.clearTimeout(timer);
    }
    setArmed(false);
  }, [active]);

  const pieces = useMemo<Piece[]>(() => {
    if (!armed) return [];
    return Array.from({ length: PIECES }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 1.4,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      duration: 2.4 + Math.random() * 1.8,
      color: COLORS[index % COLORS.length]
    }));
  }, [armed]);

  if (!armed) {
    return null;
  }

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 0.6}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
}
