import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Hook para convertir texto a voz usando Google Cloud TTS (vía Backend)
 * con fallback a Web Speech API nativa.
 * @returns {Object} Métodos y estado para TTS
 */
export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState([]);

  // Referencias para control de reproducción
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);

  // Cargar voces nativas (para fallback)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  /**
   * Limpia y normaliza el texto para mejor pronunciación
   */
  const cleanTextForSpeech = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')           // Remover negrita Markdown
      .replace(/\*/g, '')             // Remover énfasis Markdown
      .replace(/_{2,}/g, '')          // Remover guiones bajos
      .replace(/`{1,3}/g, '')         // Remover código
      .replace(/^[\*\-\+]\s+/gm, '')  // Remover viñetas
      .replace(/^\d+\.\s+/gm, '')     // Remover numeración
      .replace(/\n\n+/g, '. ')        // Párrafos a pausas
      .replace(/\n/g, ', ')           // Saltos a comas
      .replace(/S\/\s*(\d+(\.\d{2})?)/g, '$1 soles') // Moneda
      .replace(/\s+/g, ' ')           // Espacios extra
      .trim();
  };

  /**
   * Reproduce texto usando Web Speech API (Fallback)
   */
  const speakNative = useCallback((text, options = {}) => {
    if (!('speechSynthesis' in window)) return;

    const {
      rate = 1.0,
      pitch = 1.0,
      volume = 1.0,
    } = options;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Intentar seleccionar voz nativa
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) utterance.voice = spanishVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('[TTS Native] Error:', e);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voices]);

  /**
   * Reproduce texto usando Google Cloud TTS (Principal)
   */
  const speak = useCallback(async (text, options = {}) => {
    if (!text) return;

    // Detener cualquier reproducción previa
    stop();

    const cleanText = cleanTextForSpeech(text);
    const {
      rate = 1.0,
      pitch = 0.0,
      voiceName = 'es-US-Neural2-A' // Voz premium por defecto
    } = options;

    try {
      setIsSpeaking(true);
      console.log('[TTS] Solicitando audio a Google Cloud...');

      const response = await fetch(`${API_BASE_URL}/api/voice/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voiceName,
          speakingRate: rate,
          pitch
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        console.log('[TTS] Reproducción completada');
      };

      audio.onerror = (e) => {
        console.error('[TTS] Error reproduciendo audio:', e);
        URL.revokeObjectURL(audioUrl);
        // Fallback a nativo ELIMINADO por solicitud del usuario
        console.log('[TTS] Fallback nativo deshabilitado. No se reproducirá audio.');
      };

      await audio.play();

    } catch (error) {
      console.error('[TTS] Error en Google TTS:', error);
      // Fallback a nativo ELIMINADO por solicitud del usuario
      console.log('[TTS] Fallback nativo deshabilitado. No se reproducirá audio.');
    }
  }, [speakNative]);

  /**
   * Detiene cualquier reproducción
   */
  const stop = useCallback(() => {
    // Detener audio HTML5
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Detener síntesis nativa
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (window.speechSynthesis) window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) audioRef.current.play();
    if (window.speechSynthesis) window.speechSynthesis.resume();
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    voices // Exportamos voces nativas por si se necesitan listar
  };
};
