import React, { useState } from 'react';

interface MediaLightboxProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  imageUrl,
  caption,
  onClose
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!imageUrl) return null;

  const handleZoomIn = () => setScale(s => Math.min(3, s + 0.25));
  const handleZoomOut = () => setScale(s => Math.max(0.5, s - 0.25));
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `splendid_media_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-xl animate-in fade-in duration-75">
      {/* Top Glass Bar */}
      <div className="absolute top-4 inset-x-4 max-w-xl mx-auto flex items-center justify-between p-3 rounded-2xl mirror-glass border border-white/10 z-10 select-none">
        <span className="text-xs font-semibold text-slate-200 truncate pl-2">
          {caption || 'Media Attachment'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm"
            title="Zoom in"
          >
            ➕
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm"
            title="Zoom out"
          >
            ➖
          </button>
          <button
            onClick={handleRotate}
            className="w-8 h-8 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm"
            title="Rotate"
          >
            🔄
          </button>
          <button
            onClick={handleDownload}
            className="w-8 h-8 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm"
            title="Download image"
          >
            💾
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/20 flex items-center justify-center text-sm ml-1"
            title="Close"
          >
            ❌
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex items-center justify-center max-w-full max-h-full overflow-hidden p-6 select-none">
        <img
          src={imageUrl}
          alt="Attachment preview"
          referrerPolicy="no-referrer"
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-transform duration-75 ease-out"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`
          }}
        />
      </div>
    </div>
  );
};
