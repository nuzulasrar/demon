import React, { useState, useRef, useEffect } from 'react';
import DemonCanvas from './components/DemonCanvas';
import ViewerControls from './components/ViewerControls';

export default function App() {
  const [renderMode, setRenderMode] = useState('pbr');
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [emissiveIntensity, setEmissiveIntensity] = useState(1.0);
  const [lightIntensity, setLightIntensity] = useState(1.0);
  const [flipTextureY, setFlipTextureY] = useState(false);
  const [focusTarget, setFocusTarget] = useState('both');
  const [isAnimating, setIsAnimating] = useState(true);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [fps, setFps] = useState(60);
  const [isMuted, setIsMuted] = useState(false);

  const canvasElementRef = useRef(null);
  const resetViewFnRef = useRef(null);
  const audioRef = useRef(null);
  const isLoadedRef = useRef(false);

  // Preload soundtrack immediately so it's buffered and ready to play without delay
  useEffect(() => {
    try {
      const BASE = import.meta.env.BASE_URL || '/';
      const audioUrl = `${BASE}soundtrack.mp3`.replace('//', '/');
      const audio = new Audio(audioUrl);
      audio.loop = true;
      audio.volume = 0.75;
      audio.muted = false;
      audio.preload = 'auto';
      audioRef.current = audio;
    } catch (err) {
      console.warn('Audio preloading error:', err);
    }

    // Capture early user gesture to ensure audio plays immediately upon load completion
    const unlockOnGesture = () => {
      if (audioRef.current && isLoadedRef.current && !audioRef.current.muted && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', unlockOnGesture);
    window.addEventListener('touchstart', unlockOnGesture);
    window.addEventListener('keydown', unlockOnGesture);

    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('touchstart', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startSoundtrack = () => {
    isLoadedRef.current = true;
    if (audioRef.current && !isMuted) {
      audioRef.current.muted = false;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay restricted by browser; starting on first gesture:', err);
          const playOnGesture = () => {
            if (audioRef.current && !audioRef.current.muted) {
              audioRef.current.play().catch(() => {});
            }
            window.removeEventListener('pointerdown', playOnGesture);
            window.removeEventListener('touchstart', playOnGesture);
            window.removeEventListener('keydown', playOnGesture);
          };
          window.addEventListener('pointerdown', playOnGesture, { once: true });
          window.addEventListener('touchstart', playOnGesture, { once: true });
          window.addEventListener('keydown', playOnGesture, { once: true });
        });
      }
    }
  };

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
      audioRef.current.play().catch(() => {});
    } else {
      setIsMuted(true);
      audioRef.current.muted = true;
      audioRef.current.pause();
    }
  };

  const handleCaptureScreenshot = () => {
    if (!canvasElementRef.current) return;
    try {
      const dataUrl = canvasElementRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `demon-orc-showcase-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    }
  };

  const handleResetView = () => {
    if (resetViewFnRef.current) {
      resetViewFnRef.current();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas */}
      <DemonCanvas
        renderMode={renderMode}
        isAutoRotate={isAutoRotate}
        showWireframe={showWireframe}
        emissiveIntensity={emissiveIntensity}
        lightIntensity={lightIntensity}
        flipTextureY={flipTextureY}
        focusTarget={focusTarget}
        isAnimating={isAnimating}
        animSpeed={animSpeed}
        onFpsUpdate={setFps}
        canvasRefCallback={(elem) => {
          canvasElementRef.current = elem;
        }}
        onResetViewCallback={(fn) => {
          resetViewFnRef.current = fn;
        }}
        onLoadComplete={startSoundtrack}
      />

      {/* Floating Viewer Controls */}
      <ViewerControls
        fps={fps}
        renderMode={renderMode}
        setRenderMode={setRenderMode}
        isAutoRotate={isAutoRotate}
        setIsAutoRotate={setIsAutoRotate}
        showWireframe={showWireframe}
        setShowWireframe={setShowWireframe}
        emissiveIntensity={emissiveIntensity}
        setEmissiveIntensity={setEmissiveIntensity}
        lightIntensity={lightIntensity}
        setLightIntensity={setLightIntensity}
        flipTextureY={flipTextureY}
        setFlipTextureY={setFlipTextureY}
        focusTarget={focusTarget}
        setFocusTarget={setFocusTarget}
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        animSpeed={animSpeed}
        setAnimSpeed={setAnimSpeed}
        onResetView={handleResetView}
        onCaptureScreenshot={handleCaptureScreenshot}
        isMuted={isMuted}
        onToggleAudio={handleToggleAudio}
      />
    </div>
  );
}
