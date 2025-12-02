import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { processVoiceCommand, checkVoiceAvailability } from '../services/api/voiceApiClient';
import { useLoginModal } from './LoginModalContext';
import { authAPI } from '../services/api';

/**
 * Contexto global para el sistema de navegación por voz
 * Centraliza el estado y las funciones de voz en toda la aplicación
 */
const VoiceContext = createContext(null);

/**
 * Estados posibles del sistema de voz
 */
export const VoiceState = {
  IDLE: 'idle',              // Inactivo, esperando
  LISTENING: 'listening',    // Escuchando al usuario
  PROCESSING: 'processing',  // Procesando comando con IA
  EXECUTING: 'executing',    // Ejecutando acciones
  ERROR: 'error'             // Error ocurrió
};

/**
 * Provider del contexto de voz
 */
export function VoiceProvider({ children }) {
  // 🔐 Estado de autenticación desde Redux
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const { openLoginModal, isLoginModalOpen } = useLoginModal();

  // Hooks de voz con contexto de página actual
  const voiceRecognition = useVoiceRecognition({
    language: 'es-ES',
    continuous: false,
    interimResults: true,
    context: {
      pathname: window.location.pathname,
      page: window.location.pathname,
      isAuthenticated,
      user: user ? { id: user.id, nombre: user.nombre, rol: user.rol } : null
    }
  });

  // Hook de Text-to-Speech
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  // Estado global
  const [state, setState] = useState(VoiceState.IDLE);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [commandHistory, setCommandHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('voice_command_history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('[Voice Context] Error cargando historial:', error);
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isEnabled, setIsEnabled] = useState(true);

  // Estado para la voz seleccionada
  const [selectedVoice, setSelectedVoice] = useState(() => {
    try {
      const saved = localStorage.getItem('voice_preference');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('[Voice Context] Error cargando preferencia de voz:', error);
      return null;
    }
  });

  // Guardar preferencia de voz
  useEffect(() => {
    if (selectedVoice) {
      localStorage.setItem('voice_preference', JSON.stringify(selectedVoice));
    }
  }, [selectedVoice]);

  // Estado para comandos registrados por página
  const [registeredCommands, setRegisteredCommands] = useState({});
  const currentPath = window.location.pathname;

  // Guardar historial en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voice_command_history', JSON.stringify(commandHistory));
    } catch (error) {
      console.error('[Voice Context] Error guardando historial:', error);
    }
  }, [commandHistory]);

  // Verificar disponibilidad al cargar
  useEffect(() => {
    const availability = checkVoiceAvailability();
    console.log('[Voice Context] Disponibilidad:', availability);

    if (!availability.isFullySupported) {
      setError('Tu navegador no soporta navegación por voz completamente');
    }
  }, []);

  // Sincronizar estado con voiceRecognition
  useEffect(() => {
    if (voiceRecognition.isListening) {
      setState(VoiceState.LISTENING);
      setError(null);
    } else if (state === VoiceState.LISTENING) {
      if (voiceRecognition.transcript) {
        handleVoiceCommand(voiceRecognition.transcript);
      } else {
        setState(VoiceState.IDLE);
      }
    }
  }, [voiceRecognition.isListening, voiceRecognition.transcript]);

  // Manejar errores de reconocimiento de voz
  useEffect(() => {
    if (voiceRecognition.error) {
      const errorMessages = {
        'no-speech': 'No te escuché. Por favor, intenta de nuevo.',
        'audio-capture': 'No se pudo acceder al micrófono. Verifica los permisos.',
        'not-allowed': 'Permiso denegado. Habilita el micrófono en la configuración del navegador.',
        'network': 'Error de conexión. Verifica tu internet.',
        'aborted': 'Reconocimiento cancelado.',
        'bad-grammar': 'Error en el procesamiento del audio.',
      };

      const errorType = voiceRecognition.error.toLowerCase();
      const specificMessage = errorMessages[errorType] || voiceRecognition.error;

      setError(specificMessage);
      setLastResponse(specificMessage);
      setState(VoiceState.ERROR);
    }
  }, [voiceRecognition.error]);

  // 🆕 ESCUCHAR EVENTOS DE MCP (Bridge Backend -> Frontend)
  useEffect(() => {
    const handleOpenModal = (event) => {
      const { type } = event.detail;
      console.log('[Voice Context] Evento recibido: open-modal', type);
      if (type === 'login') openLoginModal();
    };

    const handleOpenLink = (event) => {
      const { target } = event.detail;
      console.log('[Voice Context] Evento recibido: open-link', target);

      const links = {
        'whatsapp': 'https://wa.me/51987654321',
        'maps': 'https://maps.google.com/?q=Famiglia+Pasteleria',
        'instagram': 'https://instagram.com/famiglia',
        'facebook': 'https://facebook.com/famiglia'
      };

      if (links[target]) {
        window.open(links[target], '_blank');
        speak(`Abriendo ${target}`);
      }
    };

    window.addEventListener('voice:open-modal', handleOpenModal);
    window.addEventListener('voice:open-link', handleOpenLink);

    return () => {
      window.removeEventListener('voice:open-modal', handleOpenModal);
      window.removeEventListener('voice:open-link', handleOpenLink);
    };
  }, [openLoginModal, speak]);

  /**
   * Obtiene el contexto actual de la página para enviarlo a la IA
   */
  const getPageContext = useCallback(() => {
    const path = window.location.pathname;

    // 1. Detectar Modales
    const genericModal = document.querySelector('.fixed.inset-0.z-\\[9999\\]');
    const modalTitle = genericModal?.querySelector('h2')?.innerText;

    const activeModals = [];
    if (isLoginModalOpen) activeModals.push('LoginModal');
    if (genericModal) activeModals.push(`GenericModal: ${modalTitle || 'Untitled'}`);

    const context = {
      path,
      title: document.title,
      isAuthenticated,
      user: user ? { id: user.id, nombre: user.nombre, rol: user.rol } : null,
      ui: {
        modals: activeModals,
        isModalOpen: activeModals.length > 0
      },
      cart: {
        itemCount: cart.items.length,
        total: cart.totalAmount,
        items: cart.items.map(item => ({
          id: item.id_detalle,
          productId: item.id_producto,
          name: item.nombre,
          quantity: item.cantidad,
          price: item.precio
        }))
      },
      visibleProducts: [],
      formState: {}
    };

    // 2. Scraping específico por página
    if (path.includes('/carta') || path === '/') {
      const productCards = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm');
      const products = Array.from(productCards).map(card => {
        const nameEl = card.querySelector('h3');
        const priceEl = card.querySelector('.text-xl.font-bold.text-red-600');
        return {
          name: nameEl?.innerText || 'Desconocido',
          price: priceEl?.innerText || '0.00',
          visible: true
        };
      }).slice(0, 10);
      context.visibleProducts = products;
    }

    // 3. Scraping de Formulario de Pago
    if (path === '/payment') {
      const phoneInput = document.querySelector('input[placeholder="987654321"]');
      const codeInput = document.querySelector('input[placeholder="123456"]');
      const checkedRadio = document.querySelector('input[type="radio"]:checked');

      context.formState = {
        phoneNumber: phoneInput?.value || '',
        verificationCode: codeInput?.value || '',
        paymentMethod: checkedRadio?.value || 'unknown'
      };
    }

    return context;
  }, [isAuthenticated, user, cart, isLoginModalOpen]);

  /**
   * Procesa un comando de voz enviándolo al backend
   */
  const handleVoiceCommand = useCallback(async (transcript) => {
    if (!transcript || transcript.trim() === '') return;

    try {
      console.log('[Voice Context] Procesando comando:', transcript);

      // 1. Obtener contexto rico
      const context = getPageContext();
      console.log('[Voice Context] Contexto generado:', context);

      setState(VoiceState.PROCESSING);
      setProcessing(true);
      setLastCommand(transcript);

      // 2. Enviar a Gemini (Backend)
      const response = await processVoiceCommand(transcript, context);
      console.log('[Voice Context] Respuesta Gemini:', response);

      // 3. Procesar respuesta
      if (response.success) {
        // Feedback de voz
        if (response.data?.userFeedback) {
          speak(response.data.userFeedback, { voiceName: selectedVoice?.name });
          setLastResponse(response.data.userFeedback);
        }

        // Actualizar historial
        setCommandHistory(prev => [...prev, {
          timestamp: new Date().toISOString(),
          command: transcript,
          response,
          success: true
        }].slice(-10));

        setState(VoiceState.EXECUTING);

        // Resetear estado después de un tiempo
        setTimeout(() => {
          setProcessing(false);
          setState(VoiceState.IDLE);
          voiceRecognition.resetTranscript();
        }, 2000);

      } else {
        throw new Error(response.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('[Voice Context] Error:', error);
      setProcessing(false);
      const errorMessage = 'Lo siento, hubo un error al procesar tu comando';
      setError(error.message);
      setLastResponse(errorMessage);
      setState(VoiceState.ERROR);
      speak(errorMessage);

      setTimeout(() => {
        setState(VoiceState.IDLE);
        voiceRecognition.resetTranscript();
      }, 3000);
    }
  }, [voiceRecognition, speak, getPageContext]);

  /**
   * 🔐 Maneja el cierre de sesión por voz
   */
  const handleVoiceLogout = useCallback(async () => {
    try {
      await authAPI.logout();
      speak('Cerrando sesión exitosamente');
    } catch (err) {
      console.error('[Voice Context] Error al cerrar sesión:', err);
      speak('Error al conectar con el servidor, cerrando sesión localmente');
    } finally {
      // Limpiar todos los tokens y datos locales
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      localStorage.removeItem("fotoPerfil");
      sessionStorage.clear();
      
      // Limpiar cookies
      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Actualizar estado de Redux
      dispatch(logout());
      
      // Navegar al home y recargar
      window.location.href = '/';
    }
  }, [dispatch, speak]);

  /**
   * Inicia la escucha de voz (sin modal)
   */
  const startVoiceCommand = useCallback(() => {
    if (!isEnabled) {
      console.warn('[Voice Context] Sistema de voz deshabilitado');
      return;
    }
    if (state !== VoiceState.IDLE) {
      console.warn('[Voice Context] Sistema ocupado, estado:', state);
      return;
    }
    setError(null);
    setIsModalOpen(false);
    voiceRecognition.startListening();
  }, [isEnabled, state, voiceRecognition]);

  /**
   * Cancela el comando de voz actual
   */
  const cancelVoiceCommand = useCallback(() => {
    voiceRecognition.stopListening();
    setState(VoiceState.IDLE);
    setError(null);
    setIsModalOpen(false);
    voiceRecognition.resetTranscript();
  }, [voiceRecognition]);

  /**
   * Abre el modal de voz
   */
  const openVoiceModal = useCallback(() => {
    setIsModalOpen(true);
    startVoiceCommand();
  }, [startVoiceCommand]);

  /**
   * Cierra el modal de voz
   */
  const closeVoiceModal = useCallback(() => {
    cancelVoiceCommand();
    setIsModalOpen(false);
  }, [cancelVoiceCommand]);

  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);

  /**
   * Habilita/deshabilita el sistema de voz
   */
  const toggleVoice = useCallback((enabled) => {
    setIsEnabled(enabled);
    if (!enabled) cancelVoiceCommand();
  }, [cancelVoiceCommand]);

  /**
   * Limpia el historial de comandos
   */
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    setHistoryIndex(-1);
    localStorage.removeItem('voice_command_history');
  }, []);

  /**
   * Navega en el historial con flechas (↑↓)
   */
  const navigateHistory = useCallback((direction) => {
    if (commandHistory.length === 0) return null;
    let newIndex = historyIndex;

    if (direction === 'up') {
      newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) newIndex = commandHistory.length - 1;
    } else if (direction === 'down') {
      newIndex = historyIndex - 1;
      if (newIndex < -1) newIndex = -1;
    }

    setHistoryIndex(newIndex);
    if (newIndex === -1) return null;

    const historyCommand = commandHistory[commandHistory.length - 1 - newIndex];
    return historyCommand?.command || null;
  }, [commandHistory, historyIndex]);

  // Event listener para navegación con flechas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (state !== VoiceState.IDLE) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 'up' : 'down';
        const command = navigateHistory(direction);
        if (command) handleVoiceCommand(command);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, navigateHistory, handleVoiceCommand]);

  /**
   * Registra comandos de voz específicos para la página actual
   */
  const registerCommands = useCallback((commands) => {
    const path = window.location.pathname;
    setRegisteredCommands(prev => ({
      ...prev,
      [path]: { ...(prev[path] || {}), ...commands }
    }));
  }, []);

  /**
   * Elimina comandos registrados para la página actual
   */
  const unregisterCommands = useCallback(() => {
    const path = window.location.pathname;
    setRegisteredCommands(prev => {
      const newCommands = { ...prev };
      delete newCommands[path];
      return newCommands;
    });
  }, []);

  /**
   * Obtiene los comandos disponibles para la página actual
   */
  const getAvailableCommands = useCallback(() => {
    const path = window.location.pathname;
    const pageCommands = registeredCommands[path] || {};
    const commandNames = Object.keys(pageCommands);
    const globalCommands = ['ir al inicio', 'ir al catálogo', 'ir al carrito', 'ir al perfil', 'ayuda'];

    return {
      page: commandNames,
      global: globalCommands,
      all: [...commandNames, ...globalCommands]
    };
  }, [registeredCommands]);

  const checkAuthentication = useCallback(() => isAuthenticated, [isAuthenticated]);

  const requireAuth = useCallback((action, requirementMessage = 'Necesitas iniciar sesión') => {
    if (!isAuthenticated) {
      speak(requirementMessage);
      openLoginModal();
      return false;
    }
    action();
    return true;
  }, [isAuthenticated, speak, openLoginModal]);

  const getCurrentUser = useCallback(() => user, [user]);

  const value = {
    state, error, isModalOpen, lastCommand, lastResponse, commandHistory, historyIndex, isEnabled,
    isAuthenticated, user, voiceRecognition,
    startVoiceCommand, cancelVoiceCommand, openVoiceModal, closeVoiceModal, toggleVoice,
    clearHistory, navigateHistory, registerCommands, unregisterCommands, getAvailableCommands,
    checkAuthentication, requireAuth, getCurrentUser,
    speak, stopSpeaking, isSpeaking,
    isSupported: voiceRecognition.isSupported,
    isListening: voiceRecognition.isListening,
    isProcessing: state === VoiceState.PROCESSING || state === VoiceState.EXECUTING,
    currentTranscript: voiceRecognition.fullTranscript,
    selectedVoice, setSelectedVoice,
    isSettingsModalOpen, openSettingsModal, closeSettingsModal
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice debe usarse dentro de un VoiceProvider');
  return context;
}

export default VoiceContext;
