import prisma from '../../prismaClient.js';
import crypto from 'crypto';

import { logAuditoria } from '../../services/auditoriaService.js';

// Función para generar hash del ID del pedido
const hashOrderId = (orderId) => {
  const hash = crypto.createHash('sha256').update(orderId.toString()).digest('hex');
  return `SA-${hash.substring(0, 8).toUpperCase()}`;
};

// Obtener o crear pedido en estado "carrito" para el usuario
const getOrCreateCart = async (userId) => {
  // Buscar pedido existente en estado "carrito"
  let pedido = await prisma.pedido.findFirst({
    where: {
      id_usuario: BigInt(userId),
      estado: 'carrito'
    },
    include: {
      detalle_pedido: {
        include: {
          producto: true
        }
      }
    }
  });

  // Si no existe, crear uno nuevo
  if (!pedido) {
    pedido = await prisma.pedido.create({
      data: {
        id_usuario: BigInt(userId),
        estado: 'carrito',
        fecha: new Date(),
        envio: 'Recojo en tienda' // Valor por defecto
      },
      include: {
        detalle_pedido: {
          include: {
            producto: true
          }
        }
      }
    });
  }

  return pedido;
};

// Calcular totales del carrito
const calculateTotals = (detalles) => {
  const items = detalles.map(detalle => ({
    id_detalle: detalle.id_detalle_pedido.toString(),
    id_producto: detalle.producto.id_producto.toString(),
    nombre: detalle.producto.nombre,
    precio: parseFloat(detalle.producto.precio),
    cantidad: detalle.cantidad,
    url_imagen: detalle.producto.url_imagen,
    subtotal: parseFloat(detalle.producto.precio) * detalle.cantidad
  }));

  const totalQuantity = items.reduce((sum, item) => sum + item.cantidad, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return { items, totalQuantity, totalAmount };
};

// Obtener carrito del usuario
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const pedido = await getOrCreateCart(userId);
    const { items, totalQuantity, totalAmount } = calculateTotals(pedido.detalle_pedido);

    res.json({
      success: true,
      orderId: hashOrderId(pedido.id_pedido),
      items,
      totalQuantity,
      totalAmount
    });
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el carrito'
    });
  }
};

// Agregar producto al carrito
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id_producto, cantidad = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!id_producto) {
      return res.status(400).json({
        success: false,
        error: 'ID de producto requerido'
      });
    }

    // Obtener o crear carrito (solo 1 query)
    let pedido = await prisma.pedido.findFirst({
      where: {
        id_usuario: BigInt(userId),
        estado: 'carrito'
      },
      select: { id_pedido: true } // Solo necesitamos el ID
    });

    if (!pedido) {
      pedido = await prisma.pedido.create({
        data: {
          id_usuario: BigInt(userId),
          estado: 'carrito',
          fecha: new Date(),
          envio: 'Recojo en tienda'
        },
        select: { id_pedido: true }
      });
    }

    // Verificar si existe y actualizar/crear (optimizado con select minimal)
    const detalleExistente = await prisma.detalle_pedido.findFirst({
      where: {
        id_pedido: pedido.id_pedido,
        id_producto: BigInt(id_producto)
      },
      select: { id_detalle_pedido: true, cantidad: true }
    });

    if (detalleExistente) {
      await prisma.detalle_pedido.update({
        where: { id_detalle_pedido: detalleExistente.id_detalle_pedido },
        data: { cantidad: detalleExistente.cantidad + cantidad }
      });
    } else {
      await prisma.detalle_pedido.create({
        data: {
          id_pedido: pedido.id_pedido,
          id_producto: BigInt(id_producto),
          cantidad
        }
      });
    }

    // Obtener solo los datos necesarios para la respuesta
    const detalles = await prisma.detalle_pedido.findMany({
      where: { id_pedido: pedido.id_pedido },
      select: {
        id_detalle_pedido: true,
        cantidad: true,
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            precio: true,
            url_imagen: true
          }
        }
      }
    });

    const { items, totalQuantity, totalAmount } = calculateTotals(detalles);

    res.json({
      success: true,
      message: 'Producto agregado al carrito',
      orderId: hashOrderId(pedido.id_pedido),
      items,
      totalQuantity,
      totalAmount
    });

    // Auditoría asíncrona (no bloquea la respuesta)
    setImmediate(() => {
      logAuditoria({
        accion: 'agregar_al_carrito',
        recurso: 'producto',
        recursoId: String(id_producto),
        req,
        meta: {
          cantidad,
          pedidoId: String(pedido.id_pedido)
        }
      });
    });

  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar producto al carrito'
    });
  }
};

// Actualizar cantidad de un producto en el carrito
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id_detalle, cantidad } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!id_detalle || !cantidad) {
      return res.status(400).json({
        success: false,
        error: 'ID de detalle y cantidad requeridos'
      });
    }

    // Actualizar y obtener datos en una sola operación
    const detalleActualizado = await prisma.detalle_pedido.update({
      where: { id_detalle_pedido: BigInt(id_detalle) },
      data: { cantidad: parseInt(cantidad) },
      select: {
        id_pedido: true,
        pedido: {
          select: {
            id_usuario: true,
            id_pedido: true
          }
        }
      }
    });

    // Verificar autorización
    if (detalleActualizado.pedido.id_usuario.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado'
      });
    }

    // Obtener solo los datos necesarios
    const detalles = await prisma.detalle_pedido.findMany({
      where: { id_pedido: detalleActualizado.id_pedido },
      select: {
        id_detalle_pedido: true,
        cantidad: true,
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            precio: true,
            url_imagen: true
          }
        }
      }
    });

    const { items, totalQuantity, totalAmount } = calculateTotals(detalles);

    res.json({
      success: true,
      message: 'Cantidad actualizada',
      orderId: hashOrderId(detalleActualizado.id_pedido),
      items,
      totalQuantity,
      totalAmount
    });
  } catch (error) {
    console.error('Error al actualizar carrito:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el carrito'
    });
  }
};

// Eliminar producto del carrito
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Eliminar y obtener id_pedido en una sola operación
    const detalleEliminado = await prisma.detalle_pedido.delete({
      where: { id_detalle_pedido: BigInt(id) },
      select: {
        id_pedido: true,
        pedido: {
          select: {
            id_usuario: true,
            id_pedido: true
          }
        }
      }
    });

    // Verificar autorización
    if (detalleEliminado.pedido.id_usuario.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado'
      });
    }

    // Obtener solo los datos necesarios
    const detalles = await prisma.detalle_pedido.findMany({
      where: { id_pedido: detalleEliminado.id_pedido },
      select: {
        id_detalle_pedido: true,
        cantidad: true,
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            precio: true,
            url_imagen: true
          }
        }
      }
    });

    const { items, totalQuantity, totalAmount } = calculateTotals(detalles);

    res.json({
      success: true,
      message: 'Producto eliminado del carrito',
      orderId: hashOrderId(detalleEliminado.id_pedido),
      items,
      totalQuantity,
      totalAmount
    });

    // Auditoría asíncrona
    setImmediate(() => {
      logAuditoria({
        accion: 'eliminar_carrito',
        recurso: 'detalle_pedido',
        recursoId: String(id),
        req,
        meta: {
          pedidoId: String(detalleEliminado.id_pedido),
          totalQuantity,
          totalAmount
        }
      });
    });

  } catch (error) {
    console.error('Error al eliminar del carrito:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar producto del carrito'
    });
  }
};
