import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCartAsync,
  updateCartItemAsync,
  loadCartAsync
} from "../redux/slices/cartSlice";
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import SentimentDissatisfiedOutlinedIcon from '@mui/icons-material/SentimentDissatisfiedOutlined';
import Modal from "../components/common/Modal";

// Selector de cantidad compacto tipo checkbox
const QuantitySelector = ({ value, onChange }) => {
  const handleIncrease = () => onChange(value + 1);
  const handleDecrease = () => onChange(Math.max(1, value - 1));

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        border: "1px solid #ff9c9c",
        borderRadius: "6px",
        overflow: "hidden",
        width: "70px",
        height: "32px",
        backgroundColor: "#fff",
      }}
    >
      <IconButton
        size="small"
        onClick={handleDecrease}
        sx={{
          width: "24px",
          height: "24px",
          color: "#771919",
          "&:hover": { backgroundColor: "#ffe5e5" },
        }}
      >
        <Remove fontSize="small" />
      </IconButton>

      <Typography
        sx={{
          width: "24px",
          textAlign: "center",
          fontSize: "0.9rem",
          fontWeight: 500,
        }}
      >
        {value}
      </Typography>

      <IconButton
        size="small"
        onClick={handleIncrease}
        sx={{
          width: "24px",
          height: "24px",
          color: "#771919",
          "&:hover": { backgroundColor: "#ffe5e5" },
        }}
      >
        <Add fontSize="small" />
      </IconButton>
    </Box>
  );
};

const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items: products, totalAmount, isLoading } = useSelector((state) => state.cart);

  // Estado local para las cantidades mientras el usuario edita
  const [localQuantities, setLocalQuantities] = useState({});

  // Refs para los temporizadores de debounce
  const debounceTimers = useRef({});

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoadingOpen, setDeleteLoadingOpen] = useState(false);
  const [productToRemoveId, setProductToRemoveId] = useState(null);

  // Cargar carrito al montar el componente
  useEffect(() => {
    dispatch(loadCartAsync());
  }, [dispatch]);

  // Inicializar cantidades locales cuando se cargan los productos
  useEffect(() => {
    if (products && products.length > 0) {
      const quantities = {};
      products.forEach(product => {
        quantities[product.id_detalle] = product.cantidad;
      });
      setLocalQuantities(quantities);
    }
  }, [products]);

  // Función debounced para actualizar en el backend
  const debouncedUpdate = useCallback((id_detalle, cantidad) => {
    // Limpiar el temporizador anterior si existe
    if (debounceTimers.current[id_detalle]) {
      clearTimeout(debounceTimers.current[id_detalle]);
    }

    // Crear nuevo temporizador que espera 2 segundos
    debounceTimers.current[id_detalle] = setTimeout(() => {
      console.log(`Guardando cantidad ${cantidad} para producto ${id_detalle}`);
      dispatch(updateCartItemAsync({ id_detalle, cantidad }));
      delete debounceTimers.current[id_detalle];
    }, 2000); // 2 segundos de espera
  }, [dispatch]);

  // Limpiar temporizadores al desmontar
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleQuantityChange = (id_detalle, newQuantity) => {
    if (newQuantity > 0) {
      // Actualizar inmediatamente en el estado local (UI instantánea)
      setLocalQuantities(prev => ({
        ...prev,
        [id_detalle]: newQuantity
      }));

      // Programar actualización en el backend con debounce
      debouncedUpdate(id_detalle, newQuantity);
    }
  };

  const confirmRemoveProduct = (id_detalle) => {
    setProductToRemoveId(id_detalle);
    setDeleteModalOpen(true);
  };

  const handleRemoveConfirmed = async () => {
    if (productToRemoveId) {
      // Cerrar modal de confirmación y abrir loading
      setDeleteModalOpen(false);
      setDeleteLoadingOpen(true);

      // Limpiar el temporizador si existe para este producto
      if (debounceTimers.current[productToRemoveId]) {
        clearTimeout(debounceTimers.current[productToRemoveId]);
        delete debounceTimers.current[productToRemoveId];
      }

      // Esperar un momento para que se vea el loading (opcional, mejora UX)
      await new Promise(resolve => setTimeout(resolve, 800));

      await dispatch(removeFromCartAsync(productToRemoveId));

      setDeleteLoadingOpen(false);
      setProductToRemoveId(null);
    }
  };

  const handleAddProduct = () => {
    navigate("/carta");
  };

  // Calcular el total local basado en las cantidades que el usuario está editando
  const calculateLocalTotal = () => {
    if (!products || products.length === 0) return 0;

    return products.reduce((total, product) => {
      const quantity = localQuantities[product.id_detalle] || product.cantidad;
      return total + (product.precio * quantity);
    }, 0);
  };

  const localTotal = calculateLocalTotal();
  const isCartEmpty = products.length === 0;

  return (
    <Box
      className="relative w-full bg-white overflow-hidden text-left text-base text-[#000] font-[Montserrat]"
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "calc(100vh - 80px)",
        padding: { xs: "20px", md: "60px 0" },
      }}
    >
      {/* CONTENEDOR PRINCIPAL */}
      <Box
        sx={{
          position: "relative",
          width: "90%",
          maxWidth: "1400px",
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "3rem",
        }}
      >
        {/* LISTA DE PRODUCTOS (LADO IZQUIERDO) */}
        <Box sx={{ flex: "1", width: "100%" }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#6b2c2c", mb: 4 }}>
            Tu Carrito de Compras
          </Typography>

          {!isCartEmpty ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* ENCABEZADO (Solo escritorio) */}
              <Box
                sx={{
                  display: { xs: "none", md: "grid" },
                  gridTemplateColumns: "100px 2fr 1fr 1fr 1fr 50px",
                  fontWeight: "600",
                  color: "#8b3e3e",
                  pb: 2,
                  borderBottom: "2px solid #f0dada",
                  alignItems: "center",
                  textAlign: "center"
                }}
              >
                <Box></Box>
                <Box sx={{ textAlign: "left" }}>Producto</Box>
                <Box>Precio</Box>
                <Box>Cantidad</Box>
                <Box>Total</Box>
                <Box></Box>
              </Box>

              {/* FILAS DE PRODUCTOS */}
              {products.map((product) => (
                <Box
                  key={product.id_detalle}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "100px 2fr 1fr 1fr 1fr 50px" },
                    alignItems: "center",
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    p: 3,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                    transition: "transform 0.2s",
                    gap: { xs: 2, md: 0 },
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 6px 25px rgba(0,0,0,0.06)" },
                  }}
                >
                  {/* Imagen */}
                  <Box
                    sx={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "12px",
                      overflow: 'hidden',
                      flexShrink: 0,
                      mx: { xs: "auto", md: 0 }
                    }}
                  >
                    <img
                      src={product.url_imagen || '/images/placeholder-product.jpg'}
                      alt={product.nombre}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.target.src = '/images/placeholder-product.jpg'; }}
                    />
                  </Box>

                  {/* Nombre */}
                  <Typography sx={{ fontWeight: 600, color: "#4a2b2b", textAlign: { xs: "center", md: "left" }, px: 2 }}>
                    {product.nombre}
                  </Typography>

                  {/* Precio */}
                  <Typography sx={{ textAlign: "center", color: "#6b2c2c", fontWeight: 500 }}>
                    <span className="md:hidden font-bold mr-2">Precio:</span>
                    S/{product.precio.toFixed(2)}
                  </Typography>

                  {/* Cantidad */}
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <QuantitySelector
                      value={localQuantities[product.id_detalle] || product.cantidad}
                      onChange={(newQty) => handleQuantityChange(product.id_detalle, newQty)}
                    />
                  </Box>

                  {/* Total Parcial */}
                  <Typography sx={{ textAlign: "center", fontWeight: 700, color: "#8b3e3e" }}>
                    <span className="md:hidden font-bold mr-2">Total:</span>
                    S/{((localQuantities[product.id_detalle] || product.cantidad) * product.precio).toFixed(2)}
                  </Typography>

                  {/* Botón Eliminar */}
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <IconButton
                      onClick={() => confirmRemoveProduct(product.id_detalle)}
                      sx={{
                        color: "#cc5555",
                        "&:hover": { backgroundColor: "#ffe5e5" }
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))}

              {/* BOTÓN CONTINUAR COMPRANDO */}
              <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 2 }}>
                <Button
                  onClick={handleAddProduct}
                  variant="text"
                  startIcon={<Add />}
                  sx={{ color: "#8b3e3e", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#fff0f0" } }}
                >
                  Continuar Comprando
                </Button>
              </Box>
            </Box>
          ) : (
            // CARRITO VACÍO
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                backgroundColor: "#fff",
                borderRadius: "20px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <SentimentDissatisfiedOutlinedIcon sx={{ color: '#e0b0b0', fontSize: '5rem' }} />
              <Typography variant="h5" sx={{ color: '#8b3e3e', fontWeight: 600 }}>
                Tu carrito está vacío
              </Typography>
              <Typography sx={{ color: '#666', maxWidth: "400px" }}>
                ¡Parece que aún no has elegido tus panes favoritos! Explora nuestra carta y deléitate.
              </Typography>
              <Button
                onClick={handleAddProduct}
                variant="contained"
                sx={{
                  backgroundColor: "#8b3e3e",
                  color: "#fff",
                  px: 4,
                  py: 1.5,
                  borderRadius: "50px",
                  textTransform: "none",
                  fontSize: "1.1rem",
                  boxShadow: "0 4px 15px rgba(139, 62, 62, 0.3)",
                  "&:hover": { backgroundColor: "#a04646" },
                }}
              >
                Ir a la Carta
              </Button>
            </Box>
          )}
        </Box>

        {/* PANEL LATERAL: RESUMEN DE COMPRA */}
        <Box
          sx={{
            flex: { xs: "1", lg: "0 0 380px" },
            width: "100%",
            position: { lg: "sticky" },
            top: { lg: "120px" },
          }}
        >
          <Box
            sx={{
              backgroundColor: "#fff",
              borderRadius: "20px",
              p: 4,
              boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
              border: "1px solid #f0f0f0"
            }}
          >
            <Typography variant="h5" sx={{ color: "#6b2c2c", fontWeight: 700, mb: 3, textAlign: "center" }}>
              Resumen del Pedido
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
                <Typography>Subtotal</Typography>
                <Typography fontWeight="600">S/{localTotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
                <Typography>Envío</Typography>
                <Typography fontWeight="600" sx={{ color: "#27ae60" }}>Gratis (Recojo)</Typography>
              </Box>
              <Box sx={{ my: 1, borderTop: "2px dashed #eee" }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" sx={{ color: "#6b2c2c", fontWeight: 700 }}>Total</Typography>
                <Typography variant="h4" sx={{ color: "#8b3e3e", fontWeight: 800 }}>
                  S/{localTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Button
              onClick={() => navigate('/payment')}
              disabled={isCartEmpty}
              fullWidth
              variant="contained"
              sx={{
                backgroundColor: "#8b3e3e",
                color: "#fff",
                py: 2,
                borderRadius: "12px",
                fontSize: "1.1rem",
                fontWeight: 600,
                textTransform: "none",
                boxShadow: "0 8px 20px rgba(139, 62, 62, 0.25)",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "#a04646",
                  transform: "translateY(-2px)",
                  boxShadow: "0 12px 25px rgba(139, 62, 62, 0.35)",
                },
                "&:disabled": {
                  backgroundColor: "#e0e0e0",
                  color: "#999"
                }
              }}
            >
              Proceder al Pago
            </Button>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "#999" }}>
                Compra segura y protegida
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Eliminar Producto"
      >
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography sx={{ mb: 4, color: "#666", fontSize: "1.1rem" }}>
            ¿Estás seguro de que deseas eliminar este producto de tu carrito?
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button
              onClick={() => setDeleteModalOpen(false)}
              variant="outlined"
              sx={{
                borderColor: "#ccc",
                color: "#666",
                textTransform: "none",
                px: 3,
                "&:hover": { borderColor: "#999", backgroundColor: "#f5f5f5" }
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRemoveConfirmed}
              variant="contained"
              sx={{
                backgroundColor: "#d32f2f",
                color: "white",
                textTransform: "none",
                px: 3,
                "&:hover": { backgroundColor: "#b71c1c" }
              }}
            >
              Eliminar
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* MODAL DE CARGA AL ELIMINAR */}
      <Modal
        isOpen={deleteLoadingOpen}
        onClose={() => { }} // No permitir cerrar manualmente
        title="" // Sin título para centrar el contenido
      >
        <Box sx={{ textAlign: "center", py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={40} sx={{ color: "#8b3e3e" }} />
          <Typography sx={{ color: "#666", fontSize: "1.1rem", fontWeight: 500 }}>
            Eliminando producto...
          </Typography>
        </Box>
      </Modal>
    </Box>
  );
};

export default Cart;