import React, { useState, useEffect } from 'react';
import { CallRecording } from '../types';
import { getCallRecordingsFromIndexedDB, deleteCallRecordingFromIndexedDB, clearAllCallRecordingsFromIndexedDB } from '../services/indexedDBService';
import { playGlassChimeSound } from '../services/audioService';

interface CallRecordingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterChatId?: string;
}

export const CallRecordingsModal: React.FC<CallRecordingsModalProps> = ({
  isOpen,
  onClose,
  filterChatId
}) => {
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlayback, setActivePlayback] = useState<{ id: string; url: string; isVideo: boolean } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'video'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const items = await getCallRecordingsFromIndexedDB(filterChatId);
      setRecordings(items);
    } catch (err) {
      console.error('Error loading recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecordings();
    } else {
      // Cleanup any active object URLs on close
      if (activePlayback?.url) {
        try { URL.revokeObjectURL(activePlayback.url); } catch (e) {}
        setActivePlayback(null);
      }
    }
  }, [isOpen, filterChatId]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePlayRecording = (rec: CallRecording) => {
    playGlassChimeSound('lock');
    if (activePlayback?.id === rec.id) {
      setActivePlayback(null);
      return;
    }

    if (rec.blob) {
      const objectUrl = URL.createObjectURL(rec.blob);
      setActivePlayback({
        id: rec.id,
        url: objectUrl,
        isVideo: rec.isVideo
      });
    }
  };

  const handleDownload = (rec: CallRecording) => {
    if (!rec.blob) return;
    playGlassChimeSound('sent');
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const cleanName = (rec.contactName || 'Call').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = rec.isVideo ? 'webm' : 'webm';
    a.download = `Record_${cleanName}_${new Date(rec.createdAt).toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleDelete = async (id: string) => {
    playGlassChimeSound('incoming');
    await deleteCallRecordingFromIndexedDB(id);
    if (activePlayback?.id === id) {
      setActivePlayback(null);
    }
    setDeleteConfirmId(null);
    loadRecordings();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all saved call recordings from your local IndexedDB?')) {
      playGlassChimeSound('incoming');
      await clearAllCallRecordingsFromIndexedDB();
      setActivePlayback(null);
      loadRecordings();
    }
  };

  const filtered = recordings.filter(r => {
    if (filterType === 'audio') return !r.isVideo;
    if (filterType === 'video') return r.isVideo;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg max-h-[90vh] rounded-3xl mirror-glass-card border border-white/20 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-xl text-white shadow-md shadow-rose-500/20">
              🎙️
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Call Recordings</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/30">
                  {recordings.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Encrypted & stored locally in your browser's IndexedDB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {recordings.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                title="Clear all recordings"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All ({recordings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('audio')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                filterType === 'audio'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              📞 Audio ({recordings.filter(r => !r.isVideo).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('video')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                filterType === 'video'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              📹 Video ({recordings.filter(r => r.isVideo).length})
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono">
            IndexedDB Offline
          </span>
        </div>

        {/* Active In-Modal Player Section */}
        {activePlayback && (
          <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-white/15 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Now Playing Recording</span>
              </span>
              <button
                type="button"
                onClick={() => setActivePlayback(null)}
                className="text-slate-400 hover:text-white text-[11px] font-semibold"
              >
                Close Player ✕
              </button>
            </div>

            {activePlayback.isVideo ? (
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/20 shadow-inner flex items-center justify-center">
                <video
                  src={activePlayback.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="p-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <audio
                  src={activePlayback.url}
                  controls
                  autoPlay
                  className="w-full h-10 accent-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Recordings List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto" />
              <p>Loading local call recordings...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-2xl">
                📼
              </div>
              <h4 className="text-sm font-bold text-slate-200">No Call Recordings Found</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                During an active audio or video call, press the <strong>🔴 Record</strong> button in the call controls to capture and store the conversation locally to your device.
              </p>
            </div>
          ) : (
            filtered.map((rec) => {
              const isPlaying = activePlayback?.id === rec.id;
              const isConfirmingDelete = deleteConfirmId === rec.id;

              return (
                <div
                  key={rec.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isPlaying
                      ? 'bg-rose-500/15 border-rose-500/40 shadow-lg shadow-rose-500/10'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    
                    {/* Contact Avatar & Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/15 flex items-center justify-center text-xl shrink-0 shadow-sm">
                        {rec.contactAvatar || '👤'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">
                            {rec.contactName}
                          </h4>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                            rec.isVideo
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {rec.isVideo ? '📹 Video' : '📞 Audio'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>⏱️ {formatDuration(rec.duration)}</span>
                          <span>•</span>
                          <span>📦 {formatFileSize(rec.sizeBytes || rec.blob?.size)}</span>
                          <span>•</span>
                          <span>{rec.formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Play / Pause */}
                      <button
                        type="button"
                        onClick={() => handlePlayRecording(rec)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                          isPlaying
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                        }`}
                        title={isPlaying ? 'Stop playback' : 'Play recording'}
                      >
                        <span>{isPlaying ? '⏹️' : '▶️'}</span>
                        <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Play'}</span>
                      </button>

                      {/* Download */}
                      <button
                        type="button"
                        onClick={() => handleDownload(rec)}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 flex items-center justify-center text-xs transition-all active:scale-95 cursor-pointer"
                        title="Download call recording file"
                      >
                        ⬇️
                      </button>

                      {/* Delete */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-100">
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.id)}
                            className="px-2 py-1 rounded-xl bg-rose-600 text-white text-[10px] font-bold shadow-sm"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="w-6 h-6 rounded-xl bg-white/10 text-slate-300 text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(rec.id)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 flex items-center justify-center text-xs transition-all cursor-pointer"
                          title="Delete from IndexedDB"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>🔒 100% Private Client-Side Storage</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
