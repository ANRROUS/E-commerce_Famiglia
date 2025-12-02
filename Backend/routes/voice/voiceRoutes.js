import express from 'express';
import { processVoiceCommand } from '../../controllers/voiceController.js';
import { optionalAuthMiddleware } from '../../middleware/optionalAuthMiddleware.js';

const router = express.Router();

/**
 * POST /api/voice/process
 * Procesa un comando de voz del usuario
 * Funciona con usuarios autenticados y anónimos
 */
router.post('/process', optionalAuthMiddleware, processVoiceCommand);

/**
 * POST /api/voice/tts
 * Genera audio de alta calidad a partir de texto usando Google Cloud TTS
 */
router.post('/tts', async (req, res) => {
    try {
        const { text, voiceName, speakingRate, pitch } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'El campo "text" es requerido' });
        }

        // Importar dinámicamente para evitar errores si no está instalado
        const { generateSpeech } = await import('../../services/ttsService.js');

        const audioBuffer = await generateSpeech(text, {
            voiceName,
            speakingRate,
            pitch
        });

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
        });

        res.send(audioBuffer);
    } catch (error) {
        console.error('[TTS Endpoint] Error:', error.message);
        res.status(500).json({
            error: 'Error al generar audio',
            message: error.message
        });
    }
});

export default router;
