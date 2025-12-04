import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './config/passportConfig.js';

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
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Session for Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'famiglia-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(setAnonId);

app.use('/auditoria', auditoriaRouter);

app.use('/productos', productoRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/api/auth', authRoutes);
app.use('/contact', contactRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/pedido/carrito', carritoRoutes);
app.use('/api/pedido/pago', pagoRoutes);
app.use('/pedidos', pedidoRoutes);


export default app;
