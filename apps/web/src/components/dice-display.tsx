'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const PIP_PATTERNS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2]
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2]
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2]
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2]
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2]
  ]
};

function buildPips(value: number) {
  return PIP_PATTERNS[value] ?? [];
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
          className="dice-cube"
          initial={false}
          animate={
            isRolling
              ? {
                  rotateX: [0, 320, 720],
                  rotateY: [0, index === 0 ? -240 : 240, index === 0 ? -540 : 540],
                  rotateZ: [0, index === 0 ? -28 : 28, index === 0 ? 12 : -12],
                  scale: [1, 1.1, 1],
                  y: [0, -8, 4, 0]
                }
              : justSettled
              ? {
                  rotateX: 0,
                  rotateY: 0,
                  rotateZ: [0, index === 0 ? -3 : 3, 0],
                  scale: [1, 1.16, 1],
                  y: [0, -6, 0]
                }
              : { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, y: 0 }
          }
          transition={{
            duration: isRolling ? 0.55 : justSettled ? 0.4 : 0.32,
            repeat: isRolling ? Number.POSITIVE_INFINITY : 0,
            ease: 'easeInOut',
            delay: index * 0.05
          }}
        >
          <div className="dice-face">
            <div className="dice-grid">
              {Array.from({ length: 9 }, (_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const visible = buildPips(value).some(
                  ([pipRow, pipCol]) => pipRow === row && pipCol === col
                );
                return (
                  <span
                    key={idx}
                    className={`dice-pip ${visible ? 'dice-pip-on' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
