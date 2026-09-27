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
  const [focusTarget, setFocusTarget] = useState('all');
  const [isAnimating, setIsAnimating] = useState(true);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [fps, setFps] = useState(60);
  const [isMuted, setIsMuted] = useState(false);

  const canvasElementRef = useRef(null);
  const resetViewFnRef = useRef(null);
  const audioRef = useRef(null);
  const isLoadedRef = useRef(false);
  const isMutedRef = useRef(false);

  const BASE = import.meta.env.BASE_URL || '/';
  const audioUrl = `${BASE}soundtrack.mp3`.replace('//', '/');

  // Audio setup: preload and attempt autoplay as early as possible on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.75;
      audioRef.current.muted = isMutedRef.current;
      // Proactively try to play early if permitted by browser MEI
      audioRef.current.play().catch(() => {});
    }

    // Capture user interaction anywhere on the document to ensure audio starts if unmuted
    const unlockOnGesture = () => {
      if (audioRef.current && !isMutedRef.current && audioRef.current.paused) {
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
    };
  }, []);

  const startSoundtrack = (onSuccess, onBlocked) => {
    isLoadedRef.current = true;
    if (!audioRef.current || isMutedRef.current) {
      if (onSuccess) onSuccess();
      return;
    }

    audioRef.current.muted = false;
    audioRef.current.volume = 0.75;

    // If already playing from early gesture
    if (!audioRef.current.paused) {
      if (onSuccess) onSuccess();
      return;
    }

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (onSuccess) onSuccess();
        })
        .catch((err) => {
          console.warn('Autoplay restricted by browser policy; awaiting user gesture to enter:', err);
          if (onBlocked) {
            onBlocked();
          } else if (onSuccess) {
            onSuccess();
          }
        });
    } else {
      if (onSuccess) onSuccess();
    }
  };

  const handleUserEnter = () => {
    if (audioRef.current && !isMutedRef.current) {
      audioRef.current.muted = false;
      audioRef.current.volume = 0.75;
      audioRef.current.play().catch((err) => {
        console.warn('Audio play on enter failed:', err);
      });
    }
  };

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      // Unmute: resume playback with volume
      isMutedRef.current = false;
      setIsMuted(false);
      audioRef.current.muted = false;
      audioRef.current.volume = 0.75;
      audioRef.current.play().catch((err) => {
        console.warn('Error resuming audio on unmute:', err);
      });
    } else {
      // Mute: pause immediately and silence audio
      isMutedRef.current = true;
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
      link.download = `demon-orcs-showcase-${Date.now()}.png`;
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
        onUserEnter={handleUserEnter}
      />

      {/* Background Soundtrack Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        loop
        playsInline
        preload="auto"
        style={{ display: 'none' }}
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
