/**
 * Audio Recording, Waveform Analysis & Glass Chime Sound Synthesizer
 */

export interface RecordingResult {
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  waveData: number[];
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let streamSource: MediaStreamAudioSourceNode | null = null;
let liveStream: MediaStream | null = null;

/**
 * Play a crystal glass chime notification sound synthesized directly in Web Audio
 */
export function playGlassChimeSound(type: 'incoming' | 'sent' | 'verified' | 'lock' = 'incoming') {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === 'incoming') {
      // Pleasant dual tone crystal chime (E6 -> B6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, now); // E6
      osc1.frequency.exponentialRampToValueAtTime(1975.53, now + 0.12); // B6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2637.02, now); // E7
      osc2.frequency.exponentialRampToValueAtTime(3951.07, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } else if (type === 'sent') {
      // Quick water-drop pop sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'lock') {
      // High-tech security lock click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.setValueAtTime(3600, now + 0.04);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (e) {
    // AudioContext autoplay restrictions or inactive tab
    console.debug('Chime not supported without interaction:', e);
  }
}

/**
 * Start live microphone recording with active spectrum analyzer
 */
export async function startRecording(onFrequencyUpdate?: (frequencies: Uint8Array) => void): Promise<boolean> {
  try {
    audioChunks = [];
    liveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Setup Web Audio Analyser
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    streamSource = audioContext.createMediaStreamSource(liveStream);
    streamSource.connect(analyser);

    // Setup MediaRecorder
    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : undefined;

    mediaRecorder = new MediaRecorder(liveStream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(100);

    // Live frequency loop
    if (onFrequencyUpdate && analyser) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkFrequency = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          analyser?.getByteFrequencyData(dataArray);
          onFrequencyUpdate(dataArray);
          requestAnimationFrame(checkFrequency);
        }
      };
      requestAnimationFrame(checkFrequency);
    }

    return true;
  } catch (error) {
    console.error('Error starting audio recording:', error);
    return false;
  }
}

/**
 * Stop microphone recording and generate result with waveform bars
 */
export async function stopRecording(): Promise<RecordingResult | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanupStreams();
      resolve(null);
      return;
    }

    mediaRecorder.onstop = async () => {
      const mimeType = mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Generate representative wave pattern (24 bars)
      const waveData: number[] = [];
      for (let i = 0; i < 24; i++) {
        // Organic pseudo wave between 20% and 95%
        const val = Math.min(100, Math.max(15, Math.floor(Math.sin(i * 0.4) * 40 + Math.random() * 45 + 30)));
        waveData.push(val);
      }

      cleanupStreams();

      resolve({
        audioBlob,
        audioUrl,
        duration: Math.max(1, Math.round(audioBlob.size / 16000)), // Approximate duration fallback
        waveData
      });
    };

    mediaRecorder.stop();
  });
}

/**
 * Cancel active recording
 */
export function cancelRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  cleanupStreams();
}

function cleanupStreams() {
  if (liveStream) {
    liveStream.getTracks().forEach(track => track.stop());
    liveStream = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
  streamSource = null;
  mediaRecorder = null;
  audioChunks = [];
}

/**
 * Helper to generate random waveform data for simulated voice notes
 */
export function generateWaveformData(length: number = 24): number[] {
  const pattern = [25, 45, 80, 60, 95, 40, 75, 90, 30, 85, 65, 40, 70, 95, 50, 30, 85, 60, 45, 90, 70, 35, 55, 20];
  return pattern.slice(0, length);
}
