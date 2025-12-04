import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import productoRoutes from './routes/productos/productoRoutes.js';
import categoriaRoutes from './routes/productos/categoriaRoutes.js';
import authRoutes from './routes/usuario/auth.route.js';
import contactRoutes from './routes/contactRoutes.js';
import preferencesRoutes from './routes/preferences/preferencesRoutes.js';
import pedidoRoutes from './routes/pedido/pedidoRoutes.js';
import pagoRoutes from './routes/pedido/pagoRoutes.js';
import carritoRoutes from './routes/pedido/carritoRoutes.js';

import { setAnonId } from './middleware/auditoriaMiddleware.js';
import auditoriaRouter from './routes/auditoria/auditoriaRoutes.js';

const app = express();
app.use(morgan('dev'));
app.use(cors({
    origin: 'https://radiant-truth-production.up.railway.app',
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());

app.use(setAnonId);

app.use('/auditoria', auditoriaRouter);

app.use('/productos', productoRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/auth', authRoutes);
app.use('/contact', contactRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/pedido/carrito', carritoRoutes);
app.use('/api/pedido/pago', pagoRoutes);
app.use('/pedidos', pedidoRoutes);


export default app;
