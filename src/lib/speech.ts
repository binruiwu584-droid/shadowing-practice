import type { Language } from '../types';

export const speak = (text: string, language: Language, rate = 1, onEnd?: () => void) => {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'en' ? 'en-US' : 'es-ES';
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => window.speechSynthesis.cancel();
