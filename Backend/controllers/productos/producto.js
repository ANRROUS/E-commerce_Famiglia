import prisma from '../../prismaClient.js';

export const getProductos = async (req, res) => {
    try {
        // Obtener productos con información de ventas y stock
        const productos = await prisma.producto.findMany({
            include: {
                categoria: true,
                stock: true,
                detalle_pedido: {
                    select: {
                        cantidad: true
                    }
                }
            }
        });

        // Calcular ventas totales para cada producto y aplanar stock
        const productosConVentas = productos.map(producto => {
            const totalVendido = producto.detalle_pedido.reduce(
                (sum, detalle) => sum + (detalle.cantidad || 0),
                0
            );

            // Eliminar detalle_pedido del objeto final y agregar totalVendido
            const { detalle_pedido, stock, ...productoSinDetalle } = producto;

            return {
                ...productoSinDetalle,
                stock: stock?.cantidad || 0,
                totalVendido
            };
        });

        res.json(productosConVentas);

    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ error: "Error al obtener productos" });
    }
};

export const getProductoById = async (req, res) => {
    const { id } = req.params;
    try {
        const producto = await prisma.producto.findUnique({
            where: { id_producto: BigInt(id) },
            include: {
                categoria: true,
                stock: true
            }
        });
        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        // Aplanar el objeto stock
        const { stock, ...productoSinStock } = producto;
        res.json({
            ...productoSinStock,
            stock: stock?.cantidad || 0
        });

    } catch (error) {
        console.error("Error al obtener producto:", error);
        res.status(500).json({ error: "Error al obtener producto" });
    }
};

export const getProductosByCategoria = async (req, res) => {
    try {
        const { id_categoria } = req.params;
        const productos = await prisma.producto.findMany({
            where: { id_categoria: BigInt(id_categoria) },
            include: { stock: true }
        });

        const productosConStock = productos.map(p => {
            const { stock, ...rest } = p;
            return {
                ...rest,
                stock: stock?.cantidad || 0
            };
        });

        res.json(productosConStock);
    } catch (error) {
        console.error("Error al obtener productos por categoría:", error);
        res.status(500).json({ error: "Error al obtener productos por categoría" });
    }
};
