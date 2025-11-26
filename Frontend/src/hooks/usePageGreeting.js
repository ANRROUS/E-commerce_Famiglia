import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useVoice } from '../context/VoiceContext';

/**
 * Hook para dar la bienvenida contextual al usuario cuando cambia de página
 */
export const usePageGreeting = () => {
    const location = useLocation();
    const { speak, isEnabled } = useVoice();
    const lastPathRef = useRef(location.pathname);
    const hasGreetedRef = useRef(false);

    const greetings = {
        '/': 'Bienvenido a Famiglia. Aquí puedes ver nuestros productos destacados y ofertas.',
        '/carta': 'Estás en la carta. Puedes buscar productos, filtrar por categoría o precio, y agregar items a tu carrito.',
        '/cart': 'Este es tu carrito de compras. Puedes revisar tus productos, cambiar cantidades o proceder al pago.',
        '/profile': 'Estás en tu perfil. Aquí puedes ver tus pedidos anteriores y tus tests de preferencias.',
        '/payment': 'Estás en la página de pago. Por favor completa tus datos para finalizar la compra.',
        '/pedidos-admin': 'Panel de administración de pedidos. Puedes filtrar por estado y actualizar el seguimiento de los pedidos.',
        '/catalogo-admin': 'Gestión del catálogo. Puedes buscar productos y actualizar sus precios o stock.',
        '/login': 'Inicia sesión para acceder a tu cuenta.',
        '/register': 'Regístrate para disfrutar de todos los beneficios de Famiglia.'
    };

    useEffect(() => {
        // Si el sistema de voz está desactivado, no hacemos nada
        if (!isEnabled) return;

        // Evitar saludo duplicado en la misma página (por re-renders)
        if (location.pathname === lastPathRef.current && hasGreetedRef.current) {
            return;
        }

        // Actualizar referencias
        lastPathRef.current = location.pathname;
        hasGreetedRef.current = true;

        // Obtener mensaje
        const message = greetings[location.pathname];

        // Si hay mensaje, hablar con un pequeño delay para dar tiempo a la carga visual
        if (message) {
            const timer = setTimeout(() => {
                speak(message);
            }, 500);
            return () => clearTimeout(timer);
        }

    }, [location.pathname, speak, isEnabled]);

    return null; // Este hook no renderiza nada
};
