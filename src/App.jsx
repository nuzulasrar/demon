import React, { useState, useRef } from 'react';
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

  const canvasElementRef = useRef(null);
  const resetViewFnRef = useRef(null);

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
      />
    </div>
  );
}
