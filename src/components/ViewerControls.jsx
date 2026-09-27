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
  Swords,
  Play,
  Pause
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
  onCaptureScreenshot
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
    { id: 'all', label: 'All', icon: Users },
    { id: 'demon', label: 'Demon', icon: Flame },
    { id: 'orc', label: 'Old Orc', icon: ShieldAlert },
    { id: 'orc2', label: 'New Orc', icon: Swords }
  ];

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <>
      {/* Top Header Bar */}
      <header className="viewer-header">
        {/* Title & Stats */}
        <div className="viewer-title-box glass-panel">
          <div>
            <h1 className="viewer-title">
              <span style={{ color: '#ff4d26' }}>Demon</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>&</span>
              <span style={{ color: '#00e5ff' }}>Orcs</span>
              <span className="viewer-title-sub">3D Showcase</span>
            </h1>
            <p className="viewer-subtitle">
              asset_demon_head (Demon Head) • asset_orc (Old Orc) • asset_orc_2 (New Orc) • 4K PBR
            </p>
          </div>
        </div>

        {/* Character Focus Selector */}
        <div className="viewer-focus-box glass-panel">
          {FOCUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = focusTarget === opt.id || (opt.id === 'all' && focusTarget === 'both');
            return (
              <button
                key={opt.id}
                className="glass-btn"
                style={{
                  background: isSelected ? 'rgba(255, 77, 38, 0.25)' : 'transparent',
                  borderColor: isSelected ? '#ff4d26' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
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
        <div className="viewer-tools-box">
          {/* FPS Badge */}
          <div className="viewer-fps-badge glass-panel">
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
            <span className="btn-label" style={{ fontSize: '0.8rem' }}>Reset</span>
          </button>

          {/* Screenshot */}
          <button
            className="glass-btn"
            onClick={onCaptureScreenshot}
            title="Capture Screenshot"
          >
            <Camera size={15} />
            <span className="btn-label" style={{ fontSize: '0.8rem' }}>Snapshot</span>
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
      <div className="viewer-bottom-container">
        {/* Settings Drawer (Sliders & Modifiers) */}
        {showSettings && (
          <div className="glass-panel viewer-settings-drawer">
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
        <div className="glass-panel viewer-controls-bar">
          {/* Render Mode Switcher */}
          <div className="viewer-render-modes">
            {RENDER_MODES.map((mode) => {
              const isSelected = renderMode === mode.id;
              return (
                <button
                  key={mode.id}
                  className={`glass-btn mode-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setRenderMode(mode.id)}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="viewer-divider" />

          {/* Action Toggles */}
          <div className="viewer-action-toggles">
            {/* Idle Animation Toggle */}
            <button
              className={`glass-btn ${isAnimating ? 'active' : ''}`}
              onClick={() => setIsAnimating(!isAnimating)}
              title="Toggle Living Idle Breathing & Posture"
            >
              {isAnimating ? <Pause size={14} color="#00f5d4" /> : <Play size={14} />}
              <span>{isAnimating ? 'Alive' : 'Paused'}</span>
            </button>

            {/* Wireframe Toggle */}
            <button
              className={`glass-btn ${showWireframe ? 'active' : ''}`}
              onClick={() => setShowWireframe(!showWireframe)}
            >
              Wireframe
            </button>

            {/* Auto Rotate Toggle */}
            <button
              className={`glass-btn ${isAutoRotate ? 'active' : ''}`}
              onClick={() => setIsAutoRotate(!isAutoRotate)}
            >
              Rotate
            </button>

            {/* Settings button */}
            <button
              className={`glass-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Adjust Lighting & Breathing Speed"
            >
              <Sliders size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Hint */}
      <div className="viewer-hint">
        {isTouchDevice ? 'Drag to Rotate • 2 Fingers to Zoom / Pan' : 'Left-click to Rotate • Right-click to Pan • Scroll to Zoom'}
      </div>
    </>
  );
}
