import prisma from '../../prismaClient.js';
import { generatePreferencesTest, getProductRecommendation } from '../../services/geminiService.js';
import { logAuditoria } from '../../services/auditoriaService.js';

export const generateTest = async (req, res) => {
  try {
    const { userPrompt } = req.body;

    const testData = await generatePreferencesTest(userPrompt || '');

    res.json({
      success: true,
      data: testData
    });
    logAuditoria({
      accion: 'generar_test',
      recurso: 'test',
      ruta: req.originalUrl || req.url,
      req,
      meta: {
        promptLength: String((userPrompt || '').length),
      }
    });

  } catch (error) {
    console.error('Error en generateTest:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el test de preferencias',
      message: error.message
    });
  }
};

export const getRecommendation = async (req, res) => {
  try {
    const { userPrompt, questions, answers } = req.body;
    // Obtener id del token JWT (la propiedad es 'id', no 'id_usuario')
    const userId = req.user?.id || null;

    console.log('👤 Usuario autenticado:', userId ? `ID: ${userId}` : 'No autenticado');

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren las preguntas del test'
      });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Se requieren las respuestas del test'
      });
    }

    const products = await prisma.producto.findMany({
      include: {
        stock: true,
        categoria: true
      }
    });

    // Filtrar solo productos con stock disponible
    const availableProducts = products.filter(p => (p.stock?.cantidad || 0) > 0);

    if (!availableProducts || availableProducts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No hay productos disponibles en stock'
      });
    }

    const recommendation = await getProductRecommendation(
      { userPrompt, questions, answers },
      availableProducts
    );

    // Guardar el test y la recomendación en la base de datos
    let testRecord = null;
    try {
      // Validar que el usuario esté autenticado
      if (!userId) {
        console.warn('⚠️ Usuario no autenticado, no se guardará en BD');
      } else {
        testRecord = await prisma.test.create({
          data: {
            consulta: userPrompt || 'Test de preferencias',
            resultado: recommendation.product.id_producto.toString(), // Solo el ID del producto
            url_resultado: recommendation.product.url_imagen || null,
            fecha: new Date(),
            id_usuario: BigInt(userId) // Convertir a BigInt para Prisma
          }
        });

        console.log('✅ Recomendación guardada en BD:', testRecord.id_test.toString());
      }
    } catch (dbError) {
      // Si falla guardar en BD, solo registrar el error pero continuar
      console.error('⚠️ Error al guardar en BD (continuando):', dbError.message);
    }

    logAuditoria({
      accion: 'resultado_test',
      recurso: 'test',
      recursoId: testRecord ? String(testRecord.id_test) : null,
      ruta: req.originalUrl || req.url,
      req,
      meta: {
        productoSugerido: recommendation.product.id_producto.toString(),
        url_producto: recommendation.product.url_imagen || null,
        guardadoEnBD: Boolean(testRecord)
      }
    });


    res.json({
      success: true,
      data: recommendation
    });

  } catch (error) {
    console.error('Error en getRecommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la recomendación',
      message: error.message
    });
  }
};

export const getRecommendationHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const history = await prisma.test.findMany({
      where: {
        id_usuario: BigInt(userId)
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 10 // Últimas 10 recomendaciones
    });

    res.json({
      success: true,
      data: history.map(test => ({
        id: test.id_test.toString(),
        consulta: test.consulta,
        resultado: test.resultado ? JSON.parse(test.resultado) : null,
        url_resultado: test.url_resultado,
        fecha: test.fecha
      }))
    });
  } catch (error) {
    console.error('Error en getRecommendationHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el historial',
      message: error.message
    });
  }
};
