/**
 * Servicio de Mapeo de Selectores CSS
 * Proporciona selectores precisos y con fallbacks para todas las páginas de Famiglia
 * Basado en SELECTORS_REFERENCE.md
 */

/**
 * Selectores del Header (Común a todas las páginas)
 */
export const HEADER_SELECTORS = {
  // Logo
  logo: 'img[alt="Panadería Famiglia"]',

  // Navegación principal
  nav: {
    home: 'span:has-text("Home")',
    carta: 'span:has-text("Carta")',
    delivery: 'span:has-text("Delivery")',
    test: 'span:has-text("Test")',
    contacto: 'span:has-text("Contáctanos")',
  },

  // Autenticación (usuario NO autenticado)
  auth: {
    registrarse: 'button:has-text("Registrarse"), .MuiButton-contained',
    iniciarSesion: 'button:has-text("Iniciar Sesión"), .MuiButton-outlined',
  },

  // Usuario autenticado
  user: {
    carrito: 'button:has(svg[data-testid="ShoppingCartIcon"])',
    carritoIcon: 'svg[data-testid="ShoppingCartIcon"]',
    perfil: 'button:has(svg[data-testid="AccountCircleIcon"])',
    perfilIcon: 'svg[data-testid="AccountCircleIcon"]',
    nombreUsuario: 'span.text-sm.font-medium.text-[#8b3e3e]',
    cerrarSesion: 'button:has-text("Cerrar Sesión")',
  },

  // Menú móvil
  mobile: {
    hamburgerIcon: 'button:has(svg[data-testid="MenuIcon"])',
    closeIcon: 'button:has(svg[data-testid="CloseIcon"])',
    menu: '.flex.flex-col.items-center.bg-white',
  },
};

/**
 * Selectores del Login Form (Modal)
 */
export const LOGIN_FORM_SELECTORS = {
  // Campos
  correo: 'input[name="correo"], input[type="email"]',
  contraseña: 'input[name="contraseña"], input[type="password"]',

  // Botones - Múltiples selectores para mayor robustez
  ingresar: 'button[type="submit"]:not([disabled]), button:has-text("INICIAR SESIÓN"), button:has-text("VERIFICAR CÓDIGO")',
  registrarseLink: 'span:has-text("Regístrate aquí")',

  // Mensajes de error
  errorGeneral: '.bg-red-100.border-red-400.text-red-700',
  errorCampo: '.text-red-600.text-sm.mt-1',

  // Placeholders (para referencia)
  placeholders: {
    correo: 'Ej. maria@gmail.com',
    contraseña: '********',
  },
};

/**
 * Selectores del Register Form (Modal)
 */
export const REGISTER_FORM_SELECTORS = {
  // Campos personales (solo los que existen en el formulario actual)
  nombre: 'input[name="nombre"]',
  correo: 'input[name="correo"], input[type="email"]',
  contraseña: 'input[name="contraseña"], input[type="password"]',

  // Checkbox términos y condiciones
  checkboxTerminos: 'input[type="checkbox"]',
  labelTerminos: 'p:has-text("Estoy de acuerdo")',

  // Links dentro del checkbox
  privacidadLink: 'span:has-text("política de privacidad")',
  terminosLink: 'span:has-text("términos y condiciones")',

  // Botones - Selector directo sin :has-text
  registrarse: 'button[type="submit"]',  // Es el único botón submit en el modal
  crearCuenta: 'button[type="submit"]',  // Alias
  iniciarSesionLink: 'span:has-text("Ingresa aquí")',
};

/**
 * Selectores del Carrito (/cart)
 */
export const CART_SELECTORS = {
  // Selector de cantidad (QuantitySelector component)
  quantity: {
    decrease: 'button:has(svg[data-testid="RemoveIcon"])',
    display: '.MuiTypography-root',
    increase: 'button:has(svg[data-testid="AddIcon"])',
    container: '.flex.items-center.border-[#ff9c9c].rounded-lg.w-70px.h-32px',
  },

  // Botón eliminar
  eliminar: 'button:has(svg[data-testid="CloseIcon"])',

  // Resumen
  total: '.text-2xl.font-bold',

  // Botones de acción
  continuar: '[data-testid="cart-continue-button"], [role="button"]:has-text("Continuar"), text=Continuar',
  procederAlPago: 'button:has-text("Proceder al pago")',

  // Estado vacío
  vacio: {
    icon: 'svg[data-testid="SentimentDissatisfiedOutlinedIcon"]',
    mensaje: '.text-2xl.font-bold.text-[#8b3e3e]',
  },

  // Helpers para productos específicos (por índice)
  getProductCard: (index) => `.MuiCard-root:nth-of-type(${index})`,
  getProductIncrease: (index) => `.MuiCard-root:nth-of-type(${index}) button:has(svg[data-testid="AddIcon"])`,
  getProductDecrease: (index) => `.MuiCard-root:nth-of-type(${index}) button:has(svg[data-testid="RemoveIcon"])`,
  getProductRemove: (index) => `.MuiCard-root:nth-of-type(${index}) button:has(svg[data-testid="CloseIcon"])`,

  // Helper con data-item-id (si está disponible)
  getItemById: (itemId) => `[data-item-id="${itemId}"]`,
};

/**
 * Selectores de Payment Page (/payment)
 */
export const PAYMENT_SELECTORS = {
  // Información de delivery
  delivery: {
    direccion: 'input[name="direccion"]',
    telefono: 'input[name="telefono"]',
    referencia: 'input[name="referencia"]',
  },

  // Métodos de pago (radio buttons)
  metodoPago: {
    yape: 'input[type="radio"][name="metodoPago"][value="yape"]',
    tarjeta: 'input[type="radio"][name="metodoPago"][value="tarjeta"]',
    efectivo: 'input[type="radio"][name="metodoPago"][value="efectivo"]',
  },

  // Campos condicionales (Yape/Transferencia)
  yapeFields: {
    numeroYape: 'input[name="numeroYape"]',
    codigoConfirmacion: 'input[name="codigo"]',
  },

  // Resumen de pedido
  resumen: {
    subtotal: '.text-lg:contains("Subtotal")',
    delivery: '.text-lg:contains("Delivery")',
    total: '.text-2xl.font-bold',
  },

  // Botones de acción
  volverAlCarrito: 'button:has-text("Volver al carrito")',
  confirmarPedido: 'button[type="submit"]:has-text("Confirmar")',
};

/**
 * Selectores de Profile Page (/profile)
 */
export const PROFILE_SELECTORS = {
  // Tabs de navegación
  tabs: {
    misDatos: 'button:has-text("Mis Datos")',
    misPedidos: 'button:has-text("Mis Pedidos")',
    cambiarContraseña: 'button:has-text("Cambiar Contraseña")',
  },

  // Tab 1: Mis Datos
  misDatos: {
    nombre: 'input[name="nombre"]',
    apellidoPaterno: 'input[name="apellido_paterno"]',
    apellidoMaterno: 'input[name="apellido_materno"]',
    email: 'input[name="email"], input[type="email"]',
    telefono: 'input[name="telefono"]',
    dni: 'input[name="dni"]', // disabled
    guardarCambios: 'button:has-text("Guardar Cambios")',
    cancelar: 'button:has-text("Cancelar")',
  },

  // Tab 2: Mis Pedidos
  misPedidos: {
    listaPedidos: '.MuiPaper-root',
    fecha: '.text-sm.text-gray-600',
    total: '.text-lg.font-bold',
    estado: '.px-3.py-1.rounded-full',
    verDetalles: 'button:has-text("Ver Detalles")',
  },

  // Tab 3: Cambiar Contraseña
  cambiarContraseña: {
    contraseñaActual: 'input[name="currentPassword"]',
    nuevaContraseña: 'input[name="newPassword"]',
    confirmarContraseña: 'input[name="confirmPassword"]',
    cambiar: 'button[type="submit"]:has-text("Cambiar Contraseña")',
  },
};

/**
 * Selectores del Catalog Page (/carta)
 */
export const CATALOG_SELECTORS = {
  // Buscador
  search: {
    input: '#search-products, input[name="search"], input[data-testid="search-input"], input[aria-label="Buscar productos"]',
    inputId: '#search-products',
  },

  // Filtros (Sidebar)
  filtros: {
    categoriaButton: (nombre) => `button:has-text("${nombre}")`,
    categoriaChip: '.MuiChip-root',
    precioSlider: '.MuiSlider-root',
    precioMin: '.text-[#6b2c2c]:first-of-type',
    precioMax: '.text-[#6b2c2c]:last-of-type',
  },

  // Grid de productos
  productos: {
    card: '.MuiCard-root',
    imagen: 'img',
    nombre: '.text-lg.font-semibold',
    precio: '.text-xl.font-bold',
    agregar: 'button:has-text("Añadir al carrito"), button:has-text("Agregar")',
    firstCard: '.MuiCard-root:first-of-type',
  },

  // Ordenamiento
  ordenar: {
    select: 'select[name="ordenar"]',
    priceAsc: 'price-asc',
    priceDesc: 'price-desc',
    name: 'name',
  },
};

/**
 * Selectores del Footer (Común a todas las páginas)
 */
export const FOOTER_SELECTORS_OLD = {
  logo: 'img[alt="Logo Famiglia"]',
  copyright: 'text="© 2024 FAMIGLIA. Todos los derechos reservados."',

  links: {
    quienesSomos: 'a:has-text("Quiénes Somos")',
    terminos: 'a:has-text("Términos y Condiciones")',
    privacidad: 'a:has-text("Política de Privacidad")',
    contacto: 'a:has-text("Contacto")',
  },

  social: {
    facebook: 'a[href*="facebook"]',
    instagram: 'a[href*="instagram"]',
    twitter: 'a[href*="twitter"]',
  },
};

/**
 * Selectores de PreferencesTest (/test)
 */
export const PREFERENCES_TEST_SELECTORS = {
  // Título y descripción
  title: 'h1:has-text("Test de Preferencias")',
  description: 'p:has-text("Responde las siguientes preguntas")',

  // Inicio del test
  startTest: {
    prompt: 'textarea[placeholder*="Por ejemplo"]',
    startButton: 'button:has-text("Comenzar Test")',
  },

  // Barra de progreso
  progress: {
    container: '.w-full.bg-\\[\\#f5e6d3\\].rounded-full',
    bar: '.bg-\\[\\#6b2c2c\\].h-2.rounded-full',
    questionText: 'span:text-matches("Pregunta \\d+ de \\d+")',
    percentage: 'span:text-matches("\\d+%")',
  },

  // Pregunta actual
  question: {
    title: 'h2.text-lg.sm\\:text-xl.font-semibold.text-\\[\\#6b2c2c\\]',

    // Opciones de respuesta
    options: {
      container: '.space-y-3.sm\\:space-y-4.mb-6',
      button: 'button.w-full.text-left.p-3',
      selected: 'button.border-\\[\\#6b2c2c\\].bg-\\[\\#f5e6d3\\]',
      label: '.font-medium.text-\\[\\#6b2c2c\\]',
      description: '.text-xs.sm\\:text-sm.text-\\[\\#6b2c2c\\].opacity-70',

      // Selectores por índice (0-based)
      first: 'button.w-full.text-left:nth-of-type(1)',
      second: 'button.w-full.text-left:nth-of-type(2)',
      third: 'button.w-full.text-left:nth-of-type(3)',
    },
  },

  // Navegación
  navigation: {
    previous: 'button:has-text("← Regresar")',
    next: 'button:has-text("Siguiente →")',
    finish: 'button:has-text("Finalizar")',
  },

  // Loading states
  loading: {
    generating: 'p:has-text("Generando tu test personalizado")',
    analyzing: 'p:has-text("Analizando tus preferencias")',
    spinner: '.animate-spin.rounded-full',
  },

  // Recomendación (después de completar test)
  recommendation: {
    container: '.bg-white.rounded-lg.shadow-md.border',
    title: 'h2:has-text("Tu Recomendación Personalizada")',
    productCard: '[class*="ProductCard"]',
    reasoning: 'p.text-sm.sm\\:text-base.text-\\[\\#6b2c2c\\]',

    // Botones de acción
    goToCatalog: 'button:has-text("Ver Catálogo Completo")',
    restartTest: 'button:has-text("Hacer Test Nuevamente")',
  },

  // Mensaje de error
  error: {
    container: '.mb-4.sm\\:mb-6.bg-\\[\\#f5e6d3\\].border.border-\\[\\#b17b6b\\]',
    message: '.text-\\[\\#6b2c2c\\]',
  },
};

/**
 * Generadores de selectores dinámicos
 */
export const SELECTOR_GENERATORS = {
  /**
   * Genera selector para producto en catálogo por posición
   */
  productByIndex: (index) => `.MuiCard-root:nth-of-type(${index + 1})`,

  /**
   * Genera selector para botón "Agregar" de producto específico
   */
  addToCartByIndex: (index) => `.MuiCard-root:nth-of-type(${index + 1}) button:has-text("Añadir al carrito"), .MuiCard-root:nth-of-type(${index + 1}) button:has-text("Agregar")`,

  /**
   * Genera selector para input por placeholder
   */
  inputByPlaceholder: (placeholder) => `input[placeholder="${placeholder}"]`,

  /**
   * Genera selector para botón por texto con fallbacks
   */
  buttonByText: (text) => `button:has-text("${text}"), [role="button"]:has-text("${text}")`,

  /**
   * Genera selector para link por texto (con auto-scroll)
   */
  linkByText: (text) => `text="${text}"`,
};

/**
 * Utilidades para construcción de selectores con fallbacks
 */
export const SELECTOR_UTILS = {
  /**
   * Combina múltiples selectores con coma (Playwright intentará cada uno)
   */
  withFallbacks: (...selectors) => selectors.filter(Boolean).join(', '),

  /**
   * Genera selector CSS seguro escapando caracteres especiales
   */
  escapeCss: (str) => str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&'),

  /**
   * Genera selector de atributo data-*
   */
  dataAttr: (name, value) => `[data-${name}="${value}"]`,
};

/**
 * Mapeo de rutas de la aplicación
 */
export const ROUTES = {
  home: '/',
  carta: '/carta',
  delivery: '/delivery',
  contacto: '/contact-us',
  cart: '/cart',
  profile: '/profile',
  payment: '/payment',
  quienesSomos: '/quienes-somos',
  terminos: '/terminos',
  privacidad: '/privacidad',
  complaints: '/complaints',
  delivery: '/delivery',
  catalogoAdmin: '/catalogo-admin',
};

/**
 * Selectores de Complaints (/complaints)
 */
export const COMPLAINTS_SELECTORS = {
  form: {
    nombre: 'input[placeholder="Ej. María López"]',
    correo: 'input[type="email"][placeholder="Ej. maria@gmail.com"]',
    motivo: 'textarea[placeholder="Describe brevemente el motivo de tu reclamo"]',
    submit: 'button[type="submit"]:has-text("Enviar Reclamo")',
  },
  alert: {
    success: '.MuiAlert-standardSuccess',
    error: '.MuiAlert-standardError',
  },
};

/**
 * Selectores de Delivery (/delivery)
 */
export const DELIVERY_SELECTORS = {
  rappi: {
    logo: 'img[alt="Rappi Logo"]',
    button: 'button:has-text("Haz click aquí")',
  },
  whatsapp: {
    logo: 'img[alt="WhatsApp Logo"]',
    numero1: 'div:has-text("949978664")',
    numero2: 'div:has-text("949870092")',
  },
  title: 'h2:has-text("RESERVAS DE PEDIDOS & DELIVERY")',
};

/**
 * Selectores de CatalogoAdmin (/catalogo-admin)
 */
export const CATALOGO_ADMIN_SELECTORS = {
  title: 'h3:has-text("Catálogo Administrativo")',
  search: {
    input: 'input[placeholder*="Buscar productos"]',
  },
  filters: {
    categoryButtons: 'button:has-text("TODOS"), button:has-text("TORTAS"), button:has-text("SANGUCHES")',
    todos: 'button:has-text("TODOS")',
    priceSlider: '.MuiSlider-root',
  },
  products: {
    card: '.space-y-3 > div',
    nombre: '.font-semibold.text-lg',
    precio: '.text-xl.font-bold',
    imagen: 'img[alt*="imagen"]',
  },
};

/**
 * Selectores de PedidosAdmin (/pedidos-admin)
 */
export const PEDIDOS_ADMIN_SELECTORS = {
  title: 'h2:has-text("Panel de Administración de Pedidos")',
  filters: {
    reservados: 'button:has-text("Reservados")',
    entregados: 'button:has-text("Entregados")',
    cancelados: 'button:has-text("Cancelados")',
    todos: 'button:has-text("Todos")',
  },
  search: {
    input: 'input[placeholder="Buscar por cliente..."]',
  },
  orders: {
    card: '.bg-white.rounded-lg.shadow-md.p-4',
    customerName: '.font-bold.text-lg',
    status: '.px-2.py-1.rounded-full.text-xs',
    total: '.font-bold.text-gray-800',
    actions: {
      entregar: 'button:has-text("Entregar")',
      cancelar: 'button:has-text("Cancelar")',
      verDetalles: 'button:has-text("Ver Detalles")',
    },
    // Selectores dinámicos por índice
    getCardByIndex: (index) => `.bg-white.rounded-lg.shadow-md.p-4:nth-of-type(${index + 1})`,
    getEntregarByIndex: (index) => `.bg-white.rounded-lg.shadow-md.p-4:nth-of-type(${index + 1}) button:has-text("Entregar")`,
  },
};

/**
 * Obtiene el selector apropiado según el contexto
 * @param {string} element - Nombre del elemento (ej: "search.input", "cart.increase")
 * @param {string} currentUrl - URL actual para determinar contexto
 * @returns {string} Selector CSS apropiado
 */
export function getSelector(element, currentUrl = '/') {
  const parts = element.split('.');

  // Determinar de qué sección obtener el selector
  if (currentUrl.includes('/cart')) {
    if (parts[0] === 'cart') {
      return getNestedValue(CART_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/payment')) {
    if (parts[0] === 'payment') {
      return getNestedValue(PAYMENT_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/profile')) {
    if (parts[0] === 'profile') {
      return getNestedValue(PROFILE_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/test')) {
    if (parts[0] === 'test' || parts[0] === 'preferences') {
      return getNestedValue(PREFERENCES_TEST_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/catalogo-admin')) {
    if (parts[0] === 'catalogoAdmin') {
      return getNestedValue(CATALOGO_ADMIN_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/complaints')) {
    if (parts[0] === 'complaints') {
      return getNestedValue(COMPLAINTS_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/delivery')) {
    if (parts[0] === 'delivery') {
      return getNestedValue(DELIVERY_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/carta')) {
    if (parts[0] === 'catalog') {
      return getNestedValue(CATALOG_SELECTORS, parts.slice(1));
    }
  } else if (currentUrl.includes('/pedidos-admin')) {
    if (parts[0] === 'pedidosAdmin') {
      return getNestedValue(PEDIDOS_ADMIN_SELECTORS, parts.slice(1));
    }
  }

  // Header y footer están en todas las páginas
  if (parts[0] === 'header') {
    return getNestedValue(HEADER_SELECTORS, parts.slice(1));
  } else if (parts[0] === 'footer') {
    return getNestedValue(FOOTER_SELECTORS, parts.slice(1));
  }

  return null;
}

/**
 * Helper para obtener valor anidado de objeto
 */
function getNestedValue(obj, path) {
  return path.reduce((acc, key) => acc?.[key], obj);
}

/**
 * Exportar todo como objeto único para fácil acceso
 */
export default {
  HEADER_SELECTORS,
  LOGIN_FORM_SELECTORS,
  REGISTER_FORM_SELECTORS,
  CART_SELECTORS,
  PAYMENT_SELECTORS,
  PROFILE_SELECTORS,
  CATALOG_SELECTORS,
  PREFERENCES_TEST_SELECTORS,
  COMPLAINTS_SELECTORS,
  DELIVERY_SELECTORS,
  DELIVERY_SELECTORS,
  CATALOGO_ADMIN_SELECTORS,
  PEDIDOS_ADMIN_SELECTORS,
  FOOTER_SELECTORS: FOOTER_SELECTORS_OLD,
  SELECTOR_GENERATORS,
  SELECTOR_UTILS,
  ROUTES,
  getSelector,
};
