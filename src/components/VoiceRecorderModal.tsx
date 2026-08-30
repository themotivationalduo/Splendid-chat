import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { startRecording, stopRecording, cancelRecording, createSimulatedVoiceNote, RecordingResult } from '../services/audioService';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoice: (result: RecordingResult) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendVoice
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [freqBars, setFreqBars] = useState<number[]>([10, 20, 15, 30, 25, 40, 50, 30, 20, 10]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const initRecording = () => {
    setSeconds(0);
    setMicPermissionError(null);
    
    startRecording((frequencies) => {
      const step = Math.floor(frequencies.length / 16);
      const bars: number[] = [];
      for (let i = 0; i < 16; i++) {
        const val = frequencies[i * step] || 0;
        bars.push(Math.max(10, Math.min(100, (val / 255) * 100)));
      }
      setFreqBars(bars);
    }).then((success) => {
      if (success) {
        setIsRecording(true);
      } else {
        setMicPermissionError('Microphone access was denied or is restricted in this window. Please allow microphone permissions in system settings, or use simulated demo voice memo below.');
      }
    });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      initRecording();
    }

    return () => {
      clearInterval(timer);
      cancelRecording();
      setIsRecording(false);
    };
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  if (!isOpen) return null;

  const handleCancel = () => {
    cancelRecording();
    setIsRecording(false);
    onClose();
  };

  const handleFinishAndSend = async () => {
    const res = await stopRecording();
    setIsRecording(false);
    if (res) {
      try {
        const storageRef = ref(storage, `voice_notes/${Date.now()}.webm`);
        await uploadBytes(storageRef, res.audioBlob);
        const downloadUrl = await getDownloadURL(storageRef);
        onSendVoice({ ...res, audioUrl: downloadUrl });
      } catch (error) {
        console.error("Error uploading voice note:", error);
        // Fallback to local URL if upload fails, though it won't work for receiver
        onSendVoice(res);
      }
    }
    onClose();
  };

  const handleSendSimulated = async () => {
    const res = await createSimulatedVoiceNote(3);
    try {
      const storageRef = ref(storage, `voice_notes/${Date.now()}.wav`);
      await uploadBytes(storageRef, res.audioBlob);
      const downloadUrl = await getDownloadURL(storageRef);
      onSendVoice({ ...res, audioUrl: downloadUrl });
    } catch (error) {
      console.error("Error uploading simulated voice note:", error);
      onSendVoice(res);
    }
    onClose();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-white/20 backdrop-blur-xl animate-in fade-in duration-75">
      <div className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-red-500/20 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <span className="text-sm font-bold text-red-400 uppercase tracking-wider">
              {isRecording ? 'Recording Voice Note' : micPermissionError ? 'Microphone Restricted' : 'Microphone Ready'}
            </span>
          </div>
          <span className="text-base font-mono font-bold text-white bg-white/5 px-3 py-1 rounded-xl border border-white/10">
            {formatTimer(seconds)}
          </span>
        </div>

        {micPermissionError ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <span className="leading-relaxed">{micPermissionError}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={initRecording}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all flex items-center justify-center gap-1"
              >
                <span>🔄</span>
                <span>Retry Mic</span>
              </button>
              <button
                onClick={handleSendSimulated}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-1 active:scale-95"
              >
                <span>🎵</span>
                <span>Send Demo Voice Note</span>
              </button>
            </div>
          </div>
        ) : (
          /* Frequency Visualizer Bars */
          <div className="flex items-center justify-center gap-1.5 h-16 mirror-glass-input rounded-2xl p-3 border border-white/5">
            {freqBars.map((height, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-gradient-to-t from-red-600 to-rose-400 rounded-full transition-all duration-75"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 text-xs font-semibold transition-all"
          >
            <span>🗑️</span>
            <span>Cancel</span>
          </button>

          {!micPermissionError && (
            <button
              onClick={handleFinishAndSend}
              disabled={!isRecording || seconds === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <span>🚀</span>
              <span>Send Voice Memo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
