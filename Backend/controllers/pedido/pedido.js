import { log } from "console";
import prisma from "../../prismaClient.js";
import crypto from "crypto";
import { logAuditoria } from "../../services/auditoriaService.js";

const hashOrderId = (id) => {
    const hash = crypto.createHash("sha256").update(id.toString()).digest("hex");
    return `SA-${hash.substring(0, 8).toUpperCase()}`;
};

const formatPedidoAdmin = (pedido) => ({
    id_pedido: Number(pedido.id_pedido),
    codigo: hashOrderId(pedido.id_pedido),
    fecha: pedido.fecha,
    estado: (pedido.estado || "").toLowerCase(),
    envio: pedido.envio,
    usuario: pedido.usuario
        ? {
            id_usuario: Number(pedido.usuario.id_usuario),
            nombre: pedido.usuario.nombre,
            correo: pedido.usuario.correo,
        }
        : null,
    detalle_pedido: pedido.detalle_pedido?.map((detalle) => ({
        id_detalle_pedido: Number(detalle.id_detalle_pedido),
        cantidad: detalle.cantidad,
        producto: detalle.producto
            ? {
                id_producto: Number(detalle.producto.id_producto),
                nombre: detalle.producto.nombre,
                precio: detalle.producto.precio,
                url_imagen: detalle.producto.url_imagen,
            }
            : null,
    })) || [],
    pago: pedido.pago?.map((pago) => ({
        id_pago: Number(pago.id_pago),
        total: pago.total,
        fecha: pago.fecha,
        medio: pago.medio,
    })) || [],
});

export const getPedidos = async (req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany({
            include: {
                detalle_pedido: {
                    include: {
                        producto: true,
                    },
                },
            },
        });
        res.json(pedidos);
    }
    catch (error) {
        console.error("Error al obtener pedidos:", error);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
};

export const getPedidoById = async (req, res) => {
    const { id_pedido } = req.params;
    try {
        const pedido = await prisma.pedido.findUnique({
            where: { id_pedido: BigInt(id_pedido) },
            include: {
                detalle_pedido: {
                    include: {
                        producto: true,
                    },
                },
            },
        });
        if (!pedido) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }
        res.json(pedido);
    }
    catch (error) {
        console.error("Error al obtener pedido por ID:", error);
        res.status(500).json({ error: "Error al obtener pedido por ID" });
    }
};

export const getPedidoByUsuario = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const pedidos = await prisma.pedido.findMany({
            where: { id_usuario: BigInt(id_usuario) },
            include: {
                detalle_pedido: {
                    include: {
                        producto: true,
                    },
                },
            },
        });
        res.json(pedidos);
    }
    catch (error) {
        console.error("Error al obtener pedidos por usuario:", error);
        res.status(500).json({ error: "Error al obtener pedidos por usuario" });
    }
};

export const createPedido = async (req, res) => {
    const { id_usuario, envio, productos } = req.body;

    if (!id_usuario || !productos || productos.length === 0) {
        return res.status(400).json({ error: "Datos inválidos" });
    }

    try {
        for (const prod of productos) {
            const producto = await prisma.producto.findUnique({
                where: { id_producto: BigInt(prod.id_producto) },
                include: { stock: true }
            });

            if (!producto) {
                return res.status(404).json({ error: `Producto ${prod.id_producto} no encontrado` });
            }

            const stockDisponible = producto.stock?.cantidad || 0;
            if (stockDisponible < prod.cantidad) {
                return res.status(400).json({
                    error: `Stock insuficiente`
                });
            }
        }
        const nuevoPedido = await prisma.pedido.create({
            data: {
                id_usuario: BigInt(id_usuario),
                fecha: new Date(),
                estado: "Carrito",
                envio: envio || null,
                detalle_pedido: {
                    create: productos.map(producto => ({
                        id_producto: BigInt(producto.id_producto),
                        cantidad: producto.cantidad,
                    })),
                },

            },
            include: {
                detalle_pedido: {
                    include: {
                        producto: true,
                    },
                },
            },
        });
        res.status(201).json(nuevoPedido);
    }
    catch (error) {
        console.error("Error al crear pedido:", error);
        res.status(500).json({ error: "Error al crear pedido" });
    }
};

export const addProductoToPedido = async (req, res) => {
    const { id_pedido } = req.params;
    const { id_producto, cantidad } = req.body;

    if (!id_producto || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: "Datos inválidos" });
    }
    try {
        const pedido = await prisma.pedido.findUnique({
            where: { id_pedido: BigInt(id_pedido) },
        });
        if (!pedido) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }
        if (pedido.estado !== "Carrito") {
            return res.status(400).json({ error: "Solo se pueden modificar pedidos en estado Carrito" });
        }

        const producto = await prisma.producto.findUnique({
            where: { id_producto: BigInt(id_producto) },
            include: { stock: true }
        });
        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        const stockDisponible = producto.stock?.cantidad || 0;
        if (stockDisponible < cantidad) {
            return res.status(400).json({ error: "Stock insuficiente" });
        }

        const detalleExistente = await prisma.detalle_pedido.findFirst({
            where: {
                id_pedido: BigInt(id_pedido),
                id_producto: BigInt(id_producto),
            },
        });

        if (detalleExistente) {
            const detalleActualizado = await prisma.detalle_pedido.update({
                where: { id_detalle_pedido: detalleExistente.id_detalle_pedido },
                data: { cantidad: detalleExistente.cantidad + cantidad },
            });
            return res.status(200).json(detalleActualizado);
        }

        const nuevoDetalle = await prisma.detalle_pedido.create({
            data: {
                id_pedido: BigInt(id_pedido),
                id_producto: BigInt(id_producto),
                cantidad,
            },
            include: {
                producto: true,
            },
        });
        res.status(201).json(nuevoDetalle);
    } catch (error) {
        console.error("Error al agregar producto al pedido:", error);
        res.status(500).json({ error: "Error al agregar producto al pedido" });
    }
};

export const updateCantidadFromDetallePedido = async (req, res) => {
    const { id_detalle_pedido } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad <= 0) {
        return res.status(400).json({ error: "Cantidad inválida" });
    }

    try {
        const detalle = await prisma.detalle_pedido.findUnique({
            where: { id_detalle_pedido: BigInt(id_detalle_pedido) },
            include: {
                pedido: true,
                producto: {
                    include: { stock: true }
                },
            },
        });
        if (!detalle) {
            return res.status(404).json({ error: "Detalle de pedido no encontrado" });
        }
        if (detalle.pedido.estado !== "Carrito") {
            return res.status(400).json({ error: "Solo se pueden modificar pedidos en estado Carrito" });
        }
        const stockDisponible = detalle.producto.stock?.cantidad || 0;
        if (stockDisponible < cantidad) {
            return res.status(400).json({ error: "Stock insuficiente" });
        }

        const detalleActualizado = await prisma.detalle_pedido.update({
            where: { id_detalle_pedido: BigInt(id_detalle_pedido) },
            data: { cantidad },
            include: { producto: true },
        });
        res.status(200).json(detalleActualizado);
    } catch (error) {
        console.error("Error al actualizar producto en carrito:", error);
        res.status(500).json({ error: "Error al actualizar producto en carrito" });
    }
};

export const deleteProductoFromPedido = async (req, res) => {
    const { id_detalle_pedido } = req.params;
    try {
        const detalle = await prisma.detalle_pedido.findUnique({
            where: { id_detalle_pedido: BigInt(id_detalle_pedido) },
            include: {
                pedido: true,
            },
        });
        if (!detalle) {
            return res.status(404).json({ error: "Detalle de pedido no encontrado" });
        }
        if (detalle.pedido.estado !== "Carrito") {
            return res.status(400).json({ error: "Solo se pueden modificar pedidos en estado Carrito" });
        }

        await prisma.detalle_pedido.delete({
            where: { id_detalle_pedido: BigInt(id_detalle_pedido) },
        });
        res.status(200).json({ message: "Producto eliminado del pedido" });
    } catch (error) {
        console.error("Error al eliminar producto del pedido:", error);
        res.status(500).json({ error: "Error al eliminar producto del pedido" });
    }
};

// Obtener historial de pedidos del usuario autenticado
export const getHistorialPedidos = async (req, res) => {
    const id_usuario = req.user?.id;

    if (!id_usuario) {
        return res.status(401).json({ error: "Usuario no autenticado" });
    }

    try {
        const pedidos = await prisma.pedido.findMany({
            where: {
                id_usuario: BigInt(id_usuario),
                estado: {
                    not: "carrito" // Excluir pedidos en carrito
                }
            },
            include: {
                detalle_pedido: {
                    include: {
                        producto: true,
                    },
                },
                pago: true,
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        // Convertir BigInt a string para JSON
        const pedidosFormateados = pedidos.map(pedido => ({
            id_pedido: pedido.id_pedido.toString(),
            fecha: pedido.fecha,
            estado: pedido.estado,
            envio: pedido.envio,
            total: pedido.detalle_pedido.reduce((sum, item) =>
                sum + (item.cantidad * item.producto.precio), 0
            ),
            items: pedido.detalle_pedido.map(detalle => ({
                id_detalle: detalle.id_detalle_pedido.toString(),
                cantidad: detalle.cantidad,
                producto: {
                    id_producto: detalle.producto.id_producto.toString(),
                    nombre: detalle.producto.nombre,
                    precio: detalle.producto.precio,
                    url_imagen: detalle.producto.url_imagen
                }
            })),
            pago: pedido.pago[0] ? {
                medio: pedido.pago[0].medio,
                total: pedido.pago[0].total,
                fecha: pedido.pago[0].fecha
            } : null
        }));

        res.json(pedidosFormateados);
    } catch (error) {
        console.error("Error al obtener historial de pedidos:", error);
        res.status(500).json({ error: "Error al obtener historial de pedidos" });
    }
};

// Obtener todos los pedidos (solo para admin)
export const getPedidosAdmin = async (req, res) => {
    try {

        if (req.user?.rol !== "A") {
            return res.status(403).json({ message: "No autorizado" });
        }

        const pedidos = await prisma.pedido.findMany({
            include: {
                usuario: {
                    select: { id_usuario: true, nombre: true, correo: true },
                },
                pago: {
                    select: { id_pago: true, total: true, fecha: true, medio: true },
                },
                detalle_pedido: {
                    include: {
                        producto: {
                            select: { id_producto: true, nombre: true, precio: true, url_imagen: true },
                        },
                    },
                },
            },
            orderBy: { fecha: "desc" },
        });

        const pedidosFormateados = pedidos.map(formatPedidoAdmin);

        res.json(pedidosFormateados);
    } catch (error) {
        console.error("Error en getPedidosAdmin:", error);
        res.status(500).json({ message: "Error al obtener pedidos de admin" });
    }
};

export const updatePedidoEstadoAdmin = async (req, res) => {
    try {
        if (req.user?.rol !== "A") {
            return res.status(403).json({ message: "No autorizado" });
        }

        const { id_pedido } = req.params;
        const { estado } = req.body;

        const allowedEstados = ["confirmado", "entregado", "cancelado"];
        const normalizedEstado = estado?.toString().toLowerCase();

        if (!normalizedEstado || !allowedEstados.includes(normalizedEstado)) {
            return res.status(400).json({ message: "Estado inválido" });
        }

        const pedidoExistente = await prisma.pedido.findUnique({
            where: { id_pedido: BigInt(id_pedido) },
        });

        if (!pedidoExistente) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        const pedidoActualizado = await prisma.pedido.update({
            where: { id_pedido: BigInt(id_pedido) },
            data: { estado: normalizedEstado },
            include: {
                usuario: {
                    select: { id_usuario: true, nombre: true, correo: true },
                },
                pago: {
                    select: { id_pago: true, total: true, fecha: true, medio: true },
                },
                detalle_pedido: {
                    include: {
                        producto: {
                            select: { id_producto: true, nombre: true, precio: true, url_imagen: true },
                        },
                    },
                },
            },
        });
        res.json(formatPedidoAdmin(pedidoActualizado));
        logAuditoria({
            req,
            accion: normalizedEstado === 'entregado' ? 'Pedido entregado'
                : normalizedEstado === 'cancelado' ? 'Pedido cancelado'
                    : 'restablecer pedido',
            recurso: 'pedido',
            recursoId: String(id_pedido),
            meta: {
                estadoPrevio: pedidoExistente.estado,
                estadoNuevo: normalizedEstado,
                usuarioPedidoId: pedidoActualizado.usuario?.id_usuario ? String(pedidoActualizado.usuario.id_usuario) : null,
                cantidadProductos: (pedidoActualizado.detalle_pedido.length || []).length,
            }
        });
    } catch (error) {
        console.error("Error al actualizar estado del pedido:", error);
        res.status(500).json({ message: "Error al actualizar el estado del pedido" });
    }
};



