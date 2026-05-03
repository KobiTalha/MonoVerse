'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

function buildPips(value: number) {
  const map: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };

  return map[value] ?? [];
}

function randomDie() {
  return (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

export function DiceDisplay({
  roll,
  isRolling,
  justSettled
}: {
  roll?: [number, number];
  isRolling?: boolean;
  justSettled?: boolean;
}) {
  const finalRoll = useMemo<[number, number]>(() => roll ?? [1, 1], [roll]);
  const [displayValues, setDisplayValues] = useState<[number, number]>(finalRoll);

  useEffect(() => {
    if (!isRolling) {
      setDisplayValues(finalRoll);
      return;
    }

    setDisplayValues([randomDie(), randomDie()]);
    const interval = window.setInterval(() => {
      setDisplayValues([randomDie(), randomDie()]);
    }, 92);

    return () => {
      window.clearInterval(interval);
    };
  }, [finalRoll, isRolling]);

  return (
    <div
      className={`dice-pair ${isRolling ? 'dice-pair-rolling' : ''} ${
        justSettled && !isRolling ? 'dice-pair-settled' : ''
      }`}
      aria-live="polite"
      aria-label={
        isRolling
          ? 'Rolling dice…'
          : `Last dice roll: ${finalRoll[0]} and ${finalRoll[1]}`
      }
    >
      {displayValues.map((value, index) => (
        <motion.div
          key={`${index}-${isRolling ? 'rolling' : finalRoll.join('-')}`}
          className="dice-face"
          initial={false}
          animate={
            isRolling
              ? {
                  rotate: [0, index === 0 ? -22 : 22, index === 0 ? 14 : -14, 0],
                  scale: [1, 1.08, 0.96, 1.04],
                  y: [0, -6, 2, 0],
                  x: [0, index === 0 ? -3 : 3, index === 0 ? 2 : -2, 0]
                }
              : justSettled
              ? {
                  rotate: [0, index === 0 ? -4 : 4, 0],
                  scale: [1, 1.12, 1],
                  y: [0, -3, 0]
                }
              : {
                  rotate: 0,
                  scale: 1,
                  y: 0,
                  x: 0
                }
          }
          transition={{
            duration: isRolling ? 0.22 : justSettled ? 0.36 : 0.32,
            repeat: isRolling ? Number.POSITIVE_INFINITY : 0,
            ease: 'easeInOut',
            delay: index * 0.03
          }}
        >
          <div className="dice-grid">
            {Array.from({ length: 9 }, (_, pipIndex) => (
              <span
                key={pipIndex}
                className={`dice-pip ${buildPips(value).includes(pipIndex) ? 'dice-pip-visible' : ''}`}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
