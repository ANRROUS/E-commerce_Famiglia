import { interpretVoiceWithGemini } from '../services/voiceGeminiService.js';
import { logVoiceCommand, logVoiceError, createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('voiceController');

/**
 * Procesa un comando de voz del usuario
 * ENFOQUE SIMPLIFICADO: TODO pasa directamente a Gemini sin conversiones intermedias
 * @param {Object} req - Request con transcript, context y screenshot
 * @param {Object} res - Response
 */
export const processVoiceCommand = async (req, res) => {
  const startTime = Date.now();

  try {
    const { transcript, context, screenshot } = req.body;

    // Validación
    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Transcript es requerido y debe ser una cadena no vacía'
      });
    }

    // Enriquecer contexto con datos del usuario (autenticado o anónimo)
    const enrichedContext = {
      ...context,
      isAuthenticated: context.isAuthenticated ?? (req.isAuthenticated || false),
      userId: context.user?.id || req.user?.id_usuario || null,
      userName: context.user?.nombre || req.user?.nombre || null,
      userEmail: req.user?.correo || null,
      userRole: context.user?.rol || req.user?.rol || 'guest',
      savedAddress: req.user?.direccion || null,
      userPhone: req.user?.telefono || null
    };

    logger.info('Voice command received', {
      transcript,
      user: req.user?.nombre || 'Anónimo',
      authenticated: enrichedContext.isAuthenticated,
      pathname: context?.currentUrl || context?.pathname,
    });

    console.log(`[Voice Controller] ═══════════════════════════════════════`);
    console.log(`[Voice Controller] 🎤 Nuevo comando de voz`);
    console.log(`[Voice Controller] Usuario: ${req.user?.nombre || 'Anónimo'}`);
    console.log(`[Voice Controller] Autenticado: ${enrichedContext.isAuthenticated ? '✅ Sí' : '❌ No'}`);
    console.log(`[Voice Controller] Comando: "${transcript}"`);
    console.log(`[Voice Controller] URL actual: ${context?.currentUrl || context?.pathname || 'Unknown'}`);
    console.log(`[Voice Controller] ═══════════════════════════════════════`);
    console.log(`[Voice Controller] 🤖 Enviando comando completo a Gemini (sin conversiones)`);

    // Usa Gemini Single Model con formato TOON (Optimizado)
    // Sin filtros, sin INTENT_MAPPING, sin conversiones de palabras
    const result = await interpretVoiceWithGemini(
      transcript,
      enrichedContext,
      screenshot
    );

    // Log del resultado
    console.log(`[Voice Controller] ═══════════════════════════════════════`);
    console.log(`[Voice Controller] 📊 Resultado final`);
    console.log(`[Voice Controller] Success: ${result.success ? '✅' : '❌'}`);
    if (result.execution) {
      console.log(`[Voice Controller] Steps: ${result.execution.stepsCompleted}/${result.execution.totalSteps}`);
      console.log(`[Voice Controller] Fallidos: ${result.execution.stepsFailed || 0}`);
    }
    console.log(`[Voice Controller] Feedback: "${result.userFeedback || 'N/A'}"`);
    console.log(`[Voice Controller] ═══════════════════════════════════════`);

    // Log estructurado del comando
    const duration = Date.now() - startTime;
    logVoiceCommand({
      transcript,
      user: req.user?.nombre || 'anonymous',
      success: result.success,
      duration: `${duration}ms`,
      stepsExecuted: result.execution?.stepsCompleted || 0,
      stepsFailed: result.execution?.stepsFailed || 0,
      cached: result.cached || false,
      pathname: context?.currentUrl || context?.pathname,
    });

    // Responder al frontend
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Voice Controller] Error procesando comando:', error);

    // Determinar tipo de error para respuesta específica
    let errorMessage = 'Error procesando comando de voz';
    let statusCode = 500;
    let isTimeout = false;
    let errorType = 'unknown';

    if (error.status === 429 || error.message.includes('429') || error.message.includes('quota')) {
      errorMessage = 'Has alcanzado el límite de comandos por hoy. Por favor, espera unas horas.';
      statusCode = 429;
      errorType = 'quota_exceeded';
    } else if (error.message.includes('TIMEOUT')) {
      errorMessage = 'La operación tardó demasiado tiempo. Intenta con un comando más simple.';
      statusCode = 408;
      isTimeout = true;
      errorType = 'timeout';
    } else if (error.message.includes('Gemini')) {
      errorMessage = 'Error con el servicio de IA. Intenta de nuevo.';
      statusCode = 503;
      errorType = 'gemini';
    } else if (error.message.includes('MCP')) {
      errorMessage = 'Error ejecutando acciones en la aplicación. Intenta de nuevo.';
      statusCode = 503;
      errorType = 'mcp';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'La operación tardó demasiado. Intenta con un comando más simple.';
      statusCode = 504;
      errorType = 'timeout';
    }

    logVoiceError({
      transcript: req.body.transcript,
      user: req.user?.nombre || 'anonymous',
      error: errorMessage,
      errorType,
      stack: error.stack,
      pathname: req.body.context?.currentUrl || req.body.context?.pathname,
      duration: `${duration}ms`,
    });

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timeout: isTimeout,
      errorType,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
