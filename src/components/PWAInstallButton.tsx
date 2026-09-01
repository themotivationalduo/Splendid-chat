import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📲</span>
          <div>
            <div className="text-xs font-bold text-slate-200">Install App</div>
            <div className="text-[10px] text-slate-400">Add to Home Screen</div>
          </div>
        </div>
        <button
          onClick={install}
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 flex items-center gap-1"
        >
          <span>Get</span>
        </button>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📲</span>
            <div>
              <div className="text-xs font-bold text-slate-200">Install App</div>
              <div className="text-[10px] text-slate-400">Add to iPhone/iPad</div>
            </div>
          </div>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 flex items-center gap-1"
          >
            <span>Get</span>
          </button>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-[#121418] border border-white/10 p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-100">Install on iOS</h3>
              <p className="text-sm text-slate-300">
                1. Tap the <strong className="text-blue-400">Share</strong> button in Safari's toolbar.<br />
                2. Scroll down and tap <strong className="text-blue-400">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
