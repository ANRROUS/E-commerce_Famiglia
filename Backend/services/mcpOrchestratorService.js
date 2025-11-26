import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logMCPStep, createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('mcpOrchestrator');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mcpClient = null;
let mcpProcess = null;
let isInitializing = false;

/**
 * Inicializa el cliente MCP conectándose al servidor Playwright
 * El servidor MCP debe estar corriendo en mcp-server/
 */
/**
 * Inicializa el cliente MCP conectándose al servidor Playwright
 * El servidor MCP debe estar corriendo en mcp-server/
 */
async function initMCPClient() {
  if (mcpClient) {
    // Keep-Alive Check: Verificar si la conexión sigue activa
    try {
      // Intentar una operación ligera (listar herramientas) con timeout corto
      const pingPromise = mcpClient.listTools();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 1000));
      await Promise.race([pingPromise, timeoutPromise]);
      return mcpClient;
    } catch (error) {
      console.warn('[MCP Orchestrator] ⚠️ Conexión perdida, reconectando...', error.message);
      mcpClient = null; // Forzar reconexión
    }
  }

  if (isInitializing) {
    // Esperar a que termine la inicialización
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mcpClient;
  }

  isInitializing = true;

  try {
    console.log('[MCP Orchestrator] Iniciando cliente MCP...');

    // Ruta al servidor MCP Playwright
    const mcpServerPath = path.resolve(__dirname, '../../mcp-server/playwright-server.js');

    console.log(`[MCP Orchestrator] Path del servidor MCP: ${mcpServerPath}`);

    // Crear transport - el SDK spawneará automáticamente el proceso
    const transport = new StdioClientTransport({
      command: process.platform === 'win32' ? 'node.exe' : 'node',
      args: [mcpServerPath],
      env: {
        ...process.env,
        APP_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
        CDP_URL: process.env.CDP_URL || 'http://localhost:9222',
        SLOW_MO: process.env.SLOW_MO || '100'
      }
    });

    // Crear cliente
    mcpClient = new Client(
      {
        name: 'famiglia-backend-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    // Conectar cliente
    await mcpClient.connect(transport);

    console.log('[MCP Orchestrator] Cliente MCP conectado exitosamente');

    // Listar herramientas disponibles
    try {
      const tools = await mcpClient.listTools();
      console.log(`[MCP Orchestrator] Herramientas disponibles: ${tools.tools.length}`);
    } catch (error) {
      console.error('[MCP Orchestrator] Error listando herramientas:', error);
    }

    isInitializing = false;
    return mcpClient;

  } catch (error) {
    isInitializing = false;
    console.error('[MCP Orchestrator] Error iniciando cliente MCP:', error);
    throw new Error(`Error iniciando MCP: ${error.message}`);
  }
}

/**
 * Ejecuta un plan generado por Gemini
 * @param {Array} steps - Array de steps del plan
 * @param {Object} context - Contexto actual (para recuperación de errores)
 * @returns {Object} Resultado de la ejecución
 */
export async function executeMCPPlan(steps, context = {}) {
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    console.log('[MCP Orchestrator] No hay steps para ejecutar');
    return {
      success: true,
      stepsCompleted: 0,
      stepsFailed: 0,
      totalSteps: 0,
      results: []
    };
  }

  const client = await initMCPClient();
  const results = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;

  console.log(`[MCP Orchestrator] Ejecutando plan con ${steps.length} steps`);
  /**
   * Ejecuta un step con retry logic y exponential backoff
   * @param {Function} fn - Función async que ejecuta el step
   * @param {number} maxRetries - Número máximo de reintentos (default: 3)
   * @param {number} baseDelay - Delay base en ms (default: 500)
   * @returns {Promise<{result: any, attempts: number}>} - Resultado de la ejecución y número de intentos
   */
  async function executeStepWithRetry(fn, maxRetries = 3, baseDelay = 500) {
    let lastError;
    let totalAttempts = 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        totalAttempts++;
        const result = await fn();
        return { result, attempts: totalAttempts };
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries - 1) {
          error.attempts = totalAttempts;
          throw error;
        }

        // Calcular delay con exponential backoff: baseDelay * 2^attempt
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[MCP Orchestrator] ⚠ Intento ${attempt + 1} falló: ${error.message}`);
        console.warn(`[MCP Orchestrator] ⏳ Reintentando en ${delay}ms...`);

        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Esto no debería alcanzarse, pero por seguridad
    lastError.attempts = totalAttempts;
    throw lastError;
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNumber = i + 1;

    console.log(`[MCP Orchestrator] Step ${stepNumber}/${steps.length}: ${step.tool}`);
    console.log(`[MCP Orchestrator] Params:`, JSON.stringify(step.params || {}, null, 2));

    try {
      // Llamar a la herramienta MCP con retry logic
      const startTime = Date.now();

      const { result, attempts } = await executeStepWithRetry(async () => {
        return await client.callTool({
          name: step.tool,
          arguments: step.params || {}
        });
      });

      const duration = Date.now() - startTime;

      // Parsear resultado
      let resultData;
      let parseSuccess = false;

      try {
        const responseText = result.content[0].text;

        // Si la respuesta ya es un objeto, usarlo directamente
        if (typeof responseText === 'object') {
          resultData = responseText;
          parseSuccess = true;
        } else {
          // Si es string, intentar parsear como JSON
          resultData = JSON.parse(responseText);
          parseSuccess = true;
        }
      } catch (parseError) {
        console.warn(`[MCP Orchestrator] Error parseando respuesta, usando raw:`, parseError.message);
        resultData = {
          success: true, // Asumir éxito si no se puede parsear pero no hay excepción
          rawResponse: result.content[0].text
        };
        parseSuccess = true;
      }

      // Determinar éxito del step
      // Un step es exitoso si:
      // 1. No tiene propiedad success (asumimos éxito)
      // 2. Tiene success: true
      // 3. Tiene success !== false (undefined, null, etc. son considerados éxito)
      const stepSuccess = resultData.success !== false;

      // Agregar al resultado
      results.push({
        step: stepNumber,
        tool: step.tool,
        params: step.params,
        reason: step.reason,
        success: stepSuccess,
        result: resultData,
        duration: `${duration}ms`
      });

      if (stepSuccess) {
        stepsCompleted++;
        console.log(`[MCP Orchestrator] ✓ Step ${stepNumber} completado (${duration}ms)`);
        if (resultData.currentUrl) {
          console.log(`[MCP Orchestrator]   → URL actual: ${resultData.currentUrl}`);
        }

        // Log estructurado del step exitoso
        logMCPStep({
          step: stepNumber,
          tool: step.tool,
          success: true,
          duration: `${duration}ms`,
          retries: attempts,
        });
      } else {
        stepsFailed++;
        console.error(`[MCP Orchestrator] ✗ Step ${stepNumber} falló:`, resultData.error || 'Unknown error');

        // Log estructurado del step fallido
        logMCPStep({
          step: stepNumber,
          tool: step.tool,
          success: false,
          duration: `${duration}ms`,
          error: resultData.error || 'Unknown error',
          retries: attempts,
        });

        // TODO: Aquí se podría consultar a Gemini para manejar el error
        // Por ahora, continuamos con el siguiente step
      }

    } catch (error) {
      stepsFailed++;
      console.error(`[MCP Orchestrator] ✗ Error ejecutando step ${stepNumber}:`, error.message);

      // Log estructurado del error
      logMCPStep({
        step: stepNumber,
        tool: step.tool,
        success: false,
        error: error.message,
        retries: error.attempts || 3, // Usar attempts del error si está disponible
      });

      results.push({
        step: stepNumber,
        tool: step.tool,
        params: step.params,
        reason: step.reason,
        success: false,
        error: error.message
      });

      // Si un step crítico falla, decidir si continuar o abortar
      // Por ahora, continuamos
    }
  }

  const finalResult = {
    success: stepsFailed === 0,
    stepsCompleted,
    stepsFailed,
    totalSteps: steps.length,
    results,
    summary: `Ejecutados ${stepsCompleted}/${steps.length} steps correctamente`
  };

  console.log(`[MCP Orchestrator] Ejecución finalizada: ${finalResult.summary}`);

  return finalResult;
}

/**
 * Ejecuta una herramienta MCP específica
 * @param {string} toolName - Nombre de la herramienta
 * @param {Object} params - Parámetros de la herramienta
 * @returns {Object} Resultado de la ejecución
 */
export async function executeToolDirectly(toolName, params = {}) {
  try {
    const client = await initMCPClient();

    console.log(`[MCP Orchestrator] 🔧 Ejecutando herramienta: ${toolName}`);
    console.log(`[MCP Orchestrator] 📋 Parámetros:`, JSON.stringify(params, null, 2));

    const startTime = Date.now();
    const result = await client.callTool({
      name: toolName,
      arguments: params
    });
    const duration = Date.now() - startTime;

    const resultData = JSON.parse(result.content[0].text);

    console.log(`[MCP Orchestrator] ✓ Herramienta ejecutada en ${duration}ms`);

    return {
      success: resultData.success !== false,
      data: resultData,
      duration: `${duration}ms`
    };

  } catch (error) {
    console.error(`[MCP Orchestrator] ✗ Error ejecutando herramienta ${toolName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene la lista de herramientas disponibles en MCP
 * @returns {Array} Lista de herramientas
 */
export async function listAvailableTools() {
  try {
    const client = await initMCPClient();
    const tools = await client.listTools();
    return tools.tools;
  } catch (error) {
    console.error('[MCP Orchestrator] Error listando herramientas:', error);
    return [];
  }
}

/**
 * Cierra el cliente MCP y limpia recursos
 */
export async function closeMCPClient() {
  if (mcpClient) {
    console.log('[MCP Orchestrator] Cerrando cliente MCP...');
    try {
      await mcpClient.close();
    } catch (error) {
      console.error('[MCP Orchestrator] Error cerrando cliente:', error);
    }
  }
  mcpClient = null;
  mcpProcess = null;
}

// Cleanup al cerrar el servidor Node
process.on('exit', () => {
  closeMCPClient();
});

process.on('SIGINT', () => {
  closeMCPClient();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeMCPClient();
  process.exit(0);
});
