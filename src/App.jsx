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
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const canvasElementRef = useRef(null);
  const resetViewFnRef = useRef(null);
  const audioRef = useRef(null);

  const startSoundtrack = () => {
    if (audioRef.current) return;
    try {
      const BASE = import.meta.env.BASE_URL || '/';
      const audioUrl = `${BASE}soundtrack.mp3`.replace('//', '/');
      const audio = new Audio(audioUrl);
      audio.loop = true;
      audio.volume = 0.65;
      audioRef.current = audio;

      const attemptPlay = () => {
        audio.play().then(() => {
          setIsAudioPlaying(true);
        }).catch((err) => {
          console.warn('Autoplay restricted by browser policy. Soundtrack will start on first user interaction:', err);
          const unlock = () => {
            audio.play().then(() => {
              setIsAudioPlaying(true);
            }).catch(() => {});
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
          };
          window.addEventListener('pointerdown', unlock, { once: true });
          window.addEventListener('keydown', unlock, { once: true });
        });
      };

      attemptPlay();
    } catch (err) {
      console.error('Failed to initialize soundtrack:', err);
    }
  };

  const handleToggleAudio = () => {
    if (!audioRef.current) {
      startSoundtrack();
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true);
      }).catch(() => {});
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
        isAudioPlaying={isAudioPlaying}
        onToggleAudio={handleToggleAudio}
      />
    </div>
  );
}
