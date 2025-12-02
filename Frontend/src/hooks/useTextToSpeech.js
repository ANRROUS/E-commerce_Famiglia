import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para convertir texto a voz usando Web Speech API
 * @returns {Object} Métodos y estado para TTS
 */
export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  useEffect(() => {
    // Verificar si el navegador soporta Speech Synthesis
    if ('speechSynthesis' in window) {
      setIsSupported(true);

      // Cargar voces disponibles
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();

      // Las voces se cargan de forma asíncrona en algunos navegadores
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      // Cleanup: cancelar cualquier voz en reproducción al desmontar
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Reproduce texto en voz alta
   * @param {string} text - Texto a leer
   * @param {Object} options - Opciones de configuración
   * @param {string} options.lang - Idioma ('es-ES', 'es-MX', 'es-AR', etc.)
   * @param {number} options.rate - Velocidad (0.1 a 10, default: 1)
   * @param {number} options.pitch - Tono (0 a 2, default: 1)
   * @param {number} options.volume - Volumen (0 a 1, default: 1)
   * @param {string} options.voiceName - Nombre de voz específica (opcional)
   */
  const speak = useCallback((text, options = {}) => {
    if (!isSupported || !text) {
      console.warn('[TTS] Speech Synthesis no soportado o texto vacío');
      return;
    }

    // Cancelar cualquier voz en reproducción
    window.speechSynthesis.cancel();

    const {
      lang = 'es-ES',
      rate = 1.0,
      pitch = 1.0,
      volume = 1.0,
      voiceName = null
    } = options;

    // Limpiar texto: remover asteriscos y otros marcadores de formato
    const cleanText = text
      .replace(/\*\*/g, '')           // Remover asteriscos dobles (negrita Markdown)
      .replace(/\*/g, '')             // Remover asteriscos simples (énfasis Markdown)
      .replace(/_{2,}/g, '')          // Remover guiones bajos dobles (negrita Markdown)
      .replace(/`{1,3}/g, '')         // Remover backticks (código Markdown)
      .replace(/^[\*\-\+]\s+/gm, '')  // Remover viñetas de listas (* - +)
      .replace(/^\d+\.\s+/gm, '')     // Remover numeración de listas (1. 2. 3.)
      .replace(/\n\n+/g, '. ')        // Convertir párrafos múltiples en pausas
      .replace(/\n/g, ', ')           // Convertir saltos de línea simples en pausas cortas
      .replace(/S\/\s*(\d+(\.\d{2})?)/g, '$1 soles') // Reemplazar S/ por soles
      .replace(/\s+/g, ' ')           // Normalizar espacios múltiples
      .trim();                        // Quitar espacios al inicio/final

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Seleccionar voz específica si se proporciona
    if (voiceName) {
      const selectedVoice = voices.find(v => v.name === voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Seleccionar automáticamente una voz en español
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }
    }

    // Event listeners
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('[TTS] Iniciando reproducción:', cleanText.substring(0, 50) + '...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('[TTS] Reproducción completada');
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      console.error('[TTS] Error en reproducción:', event.error);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  /**
   * Detiene la reproducción actual
   */
  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Pausa la reproducción
   */
  const pause = useCallback(() => {
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.pause();
    }
  }, [isSpeaking]);

  /**
   * Reanuda la reproducción pausada
   */
  const resume = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, []);

  /**
   * Obtiene voces disponibles filtradas por idioma
   * @param {string} langPrefix - Prefijo del idioma (ej: 'es', 'en')
   * @returns {Array} Voces filtradas
   */
  const getVoicesByLanguage = useCallback((langPrefix) => {
    return voices.filter(v => v.lang.startsWith(langPrefix));
  }, [voices]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    voices,
    getVoicesByLanguage,
    spanishVoices: voices.filter(v => v.lang.startsWith('es'))
  };
};
