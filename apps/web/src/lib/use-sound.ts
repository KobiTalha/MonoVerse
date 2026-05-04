'use client';

import { useCallback, useEffect, useRef } from 'react';

type SoundName = 'dice' | 'step' | 'purchase' | 'turn' | 'jail' | 'win';

interface SoundShape {
  type: OscillatorType;
  frequency: number;
  endFrequency?: number;
  duration: number;
  attack?: number;
  release?: number;
  volume?: number;
}

const SOUND_LIBRARY: Record<SoundName, SoundShape[]> = {
  dice: [
    { type: 'square', frequency: 280, endFrequency: 180, duration: 0.05, volume: 0.18 },
    { type: 'square', frequency: 200, endFrequency: 320, duration: 0.05, volume: 0.18 },
    { type: 'square', frequency: 240, endFrequency: 160, duration: 0.06, volume: 0.18 }
  ],
  step: [{ type: 'sine', frequency: 520, endFrequency: 660, duration: 0.08, volume: 0.12 }],
  purchase: [
    { type: 'triangle', frequency: 440, duration: 0.1, volume: 0.18 },
    { type: 'triangle', frequency: 660, duration: 0.12, volume: 0.18 },
    { type: 'triangle', frequency: 880, duration: 0.18, volume: 0.18 }
  ],
  turn: [
    { type: 'sine', frequency: 360, duration: 0.1, volume: 0.16 },
    { type: 'sine', frequency: 540, duration: 0.18, volume: 0.16 }
  ],
  jail: [
    { type: 'sawtooth', frequency: 220, duration: 0.18, volume: 0.16 },
    { type: 'sawtooth', frequency: 160, duration: 0.22, volume: 0.16 }
  ],
  win: [
    { type: 'triangle', frequency: 523, duration: 0.16, volume: 0.2 },
    { type: 'triangle', frequency: 659, duration: 0.16, volume: 0.2 },
    { type: 'triangle', frequency: 784, duration: 0.16, volume: 0.2 },
    { type: 'triangle', frequency: 1046, duration: 0.32, volume: 0.2 }
  ]
};

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export function useSound(enabled = true) {
  const contextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    return () => {
      contextRef.current?.close().catch(() => undefined);
      contextRef.current = null;
    };
  }, []);

  const ensureContext = useCallback(() => {
    if (contextRef.current) {
      return contextRef.current;
    }

    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      return null;
    }

    contextRef.current = new Ctor();
    return contextRef.current;
  }, []);

  const playShape = useCallback((context: AudioContext, shape: SoundShape, offsetSeconds: number) => {
    const startAt = context.currentTime + offsetSeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const peak = shape.volume ?? 0.18;
    const attack = shape.attack ?? 0.005;
    const release = shape.release ?? 0.05;

    oscillator.type = shape.type;
    oscillator.frequency.setValueAtTime(shape.frequency, startAt);

    if (shape.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(shape.endFrequency, 1),
        startAt + shape.duration
      );
    }

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + shape.duration + release);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + shape.duration + release + 0.05);
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabledRef.current) {
        return;
      }

      const context = ensureContext();
      if (!context) {
        return;
      }

      if (context.state === 'suspended') {
        context.resume().catch(() => undefined);
      }

      const shapes = SOUND_LIBRARY[name];
      let cursor = 0;
      for (const shape of shapes) {
        playShape(context, shape, cursor);
        cursor += shape.duration;
      }
    },
    [ensureContext, playShape]
  );

  return play;
}

export type { SoundName };
