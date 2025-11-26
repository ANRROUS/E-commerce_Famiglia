import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LoginModalProvider } from "./context/LoginModalContext";
import { VoiceProvider } from "./context/VoiceContext";
import { useLoginModal } from "./context/LoginModalContext";
import LoginForm from "./components/forms/LoginForm";
import { VoiceAvatarFloating } from "./components/voice/VoiceAvatarFloating";
import { usePageGreeting } from "./hooks/usePageGreeting";
import VoiceSettingsModal from "./components/common/VoiceSettingsModal";
import { useVoice } from "./context/VoiceContext";
import Home from "./pages/Home";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import HeaderAdmin from "./components/layout/HeaderAdmin";
import ContactUs from "./pages/ContactUs";
import Cart from "./pages/Cart";
import Payment from "./pages/Payment";
import OrderConfirmation from "./pages/OrderConfirmation";
import Profile from "./pages/Profile";
import Catalog from "./pages/Catalog";
import PreferencesTest from './pages/PreferencesTest';
import VoiceTest from './pages/VoiceTest';
import TerminosPage from './pages/TerminosPage';
import PrivacidadPage from './pages/PrivacidadPage';
import QuienesSomosPage from './pages/QuienesSomosPage';
import ProtectedRoute from "./components/common/ProtectedRoute";
import Delivery from "./pages/Delivery";
import Complaints from "./pages/Complaints";
import { setUser, authCheckComplete } from "./redux/slices/authSlice";
import { authAPI } from "./services/api";
import { SnackbarProvider } from 'notistack';

import { enviarEventoAuditoria } from "./services/api/auditoriaClient.js";

// 🔹 Controla la visibilidad del Header
// Admin pages
import PedidosAdmin from './pages/PedidoAdmin';
import CatalogoAdmin from './pages/CatalogoAdmin';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { role } = useSelector((state) => state.auth);
  const { isLoginModalOpen, hideLoginModal } = useLoginModal();
  const { isSettingsModalOpen, closeSettingsModal, openSettingsModal, registerCommands, unregisterCommands, speak } = useVoice();

  // 1. Saludo contextual por página
  usePageGreeting();

  // 2. Registrar comandos globales de configuración
  useEffect(() => {
    const globalCommands = {
      'configurar voz': () => {
        openSettingsModal();
        speak('Abriendo configuración de voz');
      },
      'cambiar voz': () => {
        openSettingsModal();
        speak('Abriendo configuración de voz');
      }
    };

    registerCommands(globalCommands);
    return () => unregisterCommands();
  }, [registerCommands, unregisterCommands, openSettingsModal, speak]);

  const usuario = useSelector(state => state.auth.user);
  const usuarioId = usuario?.id || usuario?.id_usuario || null;

  // Exponer función de navegación para MCP Playwright
  useEffect(() => {
    window.__navigateViaReactRouter = (route) => {
      console.log('[React Router] Navegando via MCP:', route);
      navigate(route);
    };

    return () => {
      delete window.__navigateViaReactRouter;
    };
  }, [navigate]);

  // Verificar autenticación al cargar la app (SOLO UNA VEZ)
  // Determinar si es una ruta admin
  const isAdminRoute =
    location.pathname.startsWith("/pedidos-admin") ||
    location.pathname.startsWith("/catalogo-admin");

  const isAdminUser = role === "A";
  const showAdminHeader = isAdminUser && isAdminRoute;

  // Ocultar header en home
  const hideHeader = location.pathname === "/" || location.pathname === "/home";

  // Verificar autenticación al cargar la app
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const response = await authAPI.getPerfil();
        if (isMounted) dispatch(setUser(response.data.usuario));
      } catch {
        console.log("Usuario no autenticado");
        if (isMounted) {
          dispatch(authCheckComplete());
        }
      }
    };
    checkAuth();
    return () => { isMounted = false; };
  }, [dispatch]);

  useEffect(() => {
    const usuarioLogueado = Boolean(usuarioId);
    enviarEventoAuditoria({
      accion: 'visualizar',
      recurso: 'pagina',
      ruta: location.pathname + location.search,
      meta: {
        titulo: document.title || null,
        usuarioId
      }
    }, usuarioLogueado);
  }, [location, usuarioId]);

  useEffect(() => {
    const publicRoutes = [
      "/", "/home", "/contact-us", "/complaints", "/terminos",
      "/privacidad", "/quienes-somos", "/carta", "/delivery"
    ];

    if (publicRoutes.includes(location.pathname)) {
      localStorage.setItem("lastSafePath", location.pathname);
    }
  }, [location.pathname]);

  return (
    <>
      {!hideHeader && (showAdminHeader ? <HeaderAdmin /> : <Header />)}

      <main className="min-h-screen flex justify-center">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/terminos" element={<TerminosPage />} />
          <Route path="/privacidad" element={<PrivacidadPage />} />
          <Route path="/quienes-somos" element={<QuienesSomosPage />} />
          <Route path="/carta" element={<Catalog />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/voice-test" element={<VoiceTest />} />

          {/* Admin */}
          <Route
            path="/pedidos-admin"
            element={
              <ProtectedRoute allowedRoles={["A"]} fallbackPath="/carta">
                <PedidosAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogo-admin"
            element={
              <ProtectedRoute allowedRoles={["A"]} fallbackPath="/carta">
                <CatalogoAdmin />
              </ProtectedRoute>
            }
          />

          {/* Rutas protegidas */}
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/test" element={<ProtectedRoute><PreferencesTest /></ProtectedRoute>} />
        </Routes>
      </main>

      <Footer />
      <LoginForm isOpen={isLoginModalOpen} onClose={hideLoginModal} />
      <VoiceSettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />

      {/* Avatar flotante de voz en esquina inferior derecha */}
      <VoiceAvatarFloating />
    </>
  );
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <LoginModalProvider>
        <VoiceProvider>
          <Layout />
        </VoiceProvider>
      </LoginModalProvider>
    </BrowserRouter>
  );
}

export default App;
