import textToSpeech from '@google-cloud/text-to-speech';

// Cliente de Google Cloud TTS
// IMPORTANTE: Requiere que GOOGLE_APPLICATION_CREDENTIALS esté configurado o 
// que la API Key sea válida si se usa otro método (aunque la librería oficial prefiere credenciales de servicio)
// Para este entorno, asumiremos que el entorno ya tiene acceso o usaremos la API Key si es necesario.
// NOTA: La librería oficial de Node.js usa credenciales de cuenta de servicio por defecto.
// Si solo tenemos API KEY, podríamos necesitar hacer fetch directo a la REST API si la librería no lo soporta fácil.
// Pero intentaremos instanciar el cliente.

const client = new textToSpeech.TextToSpeechClient({
    apiKey: process.env.GEMINI_API_KEY // Reusamos la key si tiene permisos de Cloud TTS
});

/**
 * Genera audio a partir de texto usando Google Cloud TTS
 * @param {string} text - Texto a convertir
 * @param {Object} options - Opciones de voz
 * @returns {Promise<Buffer>} Buffer del audio MP3
 */
export const generateSpeech = async (text, options = {}) => {
    const {
        voiceName = 'es-US-Neural2-A', // Voz femenina cálida y natural (Neural2 es premium)
        languageCode = 'es-US',
        speakingRate = 1.0,
        pitch = 0.0
    } = options;

    const request = {
        input: { text: text },
        // Seleccionamos la voz específica
        voice: {
            languageCode: languageCode,
            name: voiceName,
            // ssmlGender: 'FEMALE' // Implícito en el nombre de la voz
        },
        // Configuración del audio
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speakingRate,
            pitch: pitch,
            effectsProfileId: ['headphone-class-device'] // Optimizado para auriculares/altavoces
        },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent;
    } catch (error) {
        console.error('[TTS Service] Error generando audio:', error);
        throw error;
    }
};

/**
 * Genera audio usando SSML para mayor control (pausas, énfasis)
 */
export const generateSpeechWithSSML = async (ssmlText, options = {}) => {
    const {
        voiceName = 'es-US-Neural2-A',
        languageCode = 'es-US',
        speakingRate = 1.0
    } = options;

    const request = {
        input: { ssml: ssmlText },
        voice: {
            languageCode: languageCode,
            name: voiceName
        },
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speakingRate
        },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent;
    } catch (error) {
        console.error('[TTS Service] Error generando SSML:', error);
        throw error;
    }
};
