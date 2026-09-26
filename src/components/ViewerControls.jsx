import React, { useState } from 'react';
import {
  RotateCcw,
  Camera,
  Maximize,
  Minimize,
  Sliders,
  Activity,
  Users,
  Flame,
  ShieldAlert,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function ViewerControls({
  fps,
  renderMode,
  setRenderMode,
  isAutoRotate,
  setIsAutoRotate,
  showWireframe,
  setShowWireframe,
  emissiveIntensity,
  setEmissiveIntensity,
  lightIntensity,
  setLightIntensity,
  flipTextureY,
  setFlipTextureY,
  focusTarget,
  setFocusTarget,
  isAnimating,
  setIsAnimating,
  animSpeed,
  setAnimSpeed,
  onResetView,
  onCaptureScreenshot,
  isMuted,
  onToggleAudio
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const RENDER_MODES = [
    { id: 'pbr', label: 'Full PBR' },
    { id: 'diffuse', label: 'Diffuse' },
    { id: 'shaded', label: 'Shaded' },
    { id: 'normal', label: 'Normal Map' },
    { id: 'roughness', label: 'Roughness' },
    { id: 'metallic', label: 'Metallic' },
    { id: 'clay', label: 'Clay Sculpt' }
  ];

  const FOCUS_OPTIONS = [
    { id: 'both', label: 'Both', icon: Users },
    { id: 'demon', label: 'Demon', icon: Flame },
    { id: 'orc', label: 'Orc', icon: ShieldAlert }
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        {/* Title & Stats */}
        <div
          className="glass-panel"
          style={{
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            pointerEvents: 'auto'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#fff',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ color: '#ff4d26' }}>Demon</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>&</span>
              <span style={{ color: '#00e5ff' }}>Orc</span>
              <span style={{ fontSize: '0.78rem', color: '#ffb703', fontWeight: 500, marginLeft: '4px' }}>
                3D Showcase
              </span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
              demon_glb (Rigged Demon) • asset_orc • 4K PBR • Seamless Motion
            </p>
          </div>
        </div>

        {/* Character Focus Selector */}
        <div
          className="glass-panel"
          style={{
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'auto'
          }}
        >
          {FOCUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = focusTarget === opt.id;
            return (
              <button
                key={opt.id}
                className="glass-btn"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(255, 77, 38, 0.25)' : 'transparent',
                  borderColor: isSelected ? '#ff4d26' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 600 : 400
                }}
                onClick={() => setFocusTarget(opt.id)}
              >
                <Icon size={14} color={isSelected ? '#ff4d26' : 'currentColor'} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tools */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto'
          }}
        >
          {/* FPS Badge */}
          <div
            className="glass-panel"
            style={{
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem'
            }}
          >
            <Activity size={13} color="#00e5ff" />
            <span style={{ color: 'var(--text-muted)' }}>FPS:</span>
            <span style={{ color: '#00f5d4', fontWeight: 600, fontFamily: 'monospace' }}>
              {fps || 60}
            </span>
          </div>

          {/* Reset Camera */}
          <button
            className="glass-btn"
            onClick={onResetView}
            title="Reset Camera View"
          >
            <RotateCcw size={15} />
            <span style={{ fontSize: '0.8rem' }}>Reset</span>
          </button>

          {/* Screenshot */}
          <button
            className="glass-btn"
            onClick={onCaptureScreenshot}
            title="Capture Screenshot"
          >
            <Camera size={15} />
            <span style={{ fontSize: '0.8rem' }}>Snapshot</span>
          </button>

          {/* Soundtrack Audio Toggle */}
          <button
            className={`glass-btn ${!isMuted ? 'active' : ''}`}
            onClick={onToggleAudio}
            title={!isMuted ? 'Mute Soundtrack' : 'Unmute Soundtrack'}
            style={{
              borderColor: !isMuted ? 'rgba(255, 77, 38, 0.6)' : undefined,
              background: !isMuted ? 'rgba(255, 77, 38, 0.15)' : undefined
            }}
          >
            {!isMuted ? <Volume2 size={15} color="#ff4d26" /> : <VolumeX size={15} color="var(--text-muted)" />}
            <span style={{ fontSize: '0.8rem', color: !isMuted ? '#ff8c42' : 'var(--text-muted)' }}>
              {!isMuted ? 'Soundtrack' : 'Muted'}
            </span>
          </button>

          {/* Fullscreen */}
          <button
            className="glass-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </header>

      {/* Bottom Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'auto'
        }}
      >
        {/* Settings Drawer (Sliders & Modifiers) */}
        {showSettings && (
          <div
            className="glass-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minWidth: '340px',
              background: 'rgba(15, 14, 18, 0.95)'
            }}
          >
            {/* Animation Speed Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Breathing / Motion Speed</span>
                <span style={{ color: '#00f5d4', fontWeight: 600, fontFamily: 'monospace' }}>
                  {animSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={animSpeed}
                onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#00f5d4', cursor: 'pointer' }}
              />
            </div>

            {/* Emissive Glow (Demon) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Demon Emissive Glow</span>
                <span style={{ color: '#ff4d26', fontWeight: 600, fontFamily: 'monospace' }}>
                  {emissiveIntensity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={emissiveIntensity}
                onChange={(e) => setEmissiveIntensity(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ff4d26', cursor: 'pointer' }}
              />
            </div>

            {/* Light Intensity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Light Intensity</span>
                <span style={{ color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>
                  {lightIntensity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={lightIntensity}
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ff4d26', cursor: 'pointer' }}
              />
            </div>


            {/* Flip Texture Y */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Invert Texture Y</span>
              <button
                className={`glass-btn ${flipTextureY ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                onClick={() => setFlipTextureY(!flipTextureY)}
              >
                {flipTextureY ? 'Inverted' : 'Standard'}
              </button>
            </div>
          </div>
        )}

        {/* Main Buttons Bar */}
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            background: 'rgba(15, 14, 18, 0.9)'
          }}
        >
          {/* Render Mode Switcher */}
          {RENDER_MODES.map((mode) => {
            const isSelected = renderMode === mode.id;
            return (
              <button
                key={mode.id}
                className="glass-btn"
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(255, 77, 38, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: isSelected ? '#ff4d26' : 'rgba(255, 255, 255, 0.08)',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 600 : 400
                }}
                onClick={() => setRenderMode(mode.id)}
              >
                {mode.label}
              </button>
            );
          })}

          <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Idle Animation Toggle */}
          <button
            className={`glass-btn ${isAnimating ? 'active' : ''}`}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setIsAnimating(!isAnimating)}
            title="Toggle Living Idle Breathing & Posture"
          >
            {isAnimating ? <Pause size={14} color="#00f5d4" /> : <Play size={14} />}
            <span>{isAnimating ? 'Alive' : 'Paused'}</span>
          </button>

          {/* Wireframe Toggle */}
          <button
            className={`glass-btn ${showWireframe ? 'active' : ''}`}
            style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.8rem' }}
            onClick={() => setShowWireframe(!showWireframe)}
          >
            Wireframe
          </button>

          {/* Auto Rotate Toggle */}
          <button
            className={`glass-btn ${isAutoRotate ? 'active' : ''}`}
            style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.8rem' }}
            onClick={() => setIsAutoRotate(!isAutoRotate)}
          >
            Rotate
          </button>

          {/* Settings button */}
          <button
            className={`glass-btn ${showSettings ? 'active' : ''}`}
            style={{ padding: '7px 10px', borderRadius: '8px' }}
            onClick={() => setShowSettings(!showSettings)}
            title="Adjust Lighting & Breathing Speed"
          >
            <Sliders size={15} />
          </button>
        </div>
      </div>

      {/* Subtle Hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '20px',
          fontSize: '0.74rem',
          color: 'var(--text-dim)',
          pointerEvents: 'none'
        }}
      >
        Left-click to Rotate • Right-click to Pan • Scroll to Zoom
      </div>
    </>
  );
}
