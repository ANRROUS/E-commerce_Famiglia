import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from '@playwright/test';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { credentialManager } from './credentialManager.js';

// Importar selectores mapeados
let SELECTORS = null;
try {
  const selectorPath = path.resolve(__dirname, '../Backend/services/selectorMappingService.js');
  // Convertir ruta de Windows a URL file:// para ESM loader
  const selectorUrl = new URL('file:///' + selectorPath.replace(/\\/g, '/'));
  const selectorsModule = await import(selectorUrl.href);
  SELECTORS = selectorsModule.default;
  console.error('[MCP Playwright] ✓ Selectores mapeados cargados');
} catch (error) {
  console.error('[MCP Playwright] ⚠️ No se pudieron cargar selectores mapeados:', error.message);
  SELECTORS = null;
}

/**
 * MCP Playwright Server para Famiglia
 * Servidor que expone herramientas de Playwright para navegación por voz
 * Gemini usa estas herramientas como "manos" para interactuar con la UI
 */

// Estado del navegador
let browser = null;
let context = null;
let page = null;

// Configuración
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const SLOW_MO = parseInt(process.env.SLOW_MO || '100');

/**
 * Inicializa conexión al navegador del usuario usando CDP
 * Se conecta al navegador donde el usuario ya está navegando
 */
async function initBrowser() {
  if (!browser) {
    const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';

    console.error('[MCP Playwright] Conectando al navegador del usuario via CDP...');
    console.error(`[MCP Playwright] CDP URL: ${CDP_URL}`);

    try {
      // Conectar al navegador existente via Chrome DevTools Protocol
      browser = await chromium.connectOverCDP(CDP_URL);

      // Obtener contextos existentes
      const contexts = browser.contexts();

      if (contexts.length === 0) {
        throw new Error('No hay contextos de navegador disponibles');
      }

      // Usar el primer contexto (el del usuario)
      context = contexts[0];

      // Obtener todas las páginas abiertas
      const pages = context.pages();

      if (pages.length === 0) {
        // Si no hay páginas, crear una nueva
        page = await context.newPage();
        await page.goto(APP_URL);
      } else {
        // Buscar la página de la aplicación (no DevTools)
        // Filtrar páginas que NO sean devtools y que contengan localhost:5173
        const appPages = pages.filter(p => {
          const url = p.url();
          return !url.includes('devtools://') &&
            !url.includes('chrome://') &&
            !url.includes('about:blank');
        });

        if (appPages.length > 0) {
          // Preferir la página que sea localhost:5173
          const localPage = appPages.find(p => p.url().includes('localhost:5173'));
          page = localPage || appPages[appPages.length - 1];
        } else {
          // Si todas las páginas son devtools, crear una nueva
          console.error('[MCP Playwright] ⚠️ No se encontró página de aplicación, creando nueva...');
          page = await context.newPage();
          await page.goto(APP_URL);
        }

        console.error(`[MCP Playwright] Conectado a página: ${page.url()}`);
      }

      console.error('[MCP Playwright] ✓ Conectado al navegador del usuario');

    } catch (error) {
      console.error('[MCP Playwright] ✗ Error conectando via CDP:', error.message);
      console.error('[MCP Playwright] Instrucciones:');
      console.error('  1. Abre Chrome/Edge con: --remote-debugging-port=9222');
      console.error('  2. O inicia con: chrome.exe --remote-debugging-port=9222');
      throw error;
    }
  }

  return page;
}

/**
 * Definición de todas las herramientas MCP disponibles
 */
const TOOLS = [
  {
    name: 'navigate',
    description: 'Navega a una URL específica de la aplicación Famiglia',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Ruta relativa (ej: /carta, /cart, /profile, /contact-us)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'click',
    description: 'Hace clic en un elemento de la página',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector CSS o texto del elemento'
        },
        timeout: {
          type: 'number',
          description: 'Timeout en ms (default: 5000)'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'fill',
    description: 'Llena un campo de texto',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector CSS del input'
        },
        text: {
          type: 'string',
          description: 'Texto a escribir'
        }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'select',
    description: 'Selecciona una opción de un dropdown',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector del select'
        },
        option: {
          type: 'string',
          description: 'Valor o texto de la opción'
        }
      },
      required: ['selector', 'option']
    }
  },
  {
    name: 'getText',
    description: 'Obtiene el texto de un elemento',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector CSS del elemento'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'getProducts',
    description: 'Obtiene lista de productos visibles en la página actual',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de productos (default: 10)'
        }
      }
    }
  },
  {
    name: 'search',
    description: 'Busca productos usando el buscador',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'filterByCategory',
    description: 'Filtra productos por categoría',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Nombre de la categoría (Pan, Postres, Galletas, etc)'
        }
      },
      required: ['category']
    }
  },
  {
    name: 'filterByPrice',
    description: 'Filtra productos por rango de precio',
    inputSchema: {
      type: 'object',
      properties: {
        min: {
          type: 'number',
          description: 'Precio mínimo'
        },
        max: {
          type: 'number',
          description: 'Precio máximo'
        }
      }
    }
  },
  {
    name: 'sortBy',
    description: 'Ordena productos',
    inputSchema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Campo por el cual ordenar (price, name, popularity)'
        },
        order: {
          type: 'string',
          description: 'Orden: asc o desc'
        }
      },
      required: ['field', 'order']
    }
  },
  {
    name: 'addToCart',
    description: 'Agrega producto al carrito',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'ID del producto (opcional si ya está en la página del producto)'
        },
        quantity: {
          type: 'number',
          description: 'Cantidad (default: 1)'
        }
      }
    }
  },
  {
    name: 'updateCartQuantity',
    description: 'Actualiza cantidad de un item en el carrito',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: {
          type: 'string',
          description: 'ID del item en el carrito'
        },
        quantity: {
          type: 'number',
          description: 'Nueva cantidad'
        },
        productName: {
          type: 'string',
          description: 'Nombre del producto para buscar en caso de que itemId no coincida'
        }
      },
      required: ['itemId', 'quantity']
    }
  },
  {
    name: 'removeFromCart',
    description: 'Elimina un item del carrito',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: {
          type: 'string',
          description: 'ID del item a eliminar'
        },
        productName: {
          type: 'string',
          description: 'Nombre del producto para buscar en caso de que itemId no coincida'
        }
      },
      required: ['itemId']
    }
  },
  {
    name: 'getCartState',
    description: 'Obtiene el estado actual del carrito',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'checkout',
    description: 'Navega a la página de checkout/pago',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'proceedToPayment',
    description: 'Hace click en el botón Continuar/Proceder al pago desde el carrito',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'selectPaymentMethod',
    description: 'Selecciona método de pago (Yape o Plin) en la página de pago',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          description: 'Método de pago: "yape" o "plin"'
        }
      },
      required: ['method']
    }
  },
  {
    name: 'fillPhoneNumber',
    description: 'Llena el campo de número de teléfono en el formulario de pago',
    inputSchema: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de teléfono (9 dígitos empezando con 9)'
        }
      },
      required: ['phoneNumber']
    }
  },
  {
    name: 'fillVerificationCode',
    description: 'Llena el campo de código de verificación en el formulario de pago',
    inputSchema: {
      type: 'object',
      properties: {
        verificationCode: {
          type: 'string',
          description: 'Código de verificación (mínimo 4 dígitos)'
        }
      },
      required: ['verificationCode']
    }
  },
  {
    name: 'fillPaymentForm',
    description: 'Llena el formulario de pago',
    inputSchema: {
      type: 'object',
      properties: {
        direccion: {
          type: 'string',
          description: 'Dirección de entrega'
        },
        metodoPago: {
          type: 'string',
          description: 'Método de pago (efectivo o tarjeta)'
        }
      },
      required: ['direccion', 'metodoPago']
    }
  },
  {
    name: 'confirmPayment',
    description: 'Confirma el pago final',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'screenshot',
    description: 'Toma captura de pantalla',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: {
          type: 'boolean',
          description: 'Capturar página completa (default: false)'
        }
      }
    }
  },
  {
    name: 'wait',
    description: 'Espera un tiempo determinado',
    inputSchema: {
      type: 'object',
      properties: {
        ms: {
          type: 'number',
          description: 'Milisegundos a esperar'
        }
      },
      required: ['ms']
    }
  },
  {
    name: 'waitForSelector',
    description: 'Espera a que aparezca un elemento',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector CSS'
        },
        timeout: {
          type: 'number',
          description: 'Timeout en ms (default: 5000)'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'debugCartDOM',
    description: 'DEBUG: Analiza la estructura DOM real del carrito para debugging',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getPageState',
    description: 'Obtiene estado completo de la página',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getPageElements',
    description: 'Extrae todos los elementos interactivos de la página actual (botones, links, inputs, etc.) para que Gemini pueda generar selectores dinámicos',
    inputSchema: {
      type: 'object',
      properties: {
        types: {
          type: 'array',
          description: 'Tipos de elementos a extraer (default: ["button", "link", "input", "select"])',
          items: {
            type: 'string',
            enum: ['button', 'link', 'input', 'select', 'textarea', 'all']
          }
        }
      }
    }
  },
  {
    name: 'check',
    description: 'Marca un checkbox (input[type="checkbox"])',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector CSS del checkbox a marcar'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'getProductsData',
    description: 'Obtiene los productos actualmente visibles en el catálogo/carta con todos sus datos (nombre, precio, descripción, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Límite de productos a obtener (default: 10)'
        }
      }
    }
  },
  {
    name: 'searchProducts',
    description: 'Busca productos por término de búsqueda en el catálogo',
    inputSchema: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Término de búsqueda para filtrar productos'
        }
      },
      required: ['searchTerm']
    }
  },
  {
    name: 'filterByCategory',
    description: 'Filtra productos por categoría específica',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Nombre de la categoría (ej: "Panes", "Postres", "Bebidas")'
        }
      },
      required: ['category']
    }
  },
  {
    name: 'addProductToCart',
    description: 'Agrega un producto específico al carrito por su nombre o ID',
    inputSchema: {
      type: 'object',
      properties: {
        productName: {
          type: 'string',
          description: 'Nombre del producto a agregar'
        },
        productId: {
          type: 'string',
          description: 'ID del producto (alternativa al nombre)'
        },
        quantity: {
          type: 'number',
          description: 'Cantidad a agregar (default: 1)'
        }
      }
    }
  },
  {
    name: 'uncheck',
    description: 'Desmarca un checkbox (input[type="checkbox"])',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector CSS del checkbox a desmarcar'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'selectRadio',
    description: 'Selecciona un radio button por valor o label',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector CSS del radio button o su contenedor'
        },
        value: {
          type: 'string',
          description: 'Valor del radio button a seleccionar (opcional)'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'fillForm',
    description: 'Llena múltiples campos de un formulario simultáneamente',
    inputSchema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          description: 'Array de objetos con selector y text para cada campo',
          items: {
            type: 'object',
            properties: {
              selector: { type: 'string' },
              text: { type: 'string' }
            },
            required: ['selector', 'text']
          }
        }
      },
      required: ['fields']
    }
  },
  {
    name: 'openModal',
    description: 'Abre un modal informativo (Términos, Privacidad, Quiénes somos)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Tipo de modal a abrir (terms, privacy, about)',
          enum: ['terms', 'privacy', 'about']
        }
      },
      required: ['type']
    }
  },
  {
    name: 'openExternalLink',
    description: 'Abre un enlace externo (WhatsApp, Maps, Redes Sociales)',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Destino del enlace (whatsapp, maps, instagram, facebook)',
          enum: ['whatsapp', 'maps', 'instagram', 'facebook']
        }
      },
      required: ['target']
    }
  },
  {
    name: 'updateOrderStatus',
    description: 'Actualiza el estado de un pedido (Solo Admin)',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'ID del pedido'
        },
        status: {
          type: 'string',
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
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'ID del producto'
        },
        updates: {
          type: 'object',
          description: 'Campos a actualizar (precio, stock, nombre)',
          properties: {
            precio: { type: 'number' },
            stock: { type: 'number' },
            nombre: { type: 'string' }
          }
        }
      },
      required: ['productId', 'updates']
    }
  },
  {
    name: 'saveLoginCredentials',
    description: 'Guarda credenciales de inicio de sesión para uso futuro',
    inputSchema: {
      type: 'object',
      properties: {
        alias: {
          type: 'string',
          description: 'Nombre o alias para identificar la cuenta (ej: "Juan", "Admin")'
        },
        email: {
          type: 'string',
          description: 'Correo electrónico'
        },
        password: {
          type: 'string',
          description: 'Contraseña'
        },
        role: {
          type: 'string',
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
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoLogin',
    description: 'Inicia sesión automáticamente con una identidad guardada',
    inputSchema: {
      type: 'object',
      properties: {
        alias: {
          type: 'string',
          description: 'Alias de la identidad a usar (ej: "Administrador")'
        }
      },
      required: ['alias']
    }
  }
];

/**
 * Implementación de cada herramienta
 */
const toolHandlers = {
  // NAVEGACIÓN
  async navigate({ url }) {
    const p = await initBrowser();

    // INTERCEPCIÓN DE RUTAS ESPECIALES (MODALES)
    if (url === '/login' || url === '/signin') {
      console.log('[navigate] Interceptando /login -> Abriendo modal de Login');
      const selector = SELECTORS?.HEADER_SELECTORS?.auth?.iniciarSesion || 'button:has-text("Iniciar Sesión")';
      return await toolHandlers.click({ selector });
    }

    if (url === '/register' || url === '/signup') {
      console.log('[navigate] Interceptando /register -> Abriendo modal de Registro');
      const selector = SELECTORS?.HEADER_SELECTORS?.auth?.registrarse || 'button:has-text("Registrarse")';
      return await toolHandlers.click({ selector });
    }

    if (url === '/logout' || url === '/signout') {
      console.log('[navigate] Interceptando /logout -> Cerrando sesión');
      const selector = SELECTORS?.HEADER_SELECTORS?.user?.cerrarSesion || 'button:has-text("Cerrar Sesión")';
      return await toolHandlers.click({ selector });
    }

    const fullUrl = url.startsWith('http') ? url : `${APP_URL}${url}`;

    if (url.startsWith('http')) {
      await p.goto(fullUrl, { waitUntil: 'networkidle' });
    } else {
      const success = await p.evaluate((route) => {
        if (window.__navigateViaReactRouter) {
          window.__navigateViaReactRouter(route);
          return true;
        }
        return false;
      }, url);

      if (!success) {
        await p.goto(fullUrl, { waitUntil: 'domcontentloaded' });
      }
    }

    // Esperar a que el DOM se actualice
    await p.waitForTimeout(1000);

    return {
      success: true,
      currentUrl: p.url(),
      title: await p.title()
    };
  },
  // INTERACCIÓN CON ELEMENTOS
  async click({ selector, timeout = 5000 }) {
    const p = await initBrowser();

    // Extraer texto de selectores tipo ":has-text()" o "has-text()"
    let textToFind = null;
    const hasTextMatch = selector.match(/:has-text\(["'](.+?)["']\)/i) || selector.match(/has-text\(["'](.+?)["']\)/i);
    if (hasTextMatch) {
      textToFind = hasTextMatch[1];
      console.error(`[click] 🔍 Texto extraído de selector: "${selector}" → "${textToFind}"`);
    }

    // Usar selectores mapeados si están disponibles y el selector no es específico
    let effectiveSelector = selector;

    // Si el selector es genérico, intentar enriquecerlo con selectores mapeados
    if (SELECTORS && selector && !selector.includes('[') && !selector.includes(':has')) {
      // Intentar mapear texto simple a selector más robusto
      const selectorText = selector.toLowerCase();

      if (selectorText.includes('iniciar sesión') || selectorText === 'login') {
        effectiveSelector = SELECTORS.HEADER_SELECTORS?.auth?.iniciarSesion || selector;
      } else if (selectorText.includes('registrarse') || selectorText === 'register') {
        effectiveSelector = SELECTORS.HEADER_SELECTORS?.auth?.registrarse || selector;
      } else if (selectorText.includes('cerrar sesión') || selectorText === 'logout') {
        effectiveSelector = SELECTORS.HEADER_SELECTORS?.user?.cerrarSesion || selector;
      } else if (selectorText.includes('carrito') || selectorText === 'cart') {
        effectiveSelector = SELECTORS.HEADER_SELECTORS?.user?.carrito || selector;
      } else if (selectorText.includes('perfil') || selectorText === 'profile') {
        effectiveSelector = SELECTORS.HEADER_SELECTORS?.user?.perfil || selector;
      } else if (selectorText.includes('continuar')) {
        effectiveSelector = SELECTORS.CART_SELECTORS?.continuar || selector;
      }

      console.error(`[click] Selector enriquecido: ${selector} → ${effectiveSelector}`);
    }

    // Estrategias de click (en orden de prioridad)
    // Si extrajimos texto, usar ese texto en las estrategias de fallback
    const searchText = textToFind || selector;
    const strategies = [
      effectiveSelector,                    // Selector original o enriquecido
      `text="${searchText}"`,               // Texto exacto con comillas
      `text=${searchText}`,                 // Texto exacto sin comillas
      `text=/.*${searchText}.*/i`,          // Texto parcial (case-insensitive)
      `[role = "button"]: has - text("${searchText}")`, // Role button con texto
      `button: has - text("${searchText}")`,   // Button con texto
      `a: has - text("${searchText}")`,        // Link con texto
      `[data - testid*="${searchText.toLowerCase().replace(/\s+/g, '-')}"]`, // data-testid
    ];

    let lastError;
    for (const strategy of strategies) {
      try {
        await p.click(strategy, { timeout: 2000 }); // Timeout más corto por estrategia
        console.error(`[click] ✅ Click exitoso con estrategia: ${strategy} `);
        return { success: true, clicked: strategy };
      } catch (error) {
        lastError = error;
        console.error(`[click] ❌ Estrategia falló: ${strategy} `);
        continue;
      }
    }

    throw new Error(`No se pudo hacer clic en: ${selector} (probadas ${strategies.length} estrategias)`);
  },

  async fill({ selector, text }) {
    const p = await initBrowser();
    await p.fill(selector, text);

    return {
      success: true,
      filled: selector,
      value: text
    };
  },

  async select({ selector, option }) {
    const p = await initBrowser();
    await p.selectOption(selector, option);

    return {
      success: true,
      selected: option
    };
  },

  async getText({ selector }) {
    const p = await initBrowser();
    const text = await p.textContent(selector);

    return {
      success: true,
      text: text ? text.trim() : ''
    };
  },

  // PRODUCTOS
  async getProducts({ limit = 10 }) {
    const p = await initBrowser();

    const products = await p.evaluate((lim) => {
      const productCards = Array.from(document.querySelectorAll('.product-card, [data-product], .producto'));

      return productCards.slice(0, lim).map((card, idx) => {
        // Intentar extraer información del producto
        const nameEl = card.querySelector('.product-name, .nombre, h3, h4');
        const priceEl = card.querySelector('.product-price, .precio, .price');
        const imgEl = card.querySelector('img');

        return {
          id: card.dataset.productId || card.dataset.id || `product - ${idx} `,
          name: nameEl ? nameEl.textContent.trim() : 'Producto sin nombre',
          price: priceEl ? parseFloat(priceEl.textContent.replace(/[^\d.]/g, '')) : 0,
          image: imgEl ? imgEl.src : null,
          inStock: !card.classList.contains('out-of-stock') && !card.classList.contains('agotado')
        };
      });
    }, limit);

    return {
      success: true,
      products,
      count: products.length
    };
  },

  // NUEVAS HERRAMIENTAS
  async openModal({ type }) {
    const p = await initBrowser();

    // Ejecutar lógica en el cliente para abrir el modal
    // El frontend debe exponer una función global o escuchar un evento
    await p.evaluate((modalType) => {
      // Disparar evento personalizado que el frontend escuche
      const event = new CustomEvent('voice:open-modal', { detail: { type: modalType } });
      window.dispatchEvent(event);
    }, type);

    return {
      success: true,
      message: `Abriendo modal: ${type} `
    };
  },

  async openExternalLink({ target }) {
    const p = await initBrowser();

    await p.evaluate((linkTarget) => {
      const event = new CustomEvent('voice:open-link', { detail: { target: linkTarget } });
      window.dispatchEvent(event);
    }, target);

    return {
      success: true,
      message: `Abriendo enlace externo: ${target} `
    };
  },
  async clearFilters() {
    const p = await initBrowser();
    console.error('[clearFilters] Disparando evento voice:clear-filters');

    await p.evaluate(() => {
      window.dispatchEvent(new CustomEvent('voice:clear-filters'));
    });

    // Esperar un poco para que React procese el cambio de estado
    await p.waitForTimeout(500);

    return {
      success: true,
      message: 'Filtros limpiados correctamente'
    };
  },

  async search({ query }) {
    const p = await initBrowser();

    // Usar selectores mapeados si están disponibles
    const searchSelector = SELECTORS?.CATALOG_SELECTORS?.search?.input ||
      '#search-products, input[name="search"], input[data-testid="search-input"], input[aria-label="Buscar productos"]';

    console.error(`[search] Usando selector: ${searchSelector} `);

    try {
      // Intentar llenar el campo de búsqueda
      await p.fill(searchSelector, query);

      // Esperar a que se apliquen los filtros (Material-UI filtra automáticamente en onChange)
      await p.waitForTimeout(500);

      // Verificar si hay resultados usando selectores mapeados
      const productSelector = SELECTORS?.CATALOG_SELECTORS?.productos?.card || '.MuiCard-root';
      const productsVisible = await p.$$(productSelector);

      // Obtener datos detallados de los productos encontrados
      const productsData = await toolHandlers.getProductsData({ limit: 5 });

      console.error(`[search] ✓ Búsqueda exitosa.Productos encontrados: ${productsVisible.length} `);

      return {
        success: true,
        query,
        resultsLoaded: true,
        productsFound: productsVisible.length,
        products: productsData.products // Incluir datos de productos
      };
    } catch (error) {
      console.error(`[search] ✗ Error en búsqueda: `, error.message);

      // Fallback: listar inputs disponibles para debugging
      try {
        const allInputs = await p.$$('input');
        const inputsInfo = [];
        for (const input of allInputs.slice(0, 5)) {
          const attrs = await input.evaluate(el => ({
            type: el.type,
            name: el.name,
            placeholder: el.placeholder,
            id: el.id,
            class: el.className
          }));
          inputsInfo.push(JSON.stringify(attrs));
        }
        console.error(`[search] Inputs disponibles: ${inputsInfo.join(', ')} `);
      } catch (e) { }

      throw new Error(`No se pudo realizar la búsqueda: ${error.message} `);
    }
  },

  async filterByCategory({ category }) {
    const p = await initBrowser();
    console.error(`[filterByCategory] Filtrando por: ${category}`);

    // Esperar a que carguen las categorías (fix race condition)
    try {
      await p.waitForSelector('button, a[role="button"]', { timeout: 5000 });
      await p.waitForTimeout(1000);
    } catch (e) {
      console.error('[filterByCategory] Timeout esperando categorías');
    }

    try {
      // Intentar encontrar y clickear el botón usando lógica en el navegador
      const result = await p.evaluate((targetCategory) => {
        console.log(`[DOM] Buscando categoría: "${targetCategory}"`);

        // Buscar todos los botones que podrían ser categorías
        // Buscamos botones dentro de contenedores que parezcan listas o menús, o botones genéricos
        const buttons = Array.from(document.querySelectorAll('button, a[role="button"], div[role="button"]'));

        // Filtrar botones que tienen texto visible
        const candidates = buttons.filter(btn => {
          const text = btn.textContent?.trim();
          // Ignorar botones vacíos, muy largos o que parecen ser de otras acciones (cerrar, menú, etc)
          return text && text.length > 2 && text.length < 30 && !['cerrar', 'filtro', 'buscar'].includes(text.toLowerCase());
        });

        console.log(`[DOM] Candidatos encontrados: ${candidates.length}`);

        const target = targetCategory.toLowerCase();

        // Estrategia 1: Coincidencia exacta (case-insensitive)
        let match = candidates.find(btn => btn.textContent.trim().toLowerCase() === target);

        // Estrategia 2: Contiene la palabra (ej: "Panes" contiene "Pan")
        if (!match) {
          match = candidates.find(btn => btn.textContent.trim().toLowerCase().includes(target));
        }

        // Estrategia 3: La categoría contiene el texto del botón (ej: "Pan" está en "Panes")
        if (!match) {
          match = candidates.find(btn => target.includes(btn.textContent.trim().toLowerCase()));
        }

        // Estrategia 4: Singular/Plural simple (quitar 's' o 'es')
        if (!match) {
          const singular = target.replace(/es$/, '').replace(/s$/, '');
          if (singular.length > 2) {
            match = candidates.find(btn => btn.textContent.trim().toLowerCase().includes(singular));
          }
        }

        if (match) {
          console.log(`[DOM] ✓ Encontrado botón: "${match.textContent}" para categoría "${targetCategory}"`);
          match.click();
          return { success: true, foundText: match.textContent };
        }

        // Si falla, devolver lista de opciones para debug
        const options = candidates.map(b => b.textContent.trim()).slice(0, 15);
        return { success: false, options };

      }, category);

      if (result.success) {
        await p.waitForTimeout(1000); // Esperar a que carguen los productos
        const productsData = await toolHandlers.getProductsData({ limit: 5 });

        console.error(`[filterByCategory] ✓ Filtro aplicado: ${result.foundText}`);

        return {
          success: true,
          category,
          filtered: true,
          matchedText: result.foundText,
          products: productsData.products
        };
      } else {
        console.error(`[filterByCategory] ✗ No se encontró. Opciones visibles: ${result.options.join(', ')}`);
        throw new Error(`No se encontró la categoría: ${category}. Disponibles: ${result.options.join(', ')}`);
      }

    } catch (e) {
      console.error(`[filterByCategory] Error: ${e.message}`);
      throw e;
    }
  },

  async filterByPrice({ minPrice, maxPrice }) {
    const p = await initBrowser();

    // Usar minPrice y maxPrice en lugar de min y max
    const min = minPrice !== undefined ? minPrice : 0;
    const max = maxPrice !== undefined ? maxPrice : 100;

    console.error(`[MCP Playwright] Filtrando precios: ${min} - ${max} `);

    // El slider de MUI es complejo, mejor usar evaluate para cambiar el state directamente
    try {
      await p.evaluate(([minVal, maxVal]) => {
        // Buscar el slider de MUI en el DOM
        const slider = document.querySelector('.MuiSlider-root');

        if (slider) {
          // Disparar evento de cambio manualmente simulando interacción del usuario
          // MUI Slider tiene dos thumbs (min y max)
          const thumbs = slider.querySelectorAll('.MuiSlider-thumb');

          if (thumbs.length === 2) {
            // Crear y disparar eventos de cambio
            const changeEvent = new Event('change', { bubbles: true });

            // Simular arrastre del slider
            // El componente FiltroPrecio escucha onChange
            // Buscar el componente React y actualizar directamente

            // Alternativa: Disparar evento personalizado que React escucha
            window.dispatchEvent(new CustomEvent('setPriceRange', {
              detail: { min: minVal, max: maxVal }
            }));
          }
        }

        // Otra alternativa: buscar inputs ocultos del slider
        const inputs = document.querySelectorAll('input[type="hidden"]');
        inputs.forEach(input => {
          if (input.getAttribute('aria-label')?.includes('Minimum price')) {
            input.value = minVal;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (input.getAttribute('aria-label')?.includes('Maximum price')) {
            input.value = maxVal;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        console.log(`[Price Filter] Valores establecidos: ${minVal} - ${maxVal} `);
      }, [min, max]);

      // Esperar a que se aplique el filtro
      await p.waitForTimeout(1000);

      console.error('[MCP Playwright] ✓ Filtro de precio aplicado');

      return {
        success: true,
        minPrice: min,
        maxPrice: max,
        filtered: true
      };
    } catch (error) {
      console.error('[MCP Playwright] Error filtrando por precio:', error);
      throw error;
    }
  },

  async sortBy({ field, order }) {
    const p = await initBrowser();

    // Buscar selector de ordenamiento
    const sortValue = `${field} -${order} `;

    try {
      await p.selectOption('select[name="sortBy"], select[name="ordenar"]', sortValue);
    } catch (e) {
      // Intentar con botones
      await p.click(`button[data - sort= "${sortValue}"]`);
    }

    await p.waitForTimeout(500);

    return {
      success: true,
      field,
      order,
      sorted: true
    };
  },

  // NUEVAS FUNCIONES PARA DATOS DE PRODUCTOS
  async getProductsData({ limit = 10 }) {
    const p = await initBrowser();

    console.error(`[getProductsData] Extrayendo datos de ${limit} productos...`);

    const productsData = await p.evaluate((lim) => {
      console.log('[DOM] Buscando productos en el DOM...');

      // Buscar divs con estructura de ProductCard (Tailwind CSS)
      // Estructura: div > div.grid.grid-cols-[100px_1fr_auto]
      const productCards = Array.from(document.querySelectorAll('div[class*="bg-white"][class*="rounded-lg"][class*="shadow"], div[class*="border-red-300"]')).slice(0, lim);

      console.log(`[DOM] Encontradas ${productCards.length} tarjetas de productos(estructura ProductCard)`);

      if (productCards.length === 0) {
        // Fallback: buscar cualquier div que contenga botón, imagen y título
        const allDivs = Array.from(document.querySelectorAll('div'));
        const fallbackCards = allDivs.filter(div =>
          div.querySelector('button') && div.querySelector('img') && div.querySelector('h3')
        ).slice(0, lim);
        console.log(`[DOM] Fallback: encontradas ${fallbackCards.length} tarjetas con botón + imagen + título`);

        if (fallbackCards.length === 0) {
          // Último fallback: buscar por botones que contengan texto "Añadir" o tengan clases relacionadas con carrito
          const buttons = Array.from(document.querySelectorAll('button')).filter(btn =>
            btn.textContent.includes('Añadir') || btn.textContent.includes('carrito') ||
            btn.className.includes('carrito') || btn.className.includes('cart')
          );
          console.log(`[DOM] Último fallback: encontrados ${buttons.length} botones de carrito`);

          return buttons.slice(0, lim).map((button, idx) => {
            const container = button.closest('div[class*="bg-white"], div[class*="border"], div[class*="shadow"]');
            if (!container) return null;

            const nameEl = container.querySelector('h3, h4, [class*="font-bold"]');
            const priceEl = container.querySelector('div[class*="text-red"], div[class*="font-bold"]:not(h3):not(h4)');
            const descEl = container.querySelector('p, div[class*="text-gray"]');
            const imgEl = container.querySelector('img');

            return {
              id: `fallback - product - ${idx} `,
              nombre: nameEl?.textContent?.trim() || 'Producto',
              descripcion: descEl?.textContent?.trim() || '',
              precio: priceEl ? parseFloat(priceEl.textContent.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
              imagen: imgEl?.src || null,
              categoria: null,
              disponible: true
            };
          }).filter(Boolean);
        }

        return fallbackCards.map((card, idx) => {
          const nameEl = card.querySelector('h3, h4, [class*="font-bold"]');
          const priceEl = card.querySelector('div[class*="text-red"], div[class*="font-bold"]:not(h3):not(h4)');
          const descEl = card.querySelector('p, div[class*="text-gray"]');
          const imgEl = card.querySelector('img');
          const buttonEl = card.querySelector('button');

          return {
            id: `fallback - product - ${idx} `,
            nombre: nameEl?.textContent?.trim() || 'Producto',
            descripcion: descEl?.textContent?.trim() || '',
            precio: priceEl ? parseFloat(priceEl.textContent.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
            imagen: imgEl?.src || null,
            categoria: null,
            disponible: !!buttonEl && !buttonEl.disabled
          };
        });
      }

      return productCards.map((card, idx) => {
        // Estructura ProductCard: div > div.grid > [imagen, info, precio+botón]
        const gridContainer = card.querySelector('div[class*="grid"][class*="grid-cols"]');

        // Extraer nombre (h3 dentro del div de info)
        const nameEl = card.querySelector('h3, h4, [class*="font-bold"]:not([class*="text-red"])');

        // Extraer precio (div con text-red y font-bold)
        const priceEl = card.querySelector('div[class*="text-red"][class*="font-bold"], div[class*="text-xl"][class*="font-bold"]');

        // Extraer descripción (párrafo con text-gray)
        const descEl = card.querySelector('p[class*="text-gray"], div[class*="text-gray"]');

        // Extraer imagen
        const imgEl = card.querySelector('img');

        // Verificar botón "Añadir al carrito"
        const allButtons = Array.from(card.querySelectorAll('button'));
        const buttonEl = allButtons.find(btn =>
          btn.textContent.includes('Añadir') || btn.textContent.includes('carrito') ||
          btn.className.includes('carrito') || btn.className.includes('cart')
        );

        const nombre = nameEl?.textContent?.trim() || 'Producto sin nombre';
        let precio = 0;

        // Extraer precio (formato S/X.XX)
        if (priceEl) {
          const precioTexto = priceEl.textContent || '';
          const precioMatch = precioTexto.match(/[\d.,]+/);
          if (precioMatch) {
            precio = parseFloat(precioMatch[0].replace(',', '.')) || 0;
          }
        }

        const producto = {
          id: `product - ${idx} `,
          nombre,
          descripcion: descEl?.textContent?.trim() || '',
          precio,
          imagen: imgEl?.src || null,
          categoria: null,
          disponible: !!buttonEl && !buttonEl.disabled
        };

        console.log(`[DOM] Producto ${idx + 1}: ${nombre} - S / ${precio} `);
        return producto;
      });
    }, limit);

    console.error(`[getProductsData] ✓ Obtenidos ${productsData.length} productos del DOM`);

    return {
      success: true,
      products: productsData,
      count: productsData.length,
      source: 'dom-extraction'
    };
  },

  async searchProducts({ searchTerm }) {
    const p = await initBrowser();

    console.error(`[searchProducts] Buscando: "${searchTerm}"`);

    // Usar la función search existente
    await toolHandlers.search({ query: searchTerm });

    // Esperar a que se apliquen los filtros
    await p.waitForTimeout(1000);

    // Obtener los productos filtrados
    const result = await toolHandlers.getProductsData({ limit: 10 });

    return {
      success: true,
      searchTerm,
      products: result.products,
      count: result.count
    };
  },

  async addProductToCart({ productName, productId, quantity = 1 }) {
    const p = await initBrowser();

    // Convertir a string para evitar errores con números
    const searchTerm = String(productName || productId || '');
    console.error(`[addProductToCart] Buscando producto: ${searchTerm}`);

    try {
      // Buscar y hacer click directamente en el DOM para evitar problemas de navegación
      const result = await p.evaluate((searchName) => {
        console.log(`[DOM] Buscando producto: "${searchName}"`);

        // Buscar todas las tarjetas de productos con estructura Tailwind
        const productCards = Array.from(document.querySelectorAll('div[class*="bg-white"][class*="rounded-lg"][class*="shadow"], div[class*="border-red-300"]'));
        console.log(`[DOM] Encontradas ${productCards.length} tarjetas de productos`);

        if (productCards.length === 0) {
          return { success: false, error: 'No se encontraron productos en la página' };
        }

        // Buscar el producto específico
        let targetCard = null;
        let targetProductName = '';

        // Convertir searchName a string y a minúsculas para búsqueda
        const searchLower = String(searchName || '').toLowerCase();
        const searchLowerSpaces = searchLower.replace(/-/g, ' '); // Manejar guiones (ej: "mixto-completo" -> "mixto completo")

        for (const card of productCards) {
          const nameEl = card.querySelector('h3, h4, [class*="font-bold"]:not([class*="text-red"])');
          const productName = nameEl?.textContent?.trim() || '';
          const cardId = card.dataset.productId || card.dataset.id || '';

          // Búsqueda flexible: coincidencia parcial de nombre O ID exacto
          if (
            (searchLower && productName.toLowerCase().includes(searchLower)) ||
            (searchLowerSpaces && productName.toLowerCase().includes(searchLowerSpaces)) ||
            (cardId && cardId === searchName)
          ) {
            targetCard = card;
            targetProductName = productName;
            break;
          }
        }

        if (!targetCard) {
          return { success: false, error: `No se encontró el producto: ${searchName}` };
        }

        console.log(`[DOM] Producto encontrado: ${targetProductName} `);

        // Buscar el botón de agregar dentro de esta tarjeta específica
        const allButtons = Array.from(targetCard.querySelectorAll('button'));
        const addButton = allButtons.find(btn =>
          btn.textContent.includes('Añadir') || btn.textContent.includes('Agregar') ||
          btn.className.includes('carrito') || btn.className.includes('cart') ||
          btn.className.includes('MuiButton')
        );

        if (!addButton) {
          return { success: false, error: `No se encontró el botón para agregar: ${targetProductName} ` };
        }

        // Hacer click directamente
        addButton.click();
        console.log(`[DOM] ✓ Click realizado en botón de: ${targetProductName} `);

        return {
          success: true,
          productName: targetProductName,
          clicked: true
        };

      }, searchTerm);

      if (!result.success) {
        throw new Error(result.error);
      }

      console.error(`[addProductToCart] ✓ Producto agregado: ${result.productName} `);

      // Esperar menos tiempo para evitar navegación automática
      await p.waitForTimeout(200);

      return {
        success: true,
        productName: result.productName,
        quantity,
        added: true,
        stayOnPage: true // Indicar que debe quedarse en la página
      };

    } catch (error) {
      console.error('[addProductToCart] ✗ Error:', error.message);
      throw error;
    }
  },

  // CARRITO
  async addToCart({ productId, productName, quantity = 1 }) {
    console.error(`[addToCart] Redirigiendo a addProductToCart. ID: ${productId}, Name: ${productName}`);
    return this.addProductToCart({ productId, productName, quantity });
  },

  async updateCartQuantity({ itemId, quantity, productName }) {
    const p = await initBrowser();

    console.error(`[updateCartQuantity] Iniciando actualización: itemId = ${itemId}, quantity = ${quantity}, productName = ${productName} `);

    try {
      // Debug: Verificar qué elementos data-item-id existen
      const debugInfo = await p.evaluate(() => {
        const dataItemElements = Array.from(document.querySelectorAll('[data-item-id]'));
        console.log('[DOM] Elementos con data-item-id encontrados:', dataItemElements.length);

        return {
          dataItemIds: dataItemElements.map(el => ({
            id: el.getAttribute('data-item-id'),
            tag: el.tagName,
            hasButtons: el.querySelectorAll('button').length,
            hasAddIcon: !!el.querySelector('svg[data-testid="AddIcon"]'),
            hasRemoveIcon: !!el.querySelector('svg[data-testid="RemoveIcon"]'),
            text: el.textContent?.substring(0, 50)
          }))
        };
      });

      console.error(`[updateCartQuantity] Debug DOM: `, debugInfo);

      // NUEVA ESTRATEGIA: Buscar por nombre de producto si itemId no funciona
      let realItemId = null;

      // Primero intentar con el itemId proporcionado
      const targetExists = await p.evaluate((id) => {
        const target = document.querySelector(`[data-item-id="${id}"]`);
        if (!target) return { exists: false };

        return {
          exists: true,
          hasButtons: target.querySelectorAll('button').length,
          hasAddIcon: !!target.querySelector('svg[data-testid="AddIcon"]'),
          hasRemoveIcon: !!target.querySelector('svg[data-testid="RemoveIcon"]'),
          quantityElement: !!target.querySelector('.MuiTypography-root')
        };
      }, itemId);

      console.error(`[updateCartQuantity] Target ${itemId} analysis: `, targetExists);

      if (targetExists.exists) {
        realItemId = itemId;
        console.error(`[updateCartQuantity] ✓ Usando itemId original: ${itemId} `);
      } else {
        // Si no existe, buscar por nombre de producto
        console.error(`[updateCartQuantity] itemId ${itemId} no existe, buscando por nombre...`);

        // Obtener el nombre del producto desde los datos de getCartState o usar productName
        realItemId = await p.evaluate(({ debugInfo, targetProductName }) => {
          console.log('[DOM] Buscando producto por nombre:', targetProductName);

          if (!targetProductName) {
            console.log('[DOM] ✗ No se proporcionó nombre de producto');
            return null;
          }

          const searchTerms = targetProductName.toLowerCase().split(/\s+/);
          console.log('[DOM] Términos de búsqueda:', searchTerms);

          // Buscar por contenido de texto
          for (const item of debugInfo.dataItemIds) {
            const text = item.text.toLowerCase();
            console.log(`[DOM] Comparando "${text.substring(0, 50)}..."`);

            // Buscar si TODOS los términos están presentes en el texto
            const allTermsMatch = searchTerms.every(term => text.includes(term));

            if (allTermsMatch) {
              console.log(`[DOM] ✓ Coincidencia encontrada: ${item.id} para "${text.substring(0, 50)}"`);
              return item.id;
            }

            // Alternativa: buscar coincidencia parcial (al menos 60% de los términos)
            const matchingTerms = searchTerms.filter(term => text.includes(term)).length;
            const matchPercentage = matchingTerms / searchTerms.length;

            if (matchPercentage >= 0.6 && matchingTerms >= 1) {
              console.log(`[DOM] ✓ Coincidencia parcial(${Math.round(matchPercentage * 100)} %): ${item.id} para "${text.substring(0, 50)}"`);
              return item.id;
            }
          }

          console.log('[DOM] ✗ No se encontró coincidencia por nombre');
          return null;
        }, { debugInfo, targetProductName: productName });

        if (realItemId) {
          console.error(`[updateCartQuantity] ✓ Encontrado por nombre: ${realItemId} `);
        } else {
          throw new Error(`No se pudo encontrar el producto ni por ID "${itemId}" ni por nombre "${productName}"`);
        }
      }

      // Opción 1: Intentar con input directo (menos común en esta app)
      const input = await p.$(`[data-item-id="${realItemId}"] input[type="number"]`);

      if (input) {
        await input.fill(quantity.toString());
        await p.waitForTimeout(500);
        console.error(`[MCP Playwright] ✓ Cantidad actualizada via input: ${quantity} `);

        return {
          success: true,
          itemId: realItemId,
          newQuantity: quantity,
          method: 'input'
        };
      }

      // Opción 2: Usar botones + y - (patrón de esta app)
      // Obtener cantidad actual
      const currentQuantity = await p.evaluate((id) => {
        const container = document.querySelector(`[data-item-id="${id}"]`);
        if (!container) {
          console.log(`[DOM] ✗ No se encontró contenedor con data-item-id="${id}"`);
          return 1;
        }

        // Buscar TODOS los Typography dentro del contenedor principal
        const typographies = Array.from(container.querySelectorAll('.MuiTypography-root'));
        console.log(`[DOM] Encontrados ${typographies.length} Typography elements en el contenedor`);

        // El que tiene la cantidad es el que contiene SOLO un número (sin S/, sin decimales)
        // Este Typography está entre los botones - y +
        for (const typo of typographies) {
          const text = typo.textContent.trim();

          // Verificar que sea SOLO dígitos (la cantidad), sin símbolos ni decimales
          if (/^\d+$/.test(text)) {
            const qty = parseInt(text);
            // Verificar que esté en un rango razonable para cantidades (no es un precio grande)
            if (qty > 0 && qty < 1000) {
              console.log(`[DOM] ✓ Cantidad encontrada: ${qty} (texto: "${text}")`);
              return qty;
            }
          }
        }

        console.log('[DOM] ✗ No se encontró Typography con cantidad válida, retornando 1 por defecto');
        return 1;
      }, realItemId);

      console.error(`[MCP Playwright] Cantidad actual: ${currentQuantity}, objetivo: ${quantity} `);

      const difference = quantity - currentQuantity;

      if (difference > 0) {
        // Aumentar: hacer clic en botón "+"
        // El botón + tiene el ícono <Add /> y es el último botón del QuantitySelector
        const plusSelectors = [
          `[data-item-id="${realItemId}"] button.MuiIconButton-root:has(svg[data-testid="AddIcon"])`,
          `[data-item-id="${realItemId}"] .MuiIconButton-root:last-of-type`,
          `[data-item-id="${realItemId}"] button:has([data-testid="AddIcon"])`
        ];

        let clicked = false;
        for (const selector of plusSelectors) {
          try {
            console.error(`[updateCartQuantity] Probando selector +: ${selector} `);
            for (let i = 0; i < difference; i++) {
              await p.click(selector, { timeout: 2000 });
              await p.waitForTimeout(300);
            }
            console.error(`[MCP Playwright] ✓ Cantidad aumentada ${difference} veces con ${selector} `);
            clicked = true;
            break;
          } catch (e) {
            console.error(`[updateCartQuantity] Selector ${selector} falló: ${e.message} `);
            continue;
          }
        }

        if (!clicked) {
          throw new Error(`No se pudo hacer click en botón + del item ${realItemId} `);
        }

      } else if (difference < 0) {
        // Disminuir: hacer clic en botón "-"
        // El botón - tiene el ícono <Remove /> y es el primer botón del QuantitySelector
        const minusSelectors = [
          `[data-item-id="${realItemId}"] button.MuiIconButton-root:has(svg[data-testid="RemoveIcon"])`,
          `[data-item-id="${realItemId}"] .MuiIconButton-root:first-of-type`,
          `[data-item-id="${realItemId}"] button:has([data-testid="RemoveIcon"])`
        ];

        let clicked = false;
        for (const selector of minusSelectors) {
          try {
            console.error(`[updateCartQuantity] Probando selector -: ${selector} `);
            for (let i = 0; i < Math.abs(difference); i++) {
              await p.click(selector, { timeout: 2000 });
              await p.waitForTimeout(300);
            }
            console.error(`[MCP Playwright] ✓ Cantidad disminuida ${Math.abs(difference)} veces con ${selector} `);
            clicked = true;
            break;
          } catch (e) {
            console.error(`[updateCartQuantity] Selector ${selector} falló: ${e.message} `);
            continue;
          }
        }

        if (!clicked) {
          throw new Error(`No se pudo hacer click en botón - del item ${realItemId} `);
        }

      } else {
        console.error(`[MCP Playwright] ℹ Cantidad ya es ${quantity} `);
      }

      return {
        success: true,
        itemId: realItemId,
        newQuantity: quantity,
        method: 'buttons',
        clicks: Math.abs(difference)
      };

    } catch (error) {
      console.error('[MCP Playwright] Error actualizando cantidad:', error);
      throw error;
    }
  },

  async removeFromCart({ itemId, productName }) {
    const p = await initBrowser();

    console.error(`[removeFromCart] Iniciando eliminación: itemId = ${itemId}, productName = ${productName} `);

    try {
      // Debug: Verificar qué elementos data-item-id existen
      const debugInfo = await p.evaluate(() => {
        const dataItemElements = Array.from(document.querySelectorAll('[data-item-id]'));
        return {
          dataItemIds: dataItemElements.map(el => ({
            id: el.getAttribute('data-item-id'),
            text: el.textContent?.substring(0, 50),
            hasCloseIcon: !!el.querySelector('svg[data-testid="CloseIcon"]')
          }))
        };
      });

      console.error(`[removeFromCart] Debug DOM: `, debugInfo);

      // Buscar ID real como en updateCartQuantity
      let realItemId = null;

      // Primero intentar con el itemId proporcionado
      const targetExists = await p.evaluate((id) => {
        const target = document.querySelector(`[data-item-id="${id}"]`);
        return { exists: !!target };
      }, itemId);

      if (targetExists.exists) {
        realItemId = itemId;
        console.error(`[removeFromCart] ✓ Usando itemId original: ${itemId} `);
      } else {
        // Buscar por nombre de producto usando la misma lógica flexible de updateCartQuantity
        console.error(`[removeFromCart] itemId ${itemId} no existe, buscando por nombre...`);

        realItemId = await p.evaluate(({ debugInfo, targetProductName }) => {
          console.log('[DOM] Buscando producto por nombre para eliminar:', targetProductName);

          if (!targetProductName) {
            console.log('[DOM] ✗ No se proporcionó nombre de producto');
            return null;
          }

          const searchTerms = targetProductName.toLowerCase().split(/\s+/);
          console.log('[DOM] Términos de búsqueda:', searchTerms);

          // Buscar por contenido de texto
          for (const item of debugInfo.dataItemIds) {
            const text = item.text.toLowerCase();
            console.log(`[DOM] Comparando "${text.substring(0, 50)}..."`);

            // Buscar si TODOS los términos están presentes en el texto
            const allTermsMatch = searchTerms.every(term => text.includes(term));

            if (allTermsMatch) {
              console.log(`[DOM] ✓ Coincidencia encontrada: ${item.id} para "${text.substring(0, 50)}"`);
              return item.id;
            }

            // Alternativa: buscar coincidencia parcial (al menos 60% de los términos)
            const matchingTerms = searchTerms.filter(term => text.includes(term)).length;
            const matchPercentage = matchingTerms / searchTerms.length;

            if (matchPercentage >= 0.6 && matchingTerms >= 1) {
              console.log(`[DOM] ✓ Coincidencia parcial(${Math.round(matchPercentage * 100)} %): ${item.id} para "${text.substring(0, 50)}"`);
              return item.id;
            }
          }

          console.log('[DOM] ✗ No se encontró coincidencia por nombre para eliminar');
          return null;
        }, { debugInfo, targetProductName: productName });

        if (realItemId) {
          console.error(`[removeFromCart] ✓ Encontrado por nombre: ${realItemId} `);
        } else {
          throw new Error(`No se pudo encontrar el producto ni por ID "${itemId}" ni por nombre "${productName}"`);
        }
      }

      // Buscar botón de eliminar (CloseIcon)
      const removeSelectors = [
        `[data-item-id="${realItemId}"] svg[data-testid="CloseIcon"]`, // Directo al icono
        `[data-item-id="${realItemId}"] button:has(svg[data-testid="CloseIcon"])`, // Botón que contiene el icono
        `[data-item-id="${realItemId}"] [data-testid="CloseIcon"]`,
        `[data-item-id="${realItemId}"] button[aria-label="delete"]`,
        `[data-item-id="${realItemId}"] button[aria-label="remove"]`
      ];

      let clicked = false;
      for (const selector of removeSelectors) {
        try {
          console.error(`[removeFromCart] Probando selector: ${selector} `);
          await p.click(selector, { timeout: 2000 });
          await p.waitForTimeout(500);
          console.error(`[removeFromCart] ✓ Item eliminado con selector: ${selector} `);
          clicked = true;
          break;
        } catch (e) {
          console.error(`[removeFromCart] Selector ${selector} falló: ${e.message} `);
          continue;
        }
      }

      if (!clicked) {
        throw new Error(`No se pudo hacer click en botón eliminar del item ${realItemId} `);
      }

      return {
        success: true,
        itemId: realItemId,
        removed: true
      };

    } catch (error) {
      console.error('[removeFromCart] Error eliminando producto:', error);
      throw error;
    }
  },

  async selectPaymentMethod({ method }) {
    const p = await initBrowser();

    console.error(`[selectPaymentMethod] Seleccionando método: ${method} `);

    try {
      // Mapear método a valor del radio button
      const methodValue = method.toLowerCase() === 'yape' ? 'yape' : 'plin';

      // Selectores para los radio buttons
      const selectors = [
        `input[value = "${methodValue}"]`, // Directo al input radio
        `label: has(input[value = "${methodValue}"])`, // Label que contiene el input
        `[role = "radio"][value = "${methodValue}"]` // Aria role
      ];

      let clicked = false;
      for (const selector of selectors) {
        try {
          console.error(`[selectPaymentMethod] Probando selector: ${selector} `);
          await p.click(selector, { timeout: 2000 });
          await p.waitForTimeout(300);
          console.error(`[selectPaymentMethod] ✓ Método seleccionado: ${methodValue} `);
          clicked = true;
          break;
        } catch (e) {
          console.error(`[selectPaymentMethod] Selector ${selector} falló: ${e.message} `);
          continue;
        }
      }

      if (!clicked) {
        throw new Error(`No se pudo seleccionar el método de pago: ${method} `);
      }

      return {
        success: true,
        method: methodValue,
        selected: true
      };

    } catch (error) {
      console.error('[selectPaymentMethod] Error seleccionando método:', error);
      throw error;
    }
  },

  async fillPhoneNumber({ phoneNumber }) {
    const p = await initBrowser();

    // Convertir a string si es número
    const phoneStr = String(phoneNumber);
    console.error(`[fillPhoneNumber] Llenando teléfono: ${phoneStr} `);

    try {
      // Selectores específicos para el campo de teléfono
      const selectors = [
        'input[placeholder="987654321"]', // Por placeholder
        'input[label*="Teléfono"]', // Por label que contenga "Teléfono"
        'input[name="phoneNumber"]', // Por name si existe
        'input[type="tel"]', // Por type tel
        'label:has-text("Número de Teléfono") + div input', // Por label text
        '.MuiTextField-root:has(label:has-text("Teléfono")) input' // MUI con label
      ];

      let filled = false;
      for (const selector of selectors) {
        try {
          console.error(`[fillPhoneNumber] Probando selector: ${selector} `);

          // Limpiar campo primero
          await p.fill(selector, '', { timeout: 2000 });
          await p.waitForTimeout(100);

          // Llenar con número
          await p.fill(selector, phoneStr);
          await p.waitForTimeout(300);

          console.error(`[fillPhoneNumber] ✓ Teléfono llenado con selector: ${selector} `);
          filled = true;
          break;
        } catch (e) {
          console.error(`[fillPhoneNumber] Selector ${selector} falló: ${e.message} `);
          continue;
        }
      }

      if (!filled) {
        throw new Error(`No se pudo llenar el campo de teléfono`);
      }

      return {
        success: true,
        phoneNumber,
        filled: true
      };

    } catch (error) {
      console.error('[fillPhoneNumber] Error llenando teléfono:', error);
      throw error;
    }
  },

  async fillVerificationCode({ verificationCode }) {
    const p = await initBrowser();

    // Convertir a string si es número
    const codeStr = String(verificationCode);
    console.error(`[fillVerificationCode] Llenando código: ${codeStr} `);

    try {
      // Selectores específicos para el campo de código de verificación
      const selectors = [
        'input[placeholder="123456"]', // Por placeholder
        'input[label*="Código"]', // Por label que contenga "Código"
        'input[label*="Verificación"]', // Por label que contenga "Verificación"
        'input[name="verificationCode"]', // Por name si existe
        'label:has-text("Código de Verificación") + div input', // Por label text
        '.MuiTextField-root:has(label:has-text("Código")) input' // MUI con label
      ];

      let filled = false;
      for (const selector of selectors) {
        try {
          console.error(`[fillVerificationCode] Probando selector: ${selector} `);

          // Limpiar campo primero
          await p.fill(selector, '', { timeout: 2000 });
          await p.waitForTimeout(100);

          // Llenar con código
          await p.fill(selector, codeStr);
          await p.waitForTimeout(300);

          console.error(`[fillVerificationCode] ✓ Código llenado con selector: ${selector} `);
          filled = true;
          break;
        } catch (e) {
          console.error(`[fillVerificationCode] Selector ${selector} falló: ${e.message} `);
          continue;
        }
      }

      if (!filled) {
        throw new Error(`No se pudo llenar el campo de código de verificación`);
      }

      return {
        success: true,
        verificationCode,
        filled: true
      };

    } catch (error) {
      console.error('[fillVerificationCode] Error llenando código:', error);
      throw error;
    }
  },

  async confirmPayment() {
    const p = await initBrowser();

    console.error(`[confirmPayment] Confirmando pago...`);

    try {
      // Selectores para el botón de confirmar pago
      const selectors = [
        'button:has-text("Confirmar Pago")', // Por texto
        'button[type="submit"]', // Por type submit
        'button:has-text("Procesar")', // Variación del texto
        '.MuiButton-root:has-text("Confirmar")', // MUI button
        '[role="button"]:has-text("Confirmar Pago")' // Por role
      ];

      let clicked = false;
      for (const selector of selectors) {
        try {
          console.error(`[confirmPayment] Probando selector: ${selector} `);
          await p.click(selector, { timeout: 2000 });
          await p.waitForTimeout(500);
          console.error(`[confirmPayment] ✓ Pago confirmado con selector: ${selector} `);
          clicked = true;
          break;
        } catch (e) {
          console.error(`[confirmPayment] Selector ${selector} falló: ${e.message} `);
          continue;
        }
      }

      if (!clicked) {
        throw new Error(`No se pudo hacer click en botón confirmar pago`);
      }

      return {
        success: true,
        confirmed: true
      };

    } catch (error) {
      console.error('[confirmPayment] Error confirmando pago:', error);
      throw error;
    }
  },

  async getCartState() {
    const p = await initBrowser();

    console.error('[getCartState] Extrayendo información del carrito...');

    const cartData = await p.evaluate(() => {
      console.log('[DOM] Accediendo al Redux store del carrito...');

      let cartItems = [];
      let cartTotal = 0;
      let purchaseId = 'C-001';
      let shipping = 'Recojo en tienda';

      try {
        // Intentar acceder al Redux store desde window.__REDUX_STORE__ o similar
        let reduxState = null;

        // Buscar el store de Redux de diferentes maneras
        console.log('[DOM] Buscando Redux store...');
        console.log('[DOM] window.__REDUX_STORE__:', !!window.__REDUX_STORE__);
        console.log('[DOM] window.store:', !!window.store);
        console.log('[DOM] window.__store:', !!window.__store);

        if (window.__REDUX_STORE__) {
          console.log('[DOM] Usando window.__REDUX_STORE__');
          reduxState = window.__REDUX_STORE__.getState();
          console.log('[DOM] Redux state obtenido:', !!reduxState);
          console.log('[DOM] Cart state exists:', !!(reduxState?.cart));
        } else if (window.store) {
          console.log('[DOM] Usando window.store');
          reduxState = window.store.getState();
        } else if (window.__store) {
          console.log('[DOM] Usando window.__store');
          reduxState = window.__store.getState();
        } else {
          // Buscar en el DOM el script que contiene el estado inicial
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            if (script.textContent && script.textContent.includes('preloadedState')) {
              try {
                const match = script.textContent.match(/preloadedState["\s]*:["\s]*({.*?})/);
                if (match) {
                  reduxState = JSON.parse(match[1]);
                }
              } catch (e) {
                console.log('[DOM] Error parseando estado inicial:', e.message);
              }
            }
          }
        }

        if (reduxState && reduxState.cart) {
          console.log('[DOM] ✓ Estado Redux del carrito encontrado');
          const cart = reduxState.cart;

          console.log(`[DOM] Redux cart state: `, {
            hasItems: !!(cart.items),
            itemsType: typeof cart.items,
            itemsLength: cart.items?.length,
            totalAmount: cart.totalAmount,
            orderId: cart.orderId
          });

          if (cart.items && Array.isArray(cart.items) && cart.items.length > 0) {
            cartItems = cart.items.map((item, index) => {
              console.log(`[DOM] Procesando item ${index}: `, {
                id_detalle: item.id_detalle,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.cantidad,
                subtotal: item.subtotal
              });

              return {
                id_detalle: item.id_detalle || `item - ${index} `,
                name: item.nombre || 'Producto sin nombre',
                price: parseFloat(item.precio) || 0,
                quantity: parseInt(item.cantidad) || 1,
                image: item.url_imagen || null,
                total: parseFloat(item.subtotal) || (parseFloat(item.precio) * parseInt(item.cantidad))
              };
            });

            console.log(`[DOM] ✓ Items mapeados COMPLETO(${cartItems.length} items): `,
              JSON.stringify(cartItems.map((item, idx) => ({
                index: idx,
                id: item.id_detalle,
                name: item.name
              })), null, 2)
            );
          } else {
            console.log('[DOM] ⚠️ No hay items en el carrito o items no es array válido');
          }

          cartTotal = parseFloat(cart.totalAmount) || 0;
          purchaseId = cart.orderId || 'C-001';

          console.log(`[DOM] ✓ Totales: ${cartItems.length} productos, total: S / ${cartTotal} `);
        } else {
          console.log('[DOM] ⚠️ No se pudo acceder al Redux store, intentando DOM...');

          // Fallback: intentar extraer del DOM como respaldo
          const productRows = Array.from(document.querySelectorAll('[style*="grid-template-columns"]')).filter(row =>
            row.style.gridTemplateColumns && row.style.gridTemplateColumns.includes('minmax')
          );

          console.log(`[DOM] Encontradas ${productRows.length} filas de productos en DOM`);

          for (const row of productRows) {
            try {
              // Buscar nombre del producto
              const nameEl = row.querySelector('img + *') || row.querySelector('[alt] ~ *');
              const name = nameEl?.textContent?.trim();

              if (!name || name.length < 3) continue;

              // Buscar precios (S/)
              const priceElements = Array.from(row.querySelectorAll('*')).filter(el =>
                el.textContent && el.textContent.includes('S/') && !el.querySelector('*')
              );

              let price = 0;
              let quantity = 1;
              let totalParcial = 0;

              if (priceElements.length >= 2) {
                const priceMatch = priceElements[0].textContent.match(/S\/(\d+\.?\d*)/);
                const totalMatch = priceElements[1].textContent.match(/S\/(\d+\.?\d*)/);

                if (priceMatch) price = parseFloat(priceMatch[1]);
                if (totalMatch) totalParcial = parseFloat(totalMatch[1]);
              }

              // Buscar cantidad
              const quantityText = row.textContent.match(/\b(\d+)\b/g);
              if (quantityText) {
                for (const num of quantityText) {
                  const numVal = parseInt(num);
                  if (numVal > 0 && numVal < 100 && numVal !== price && numVal !== totalParcial) {
                    quantity = numVal;
                    break;
                  }
                }
              }

              const imgEl = row.querySelector('img');
              const image = imgEl?.src || null;

              if (name && price > 0) {
                cartItems.push({
                  name,
                  price,
                  quantity,
                  image,
                  total: totalParcial || (price * quantity)
                });
              }
            } catch (error) {
              console.log(`[DOM] Error procesando fila: ${error.message} `);
            }
          }
        }
      } catch (error) {
        console.log(`[DOM] Error accediendo a datos del carrito: ${error.message} `);
      }

      // Buscar información del resumen de compra (actualizar variables existentes)
      // purchaseId, shipping y cartTotal ya fueron declaradas arriba

      // Buscar ID-Compra
      const idElement = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent && el.textContent.includes('ID-Compra')
      );
      if (idElement && idElement.nextSibling) {
        purchaseId = idElement.nextSibling.textContent?.trim() || 'C-001';
      }

      // Buscar tipo de envío
      const shippingElement = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent && el.textContent.includes('Envío')
      );
      if (shippingElement && shippingElement.nextSibling) {
        shipping = shippingElement.nextSibling.textContent?.trim() || 'Recojo en tienda';
      }

      // Buscar total (en color rojo y con mayor peso)
      const totalElements = Array.from(document.querySelectorAll('*')).filter(el =>
        el.textContent && el.textContent.includes('S/') &&
        (el.style.color === 'rgb(240, 0, 0)' || el.style.fontWeight === '700')
      );

      if (totalElements.length > 0) {
        const totalText = totalElements[0].textContent;
        const totalMatch = totalText.match(/S\/(\d+\.?\d*)/);
        if (totalMatch) {
          cartTotal = parseFloat(totalMatch[1]);
        }
      }

      // Si no encontramos el total, calcularlo desde los items
      if (cartTotal === 0) {
        cartTotal = cartItems.reduce((sum, item) => sum + item.total, 0);
      }

      // Buscar botones de navegación
      const continueButtons = [];

      // Buscar botón "Continuar"
      const continueBtn = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent?.trim() === 'Continuar' &&
        (el.getAttribute('role') === 'button' || el.style.cursor === 'pointer')
      );
      if (continueBtn) {
        continueButtons.push({
          text: 'Continuar',
          tag: continueBtn.tagName,
          className: continueBtn.className,
          action: 'continue'
        });
      }

      // Buscar botón "Proceder al Pago"
      const paymentBtn = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent?.includes('Proceder al Pago')
      );
      if (paymentBtn) {
        continueButtons.push({
          text: 'Proceder al Pago',
          tag: paymentBtn.tagName,
          className: paymentBtn.className,
          action: 'payment'
        });
      }

      console.log(`[DOM] Encontrados ${cartItems.length} productos en el carrito`);
      console.log(`[DOM] Total del carrito: S / ${cartTotal} `);
      console.log(`[DOM] Encontrados ${continueButtons.length} botones para continuar`);

      return {
        items: cartItems,
        itemCount: cartItems.length,
        total: cartTotal,
        purchaseInfo: {
          id: purchaseId,
          shipping: shipping,
          total: cartTotal
        },
        continueButtons: continueButtons,
        url: window.location.pathname,
        isEmpty: cartItems.length === 0
      };
    });

    console.error(`[getCartState] ✓ Encontrados ${cartData.items.length} productos en el carrito`);
    console.error(`[getCartState] ✓ Total: S / ${cartData.total} `);

    return {
      success: true,
      items: cartData.items,
      itemCount: cartData.itemCount,
      total: cartData.total,
      purchaseInfo: cartData.purchaseInfo,
      continueButtons: cartData.continueButtons,
      url: cartData.url,
      isEmpty: cartData.isEmpty
    };
  },

  async checkout() {
    const p = await initBrowser();

    // Ir a la página del carrito primero
    console.error('[checkout] Navegando al carrito...');
    await p.goto(`${APP_URL}/cart`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500); // Esperar a que cargue React

    // Verificar si el carrito está vacío
    try {
      const emptyMsg = await p.$('text="Tu carrito está vacío"');
      if (emptyMsg && await emptyMsg.isVisible()) {
        throw new Error('El carrito está vacío, agrega productos antes de pagar.');
      }
    } catch (e) { }

    // Hacer clic en "Proceder al pago"
    const checkoutSelectors = [
      'button:has-text("Proceder al pago")',
      'button:has-text("Proceder al Pago")',
      'button:has-text("Continuar compra")',
      'button:has-text("Pagar")',
      'a[href="/payment"]',
      'a[href="/checkout"]',
      '.checkout-button',
      'button.MuiButton-containedPrimary' // Botón principal suele ser el de pago
    ];

    console.error(`[checkout] Buscando botón de pago...`);

    for (const selector of checkoutSelectors) {
      try {
        const btn = await p.$(selector);
        if (btn && await btn.isVisible() && await btn.isEnabled()) {
          await btn.click();
          console.error(`[checkout] ✓ Click en: ${selector}`);
          await p.waitForTimeout(1000);
          return {
            success: true,
            currentUrl: p.url(),
            navigatedToCheckout: true
          };
        }
      } catch (e) { continue; }
    }

    // Si falla, intentar buscar cualquier botón "Continuar"
    try {
      const continueBtn = await p.$('button:has-text("Continuar")');
      if (continueBtn) {
        await continueBtn.click();
        return { success: true, method: 'generic-continue' };
      }
    } catch (e) { }

    console.error('[checkout] ✗ No se encontró el botón de checkout');
    throw new Error('No se encontró el botón de checkout. Asegúrate de tener productos en el carrito.');
  },

  async debugCartDOM() {
    const p = await initBrowser();

    console.error('[debugCartDOM] 🔍 Analizando estructura DOM del carrito...');

    const debugInfo = await p.evaluate(() => {
      console.log('[DOM Debug] Iniciando análisis completo...');

      const analysis = {
        url: window.location.href,
        title: document.title,
        bodyClasses: document.body.className,
        reduxStore: null,
        cartState: null,
        gridElements: [],
        allTexts: [],
        imageSources: [],
        priceElements: [],
        productElements: []
      };

      // Analizar Redux store
      console.log('[DOM Debug] Analizando Redux store...');
      if (window.__REDUX_STORE__) {
        try {
          const state = window.__REDUX_STORE__.getState();
          analysis.reduxStore = {
            available: true,
            cartExists: !!(state?.cart),
            cartItemsCount: state?.cart?.items?.length || 0,
            cartTotal: state?.cart?.totalAmount || 0,
            cartItems: state?.cart?.items?.map(item => ({
              id: item.id_detalle,
              name: item.nombre,
              price: item.precio,
              quantity: item.cantidad,
              subtotal: item.subtotal
            })) || []
          };
          analysis.cartState = state?.cart || null;
        } catch (error) {
          analysis.reduxStore = { available: false, error: error.message };
        }
      } else {
        analysis.reduxStore = { available: false, reason: 'window.__REDUX_STORE__ not found' };
      }

      // Buscar todos los elementos con grid-template-columns
      const gridElements = Array.from(document.querySelectorAll('*')).filter(el =>
        el.style.gridTemplateColumns || el.className.includes('grid')
      );

      analysis.gridElements = gridElements.map(el => ({
        tag: el.tagName,
        className: el.className,
        style: el.style.cssText,
        textContent: el.textContent?.substring(0, 100),
        children: el.children.length
      }));

      // Buscar todos los textos que contengan S/
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent && el.textContent.includes('S/')) {
          analysis.priceElements.push({
            tag: el.tagName,
            className: el.className,
            textContent: el.textContent.trim(),
            parentTag: el.parentElement?.tagName,
            parentClass: el.parentElement?.className
          });
        }
      }

      // Buscar imágenes
      const images = document.querySelectorAll('img');
      analysis.imageSources = Array.from(images).map(img => ({
        src: img.src,
        alt: img.alt,
        parentTag: img.parentElement?.tagName,
        parentClass: img.parentElement?.className
      }));

      // Buscar elementos que podrían ser productos
      const potentialProducts = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('torta') || text.includes('baguette') ||
          text.includes('empanada') || text.includes('pan') ||
          text.includes('cantidad') || text.includes('precio');
      });

      analysis.productElements = potentialProducts.slice(0, 10).map(el => ({
        tag: el.tagName,
        className: el.className,
        textContent: el.textContent?.substring(0, 150),
        innerHTML: el.innerHTML?.substring(0, 200),
        parentTag: el.parentElement?.tagName,
        parentClass: el.parentElement?.className
      }));

      console.log(`[DOM Debug] Encontrados ${analysis.gridElements.length} elementos grid`);
      console.log(`[DOM Debug] Encontrados ${analysis.priceElements.length} elementos con S/`);
      console.log(`[DOM Debug] Encontradas ${analysis.imageSources.length} imágenes`);
      console.log(`[DOM Debug] Encontrados ${analysis.productElements.length} posibles productos`);

      return analysis;
    });

    console.error(`[debugCartDOM] ✅ Análisis completado:`);
    console.error(`- Grid elements: ${debugInfo.gridElements.length}`);
    console.error(`- Price elements: ${debugInfo.priceElements.length}`);
    console.error(`- Images: ${debugInfo.imageSources.length}`);
    console.error(`- Product elements: ${debugInfo.productElements.length}`);

    return {
      success: true,
      analysis: debugInfo
    };
  },

  async proceedToPayment() {
    const p = await initBrowser();

    console.error('[proceedToPayment] Buscando botón para continuar al pago...');

    try {
      // Lista de selectores prioritarios para el botón continuar
      const continueSelectors = [
        '[data-testid="cart-continue-button"]',
        'button:has-text("Continuar")',
        '[role="button"]:has-text("Continuar")',
        'button:has-text("Proceder al Pago")',
        '[role="button"]:has-text("Proceder al Pago")'
      ];

      let result = null;

      // Intentar cada selector hasta encontrar uno que funcione
      for (const selector of continueSelectors) {
        try {
          console.error(`[proceedToPayment] Probando selector: ${selector}`);

          await p.click(selector, { timeout: 2000 });

          result = {
            success: true,
            buttonText: selector.includes('Continuar') ? 'Continuar' : 'Proceder al Pago',
            selector: selector,
            clicked: true
          };

          console.error(`[proceedToPayment] ✓ Click exitoso con: ${selector}`);
          break;

        } catch (e) {
          console.error(`[proceedToPayment] ✗ Selector ${selector} falló: ${e.message}`);
          continue;
        }
      }

      // Si ningún selector funcionó, intentar búsqueda en DOM como fallback
      if (!result) {
        console.error('[proceedToPayment] Todos los selectores fallaron, buscando en DOM...');

        result = await p.evaluate(() => {
          console.log('[DOM] Buscando botones para continuar al pago...');

          // Buscar por data-testid primero
          let button = document.querySelector('[data-testid="cart-continue-button"]');

          if (!button) {
            // Buscar botones con texto relacionado al pago/continuar
            const buttons = Array.from(document.querySelectorAll('*')).filter(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              const isVisible = btn.offsetParent !== null; // Verificar que esté visible
              const isClickable = btn.getAttribute('role') === 'button' || btn.style.cursor === 'pointer' || btn.tagName === 'BUTTON';
              return isVisible && isClickable && (
                text.includes('continuar') || text.includes('proceder') ||
                text.includes('pagar') || text.includes('checkout') ||
                text.includes('siguiente') || text.includes('finalizar')
              );
            });

            console.log(`[DOM] Encontrados ${buttons.length} botones de continuar`);
            button = buttons[0];
          }

          if (!button) {
            return { success: false, error: 'No se encontró botón para continuar' };
          }

          // Hacer click en el botón encontrado
          button.click();

          console.log(`[DOM] ✓ Click en botón: "${button.textContent?.trim()}"`);

          return {
            success: true,
            buttonText: button.textContent?.trim(),
            clicked: true
          };
        });
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      console.error(`[proceedToPayment] ✓ Click exitoso en: "${result.buttonText}"`);

      // Esperar a que navegue
      await p.waitForTimeout(1000);

      return {
        success: true,
        buttonText: result.buttonText,
        currentUrl: p.url(),
        proceededToPayment: true
      };

    } catch (error) {
      console.error('[proceedToPayment] ✗ Error:', error.message);
      throw error;
    }
  },

  async fillPaymentForm({ direccion, metodoPago }) {
    const p = await initBrowser();

    // Llenar dirección usando selectores mapeados
    const addressSelector = SELECTORS?.PAYMENT_SELECTORS?.delivery?.direccion ||
      'input[name="direccion"], textarea[name="direccion"], input[name="address"]';

    console.error(`[fillPaymentForm] Llenando dirección: ${direccion}`);
    console.error(`[fillPaymentForm] Selector dirección: ${addressSelector}`);

    const addressSelectors = addressSelector.split(',').map(s => s.trim());

    for (const selector of addressSelectors) {
      try {
        const input = await p.$(selector);
        if (input) {
          await input.fill(direccion);
          console.error(`[fillPaymentForm] ✓ Dirección llenada con: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Seleccionar método de pago usando selectores mapeados
    let paymentMethodSelector;
    if (SELECTORS?.PAYMENT_SELECTORS?.metodoPago) {
      paymentMethodSelector = SELECTORS.PAYMENT_SELECTORS.metodoPago[metodoPago];
    }

    if (!paymentMethodSelector) {
      paymentMethodSelector = `input[value="${metodoPago}"]`;
    }

    console.error(`[fillPaymentForm] Método de pago: ${metodoPago}`);
    console.error(`[fillPaymentForm] Selector método: ${paymentMethodSelector}`);

    const paymentSelectors = [
      paymentMethodSelector,
      `button:has-text("${metodoPago}")`,
      `[data-payment="${metodoPago}"]`
    ];

    for (const selector of paymentSelectors) {
      try {
        await p.click(selector, { timeout: 2000 });
        console.error(`[fillPaymentForm] ✓ Método de pago seleccionado: ${metodoPago}`);
        break;
      } catch (e) {
        continue;
      }
    }

    await p.waitForTimeout(500);

    console.error('[fillPaymentForm] ✓ Formulario de pago llenado');

    return {
      success: true,
      direccion,
      metodoPago,
      formFilled: true
    };
  },

  async confirmPayment() {
    const p = await initBrowser();

    // Hacer clic en confirmar pago
    const confirmSelectors = [
      'button:has-text("Confirmar pago")',
      'button:has-text("Confirmar")',
      'button[type="submit"]',
      '.confirm-payment'
    ];

    for (const selector of confirmSelectors) {
      try {
        await p.click(selector, { timeout: 2000 });
        await p.waitForTimeout(2000);

        // Intentar extraer número de orden
        const pageText = await p.textContent('body');
        const orderMatch = pageText.match(/ORD-\d+-\d+|Pedido #\d+/);

        return {
          success: true,
          orderId: orderMatch ? orderMatch[0] : 'unknown',
          paymentConfirmed: true
        };
      } catch (e) {
        continue;
      }
    }

    throw new Error('No se pudo confirmar el pago');
  },

  // UTILIDADES
  async screenshot({ fullPage = false }) {
    const p = await initBrowser();
    const screenshot = await p.screenshot({
      fullPage,
      encoding: 'base64'
    });

    return {
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`,
      fullPage
    };
  },

  async wait({ ms }) {
    await new Promise(resolve => setTimeout(resolve, ms));
    return {
      success: true,
      waited: ms
    };
  },

  async waitForSelector({ selector, timeout = 5000 }) {
    const p = await initBrowser();

    try {
      await p.waitForSelector(selector, { timeout });
      return {
        success: true,
        found: true,
        selector
      };
    } catch (e) {
      return {
        success: false,
        found: false,
        selector,
        error: 'Timeout esperando elemento'
      };
    }
  },

  async getPageState() {
    const p = await initBrowser();

    const state = await p.evaluate(() => {
      // Detectar si está autenticado
      const isAuth = !!document.querySelector('.user-menu, .user-profile, [data-user-authenticated]');

      // Obtener items en carrito
      const cartBadge = document.querySelector('.cart-badge, .cart-count');
      const cartCount = cartBadge ? parseInt(cartBadge.textContent) : 0;

      return {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        isAuthenticated: isAuth,
        cartItemCount: cartCount,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });

    return {
      success: true,
      ...state
    };
  },

  async getPageElements({ types = ['button', 'link', 'input', 'select'] }) {
    const p = await initBrowser();

    const elements = await p.evaluate((typesToExtract) => {
      const results = {
        buttons: [],
        links: [],
        inputs: [],
        selects: [],
        textareas: []
      };

      const shouldExtract = (type) => typesToExtract.includes(type) || typesToExtract.includes('all');

      // Extraer botones
      if (shouldExtract('button')) {
        const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
        results.buttons = Array.from(buttons).map((btn, index) => ({
          index,
          text: btn.textContent?.trim() || btn.value || '',
          id: btn.id || null,
          className: btn.className || '',
          ariaLabel: btn.getAttribute('aria-label') || null,
          type: btn.type || 'button',
          visible: btn.offsetParent !== null,
          disabled: btn.disabled || false,
          innerHTML: btn.innerHTML.substring(0, 100) // Limitar para no enviar demasiado
        })).filter(b => b.text || b.ariaLabel); // Solo botones con texto o aria-label
      }

      // Extraer links
      if (shouldExtract('link')) {
        const links = document.querySelectorAll('a');
        results.links = Array.from(links).map((link, index) => ({
          index,
          text: link.textContent?.trim() || '',
          href: link.href || '',
          id: link.id || null,
          className: link.className || '',
          ariaLabel: link.getAttribute('aria-label') || null,
          visible: link.offsetParent !== null
        })).filter(l => l.text || l.ariaLabel);
      }

      // Extraer inputs
      if (shouldExtract('input')) {
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        results.inputs = Array.from(inputs).map((input, index) => ({
          index,
          type: input.type || 'text',
          name: input.name || null,
          id: input.id || null,
          placeholder: input.placeholder || null,
          ariaLabel: input.getAttribute('aria-label') || null,
          className: input.className || '',
          value: input.type === 'password' ? '***' : (input.value || ''),
          visible: input.offsetParent !== null,
          disabled: input.disabled || false
        }));
      }

      // Extraer selects
      if (shouldExtract('select')) {
        const selects = document.querySelectorAll('select');
        results.selects = Array.from(selects).map((select, index) => ({
          index,
          name: select.name || null,
          id: select.id || null,
          className: select.className || '',
          options: Array.from(select.options).map(opt => ({
            text: opt.text,
            value: opt.value
          })),
          selectedIndex: select.selectedIndex,
          visible: select.offsetParent !== null
        }));
      }

      return results;
    }, types);

    // Contar elementos
    const totalElements =
      elements.buttons.length +
      elements.links.length +
      elements.inputs.length +
      elements.selects.length +
      elements.textareas.length;

    return {
      success: true,
      totalElements,
      elements,
      timestamp: new Date().toISOString()
    };
  },

  // NUEVAS HERRAMIENTAS

  async check({ selector }) {
    const p = await initBrowser();

    try {
      const checkbox = await p.$(selector);
      if (!checkbox) {
        throw new Error(`No se encontró el checkbox: ${selector}`);
      }

      // Verificar si ya está marcado
      const isChecked = await checkbox.isChecked();

      if (!isChecked) {
        await checkbox.check();
        console.error(`[MCP Playwright] ✓ Checkbox marcado: ${selector}`);
      } else {
        console.error(`[MCP Playwright] ℹ Checkbox ya estaba marcado: ${selector}`);
      }

      return {
        success: true,
        selector,
        checked: true,
        wasAlreadyChecked: isChecked
      };
    } catch (error) {
      console.error('[MCP Playwright] Error marcando checkbox:', error);
      throw error;
    }
  },

  async uncheck({ selector }) {
    const p = await initBrowser();

    try {
      const checkbox = await p.$(selector);
      if (!checkbox) {
        throw new Error(`No se encontró el checkbox: ${selector}`);
      }

      // Verificar si ya está desmarcado
      const isChecked = await checkbox.isChecked();

      if (isChecked) {
        await checkbox.uncheck();
        console.error(`[MCP Playwright] ✓ Checkbox desmarcado: ${selector}`);
      } else {
        console.error(`[MCP Playwright] ℹ Checkbox ya estaba desmarcado: ${selector}`);
      }

      return {
        success: true,
        selector,
        checked: false,
        wasAlreadyUnchecked: !isChecked
      };
    } catch (error) {
      console.error('[MCP Playwright] Error desmarcando checkbox:', error);
      throw error;
    }
  },

  async selectRadio({ selector, value }) {
    const p = await initBrowser();

    try {
      // Si se proporciona un valor, buscar el radio button con ese valor
      if (value) {
        const radioSelector = `${selector}[value="${value}"]`;
        await p.click(radioSelector);
        console.error(`[MCP Playwright] ✓ Radio button seleccionado: ${radioSelector}`);

        return {
          success: true,
          selector: radioSelector,
          value,
          selected: true
        };
      } else {
        // Si no hay valor, hacer click directo en el selector
        await p.click(selector);
        console.error(`[MCP Playwright] ✓ Radio button seleccionado: ${selector}`);

        return {
          success: true,
          selector,
          selected: true
        };
      }
    } catch (error) {
      console.error('[MCP Playwright] Error seleccionando radio button:', error);
      throw error;
    }
  },

  async fillForm({ fields }) {
    const p = await initBrowser();
    const results = [];

    try {
      for (const field of fields) {
        const { selector, text } = field;

        try {
          const element = await p.$(selector);
          if (!element) {
            console.error(`[MCP Playwright] ⚠️ Campo no encontrado: ${selector}`);
            results.push({
              selector,
              success: false,
              error: 'Campo no encontrado'
            });
            continue;
          }

          await element.fill(text);
          console.error(`[MCP Playwright] ✓ Campo llenado: ${selector} = "${text}"`);

          results.push({
            selector,
            text,
            success: true
          });

          // Pequeña pausa entre campos para simular entrada humana
          await p.waitForTimeout(100);
        } catch (fieldError) {
          console.error(`[MCP Playwright] ✗ Error en campo ${selector}:`, fieldError.message);
          results.push({
            selector,
            success: false,
            error: fieldError.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      console.error(`[MCP Playwright] Formulario llenado: ${successCount}/${totalCount} campos`);

      return {
        success: successCount === totalCount,
        totalFields: totalCount,
        successfulFields: successCount,
        failedFields: totalCount - successCount,
        results
      };
    } catch (error) {
      console.error('[MCP Playwright] Error llenando formulario:', error);
      throw error;
    }
  },

  // GESTIÓN DE CREDENCIALES
  async saveLoginCredentials({ alias, email, password, role }) {
    const success = credentialManager.saveIdentity(alias, email, password, role);
    return {
      success,
      message: success ? `Credenciales guardadas para ${alias}` : 'Error al guardar credenciales'
    };
  },

  async getSavedIdentities() {
    const identities = credentialManager.getAllIdentities();
    return {
      identities: identities.map(id => ({ alias: id.alias, email: id.email, role: id.role }))
    };
  },

  async autoLogin({ alias }) {
    const identity = credentialManager.getIdentityByAlias(alias);

    if (!identity) {
      throw new Error(`No se encontraron credenciales para el alias "${alias}"`);
    }

    const p = await initBrowser();

    // 1. Asegurar que estamos en la aplicación
    if (!p.url().startsWith(APP_URL)) {
      await p.goto(APP_URL, { waitUntil: 'networkidle' });
    }

    // 2. Abrir modal de login usando la herramienta navigate actualizada
    console.log(`[autoLogin] Abriendo modal de login para ${alias}`);
    // Usamos navigate que ahora maneja la apertura del modal
    await toolHandlers.navigate({ url: '/login' });

    // 3. Esperar a que el formulario sea visible
    const emailSelector = SELECTORS?.HEADER_SELECTORS?.auth?.emailInput || 'input[type="email"]';
    const passwordSelector = SELECTORS?.HEADER_SELECTORS?.auth?.passwordInput || 'input[type="password"]';
    const submitSelector = SELECTORS?.HEADER_SELECTORS?.auth?.submitButton || 'button[type="submit"]';

    try {
      // Esperar un poco a que el modal abra y la animación termine
      await p.waitForTimeout(1000);

      console.log(`[autoLogin] Llenando credenciales para ${identity.email}`);
      await p.fill(emailSelector, identity.email);
      await p.fill(passwordSelector, identity.password);
      await p.click(submitSelector);

      // Esperar a que se procese el login
      await p.waitForTimeout(2000);

      return {
        success: true,
        message: `Sesión iniciada como ${identity.alias} (${identity.email})`,
        currentUrl: p.url()
      };
    } catch (error) {
      console.error('Error en autoLogin:', error);
      throw new Error(`Falló el inicio de sesión automático: ${error.message}`);
    }
  },

  async debugCartDOM() {
    return await this.debugCartDOM();
  },

  // ADMIN TOOLS
  async updateOrderStatus({ orderId, status }) {
    // Implementación directa via API o UI
    // Por ahora simularemos UI interaction si es posible, o API call
    // Dado que no tenemos API client en node, usaremos fetch desde el navegador context
    const p = await initBrowser();

    console.log(`[updateOrderStatus] Actualizando pedido ${orderId} a ${status}`);

    const result = await p.evaluate(async ({ orderId, status }) => {
      try {
        // Intentar usar la API interna si está expuesta, o fetch
        // Asumimos que hay un endpoint /api/pedidos
        const response = await fetch(`/api/pedidos/${orderId}/estado`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            // Asumimos que la cookie de sesión se envía automáticamente
          },
          body: JSON.stringify({ estado: status })
        });

        if (!response.ok) throw new Error('Error en API');
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, { orderId, status });

    if (result.success) {
      return { success: true, message: `Pedido ${orderId} actualizado a ${status}` };
    } else {
      // Fallback: Intentar UI
      // Navegar a pedidos admin
      await toolHandlers.navigate({ url: '/pedidos-admin' });
      // Buscar pedido y clickear botón (esto es complejo sin selectores precisos de ID)
      // Por ahora retornamos error si API falla
      throw new Error(`No se pudo actualizar el pedido: ${result.error}`);
    }
  },

  async updateProduct({ productId, updates }) {
    const p = await initBrowser();
    console.log(`[updateProduct] Actualizando producto ${productId}`, updates);

    const result = await p.evaluate(async ({ productId, updates }) => {
      try {
        const response = await fetch(`/api/productos/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Error en API');
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, { productId, updates });

    if (result.success) {
      return { success: true, message: `Producto actualizado correctamente` };
    } else {
      throw new Error(`Error actualizando producto: ${result.error}`);
    }
  }
};

/**
 * Crear servidor MCP
 */
const server = new Server(
  {
    name: 'famiglia-playwright-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler para listar herramientas disponibles
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

/**
 * Handler para ejecutar herramientas
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[MCP Playwright] Ejecutando tool: ${name}`);

  try {
    if (!toolHandlers[name]) {
      throw new Error(`Herramienta desconocida: ${name}`);
    }

    const result = await toolHandlers[name](args || {});

    console.error(`[MCP Playwright] ✓ Tool ${name} ejecutado exitosamente`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };

  } catch (error) {
    console.error(`[MCP Playwright] ✗ Error en tool ${name}:`, error.message);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            tool: name
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

/**
 * Iniciar servidor MCP
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('  MCP Playwright Server - Famiglia');
  console.error('  Modo: Chrome DevTools Protocol (CDP)');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`  App URL: ${APP_URL}`);
  console.error(`  CDP URL: ${CDP_URL}`);
  console.error(`  Slow Motion: ${SLOW_MO}ms`);
  console.error(`  Tools disponibles: ${TOOLS.length}`);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('  IMPORTANTE: Inicia Chrome con:');
  console.error('  chrome.exe --remote-debugging-port=9222');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('  Servidor iniciado y listo 🚀');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Cleanup al cerrar
 */
async function cleanup() {
  console.error('\n[MCP Playwright] Cerrando navegador...');

  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
  }

  console.error('[MCP Playwright] Navegador cerrado. Adiós! 👋');
  process.exit(0);
}

// Manejar señales de cierre
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Iniciar servidor
main().catch((error) => {
  console.error('[MCP Playwright] Error fatal:', error);
  process.exit(1);
});
