import React, { useState, useEffect } from 'react';
import { startRecording, stopRecording, cancelRecording, createSimulatedVoiceNote, applyVoiceFilter, RecordingResult } from '../services/audioService';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoice: (result: RecordingResult) => void;
}

type VoiceEffectType = 'normal' | 'chipmunk' | 'robotic' | 'deep' | 'radio';

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendVoice
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [freqBars, setFreqBars] = useState<number[]>([10, 20, 15, 30, 25, 40, 50, 30, 20, 10]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffectType>('normal');
  const [isProcessing, setIsProcessing] = useState(false);

  const initRecording = () => {
    setSeconds(0);
    setMicPermissionError(null);
    setSelectedEffect('normal');
    setIsProcessing(false);
    
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
      setIsProcessing(false);
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
    setIsProcessing(true);
    const res = await stopRecording();
    setIsRecording(false);
    if (res && res.audioBlob) {
      const filteredRes = await applyVoiceFilter(res.audioBlob, selectedEffect);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onSendVoice({ ...filteredRes, audioUrl: dataUrl });
        setIsProcessing(false);
        onClose();
      };
      reader.readAsDataURL(filteredRes.audioBlob);
    } else if (res) {
      onSendVoice(res);
      setIsProcessing(false);
      onClose();
    } else {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleSendSimulated = async () => {
    setIsProcessing(true);
    const res = await createSimulatedVoiceNote(3);
    if (res && res.audioBlob) {
      const filteredRes = await applyVoiceFilter(res.audioBlob, selectedEffect);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onSendVoice({ ...filteredRes, audioUrl: dataUrl });
        setIsProcessing(false);
        onClose();
      };
      reader.readAsDataURL(filteredRes.audioBlob);
    } else {
      onSendVoice(res);
      setIsProcessing(false);
      onClose();
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const voiceEffects: { id: VoiceEffectType; name: string; emoji: string; desc: string }[] = [
    { id: 'normal', name: 'Original', emoji: '🎙️', desc: 'Clean natural voice' },
    { id: 'chipmunk', name: 'Chipmunk', emoji: '🐿️', desc: 'High pitch & fast' },
    { id: 'robotic', name: 'Robotic', emoji: '🤖', desc: 'Sci-fi metallic ring' },
    { id: 'deep', name: 'Monster', emoji: '🦁', desc: 'Deep booming bass' },
    { id: 'radio', name: 'Walkie-Talkie', emoji: '📻', desc: 'Vintage radio filter' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-white/25 backdrop-blur-xl animate-in fade-in duration-75">
      <div className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-blue-500/20 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">
              {isProcessing ? 'Applying Voice Filter...' : isRecording ? 'Recording Voice Note' : micPermissionError ? 'Microphone Restricted' : 'Microphone Ready'}
            </span>
          </div>
          <span className="text-base font-mono font-bold text-white bg-white/5 px-3 py-1 rounded-xl border border-white/10">
            {formatTimer(seconds)}
          </span>
        </div>

        {micPermissionError ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 space-y-2">
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
                disabled={isProcessing}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span>🎵</span>
                <span>{isProcessing ? 'Processing...' : 'Send Demo Voice Note'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Frequency Visualizer Bars */}
            <div className="flex items-center justify-center gap-1.5 h-16 mirror-glass-input rounded-2xl p-3 border border-white/5">
              {freqBars.map((height, idx) => (
                <div
                  key={idx}
                  className="w-1.5 bg-gradient-to-t from-blue-600 to-indigo-400 rounded-full transition-all duration-75"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fun Voice Filters Selection Bar */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>✨ Fun Voice Effect Filters</span>
            <span className="text-[10px] text-blue-400 font-mono">Applied on send</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {voiceEffects.map((fx) => {
              const isSelected = selectedEffect === fx.id;
              return (
                <button
                  key={fx.id}
                  type="button"
                  onClick={() => setSelectedEffect(fx.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/30 border-blue-400 text-white shadow-md shadow-blue-500/20 scale-105'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                  }`}
                  title={fx.desc}
                >
                  <span className="text-base mb-0.5">{fx.emoji}</span>
                  <span className="text-[10px] font-bold truncate w-full">{fx.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <span>🗑️</span>
            <span>Cancel</span>
          </button>

          {!micPermissionError && (
            <button
              onClick={handleFinishAndSend}
              disabled={!isRecording || seconds === 0 || isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <span>{isProcessing ? '⏳' : '🚀'}</span>
              <span>{isProcessing ? 'Processing FX...' : 'Send Voice Memo'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

