import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { executeMCPPlan } from './mcpOrchestratorService.js';
import { addUserMessage, addModelResponse } from './conversationHistoryService.js';
import { parseToonResponse, formatToonSchema as formatToolsForToon } from '../utils/toonParser.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuración de Gemini
const MODEL_NAME = 'gemini-2.5-flash'; // Modelo único optimizado para velocidad

/**
 * Definición de herramientas MCP disponibles para Gemini
 * Estas son las "manos" que Gemini puede usar para interactuar con la UI
 */
const MCP_TOOLS_SCHEMA = [
    {
        name: 'navigate',
        description: 'Navega a una URL específica de la aplicación Famiglia. Usa rutas relativas como /carta, /cart, /profile, etc.',
        parameters: {
            type: 'OBJECT',
            properties: {
                url: {
                    type: 'STRING',
                    description: 'Ruta relativa (ej: /carta, /cart, /profile, /contact-us)'
                }
            },
            required: ['url']
        }
    },
    {
        name: 'search',
        description: 'Busca productos en el catálogo usando el buscador principal',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: {
                    type: 'STRING',
                    description: 'Término de búsqueda (ej: pan, chocolate, dona)'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'click',
        description: 'Hace clic en un elemento de la página usando un selector CSS',
        parameters: {
            type: 'OBJECT',
            properties: {
                selector: {
                    type: 'STRING',
                    description: 'Selector CSS del elemento (ej: button:has-text("Agregar"), .product-card:first-child)'
                },
                timeout: {
                    type: 'NUMBER',
                    description: 'Timeout en milisegundos (default: 5000)'
                }
            },
            required: ['selector']
        }
    },
    {
        name: 'fill',
        description: 'Llena un campo de texto o input',
        parameters: {
            type: 'OBJECT',
            properties: {
                selector: {
                    type: 'STRING',
                    description: 'Selector CSS del input'
                },
                text: {
                    type: 'STRING',
                    description: 'Texto a escribir en el campo'
                }
            },
            required: ['selector', 'text']
        }
    },
    {
        name: 'getProducts',
        description: 'Obtiene la lista de productos visibles actualmente en la página',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: {
                    type: 'NUMBER',
                    description: 'Número máximo de productos a retornar (default: 10)'
                }
            }
        }
    },
    {
        name: 'filterByCategory',
        description: 'Filtra productos por categoría (Pan, Postres, Galletas, etc)',
        parameters: {
            type: 'OBJECT',
            properties: {
                category: {
                    type: 'STRING',
                    description: 'Nombre de la categoría'
                }
            },
            required: ['category']
        }
    },
    {
        name: 'filterByPrice',
        description: 'Filtra productos por rango de precio',
        parameters: {
            type: 'OBJECT',
            properties: {
                min: {
                    type: 'NUMBER',
                    description: 'Precio mínimo'
                },
                max: {
                    type: 'NUMBER',
                    description: 'Precio máximo'
                }
            }
        }
    },
    {
        name: 'sortBy',
        description: 'Ordena los productos mostrados',
        parameters: {
            type: 'OBJECT',
            properties: {
                field: {
                    type: 'STRING',
                    description: 'Campo por el cual ordenar',
                    enum: ['price', 'name', 'popularity']
                },
                order: {
                    type: 'STRING',
                    description: 'Orden ascendente o descendente',
                    enum: ['asc', 'desc']
                }
            },
            required: ['field', 'order']
        }
    },
    {
        name: 'addToCart',
        description: 'Agrega un producto al carrito. Si no se especifica ID, agrega el producto actualmente visible en pantalla.',
        parameters: {
            type: 'OBJECT',
            properties: {
                productId: {
                    type: 'STRING',
                    description: 'ID del producto a agregar (opcional)'
                },
                quantity: {
                    type: 'NUMBER',
                    description: 'Cantidad a agregar (default: 1)'
                }
            }
        }
    },
    {
        name: 'saveLoginCredentials',
        description: 'Guarda credenciales de inicio de sesión para uso futuro (ej: "mi cuenta", "admin")',
        parameters: {
            type: 'OBJECT',
            properties: {
                alias: {
                    type: 'STRING',
                    description: 'Alias para identificar la cuenta (ej: "Juan", "Admin")'
                },
                email: {
                    type: 'STRING',
                    description: 'Correo electrónico'
                },
                password: {
                    type: 'STRING',
                    description: 'Contraseña'
                },
                role: {
                    type: 'STRING',
                    description: 'Rol del usuario (client o admin)',
                    enum: ['client', 'admin']
                }
            },
            required: ['alias', 'email', 'password']
        }
    },
    {
        name: 'getSavedIdentities',
        description: 'Obtiene la lista de identidades guardadas para sugerir inicio de sesión',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'autoLogin',
        description: 'Inicia sesión automáticamente con una identidad guardada. Usa esto cuando el usuario pida "iniciar sesión como [alias]"',
        parameters: {
            type: 'OBJECT',
            properties: {
                alias: {
                    type: 'STRING',
                    description: 'Alias de la identidad a usar (ej: "Administrador", "Juan")'
                }
            },
            required: ['alias']
        }
    },
    {
        name: 'getCartState',
        description: 'Obtiene el estado completo del carrito: productos, precios individuales, cantidades, totales parciales, resumen de compra (ID, envío, total general) y botones disponibles',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'updateCartQuantity',
        description: 'Actualiza la cantidad específica de un item en el carrito a un valor exacto (NO incrementa, sino que ESTABLECE la cantidad)',
        parameters: {
            type: 'OBJECT',
            properties: {
                itemId: {
                    type: 'STRING',
                    description: 'ID del detalle del item en el carrito - DEBE ser el campo id_detalle obtenido de getCartState (un número como "72", "73", etc.), NO el código del producto'
                },
                quantity: {
                    type: 'NUMBER',
                    description: 'Nueva cantidad exacta a establecer'
                },
                productName: {
                    type: 'STRING',
                    description: 'Nombre del producto para fallback en caso de ID incorrecto'
                }
            },
            required: ['itemId', 'quantity', 'productName']
        }
    },
    {
        name: 'checkout',
        description: 'Navega a la página de checkout/pago',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'proceedToPayment',
        description: 'Hace click en el botón Continuar/Proceder al pago desde el carrito actual',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'removeFromCart',
        description: 'Elimina un producto específico del carrito',
        parameters: {
            type: 'OBJECT',
            properties: {
                itemId: {
                    type: 'STRING',
                    description: 'ID del detalle del item a eliminar - DEBE ser el campo id_detalle obtenido de getCartState (un número como "72", "73", etc.), NO el código del producto'
                },
                productName: {
                    type: 'STRING',
                    description: 'Nombre del producto para fallback en caso de ID incorrecto'
                }
            },
            required: ['itemId', 'productName']
        }
    },
    {
        name: 'selectPaymentMethod',
        description: 'Selecciona método de pago (Yape o Plin) en la página de pago',
        parameters: {
            type: 'OBJECT',
            properties: {
                method: {
                    type: 'STRING',
                    description: 'Método de pago',
                    enum: ['yape', 'plin']
                }
            },
            required: ['method']
        }
    },
    {
        name: 'fillPhoneNumber',
        description: 'Llena el campo de número de teléfono en el formulario de pago',
        parameters: {
            type: 'OBJECT',
            properties: {
                phoneNumber: {
                    type: 'STRING',
                    description: 'Número de teléfono (9 dígitos empezando con 9)'
                }
            },
            required: ['phoneNumber']
        }
    },
    {
        name: 'fillVerificationCode',
        description: 'Llena el campo de código de verificación en el formulario de pago',
        parameters: {
            type: 'OBJECT',
            properties: {
                verificationCode: {
                    type: 'STRING',
                    description: 'Código de verificación (mínimo 4 dígitos)'
                }
            },
            required: ['verificationCode']
        }
    },
    {
        name: 'fillPaymentForm',
        description: 'Llena el formulario de pago con dirección y método de pago',
        parameters: {
            type: 'OBJECT',
            properties: {
                direccion: {
                    type: 'STRING',
                    description: 'Dirección de entrega'
                },
                metodoPago: {
                    type: 'STRING',
                    description: 'Método de pago',
                    enum: ['efectivo', 'tarjeta']
                }
            },
            required: ['direccion', 'metodoPago']
        }
    },
    {
        name: 'confirmPayment',
        description: 'Confirma y procesa el pago final',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'wait',
        description: 'Espera un tiempo determinado antes de continuar',
        parameters: {
            type: 'OBJECT',
            properties: {
                ms: {
                    type: 'NUMBER',
                    description: 'Milisegundos a esperar'
                }
            },
            required: ['ms']
        }
    },
    // Nuevas herramientas solicitadas
    {
        name: 'openModal',
        description: 'Abre un modal informativo (Términos, Privacidad, Quiénes somos)',
        parameters: {
            type: 'OBJECT',
            properties: {
                type: {
                    type: 'STRING',
                    description: 'Tipo de modal a abrir',
                    enum: ['terms', 'privacy', 'about']
                }
            },
            required: ['type']
        }
    },
    {
        name: 'openExternalLink',
        description: 'Abre un enlace externo (WhatsApp, Maps, Redes Sociales)',
        parameters: {
            type: 'OBJECT',
            properties: {
                target: {
                    type: 'STRING',
                    description: 'Destino del enlace',
                    enum: ['whatsapp', 'maps', 'instagram', 'facebook']
                }
            },
            required: ['target']
        }
    },
    {
        name: 'updateOrderStatus',
        description: 'Actualiza el estado de un pedido (Solo Admin)',
        parameters: {
            type: 'OBJECT',
            properties: {
                orderId: {
                    type: 'STRING',
                    description: 'ID del pedido'
                },
                status: {
                    type: 'STRING',
                    description: 'Nuevo estado',
                    enum: ['PENDIENTE', 'PREPARANDO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO']
                }
            },
            required: ['orderId', 'status']
        }
    },
    {
        name: 'updateOrderStatus',
        description: 'Actualiza el estado de un pedido (Solo Admin)',
        parameters: {
            type: 'OBJECT',
            properties: {
                orderId: {
                    type: 'STRING',
                    description: 'ID del pedido'
                },
                status: {
                    type: 'STRING',
                    description: 'Nuevo estado',
                    enum: ['PENDIENTE', 'PREPARANDO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO']
                }
            },
            required: ['orderId', 'status']
        }
    },
    {
        name: 'updateProduct',
        description: 'Actualiza un producto (Solo Admin)',
        parameters: {
            type: 'OBJECT',
            properties: {
                productId: {
                    type: 'STRING',
                    description: 'ID del producto'
                },
                updates: {
                    type: 'OBJECT',
                    description: 'Campos a actualizar',
                    properties: {
                        precio: { type: 'NUMBER' },
                        stock: { type: 'NUMBER' },
                        nombre: { type: 'STRING' }
                    }
                }
            },
            required: ['productId', 'updates']
        }
    }
];

/**
 * Interpreta un comando de voz usando Gemini como cerebro
 * Gemini decide qué herramientas MCP usar y en qué orden
 *
 * @param {string} transcript - Texto del comando de voz
 * @param {Object} context - Contexto actual (usuario, URL, carrito, etc)
 * @returns {Object} Resultado con plan ejecutado y feedback
 */
export async function interpretVoiceWithGemini(transcript, context = {}) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY no configurada');
        }

        console.log('[Voice Gemini] 🚀 Iniciando procesamiento optimizado (Single Model + TOON)...');

        // 1. Preparar System Prompt con TOON
        const toolsSchema = formatToolsForToon(MCP_TOOLS_SCHEMA);
        const systemPrompt = `
Eres el asistente de voz de "Famiglia", un e-commerce de comida italiana.
Tu objetivo es ayudar al usuario a navegar, comprar y resolver dudas.

FORMATO DE RESPUESTA (TOON - Token-Oriented Object Notation):
Debes responder SIEMPRE con este formato exacto:

THOUGHT: [Tu razonamiento breve aquí]
FEEDBACK: [Lo que le dirás al usuario en voz alta]
TOOL: [NombreHerramienta] | [param1]: [valor1] | [param2]: [valor2]
... (puedes usar múltiples herramientas secuenciales)

HERRAMIENTAS DISPONIBLES:
${toolsSchema}

REGLAS:
1. Si el usuario quiere navegar, usa 'navigate'.
2. Si quiere buscar, usa 'search'.
3. Si quiere agregar al carrito, usa 'addToCart'.
4. Si quiere ver el carrito, usa 'navigate' a '/carrito'.
5. Si quiere pagar, usa 'checkout'.
6. Si solo saluda o agradece, responde solo con FEEDBACK.
7. Sé amable, conciso y proactivo.
8. Si el usuario es ADMIN y quiere actualizar un pedido, usa 'updateOrderStatus'.
9. Si el usuario es ADMIN y quiere actualizar un producto, usa 'updateProduct'.

CONTEXTO ACTUAL:
${JSON.stringify(context, null, 2)}
`;

        // 2. Generar plan con Gemini (Modelo Único: gemini-2.5-flash)
        console.log(`[Voice Service] Generando plan con ${MODEL_NAME}...`);

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1024,
            }
        });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: systemPrompt },
                        { text: `TRANSCRIPT: "${transcript}"` }
                    ]
                }
            ]
        });

        const responseText = result.response.text();
        console.log('[Voice Service] Respuesta raw de Gemini:', responseText);

        // 3. Parsear respuesta TOON
        const parsedResponse = parseToonResponse(responseText);

        console.log('[Voice Gemini] Parsed Plan:', parsedResponse);

        // 4. Ejecutar el plan con el orquestador MCP
        let executionResult = { success: true, stepsCompleted: 0, results: [] };

        if (parsedResponse.steps && parsedResponse.steps.length > 0) {
            console.log(`[Voice Gemini] Ejecutando ${parsedResponse.steps.length} pasos...`);
            executionResult = await executeMCPPlan(parsedResponse.steps, context);
        }

        // 5. RE-ACT: Generar nuevo feedback si hay resultados de datos (Búsqueda/Filtro)
        // Si la herramienta devolvió productos, actualizamos el feedback para ser específicos
        const dataStep = executionResult.results?.find(r =>
            (r.tool === 'search' || r.tool === 'filterByCategory' || r.tool === 'getProducts' || r.tool === 'searchProducts') &&
            r.success &&
            (r.result.products || r.result.productsFound !== undefined)
        );

        let finalFeedback = parsedResponse.userFeedback;

        if (dataStep) {
            console.log('[Voice Gemini] Detectados resultados de datos, regenerando feedback...');

            const productsFound = dataStep.result.products || [];
            const count = dataStep.result.productsFound || productsFound.length;

            // Generar feedback enriquecido
            const feedbackPrompt = `
CONTEXTO:
El usuario dijo: "${transcript}"
El asistente ejecutó la herramienta: "${dataStep.tool}"
Resultado: Se encontraron ${count} productos.
Lista de productos (primeros 5): ${JSON.stringify(productsFound.slice(0, 5).map(p => p.nombre || p.name), null, 2)}

TAREA:
Genera una respuesta verbal breve y natural para el usuario.
- Si hay productos, menciona cuántos hay y lista los 2-3 más relevantes.
- Si no hay productos, dilo claramente y ofrece ayuda.
- NO uses formato JSON ni markdown, solo el texto plano de lo que dirías.
- Sé amable y entusiasta.
`;

            const feedbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const feedbackResult = await feedbackModel.generateContent(feedbackPrompt);
            finalFeedback = feedbackResult.response.text().trim();
            console.log('[Voice Gemini] Nuevo feedback generado:', finalFeedback);
        }

        // 6. Guardar en historial
        if (context.user && context.user.id) {
            await addUserMessage(context.user.id, transcript);
            await addModelResponse(context.user.id, finalFeedback, parsedResponse.steps);
        }

        return {
            success: true,
            plan: parsedResponse,
            execution: executionResult,
            userFeedback: finalFeedback
        };

    } catch (error) {
        console.error('[Voice Gemini] Error crítico:', error);

        // Fallback de emergencia
        return {
            success: false,
            error: error.message,
            userFeedback: "Lo siento, tuve un problema técnico. ¿Podrías repetirlo?"
        };
    }
}
