import prisma from "../../prismaClient.js";
import crypto from "crypto";
import { logAuditoria } from "../../services/auditoriaService.js";

// Función para generar el hash del ID del pedido
const hashOrderId = (id) => {
  const hash = crypto.createHash('sha256').update(id.toString()).digest('hex');
  return `SA-${hash.substring(0, 8).toUpperCase()}`;
};

export const procesarPago = async (req, res) => {
    const id_usuario = req.user?.id;
    const { medio, numero, cod_ver, envio } = req.body;

    if (!id_usuario) {
        return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!medio || !numero || !cod_ver) {
        return res.status(400).json({ error: "Datos de pago incompletos" });
    }

    try {
        // Buscar el pedido en estado "carrito" del usuario
        const pedido = await prisma.pedido.findFirst({
            where: { 
                id_usuario: BigInt(id_usuario),
                estado: "carrito"
            },
            include: {
                detalle_pedido: {
                    include: {
                        producto: {
                            include: {
                                stock: true
                            }
                        }
                    },
                },
            },
        });

        if (!pedido) {
            return res.status(404).json({ error: "No hay pedido en carrito" });
        }

        if (pedido.detalle_pedido.length === 0) {
            return res.status(400).json({ error: "El pedido no tiene productos" });
        }

        // Validar stock
        for (const item of pedido.detalle_pedido) {
            const stockDisponible = item.producto.stock?.cantidad || 0;
            if (stockDisponible < item.cantidad) {
                return res.status(400).json({ 
                    error: `Stock insuficiente para el producto: ${item.producto.nombre}. Disponible: ${stockDisponible}, Solicitado: ${item.cantidad}` 
                });
            }
        }

        // Calcular el total
        const total = pedido.detalle_pedido.reduce((sum, item) => {
            return sum + (item.cantidad * item.producto.precio);
        }, 0);

        // Iniciar transacción
        const result = await prisma.$transaction(async (prisma) => {
            // Decrementar stock
            for (const item of pedido.detalle_pedido) {
                await prisma.stock.update({
                    where: { id_producto: item.producto.id_producto },
                    data: {
                        cantidad: {
                            decrement: item.cantidad
                        }
                    }
                });
            }

            // Crear el registro de pago
            const pago = await prisma.pago.create({
                data: {
                    id_pedido: pedido.id_pedido,
                    medio,
                    numero: parseInt(numero),
                    cod_ver: parseInt(cod_ver),
                    total,
                    fecha: new Date(),
                },
            });

            // Actualizar el estado del pedido
            await prisma.pedido.update({
                where: { id_pedido: pedido.id_pedido },
                data: { 
                    estado: "confirmado",
                    envio: envio || "pendiente",
                    fecha: new Date()
                },
            });

            return pago;
        });

        // Generar el hash del ID del pedido para mostrar al usuario
        const hashedOrderId = hashOrderId(pedido.id_pedido);

        res.status(201).json({ 
            mensaje: "Pago procesado exitosamente", 
            pago: {
                id_pago: result.id_pago.toString(),
                medio: result.medio,
                total: result.total,
                fecha: result.fecha
            },
            pedido: {
                id_pedido: hashedOrderId,
                estado: "confirmado",
                total: total
            }
        });
        logAuditoria({
            accion: 'compra',
            recurso: 'pedido',  
            recursoId: pedido.id_pedido,
            req,
            meta: { 
                medio, 
                total
            }
        });
    } catch (error) {
        console.error("Error al procesar pago:", error);
        res.status(500).json({ error: "Error al procesar pago" });
    }
};



