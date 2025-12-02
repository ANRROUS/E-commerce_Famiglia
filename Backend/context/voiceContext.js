/**
 * ARCHIVO DE CONTEXTO PARA EL SISTEMA DE VOZ FAMIGLIA
 * 
 * Este archivo contiene información específica del negocio y configuraciones
 * que el sistema de voz debe conocer para responder apropiadamente.
 */

export const VOICE_CONTEXT = {
  // INFORMACIÓN DEL NEGOCIO
  business: {
    name: "Famiglia",
    description: "Panadería y repostería artesanal",
    fullName: "Famiglia - Panadería Artesanal",
    aliases: ["famiglia", "familia", "la familia", "nuestro negocio", "la empresa"]
  },

  // CONFIGURACIÓN DE MONEDA
  currency: {
    symbol: "S/",
    name: "soles",
    fullName: "Soles Peruanos",
    country: "Perú",
    format: "S/ {amount}",
    voiceFormat: "{amount} soles", // Para respuestas de voz
    decimalPlaces: 2
  },

  // CONTEXTO DE PRODUCTOS
  products: {
    categories: {
      "Bebidas": ["café", "té", "jugos", "agua", "gaseosas", "maracuyá", "jugo surtido"],
      "Panes": ["pan francés", "pan integral", "pan molde", "baguette", "ciabatta", "baguettino"],
      "Postres": ["cake", "pastel", "flan", "cheesecake", "tiramisú", "pie"],
      "Salados": ["empanada de pollo", "empanada de carne", "empanada de queso", "quiche"],
      "Sanguches": ["sándwich", "sandwich", "bocadillo", "hamburguesa"],
      "Tortas": ["torta", "pastel", "cake", "tarta"]
    },
    defaultUnit: "unidad",
    availableHours: "Lunes a Domingo de 7:00 AM a 9:00 PM"
  },

  // FRASES Y RESPUESTAS CONTEXTUALES
  responses: {
    greeting: "¡Bienvenido a Famiglia! ¿En qué te puedo ayudar hoy?",
    businessInfo: "Famiglia es una panadería artesanal especializada en productos frescos y de calidad.",
    priceFormat: (name, price) => `${name} cuesta S/ ${price.toFixed(2)}`,
    productList: (products) => {
      if (products.length === 0) return "No encontré productos disponibles en este momento.";
      if (products.length === 1) return `El producto disponible es: ${products[0].nombre} a S/ ${products[0].precio.toFixed(2)}`;

      const list = products.map((p, idx) =>
        `${idx + 1}. ${p.nombre} a S/ ${p.precio.toFixed(2)}`
      ).join(', ');

      return `Los productos que encuentro son: ${list}`;
    },
    orderConfirmation: "Perfecto, he agregado el producto a tu carrito.",
    notFound: "Lo siento, no pude encontrar ese producto en nuestro catálogo actual."
  },

  // PALABRAS CLAVE Y SINÓNIMOS
  keywords: {
    price: ["precio", "costo", "cuánto cuesta", "vale", "cuesta"],
    add: ["agregar", "añadir", "quiero", "comprar", "llevar"],
    show: ["mostrar", "ver", "enseñar", "dime", "cuáles", "qué hay"],
    search: ["buscar", "encontrar", "busca", "hay"],
    help: ["ayuda", "ayúdame", "qué puedes hacer", "comandos"],
    business: ["famiglia", "familia", "negocio", "empresa", "panadería"]
  },

  // CONFIGURACIÓN DE VOZ
  voice: {
    language: "es-PE", // Español de Perú
    responseStyle: "friendly", // Estilo amigable
    includeBusinessName: true, // Incluir nombre del negocio en respuestas
    useCurrency: true, // Usar símbolo de moneda en precios
    verboseProductInfo: true // Información detallada de productos
  }
};

/**
 * Función para formatear precios en el contexto local (visualización)
 */
export function formatPrice(price) {
  return `S/ ${parseFloat(price).toFixed(2)}`;
}

/**
 * Función para formatear precios para respuestas de voz
 */
export function formatPriceForVoice(price) {
  const amount = parseFloat(price).toFixed(2);
  return `${amount} soles`;
}

/**
 * Función para convertir texto con S/ a formato de voz
 */
export function convertCurrencyToVoice(text) {
  // Reemplaza patrones como "S/ 42.50" con "42.50 soles"
  return text.replace(/S\/\s*(\d+(?:\.\d{2})?)/g, '$1 soles');
}

/**
 * Detecta si la consulta es específicamente sobre el total del carrito
 */
export function isCarrotalQuery(text) {
  const lowerText = text.toLowerCase();
  const totalKeywords = ['total', 'cuánto debo', 'precio total', 'cuánto es', 'cuánto cuesta todo', 'suma total'];
  const cartKeywords = ['carrito', 'carro', 'compra'];

  return totalKeywords.some(keyword => lowerText.includes(keyword)) &&
    cartKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Función para generar respuesta de lista de productos con contexto
 */
export function generateProductListResponse(products, requestType = 'list') {
  if (!products || products.length === 0) {
    return VOICE_CONTEXT.responses.notFound;
  }

  if (products.length === 1) {
    const product = products[0];
    return `El producto es ${product.nombre || product.name} a ${formatPrice(product.precio || product.price)}`;
  }

  const productTexts = products.map((product, idx) => {
    const name = product.nombre || product.name;
    const price = product.precio || product.price;
    return `${name} a ${formatPrice(price)}`;
  });

  if (products.length <= 3) {
    return `Los productos son: ${productTexts.join(', ')}`;
  } else {
    const firstThree = productTexts.slice(0, 3).join(', ');
    const remaining = products.length - 3;
    return `Los primeros productos son: ${firstThree}, y ${remaining} más`;
  }
}

/**
 * Función para detectar si el usuario se refiere al negocio
 */
export function isBusinessReference(text) {
  const lowerText = text.toLowerCase();
  return VOICE_CONTEXT.business.aliases.some(alias => lowerText.includes(alias));
}

/**
 * Función para obtener información del negocio
 */
export function getBusinessInfo() {
  return VOICE_CONTEXT.responses.businessInfo;
}