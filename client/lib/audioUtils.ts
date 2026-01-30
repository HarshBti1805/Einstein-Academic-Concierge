/**
 * Audio utilities for Gemini Live API.
 * Input: 16-bit PCM, 16 kHz, mono (from ScriptProcessor).
 * Output: 24 kHz PCM from API (base64).
 */

/** Decode base64 string to Uint8Array (for API audio response). */
export function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Convert Float32Array from ScriptProcessor (any sample rate) to 16-bit PCM at 16 kHz and wrap in Blob. */
export function createBlob(
  float32: Float32Array,
  sourceSampleRate: number = 48000,
): Blob {
  const targetSampleRate = 16000;
  const ratio = sourceSampleRate / targetSampleRate;
  let outputLength = Math.round(float32.length / ratio);
  const pcm = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const idx = Math.floor(srcIndex);
    const frac = srcIndex - idx;
    const s =
      idx < float32.length - 1
        ? float32[idx] * (1 - frac) + float32[idx + 1] * frac
        : float32[Math.min(idx, float32.length - 1)];
    const n = Math.max(-1, Math.min(1, s));
    pcm[i] = n < 0 ? n * 0x8000 : n * 0x7fff;
  }
  return new Blob([pcm.buffer], { type: "audio/pcm;rate=16000" });
}

/** Decode raw PCM bytes to AudioBuffer for playback (24 kHz mono from Gemini). */
export function decodeAudioData(
  pcmBytes: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const numSamples = pcmBytes.length / 2;
  const buffer = audioContext.createBuffer(numChannels, numSamples, sampleRate);
  const channel = buffer.getChannelData(0);
  const view = new DataView(
    pcmBytes.buffer,
    pcmBytes.byteOffset,
    pcmBytes.byteLength,
  );
  for (let i = 0; i < numSamples; i++) {
    const s = view.getInt16(i * 2, true);
    channel[i] = s < 0 ? s / 0x8000 : s / 0x7fff;
  }
  return Promise.resolve(buffer);
}
