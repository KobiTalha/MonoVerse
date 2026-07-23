'use client';

import { motion } from 'framer-motion';

export function LandingHero({
  connection,
  soundOn,
  mode,
  onToggleSound,
  onToggleMode
}: {
  connection: string;
  soundOn: boolean;
  mode?: 'server' | 'local';
  onToggleSound: () => void;
  onToggleMode?: () => void;
}) {
  return (
    <header className="landing-hero">
      <div className="landing-hero-rail">
        <div className="landing-brand">
          <span className="landing-brand-mark" aria-hidden>
            M
          </span>
          <div>
            <strong>MonoVerse</strong>
            <small>Realtime monopoly arena</small>
          </div>
        </div>
        <nav className="landing-hero-pills">
          <span className={`pill pill-status pill-status-${connection}`}>
            <span className="pill-status-dot" aria-hidden />
            {connection === 'online'
              ? 'Realtime server'
              : connection === 'local'
              ? 'In-Browser engine'
              : connection === 'connecting'
              ? 'Connecting…'
              : 'Backend unreachable'}
          </span>

          {onToggleMode ? (
            <button
              type="button"
              className="pill pill-toggle"
              onClick={onToggleMode}
              title="Click to switch between In-Browser engine and WebSocket server"
            >
              <span aria-hidden>{mode === 'local' ? '⚡' : '🌐'}</span>
              {mode === 'local' ? 'In-Browser mode' : 'WebSocket server'}
            </button>
          ) : null}

          <button
            type="button"
            className={`pill pill-toggle ${soundOn ? 'pill-toggle-on' : ''}`}
            onClick={onToggleSound}
            aria-pressed={soundOn}
          >
            <span aria-hidden>{soundOn ? '🔊' : '🔇'}</span>
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
        </nav>
      </div>

      <motion.div
        className="landing-hero-copy"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1>
          Roll, buy, conquer — <span>in real time</span>.
        </h1>
        <p>
          A premium, server-authoritative Monopoly arena built for tactile play. Cinematic
          board, animated dice, deed cards, sound, and a live activity feed.
        </p>
      </motion.div>
    </header>
  );
}
