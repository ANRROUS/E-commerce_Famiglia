/**
 * Cliente API para el sistema de navegación por voz
 * Comunica el frontend con el backend de voz
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Procesa un comando de voz enviándolo al backend
 * @param {string} transcript - Texto transcrito del comando de voz
 * @param {Object} context - Contexto actual (URL, página, etc.)
 * @returns {Promise<Object>} Respuesta del backend con plan ejecutado
 */
export async function processVoiceCommand(transcript, context = {}) {
  try {
    // Enriquecer contexto con información del navegador
    const enrichedContext = {
      ...context,
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };

    console.log('[Voice API] Enviando comando:', transcript);
    console.log('[Voice API] Contexto:', enrichedContext);

    const response = await fetch(`${API_BASE_URL}/api/voice/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Incluir cookies para autenticación
      body: JSON.stringify({
        transcript,
        context: enrichedContext
      })
    });

    if (!response.ok) {
      console.error('[Voice API] Respuesta HTTP no OK:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({}));
      console.error('[Voice API] Error data:', errorData);
      throw new Error(errorData.error || `Error con el servicio de IA. Intenta de nuevo.`);
    }

    const data = await response.json();

    console.log('[Voice API] Respuesta recibida exitosamente:', data);
    console.log('[Voice API] Success:', data.success);
    console.log('[Voice API] Data:', data.data);

    return data;

  } catch (error) {
    console.error('[Voice API] Error procesando comando:', error);
    throw error;
  }
}

/**
 * Verifica si el sistema de voz está disponible
 * @returns {Object} Estado de disponibilidad
 */
export function checkVoiceAvailability() {
  const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const hasSpeechSynthesis = 'speechSynthesis' in window;

  return {
    voiceRecognition: hasWebSpeech,
    textToSpeech: hasSpeechSynthesis,
    isFullySupported: hasWebSpeech && hasSpeechSynthesis,
    browser: navigator.userAgent
  };
}

export default {
  processVoiceCommand,
  checkVoiceAvailability
};
