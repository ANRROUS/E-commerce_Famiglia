import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Box, Typography, Button, Paper } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { clearCart } from "../redux/slices/cartSlice";

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const orderDetails = location.state?.orderDetails;
  const paymentDetails = location.state?.paymentDetails;

  useEffect(() => {
    // Limpiar el carrito después de confirmar el pedido
    dispatch(clearCart());
  }, [dispatch]);

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 80px)", // Adjust height to account for header if needed, or just auto
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "flex-start", // Align to top
        justifyContent: "center",
        pt: 8, // Add some top padding
        pb: 8,
        px: 2,
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <Box
        sx={{
          maxWidth: "500px", // Más pequeño
          width: "100%",
          textAlign: "center",
        }}
      >
        <CheckCircle
          sx={{
            fontSize: "64px", // Icono más pequeño
            color: "#4caf50",
            mb: 2,
          }}
        />

        <Typography
          variant="h5" // Título más pequeño
          sx={{
            fontWeight: "700",
            color: "#2d2d2d",
            mb: 1,
          }}
        >
          ¡Pedido Confirmado!
        </Typography>

        <Typography
          sx={{
            color: "#666",
            fontSize: "14px", // Texto más pequeño
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          Tu pedido ha sido procesado exitosamente. Recibirás una confirmación en tu
          correo electrónico.
        </Typography>

        {/* Detalles del pedido */}
        {orderDetails && (
          <Box
            sx={{
              backgroundColor: "#f9f9f9", // Fondo muy sutil
              borderRadius: "12px",
              p: 3,
              mb: 3,
            }}
          >
            <Typography
              sx={{
                color: "#666",
                fontSize: "13px",
                mb: 1,
              }}
            >
              Número de Pedido:
            </Typography>
            <Typography
              sx={{
                fontWeight: "700",
                fontSize: "18px",
                color: "#ff9c9c", // Color rosado/rojo suave
                mb: 2,
              }}
            >
              {orderDetails.id_pedido}
            </Typography>

            {paymentDetails && (
              <>
                <Typography
                  sx={{
                    color: "#666",
                    fontSize: "13px",
                    mb: 1,
                  }}
                >
                  Total Pagado:
                </Typography>
                <Typography
                  sx={{
                    fontWeight: "700",
                    fontSize: "20px",
                    color: "#2d2d2d",
                  }}
                >
                  S/{paymentDetails.total?.toFixed(2)}
                </Typography>
              </>
            )}
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => navigate("/")}
            sx={{
              backgroundColor: "#ff9c9c",
              color: "#fff",
              px: 3,
              py: 1,
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "8px",
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#ff7a7a",
                boxShadow: "none",
              },
            }}
          >
            Volver al Inicio
          </Button>

          <Button
            variant="outlined"
            onClick={() => navigate("/carta")}
            sx={{
              borderColor: "#ff9c9c",
              color: "#ff9c9c",
              px: 3,
              py: 1,
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "8px",
              textTransform: "none",
              "&:hover": {
                borderColor: "#ff7a7a",
                backgroundColor: "#fff5f5",
              },
            }}
          >
            Ver Carta
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default OrderConfirmation;
