let audioContext: AudioContext | null = null

/**
 * Play a short notification sound using the Web Audio API.
 * No-op if AudioContext is not available (SSR, unsupported browser).
 */
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined' || !window.AudioContext) return

    if (!audioContext) {
      audioContext = new AudioContext()
    }

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.connect(gain)
    gain.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)

    gain.gain.setValueAtTime(0.3, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch {
    // Silent fail — audio is optional
  }
}
