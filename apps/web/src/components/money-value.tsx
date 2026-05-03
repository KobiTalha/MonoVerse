'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const ANIMATION_MS = 600;

export function MoneyValue({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [delta, setDelta] = useState<{ amount: number; key: number } | undefined>();
  const previousRef = useRef<number>(value);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const previous = previousRef.current;
    if (previous === value) {
      return;
    }
    const change = value - previous;
    setDelta({ amount: change, key: Date.now() });
    const start = performance.now();
    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
    }

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ANIMATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(previous + change * eased);
      setDisplayValue(next);
      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
        previousRef.current = value;
        animationRef.current = undefined;
      }
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current !== undefined) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  useEffect(() => {
    if (!delta) return;
    const timer = window.setTimeout(() => setDelta(undefined), 1100);
    return () => window.clearTimeout(timer);
  }, [delta]);

  return (
    <span className="money-value">
      <span>{displayValue.toLocaleString()}</span>
      <AnimatePresence>
        {delta && delta.amount !== 0 ? (
          <motion.span
            key={delta.key}
            className={`money-delta ${delta.amount >= 0 ? 'money-delta-up' : 'money-delta-down'}`}
            initial={{ opacity: 0, y: 0, scale: 0.9 }}
            animate={{ opacity: 1, y: -14, scale: 1 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {delta.amount > 0 ? '+' : '−'}
            {Math.abs(delta.amount).toLocaleString()}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
