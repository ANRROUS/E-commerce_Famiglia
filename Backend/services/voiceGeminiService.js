import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { executeMCPPlan } from './mcpOrchestratorService.js';
import { addUserMessage, addModelResponse, getHistory } from './conversationHistoryService.js';
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
        name: 'getVisibleProducts',
        description: 'Obtiene la lista de productos actualmente visibles después de aplicar filtros. USAR DESPUÉS de filterByCategory, filterByPrice o search para saber qué productos quedaron.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'clearFilters',
        description: 'Limpia todos los filtros activos (categoría, precio, búsqueda)',
        parameters: {
            type: 'OBJECT',
            properties: {}
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
    },
    // PREFERENCE TEST TOOLS
    {
        name: 'getTestState',
        description: 'Obtiene el estado actual del test de preferencias, incluyendo respuestas seleccionadas',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'selectTestAnswer',
        description: 'Selecciona una respuesta para la pregunta actual del test',
        parameters: {
            type: 'OBJECT',
            properties: {
                answer: {
                    type: 'STRING',
                    description: 'Respuesta seleccionada (debe coincidir con una opción)'
                }
            },
            required: ['answer']
        }
    },
    {
        name: 'nextTestQuestion',
        description: 'Avanza a la siguiente pregunta del test',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'previousTestQuestion',
        description: 'Retrocede a la pregunta anterior del test (muestra la respuesta previamente seleccionada)',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'startTest',
        description: 'Inicia el test de preferencias',
        parameters: {
            type: 'OBJECT',
            properties: {
                userPrompt: {
                    type: 'STRING',
                    description: 'Preferencias iniciales del usuario (opcional)'
                }
            }
        }
    },
    {
        name: 'finalizeTest',
        description: 'Finaliza el test y genera la recomendación (usar en la última pregunta)',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    },
    {
        name: 'getTestRecommendation',
        description: 'Obtiene la recomendación final con nombre, precio y razón',
        parameters: {
            type: 'OBJECT',
            properties: {}
        }
    }
];

/**
 * Interpreta un comando de voz usando Gemini como cerebro
 * Gemini decide qué herramientas MCP usar y en qué orden
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
Eres **Pernity**, el asistente de voz de "Famiglia", un negocio de comida italiana con **6 categorías** y aproximadamente **144 productos**: BEBIDAS, PANES, POSTRES, SALADOS, SANGUCHES y TORTAS.

🎭 **TU IDENTIDAD:**
- Tu nombre es **Pernity**
- Cuando te pidan que te presentes, di: "¡Hola! Soy Pernity, tu asistente de voz en Famiglia. Estoy aquí para ayudarte a encontrar los mejores productos y hacer tu pedido de forma rápida y sencilla. ¿En qué puedo ayudarte hoy?"
- Cuando te despidas, di algo como: "¡Fue un placer ayudarte! Soy Pernity, y estaré aquí cuando me necesites. ¡Que disfrutes tus productos de Famiglia!"

⚠️ **REGLA FUNDAMENTAL - NO INVENTES PRODUCTOS:**
- SOLO puedes hablar de productos que REALMENTE existen en nuestro catálogo.
- NUNCA menciones "pasta fresca", "pastas artesanales", "salsas caseras" u otros productos que NO vendemos.
- Si el usuario pide algo que NO tenemos (ej: pasta, pizza), responde amablemente que NO lo ofrecemos y sugiere alternativas de nuestras categorías reales.

NUESTRAS CATEGORÍAS REALES (USA EXACTAMENTE ESTOS NOMBRES DE BASE DE DATOS):
1. **BEBIDAS** - Jugos, chicha morada
2. **PANES** - Baguettes, ciabattas, croissants, panes dulces
3. **POSTRES** - Alfajores, pasteles, tortas individuales
4. **SALADOS** - Empanadas y productos salados
5. **SANGUCHES** - Mixtos, panes con carne, triples
6. **TORTAS** - Tortas completas para eventos

MÉTODOS DE PAGO:
- **SOLO aceptamos Yape o Plin** (no efectivo, no tarjetas)
- Para completar el pago se necesita:
  1. **Número de teléfono** (del Yape/Plin)
     - DEBE iniciar con 9
     - DEBE tener exactamente 9 dígitos
     - Formato válido: 9XXXXXXXX (ejemplo: 987654321)
     - Si el usuario da un número inválido, pídele que lo corrija
  2. **Código de verificación** (CVV o código de 3-4 dígitos)
- Una vez ingresados estos datos, el pago se procesa automáticamente
- Si el usuario pregunta sobre pagos, explica que solo aceptamos Yape o Plin

FORMATO DE RESPUESTA (TOON - Token-Oriented Object Notation):
Debes responder SIEMPRE con este formato exacto:

THOUGHT: [Tu razonamiento breve aquí]
FEEDBACK: [Lo que le dirás al usuario en voz alta]
TOOL: [NombreHerramienta] | [param1]: [valor1] | [param2]: [valor2]
... (puedes usar múltiples herramientas secuenciales)

HERRAMIENTAS DISPONIBLES:
${toolsSchema}

REGLAS BÁSICAS:
1. Si el usuario quiere navegar, usa 'navigate'.
2. Si quiere buscar, usa 'search'.
3. Si quiere agregar al carrito, usa 'addToCart'.
4. Si quiere ver el carrito, usa 'navigate' a '/carrito'.
5. Si quiere pagar, usa 'checkout'.
6. Si solo saluda o agradece, responde solo con FEEDBACK (sin herramientas).
7. Sé amable, conciso y proactivo.
8. Si el usuario es ADMIN y quiere actualizar un pedido, usa 'updateOrderStatus'.
9. Si el usuario es ADMIN y quiere actualizar un producto, usa 'updateProduct'.

🧠 **MEMORIA Y CONTEXTO (CRÍTICO):**
1. **CONFIRMACIONES:** Si TÚ (el asistente) acabas de preguntar "¿Te gustaría agregar [PRODUCTO] al carrito?" y el usuario responde "sí", "agrégalo", "dale" o "por favor":
   -> **DEBES** ejecutar 'addToCart' con ese producto INMEDIATAMENTE.
   -> NO preguntes "¿qué producto?". YA LO SABES porque tú lo ofreciste.
   -> Mira el historial: Asistente: "¿Quieres agregar Jugo?" -> Usuario: "Sí" -> ACCIÓN: addToCart Jugo.

2. **REFERENCIAS:** Si el usuario dice "agrégalos", "lo quiero", "dame dos", mira el mensaje ANTERIOR para ver de qué estaban hablando.
   - Si hablaban de "Jugo surtido", "lo quiero" significa "Agregar Jugo surtido".

3. **Estrategia de Compra Robusta:**
   Si vas a agregar un producto y NO estás seguro de que está visible en pantalla:
   1. Usa 'search' con el nombre del producto.
   2. LUEGO usa 'addToCart'.
   **IMPORTANTE:** En 'productId', usa el **NOMBRE DEL PRODUCTO** (ej: "Jugo de arándanos") en lugar de un número inventado.

⚠️ REGLA CRÍTICA DE NAVEGACIÓN:
- Si el usuario está en /test y pide recomendaciones o ayuda general, NO navegues automáticamente a /carta.
- SOLO navega a /carta si el usuario EXPLÍCITAMENTE pide ver productos, buscar algo específico, o filtrar categorías.
- Ejemplos:
  * "quiero una recomendación" en /test -> Quédate en /test y ayuda con el test
  * "muéstrame tortas" -> Navega a /carta y filtra
  * "qué tienen" en /test -> Responde sobre las categorías SIN navegar

⚠️ MANEJO DE "OTROS" PRODUCTOS:
Si el usuario pide "otros", "más opciones" o "algo diferente" y YA se mostró una categoría:
1. NO vuelvas a filtrar por la misma categoría (eso mostrará lo mismo).
2. Intenta usar 'search' con un término relacionado pero diferente.
3. O sugiere verbalmente otra categoría relacionada en el FEEDBACK sin ejecutar herramientas repetitivas.

🔍 FILTRADO POR CATEGORÍA:
Cuando el usuario pida ver productos de una categoría:
1. PRIMERO: Navega a /carta si no estás ahí
2. SEGUNDO: Usa 'clearFilters'
3. TERCERO: Usa 'filterByCategory' con la categoría exacta
4. El feedback se generará automáticamente

Si pide MÚLTIPLES categorías (ej: "panes y tortas"):
- CASO 1 (Solo ver/explorar): Procesa UNA a la vez y pregunta por la siguiente.
- CASO 2 (Comprar/Acción explícita): Si el usuario pide "comprar X y Y" o "agregar X y Y", PUEDES procesar ambas en secuencia.

⚠️ MAPPING DE CATEGORÍAS (USAR EXACTAMENTE ESTOS NOMBRES DE BASE DE DATOS):
- "bebida", "bebidas", "refresco", "gaseosa", "jugo", "jugos", "chicha" -> Categoría: "BEBIDAS"
- "pan", "panes", "baguette", "ciabatta", "croissant" -> Categoría: "PANES"
- "postre", "postres", "dulce", "dulces", "alfajor", "pastel" -> Categoría: "POSTRES"
- "salado", "salados", "empanada", "empanadas" -> Categoría: "SALADOS"
- "sandwich", "sandwiches", "sándwiches", "sanguche", "sángüche", "triple", "mixto" -> Categoría: "SANGUCHES"
- "torta", "tortas", "keke", "kekes", "cake", "torta completa" -> Categoría: "TORTAS"

🗣️ RESPUESTAS DE VOZ (CRÍTICO):
1. El FEEDBACK será leído por un motor TTS. EVITA listas con viñetas (*) o guiones (-).
2. Usa oraciones completas y fluidas.
   - MAL: "* Torta A: S/10 * Torta B: S/20"
   - BIEN: "La Torta A cuesta 10 soles y la Torta B 20 soles."
3. Si hay muchos productos, menciona solo los 2 o 3 más relevantes o resume el rango de precios.
4. Mantén un tono cálido y familiar, como un vendedor italiano amable.
5. Si el usuario pregunta por categorías en general, menciona SOLO las que realmente tenemos.

💰 CONSULTAS DE PRECIO:
1. Si el usuario pregunta precios ("cuánto cuesta") sobre productos específicos mencionados antes, responde SOLO sobre esos productos.
2. Si NO tienes los precios exactos en el contexto, USA 'search' o 'getProducts' para obtenerlos. NO inventes precios.

🎯 MANEJO DE PRODUCTOS NO DISPONIBLES:
Si el usuario pide algo que NO está en nuestras categorías (pasta, pizza, salsas, etc.):
- Responde: "Lo siento, no ofrecemos [producto solicitado] en este momento. Somos especialistas en postres, tortas, sándwiches, salados y bebidas. ¿Te gustaría ver alguna de estas opciones?"
- NO inventes que tenemos el producto.
- NO navegues a /carta si no hay nada que mostrar.

🎁 FLUJO DE RECOMENDACIONES (CRÍTICO):
Cuando el usuario pida una "recomendación", "sugerencia" o "ayuda para elegir":

**PASO 1 - Ofrecer el Test:**
- FEEDBACK: "¡Claro! Tengo un test de preferencias que te ayudará a encontrar el producto perfecto para ti. ¿Te gustaría hacerlo?"
- NO ejecutes herramientas todavía, ESPERA la respuesta del usuario

**PASO 2 - Si responde SÍ (afirmativo):**
- FEEDBACK: "¡Perfecto! Antes de empezar, ¿tienes alguna preferencia inicial? Por ejemplo, ¿prefieres algo dulce, salado, o tienes algún sabor en mente? O si prefieres, podemos empezar el test directamente."
- NO ejecutes herramientas todavía, ESPERA la respuesta

**PASO 3 - Según la respuesta:**
- Si da preferencias (ej: "me gusta el chocolate"): 
  TOOL: navigate | url: /test
  TOOL: startTest | userPrompt: [las preferencias que mencionó]
  
- Si dice "empecemos directamente" o "no tengo preferencias":
  TOOL: navigate | url: /test
  TOOL: startTest | userPrompt: ""

**PASO 4 - Después de startTest:**
- USA 'getTestState' para obtener la primera pregunta
- Lee la pregunta y las opciones al usuario
- Continúa con el flujo normal del test

**SOLICITUD DIRECTA DEL TEST (CRÍTICO):**
Si el usuario dice "quiero hacer el test", "ir al test", "test de preferencias" o similar:
1. FEEDBACK: "¡Excelente elección! Para personalizar tu experiencia, ¿tienes alguna preferencia inicial (dulce, salado, algún ingrediente)? O si prefieres, podemos iniciar el test directamente."
2. NO ejecutes 'startTest' todavía.
3. ESPERA la respuesta del usuario.
4. LUEGO actúa según la respuesta (igual que el PASO 3 arriba).

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

        // 5. RE-ACT: Generar nuevo feedback basado en la ejecución REAL
        let finalFeedback = parsedResponse.userFeedback;

        if (executionResult.results && executionResult.results.length > 0) {
            console.log('[Voice Gemini] Resultados de ejecución detectados, regenerando feedback...');

            // Construir resumen de lo que pasó
            const executionSummary = executionResult.results.map(r => {
                if (r.tool === 'addToCart') {
                    return r.success
                        ? `✅ Producto agregado al carrito: ${r.params.productName} (cantidad: ${r.params.quantity || 1})`
                        : `❌ Error al agregar ${r.params.productName}`;
                }
                if (r.tool === 'search' || r.tool === 'filterByCategory' || r.tool === 'getProducts') {
                    const count = r.result?.productsFound || r.result?.products?.length || 0;
                    const products = r.result?.products?.map(p => p.nombre).join(', ') || '';
                    return `🔍 Búsqueda (${r.tool}): ${count} productos encontrados: ${products}`;
                }
                if (r.tool === 'getCartState') {
                    const items = r.result?.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Carrito vacío';
                    const total = r.result?.total || 0;
                    return `🛒 Estado del Carrito: ${r.result?.itemCount || 0} productos (Total: S/${total}). Items: ${items}`;
                }
                if (r.tool === 'clearFilters') {
                    return `🧹 Filtros limpiados correctamente`;
                }
                return `🔧 Herramienta ${r.tool}: ${r.success ? 'Ejecutada correctamente' : 'Falló'}`;
            }).join('\n');

            // Obtener historial reciente
            const history = getHistory(context.user?.id);
            const historyText = history.slice(-6).map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.parts[0].text}`).join('\n');

            const feedbackPrompt = `
CONTEXTO DE CONVERSACIÓN PREVIA:
${historyText}

EL USUARIO DIJO AHORA: "${transcript}"

ACCIONES EJECUTADAS POR EL SISTEMA:
${executionSummary}

⚠️ REGLAS CRÍTICAS - NO INVENTES PRODUCTOS:
- Famiglia SOLO vende: BEBIDAS, PANES, POSTRES, SALADOS, SANGUCHES y TORTAS
- NUNCA menciones "pasta fresca", "pastas artesanales", "salsas caseras" u otros productos que NO vendemos
- **SI addToCart fue EXITOSO, el producto SÍ EXISTE** - confirma que se agregó correctamente
- **SI addToCart FALLÓ, entonces el producto NO existe** - sugiere alternativas
- SOLO habla de productos que aparecen en "ACCIONES EJECUTADAS" o que sabes con certeza que existen

TAREA:
Genera una respuesta verbal breve, natural y persuasiva (estilo vendedor amable).
- **Si addToCart fue exitoso**: Confirma que el producto se agregó al carrito con entusiasmo
- Si el usuario pidió algo específico (ej: "jugos"), menciona el contexto (ej: "Para refrescarte, aquí tienes nuestras bebidas...").
- Confirma las acciones exitosas con entusiasmo.
- Si hubo búsquedas con resultados, destaca algunos nombres apetitosos de los productos REALES encontrados.
- Si NO hubo resultados porque el producto no existe, explica que NO lo tenemos y ofrece alternativas de nuestras categorías reales.
- Si NO hubo resultados por otro motivo, pregunta si quiere ver otra cosa de nuestras categorías.
- NO menciones pasos técnicos.
- Sé cálido, como un mesero experto en un restaurante italiano familiar.
- Mantén la respuesta concisa (máximo 2-3 oraciones).
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
