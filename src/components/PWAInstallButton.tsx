import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running as an installed standalone PWA
  if (isInstalled) {
    return (
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">✅</span>
          <div>
            <div className="text-xs font-bold text-emerald-300">Application Installed</div>
            <div className="text-[10px] text-emerald-400/80">Running in Standalone App Mode</div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
          Installed
        </span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📲</span>
          <div>
            <div className="text-xs font-bold text-slate-200">Install PWA Application</div>
            <div className="text-[10px] text-slate-400">Add to Home Screen / Desktop</div>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1 cursor-pointer"
        >
          <span>Get App</span>
        </button>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#121418] border border-white/10 p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>📲</span> Install SPLENDID CHAT
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2 text-xs text-slate-300">
                <p className="font-semibold text-blue-400">iOS Safari Instructions:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Tap the <strong className="text-white">Share</strong> button in Safari toolbar.</li>
                  <li>Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-300">
                <p className="font-semibold text-blue-400">Desktop / Android Instructions:</p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>Look for the <strong className="text-white">Install App</strong> icon in your browser address bar.</li>
                  <li>Or open your browser menu (⋮ / ⋯) and select <strong className="text-white">"Install SPLENDID CHAT"</strong> or <strong className="text-white">"Add to Home Screen"</strong>.</li>
                  <li>If viewing inside an iframe preview, open this app in a new tab first.</li>
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

