import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, Typography, IconButton, Badge } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import imgDegradado from "../../../assets/images/img_degradado.png";
import imgLogoFamigliawithourBorders from "../../../assets/images/img_logoFamigliawithoutBorders.png";
import imgMilhojasFresa from "../../../assets/images/img_milhojasFresa.png";
import imgAlfajor from "../../../assets/images/img_alfajor.png";
import imgEmpanadaMixta from "../../../assets/images/img_empanadaMixta.png";
import imgPointMap from "../../../assets/images/img_map.png";
import RegisterForm from "../../forms/RegisterForm";
import LoginForm from "../../forms/LoginForm";
import { logout } from "../../../redux/slices/authSlice";
import { authAPI } from "../../../services/api";

const HeroSection = ({
  onHomeTextClick,
  onCartaTextClick,
  onDeliveryTextClick,
  onTestTextClick,
  onContactanosTextClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1137);
  const [showHeroImages, setShowHeroImages] = useState(window.innerWidth >= 969);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Estado de autenticación desde Redux
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { totalQuantity } = useSelector((state) => state.cart);

  // Función de logout
  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
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
      
      // Navegar al home
      navigate("/");
      
      // Recargar para asegurar limpieza
      setTimeout(() => window.location.reload(), 100);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const small = window.innerWidth < 1137;
      const showImages = window.innerWidth >= 969;

      setIsSmallScreen(small);
      setShowHeroImages(showImages);

      // Si el menú está abierto y se pasa a escritorio, se cierra
      if (!small && menuOpen) setMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  // Bloquea el scroll al abrir el menú y lo restaura al cerrarlo
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [menuOpen]);

  // Cierra el menú si cambia a pantalla grande
  useEffect(() => {
    const handleResize = () => {
      const small = window.innerWidth < 1137;
      setIsSmallScreen(small);
      if (!small && menuOpen) setMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  return (
    <Box className="relative w-full bg-white text-[#753b3b] font-[Montserrat] overflow-hidden">
      {/* Fondo degradado */}
      <img
        src={imgDegradado}
        alt="fondo"
        className="absolute -top-15 left-0 w-full h-[75%] object-cover z-0"
      />

      {/* NAVBAR */}
      <Box className="relative flex flex-row justify-between items-center px-6 sm:px-10 md:px-16 py-3 z-20 text-white">
        {/* Logo */}
        <img
          src={imgLogoFamigliawithourBorders}
          alt="Famiglia Logo"
          className="w-40 sm:w-56 md:w-64 h-auto object-contain z-20"
        />

        {/* Menú en pantallas grandes */}
        <Box
          className={`${isSmallScreen ? "hidden" : "flex"
            } flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-10 text-base sm:text-lg md:text-base font-medium`}
        >
          <div className="cursor-pointer border-b-2 border-white pb-1" onClick={onHomeTextClick}>
            Home
          </div>
          <div className="cursor-pointer hover:text-gray-200" onClick={onCartaTextClick}>
            Carta
          </div>
          <div className="cursor-pointer hover:text-gray-200" onClick={onDeliveryTextClick}>
            Delivery
          </div>
          <div className="cursor-pointer hover:text-gray-200" onClick={onTestTextClick}>
            Test
          </div>
          <div className="cursor-pointer hover:text-gray-200" onClick={onContactanosTextClick}>
            Contáctanos
          </div>
        </Box>

        {/* Botones en escritorio */}
        <Box className={`${isSmallScreen ? "hidden" : "flex"} gap-3 items-center`}>
          {isAuthenticated ? (
            <>
              {/* Carrito */}
              <IconButton
                onClick={() => navigate("/cart")}
                sx={{ color: "white", position: "relative" }}
              >
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
                      fontWeight: "bold"
                    }}
                  >
                    {totalQuantity}
                  </Box>
                )}
              </IconButton>

              {/* Perfil */}
              <IconButton
                onClick={() => navigate("/profile")}
                sx={{ color: "white" }}
              >
                <AccountCircleIcon />
              </IconButton>

              {/* Nombre del usuario */}
              <span className="text-white text-sm font-medium">
                {user?.nombre}
              </span>

              {/* Botón Cerrar Sesión */}
              <button
                onClick={handleLogout}
                className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-4 py-2 text-sm md:text-base"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowRegister(true)}
                className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-4 py-2 text-sm md:text-base"
              >
                Registrarse
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-4 py-2 text-sm md:text-base"
              >
                Iniciar Sesión
              </button>
            </>
          )}
        </Box>

        {/* Botón menú hamburguesa (solo en móvil) */}
        {isSmallScreen && (
          <Box
            className="absolute right-8 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center"
          >
            <IconButton
              onClick={() => setMenuOpen(!menuOpen)}
              sx={{
                color: "white",
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                width: 56,
                height: 56,
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.3)",
                  transform: "scale(1.1)",
                },
              }}
            >
              {menuOpen ? (
                <CloseIcon sx={{ fontSize: 34 }} />
              ) : (
                <MenuIcon sx={{ fontSize: 34 }} />
              )}
            </IconButton>
          </Box>
        )}

        {/* Menú móvil desplegable */}
        {menuOpen && (
          <Box
            className="fixed inset-0 bg-[#753b3bcc] backdrop-blur-sm flex flex-col justify-center items-center text-white text-2xl gap-6 z-20"
          >
            <div onClick={onHomeTextClick} className="cursor-pointer hover:text-gray-200">
              Home
            </div>
            <div onClick={onCartaTextClick} className="cursor-pointer hover:text-gray-200">
              Carta
            </div>
            <div onClick={onDeliveryTextClick} className="cursor-pointer hover:text-gray-200">
              Delivery
            </div>
            <div onClick={onTestTextClick} className="cursor-pointer hover:text-gray-200">
              Test
            </div>
            <div onClick={onContactanosTextClick} className="cursor-pointer hover:text-gray-200">
              Contáctanos
            </div>

            {/* Botones también visibles en móvil */}
            <Box className="flex flex-col gap-4 mt-8">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/cart");
                    }}
                    className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-6 py-2"
                  >
                    🛒 Carrito ({totalQuantity})
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-6 py-2"
                  >
                    👤 Perfil
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-6 py-2"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowRegister(true);
                    }}
                    className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-6 py-2"
                  >
                    Registrarse
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowLogin(true);
                    }}
                    className="border-2 border-white text-white bg-transparent font-semibold rounded-md hover:bg-white hover:text-[#8f3c3c] transition px-6 py-2"
                  >
                    Iniciar Sesión
                  </button>
                </>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Modales de Login y Registro */}
      <RegisterForm
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
      />
      <LoginForm
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
      />


      {/* HERO SECTION */}
      <Box className="relative flex flex-col md:flex-row justify-between items-center px-6 sm:px-10 md:px-16 pt-2 md:pt-0 pb-8 md:pb-12 z-100">
        {/* Texto principal */}
        <Box
          className={`relative z-10 flex flex-col gap-6 transition-all duration-500
      ${showHeroImages
              ? "md:w-1/2 text-left items-start"
              : "w-full text-center items-center"
            }`}
        >
          <Typography
            variant="h2"
            sx={{
              fontFamily: "'Lilita One', cursive",
              fontWeight: 400,
              color: "#753b3b",
              lineHeight: 1.1,
              fontSize: { xs: "2rem", sm: "2.8rem", md: "3.8rem" },
            }}
          >
            Panadería,{" "}
            <span style={{ color: "#fd9d50" }}>pastelería y</span>{" "}
            <span style={{ color: "#da3644" }}>snack bar</span>
          </Typography>

          <button
            onClick={() => {
              navigate("/carta");
            }}
            className="bg-[#8f3c3c] text-white text-[1.3rem] sm:text-[1.7rem] md:text-[1.9rem] font-['Lilita_One'] rounded-xl px-10 sm:px-14 py-4 shadow-lg hover:bg-[#702828] transition"
          >
            RESERVA TU PEDIDO
          </button>

          <Box
            className={`flex items-center gap-3 mt-4 text-[#000] transition-all duration-500
        ${showHeroImages ? "justify-start" : "justify-center"}`}
          >
            <img
              src={imgPointMap}
              alt="Ubicación"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
            <Typography
              variant="body1"
              sx={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 200,
                fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                color: "#000",
              }}
            >
              Av. Gral. Antonio Álvarez de Arenales 458, Jesús María
            </Typography>
          </Box>
        </Box>

        {/* Imágenes (solo si >= 969px) */}
        {showHeroImages && (
          <Box className="relative -mt-8 md:-mt-12 w-full md:w-1/2 justify-center items-center -mr-6 sm:-mr-10 md:-mr-16 lg:-mr-20 hidden md:flex">
            <img
              src={imgMilhojasFresa}
              alt="Milhojas Fresa"
              className="relative z-10 w-80 sm:w-[28rem] md:w-[40rem] h-auto object-contain drop-shadow-2xl"
            />
            <img
              src={imgAlfajor}
              alt="Alfajor"
              className="absolute bottom-0 -right-5 w-28 sm:w-36 md:w-44 object-contain"
            />
            <img
              src={imgEmpanadaMixta}
              alt="Empanada"
              className="absolute top-0 left-[-18%] w-24 sm:w-32 md:w-60 object-contain"
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HeroSection;
