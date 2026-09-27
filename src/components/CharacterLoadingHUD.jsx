import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldAlert,
  Swords,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

export default function CharacterLoadingHUD({ characterProgress }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  const demon = characterProgress?.demon || { percent: 0, stage: 'Waiting...', loaded: false };
  const orc = characterProgress?.orc || { percent: 0, stage: 'Waiting...', loaded: false };
  const orc2 = characterProgress?.orc2 || { percent: 0, stage: 'Waiting...', loaded: false };

  const allLoaded = demon.loaded && orc.loaded && orc2.loaded;
  const loadedCount = [demon.loaded, orc.loaded, orc2.loaded].filter(Boolean).length;
  const avgPercent = Math.round((demon.percent + orc.percent + orc2.percent) / 3);

  // Auto-collapse 3 seconds after all models are loaded
  useEffect(() => {
    if (allLoaded && !hasAutoCollapsed) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
        setHasAutoCollapsed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allLoaded, hasAutoCollapsed]);

  const CHARACTERS = [
    {
      id: 'demon',
      name: 'Demon Head',
      subtitle: '54MB GLB • 4K PBR',
      icon: Flame,
      color: '#ff4d26',
      glow: 'rgba(255, 77, 38, 0.4)',
      gradient: 'linear-gradient(90deg, #ff3e18, #ff8c42)',
      data: demon
    },
    {
      id: 'orc',
      name: 'Old Orc',
      subtitle: 'OBJ Sculpt • 4K Shaded',
      icon: ShieldAlert,
      color: '#ffb703',
      glow: 'rgba(255, 183, 3, 0.4)',
      gradient: 'linear-gradient(90deg, #ffb703, #00f5d4)',
      data: orc
    },
    {
      id: 'orc2',
      name: 'New Orc',
      subtitle: '90MB GLB • 4K Shaded',
      icon: Swords,
      color: '#00e5ff',
      glow: 'rgba(0, 229, 255, 0.4)',
      gradient: 'linear-gradient(90deg, #00e5ff, #0077ff)',
      data: orc2
    }
  ];

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '80px',
        left: '20px',
        zIndex: 45,
        width: 'clamp(270px, 24vw, 320px)',
        padding: isCollapsed ? '8px 14px' : '14px 16px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
        userSelect: 'none',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.15)'
      }}
    >
      {/* HUD Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {allLoaded ? (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#00f5d4',
                boxShadow: '0 0 10px #00f5d4'
              }}
            />
          ) : (
            <Loader2
              size={13}
              color="#ff8c42"
              style={{ animation: 'spin 1.2s linear infinite' }}
            />
          )}
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: allLoaded ? '#00f5d4' : '#f5f3f4'
            }}
          >
            {allLoaded ? 'All Models Ready' : `Loading Models (${loadedCount}/3)`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontFamily: 'monospace',
              fontWeight: 600,
              color: allLoaded ? '#00f5d4' : '#ff8c42'
            }}
          >
            {avgPercent}%
          </span>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              color: 'var(--text-muted)'
            }}
            aria-label={isCollapsed ? 'Expand loader' : 'Collapse loader'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Character Progress Rows */}
      {!isCollapsed && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {CHARACTERS.map((char) => {
            const Icon = char.icon;
            const isReady = char.data.loaded;
            const percent = char.data.percent || 0;

            return (
              <div
                key={char.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: `1px solid ${isReady ? 'rgba(0, 245, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                  borderRadius: '10px',
                  padding: '8px 10px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Character Name & Percent */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon size={14} color={char.color} />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#f5f3f4'
                      }}
                    >
                      {char.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        color: 'var(--text-dim)',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {char.subtitle}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isReady ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#00f5d4',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                        <span>Ready</span>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: char.color
                        }}
                      >
                        {percent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: char.gradient,
                      boxShadow: isReady ? `0 0 8px ${char.glow}` : 'none',
                      transition: 'width 0.2s ease-out'
                    }}
                  />
                </div>

                {/* Status Subtitle */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '4px',
                    fontSize: '0.67rem',
                    color: isReady ? '#00f5d4' : 'var(--text-muted)'
                  }}
                >
                  <span>{char.data.stage}</span>
                  {isReady && <span style={{ opacity: 0.7 }}>Active in scene</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
