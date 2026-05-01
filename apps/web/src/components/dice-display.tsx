'use client';

import { motion } from 'framer-motion';

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

export function DiceDisplay({ roll }: { roll?: [number, number] }) {
  const values = roll ?? [1, 1];

  return (
    <div className="dice-pair">
      {values.map((value, index) => (
        <motion.div
          key={`${value}-${index}-${roll?.join('-') ?? 'idle'}`}
          className="dice-face"
          initial={{ rotate: -180, scale: 0.82, opacity: 0.5 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.08 }}
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

