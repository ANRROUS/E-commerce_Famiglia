import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook personalizado para escuchar eventos de voz del servidor MCP
 * Conecta los comandos de voz con acciones de la UI
 * 
 * @param {Function} setOpenModal - Función para abrir modales (del Footer)
 */
export const useVoiceEvents = (setOpenModal) => {
    const navigate = useNavigate();

    useEffect(() => {
        // 1. HANDLER: Abrir Modales
        const handleVoiceOpenModal = (event) => {
            const { type } = event.detail;
            console.log('[Voice Events] Abriendo modal:', type);

            // Mapear tipos de modal del MCP a los del Footer
            const modalMapping = {
                'about': 'quienes',      // Quiénes somos
                'terms': 'terminos',     // Términos y condiciones
                'privacy': 'privacidad'  // Política de privacidad
            };

            const modalType = modalMapping[type];

            if (modalType) {
                // Scroll arriba para mejor UX
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Abrir el modal
                if (setOpenModal) {
                    setOpenModal(modalType);
                } else {
                    // Fallback: navegar a la ruta
                    navigate(`/${modalType}`);
                }
            } else {
                console.warn('[Voice Events] Tipo de modal desconocido:', type);
            }
        };

        // 2. HANDLER: Abrir Enlaces Externos
        const handleVoiceOpenLink = (event) => {
            const { target } = event.detail;
            console.log('[Voice Events] Abriendo enlace externo:', target);

            const linkMapping = {
                'whatsapp': 'https://wa.me/51999999999', // TODO: Actualizar con número real
                'maps': 'https://maps.app.goo.gl/rYYDD2HYf5QmBSDq7',
                'instagram': 'https://www.instagram.com/famiglia', // TODO: Actualizar
                'facebook': 'https://www.facebook.com/famiglia'  // TODO: Actualizar
            };

            const url = linkMapping[target];

            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                console.warn('[Voice Events] Enlace externo desconocido:', target);
            }
        };

        // Registrar event listeners
        window.addEventListener('voice:open-modal', handleVoiceOpenModal);
        window.addEventListener('voice:open-link', handleVoiceOpenLink);

        console.log('[Voice Events] ✓ Event listeners de voz registrados');

        // Cleanup
        return () => {
            window.removeEventListener('voice:open-modal', handleVoiceOpenModal);
            window.removeEventListener('voice:open-link', handleVoiceOpenLink);
            console.log('[Voice Events] Event listeners de voz removidos');
        };
    }, [setOpenModal, navigate]);
};

export default useVoiceEvents;
