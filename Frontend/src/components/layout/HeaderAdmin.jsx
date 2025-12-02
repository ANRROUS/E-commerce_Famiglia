import { useEffect, useRef, useState } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import imgLogoFamiglia from "../../assets/images/img_logoFamigliawithoutBorders.png";
import { authAPI } from "../../services/api";

const HeaderAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const navRefs = {
    pedidos: useRef(null),
    catalogo: useRef(null),
  };

  const navLinks = [
    { label: "Pedidos", path: "/pedidos-admin", ref: navRefs.pedidos },
    { label: "Catálogo", path: "/catalogo-admin", ref: navRefs.catalogo },
  ];

  const [underlineStyle, setUnderlineStyle] = useState({ width: 0, left: 0 });

  useEffect(() => {
    const active = navLinks.find((link) => location.pathname.startsWith(link.path));
    if (active?.ref?.current) {
      const rect = active.ref.current.getBoundingClientRect();
      const parentRect = active.ref.current.parentNode.getBoundingClientRect();
      setUnderlineStyle({ width: rect.width, left: rect.left - parentRect.left });
    } else {
      setUnderlineStyle({ width: 0, left: 0 });
    }
  }, [location.pathname]);

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

  const buttonStyles = {
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
    <Box className="w-full bg-white text-[#6b2c2c] font-[Montserrat] border-b-[1.5px] border-[#b17b6b]">
      <Box className="max-w-7xl mx-auto flex items-center justify-between px-8 py-3">
        <Box
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/pedidos-admin")}
        >
          <img
            src={imgLogoFamiglia}
            alt="Panadería Famiglia"
            className="w-36 sm:w-44 md:w-48 object-contain"
          />
          <Typography
            variant="subtitle2"
            sx={{
              color: "#8b3e3e",
              fontWeight: 600,
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 1,
            }}
          >
            <AdminPanelSettingsIcon fontSize="small" /> Panel administrativo
          </Typography>
        </Box>

        <Box className="flex items-center gap-8 text-sm font-medium relative">
          {navLinks.map(({ label, path, ref }) => (
            <span
              key={path}
              ref={ref}
              onClick={() => navigate(path)}
              className="cursor-pointer hover:text-[#9c4c4c]"
            >
              {label}
            </span>
          ))}
          <Box
            className="absolute bottom-[-6px] h-[2px] bg-[#6b2c2c] transition-all duration-300 ease-in-out"
            style={{ width: underlineStyle.width, left: underlineStyle.left }}
          />
        </Box>

        <Box className="flex items-center gap-3">
          {user?.nombre && (
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#8b3e3e", display: { xs: "none", md: "block" } }}
            >
              {user.nombre}
            </Typography>
          )}
          <Button
            onClick={handleLogout}
            variant="outlined"
            sx={buttonStyles.outlined}
            endIcon={<LogoutIcon fontSize="small" />}
          >
            Cerrar sesión
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default HeaderAdmin;
