let context: AudioContext | null = null
export function getAudioContext(): AudioContext | null {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

export function playTone(frequency = 440, duration = 0.12, volume = 0.06, delay = 0) {
  const audio = getAudioContext()
  if (!audio) return
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  const start = audio.currentTime + delay
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.03)
}

export function playSuccess() {
  ;[440, 554.37, 659.25, 880].forEach((tone, index) => playTone(tone, 0.25, 0.04, index * 0.1))
}

export const MORSE: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
}
