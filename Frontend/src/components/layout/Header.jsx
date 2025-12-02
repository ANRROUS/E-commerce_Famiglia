import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useNavigate, useLocation } from "react-router-dom";
import imgLogoFamiglia from "../../assets/images/img_logoFamigliawithoutBorders.png";
import RegisterForm from "../forms/RegisterForm";
import LoginForm from "../forms/LoginForm";
import { logout } from "../../redux/slices/authSlice";
import { authAPI } from "../../services/api";
import { useLoginModal } from "../../context/LoginModalContext";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [underlineStyle, setUnderlineStyle] = useState({});
  const [showRegister, setShowRegister] = useState(false);
  const { isLoginModalOpen: showLogin, showLoginModal, hideLoginModal } = useLoginModal();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 969);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { totalQuantity } = useSelector((state) => state.cart);

  const navRefs = {
    home: useRef(null),
    carta: useRef(null),
    delivery: useRef(null),
    test: useRef(null),
    contact: useRef(null),
  };

  // 🔹 Detecta cambio de tamaño de ventana
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 969);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🔹 Subrayado dinámico (mejorado)
  useEffect(() => {
    const path = location.pathname;
    const mapping = {
      "/": navRefs.home,
      "/carta": navRefs.carta,
      "/delivery": navRefs.delivery,
      "/test": navRefs.test,
      "/contact-us": navRefs.contact,
    };

    const activeRef = Object.entries(mapping).find(([key]) => path === key)?.[1];

    if (activeRef?.current) {
      const rect = activeRef.current.getBoundingClientRect();
      const parentRect = activeRef.current.parentNode.getBoundingClientRect();
      setUnderlineStyle({
        width: rect.width,
        left: rect.left - parentRect.left,
      });
    }
  }, [location.pathname]);

  // 🔹 Recalcula al redimensionar ventana
  useEffect(() => {
    const updateUnderline = () => {
      const path = location.pathname;
      const mapping = {
        "/": navRefs.home,
        "/carta": navRefs.carta,
        "/delivery": navRefs.delivery,
        "/test": navRefs.test,
        "/contact-us": navRefs.contact,
      };

      const activeRef = Object.entries(mapping).find(([key]) => path === key)?.[1];
      if (activeRef?.current) {
        const rect = activeRef.current.getBoundingClientRect();
        const parentRect = activeRef.current.parentNode.getBoundingClientRect();
        setUnderlineStyle({
          width: rect.width,
          left: rect.left - parentRect.left,
        });
      }
    };

    window.addEventListener("resize", updateUnderline);
    return () => window.removeEventListener("resize", updateUnderline);
  }, [location.pathname]);

  // 🔹 Navegación
  const handleNavigation = (path) => {
    navigate(path);
  };

  // 🔹 Logout
  const handleLogout = async () => {
    try {
      // Llamar al endpoint de logout primero
      await authAPI.logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Continuar con el logout local incluso si hay error en el servidor
    } finally {
      // Limpiar todos los tokens y datos locales
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      localStorage.removeItem("fotoPerfil");
      sessionStorage.clear();
      
      // Limpiar cookies (aunque sean HTTPOnly, intentamos limpiarlas)
      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Actualizar estado de Redux
      dispatch(logout());
      
      // Navegar al home
      handleNavigation("/");
      
      // Opcional: recargar la página para asegurar limpieza completa
      setTimeout(() => window.location.reload(), 100);
    }
  };

  const navLinks = [
    { label: "Home", path: "/", ref: navRefs.home },
    { label: "Carta", path: "/carta", ref: navRefs.carta },
    { label: "Delivery", path: "/delivery", ref: navRefs.delivery },
    { label: "Test", path: "/test", ref: navRefs.test },
    { label: "Contáctanos", path: "/contact-us", ref: navRefs.contact },
  ];

  const buttonStyles = {
    contained: {
      backgroundColor: "#8b3e3e",
      color: "#fff",
      fontWeight: 600,
      textTransform: "none",
      borderRadius: "8px",
      px: 3,
      "&:hover": { backgroundColor: "#742f2f" },
    },
    outlined: {
      borderColor: "#8b3e3e",
      color: "#8b3e3e",
      fontWeight: 600,
      textTransform: "none",
      borderRadius: "8px",
      px: 3,
      "&:hover": {
        backgroundColor: "#8b3e3e",
        color: "#fff",
        borderColor: "#8b3e3e",
      },
    },
  };

  return (
    <Box className="w-full bg-white text-[#6b2c2c] font-[Montserrat] border-b-[1.5px] border-[#b17b6b] relative">
      <Box className="max-w-7xl mx-auto flex items-center justify-between px-8">
        {/* Logo */}
        <img
          src={imgLogoFamiglia}
          alt="Panadería Famiglia"
          className="w-36 sm:w-44 md:w-48 object-contain cursor-pointer"
          onClick={() => handleNavigation("/")}
        />

        {/* 🔹 Menú de escritorio */}
        {!isMobile ? (
          <>
            <Box className="flex items-center gap-10 text-sm font-medium relative">
              {navLinks.map(({ label, path, ref }) => (
                <span
                  key={path}
                  ref={ref}
                  onClick={() => handleNavigation(path)}
                  className="cursor-pointer hover:text-[#9c4c4c]"
                >
                  {label}
                </span>
              ))}
              <Box
                className="absolute bottom-[-4px] h-[2px] bg-[#6b2c2c] transition-all duration-300 ease-in-out"
                style={{
                  width: underlineStyle.width,
                  left: underlineStyle.left,
                }}
              />
            </Box>

            <Box className="flex gap-3 items-center">
              {isAuthenticated ? (
                <>
                  <IconButton onClick={() => handleNavigation("/cart")} sx={{ color: "#8b3e3e", position: "relative" }}>
                    <ShoppingCartIcon />
                    {totalQuantity > 0 && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          backgroundColor: "#e74c3c",
                          color: "white",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        {totalQuantity}
                      </Box>
                    )}
                  </IconButton>

                  <IconButton onClick={() => handleNavigation("/profile")} sx={{ color: "#8b3e3e" }}>
                    <AccountCircleIcon />
                  </IconButton>

                  <span className="text-sm font-medium text-[#8b3e3e]">{user?.nombre}</span>

                  <Button onClick={handleLogout} variant="outlined" sx={buttonStyles.outlined}>
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setShowRegister(true)} variant="contained" sx={buttonStyles.contained}>
                    Registrarse
                  </Button>
                  <Button onClick={() => showLoginModal()} variant="outlined" sx={buttonStyles.outlined}>
                    Iniciar Sesión
                  </Button>
                </>
              )}
            </Box>
          </>
        ) : (
          // 🔹 Botón de menú móvil
          <IconButton onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        )}
      </Box>

      {/* 🔹 Menú móvil desplegable */}
      {isMobile && menuOpen && (
        <Box className="flex flex-col items-center bg-white text-[#6b2c2c] py-6 gap-5 border-t border-[#c9a6a6]">
          {navLinks.map(({ label, path }) => (
            <span
              key={path}
              onClick={() => handleNavigation(path)}
              className="cursor-pointer hover:text-[#9c4c4c]"
            >
              {label}
            </span>
          ))}

          <Box className="flex flex-col gap-3 mt-4 w-[60%]">
            {isAuthenticated ? (
              <>
                <Button onClick={() => handleNavigation("/cart")} variant="contained" sx={buttonStyles.contained}>
                  Carrito ({totalQuantity})
                </Button>
                <Button onClick={() => handleNavigation("/profile")} variant="outlined" sx={buttonStyles.outlined}>
                  Perfil
                </Button>
                <Button onClick={handleLogout} variant="outlined" sx={buttonStyles.outlined}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => { setShowRegister(true); setMenuOpen(false); }} variant="contained" sx={buttonStyles.contained}>
                  Registrarse
                </Button>
                <Button onClick={() => { showLoginModal(); setMenuOpen(false); }} variant="outlined" sx={buttonStyles.outlined}>
                  Iniciar Sesión
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* 🔹 Modales */}
      <RegisterForm
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => {
          setShowRegister(false);
          showLoginModal();
        }}
      />
      <LoginForm
        isOpen={showLogin}
        onClose={hideLoginModal}
        onSwitchToRegister={() => {
          hideLoginModal();
          setShowRegister(true);
        }}
      />
    </Box>
  );
};

export default Header;
