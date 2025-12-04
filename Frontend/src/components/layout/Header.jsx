import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, IconButton, Menu, MenuItem, ListItemIcon } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Logout from "@mui/icons-material/Logout";
import { useNavigate, useLocation } from "react-router-dom";
import imgLogoFamiglia from "../../assets/images/img_logoFamigliawithoutBorders.png";
import RegisterForm from "../forms/RegisterForm";
import LoginForm from "../forms/LoginForm";
import { logout } from "../../redux/slices/authSlice";
import { authAPI } from "../../services/api";
import { useLoginModal } from "../../context/LoginModalContext";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
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
    cart: useRef(null),
    profile: useRef(null),
  };
  const containerRef = useRef(null);

  // 🔹 Detecta cambio de tamaño de ventana
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 969);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🔹 Subrayado dinámico (mejorado)
  useEffect(() => {
    const updateUnderline = () => {
      const path = location.pathname;
      const mapping = {
        "/": navRefs.home,
        "/carta": navRefs.carta,
        "/delivery": navRefs.delivery,
        "/test": navRefs.test,
        "/contact-us": navRefs.contact,
        "/cart": navRefs.cart,
        "/profile": navRefs.profile,
      };

      const activeRef = Object.entries(mapping).find(([key]) => path === key)?.[1];

      if (activeRef?.current && containerRef.current) {
        const rect = activeRef.current.getBoundingClientRect();
        const parentRect = containerRef.current.getBoundingClientRect();
        setUnderlineStyle({
          width: rect.width,
          left: rect.left - parentRect.left,
          opacity: 1,
        });
      } else {
        setUnderlineStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateUnderline();
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
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      await authAPI.logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      dispatch(logout());
      handleNavigation("/");
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
    <Box
      className={`w-full font-[Montserrat] border-b border-[#eecbcb] transition-all duration-300 ${location.pathname === "/" ? "bg-white" : "sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm"
        }`}
    >
      <Box ref={containerRef} className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-1 md:px-12 relative">
        {/* Logo */}
        <img
          src={imgLogoFamiglia}
          alt="Panadería Famiglia"
          className="w-20 sm:w-24 md:w-28 object-contain cursor-pointer transition-transform hover:scale-105"
          onClick={() => handleNavigation("/")}
        />

        {/* 🔹 Menú de escritorio */}
        {!isMobile ? (
          <>
            <Box className="flex items-center gap-8 text-[14px] font-medium tracking-wide">
              {navLinks.map(({ label, path, ref }) => (
                <span
                  key={path}
                  ref={ref}
                  onClick={() => handleNavigation(path)}
                  className={`cursor-pointer transition-colors duration-300 ${location.pathname === path ? "text-[#8b3e3e] font-semibold" : "text-[#6b2c2c] hover:text-[#9c4c4c]"
                    }`}
                >
                  {label}
                </span>
              ))}
            </Box>

            <Box className="flex gap-4 items-center">
              {isAuthenticated ? (
                <>
                  <IconButton
                    ref={navRefs.cart}
                    onClick={() => handleNavigation("/cart")}
                    sx={{
                      color: "#8b3e3e",
                      position: "relative",
                      transition: "transform 0.2s",
                      "&:hover": { transform: "scale(1.1)" }
                    }}
                  >
                    <ShoppingCartIcon />
                    {totalQuantity > 0 && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          backgroundColor: "#e74c3c",
                          color: "white",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: "bold",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                        }}
                      >
                        {totalQuantity}
                      </Box>
                    )}
                  </IconButton>

                  {/* Divider */}
                  <div className="h-6 w-[1px] bg-[#eecbcb]"></div>

                  <IconButton
                    ref={navRefs.profile}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                      color: "#8b3e3e",
                      transition: "transform 0.2s",
                      "&:hover": { transform: "scale(1.1)" }
                    }}
                  >
                    <AccountCircleIcon sx={{ fontSize: 28 }} />
                  </IconButton>

                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    PaperProps={{
                      elevation: 0,
                      sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                        mt: 1.5,
                        '& .MuiAvatar-root': {
                          width: 32,
                          height: 32,
                          ml: -0.5,
                          mr: 1,
                        },
                        '&:before': {
                          content: '""',
                          display: 'block',
                          position: 'absolute',
                          top: 0,
                          right: 14,
                          width: 10,
                          height: 10,
                          bgcolor: 'background.paper',
                          transform: 'translateY(-50%) rotate(45deg)',
                          zIndex: 0,
                        },
                      },
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <MenuItem onClick={() => { handleNavigation("/profile"); setAnchorEl(null); }}>
                      <ListItemIcon>
                        <AccountCircleIcon fontSize="small" sx={{ color: "#8b3e3e" }} />
                      </ListItemIcon>
                      Mi Perfil
                    </MenuItem>
                    <MenuItem onClick={() => { handleLogout(); setAnchorEl(null); }}>
                      <ListItemIcon>
                        <Logout fontSize="small" sx={{ color: "#8b3e3e" }} />
                      </ListItemIcon>
                      Cerrar Sesión
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <>
                  <Button onClick={() => setShowRegister(true)} variant="contained" size="small" sx={{ ...buttonStyles.contained, py: 0.5, fontSize: '0.85rem' }}>
                    Registrarse
                  </Button>
                  <Button onClick={() => showLoginModal()} variant="outlined" size="small" sx={{ ...buttonStyles.outlined, py: 0.5, fontSize: '0.85rem' }}>
                    Ingresar
                  </Button>
                </>
              )}
            </Box>
          </>
        ) : (
          // 🔹 Botón de menú móvil
          <IconButton onClick={() => setMenuOpen(!menuOpen)} sx={{ color: "#8b3e3e" }}>
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        )}

        {/* Underline Indicator */}
        {!isMobile && (
          <Box
            className="absolute bottom-[18px] h-[3px] bg-[#8b3e3e] transition-all duration-300 ease-out rounded-t-full"
            style={{
              width: underlineStyle.width,
              left: underlineStyle.left,
              opacity: underlineStyle.opacity ?? 0,
            }}
          />
        )}
      </Box>

      {/* 🔹 Menú móvil desplegable */}
      {isMobile && menuOpen && (
        <Box className="flex flex-col items-center bg-white text-[#6b2c2c] py-8 gap-6 border-t border-[#f0dada] shadow-lg absolute w-full left-0 top-full z-40">
          {navLinks.map(({ label, path }) => (
            <span
              key={path}
              onClick={() => { handleNavigation(path); setMenuOpen(false); }}
              className="cursor-pointer text-lg font-medium hover:text-[#8b3e3e] transition-colors"
            >
              {label}
            </span>
          ))}

          <Box className="flex flex-col gap-4 mt-4 w-[80%] max-w-xs">
            {isAuthenticated ? (
              <>
                <Button onClick={() => { handleNavigation("/cart"); setMenuOpen(false); }} variant="contained" sx={buttonStyles.contained}>
                  Carrito ({totalQuantity})
                </Button>
                <Button onClick={() => { handleNavigation("/profile"); setMenuOpen(false); }} variant="outlined" sx={buttonStyles.outlined}>
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
