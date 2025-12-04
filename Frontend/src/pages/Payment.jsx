import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { pagoAPI } from "../services/api";
import {
  Box,
  Typography,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";

// ---
// NOTA IMPORTANTE:
// He importado los logos basándome en la estructura de tu proyecto.
// Si Payment.jsx está en 'src/pages/', esta ruta debería ser correcta.
// Ajusta la ruta ('../') si es necesario.
// ---
import plinLogo from "../assets/images/img_plin_logo.png";
import yapeLogo from "../assets/images/img_yapeLogo.png";

// --- Paleta de Colores ---
const palette = {
  darkBrown: "#6B3730",
  rustRed: "#AF442F",
  brightRed: "#C94549",
  orange: "#EF9D58",
  lightPeach: "#EBBABC",
  white: "#FFFFFF",
};

const Payment = () => {
  const navigate = useNavigate();
  const { items, totalAmount, orderId } = useSelector((state) => state.cart);

  const [paymentMethod, setPaymentMethod] = useState("yape");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Si no hay items en el carrito, redirigir
  if (!items || items.length === 0) {
    navigate("/cart");
    return null;
  }

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^9\d{8}$/;
    return phoneRegex.test(phone);
  };

  const handlePayment = async () => {
    const newErrors = {};

    // Validar número de teléfono
    if (!phoneNumber) {
      newErrors.phoneNumber = "El número de teléfono es requerido";
    } else if (!validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = "Ingrese un número válido (9 dígitos, comenzando con 9)";
    }

    // Validar código de verificación
    if (!verificationCode) {
      newErrors.verificationCode = "El código de verificación es requerido";
    } else if (verificationCode.length < 4) {
      newErrors.verificationCode = "El código debe tener al menos 4 dígitos";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      // Llamar al backend para procesar el pago
      const response = await pagoAPI.procesarPago({
        medio: paymentMethod,
        numero: phoneNumber,
        cod_ver: verificationCode,
        envio: "pendiente",
      });

      console.log("Pago procesado exitosamente:", response.data);

      // Navegar a la página de confirmación
      navigate("/order-confirmation", {
        state: {
          orderDetails: response.data.pedido,
          paymentDetails: response.data.pago,
        },
      });
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      setApiError(
        error.response?.data?.error ||
        "Error al procesar el pago. Por favor, intente nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: "1400px", margin: "0 auto" }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: "700",
          color: palette.darkBrown, // Título principal
          mb: 4,
          pt: 4,
          textAlign: "center",
        }}
      >
        Método de Pago
      </Typography>

      {/* Mensaje de error de API */}
      {apiError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>
          {apiError}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.5fr 1fr" },
          gap: { xs: 3, md: 4 },
        }}
      >
        {/* Columna Izquierda: Resumen del Pedido */}
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "18px",
            background: "linear-gradient(145deg, #fcfcfcff, #f7f4efff)",
            height: "fit-content", // Allow height to adjust to content
            display: "flex",
            flexDirection: "column",
            boxShadow: `
                8px 8px 20px rgba(0, 0, 0, 0.15), 
                -4px -4px 10px rgba(255, 255, 255, 0.9)
              `,
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: `
                  10px 10px 25px rgba(0, 0, 0, 0.2), 
                  -5px -5px 12px rgba(255, 255, 255, 0.95)
                `,
            },
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: "600", mb: 2, color: palette.darkBrown }}
          >
            Resumen del Pedido
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontWeight: "500",
                color: "#666",
                fontSize: "14px",
              }}
            >
              ID del Pedido:{" "}
              <strong style={{ color: palette.darkBrown }}>{orderId}</strong>
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Lista de productos en 2 columnas */}
          <Box sx={{
            mb: 3,
            // flex: 1, // Removed to prevent stretching and empty space
            maxHeight: "260px", // Limit height to show approx 4 items
            overflowY: "auto",
            pr: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2
          }}>
            {items.map((item) => (
              <Box
                key={item.id_detalle}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  p: 2,
                  borderRadius: "12px",
                  border: "1px solid #f0f0f0",
                  backgroundColor: "#fff",
                  transition: "box-shadow 0.2s",
                  "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }
                }}
              >
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: "600", fontSize: "14px", color: palette.darkBrown, lineHeight: 1.3 }}>
                    {item.nombre}
                  </Typography>
                  <Typography
                    sx={{ color: "#888", fontSize: "12px", mt: 0.5 }}
                  >
                    Cant: {item.cantidad}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: "700", color: palette.rustRed, fontSize: "15px", mt: "auto", textAlign: "right" }}>
                  S/{item.subtotal.toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Total */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 3,
            }}
          >
            <Typography sx={{ fontWeight: "700", fontSize: "18px", color: palette.darkBrown }}>
              Total a Pagar:
            </Typography>
            <Typography
              sx={{
                fontWeight: "700",
                fontSize: "24px",
                color: palette.brightRed, // Total destacado
              }}
            >
              S/{totalAmount.toFixed(2)}
            </Typography>
          </Box>
        </Paper>

        {/* Columna Derecha: Método de Pago */}
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: "18px",
            background: "linear-gradient(145deg, #fefcfcff, #f2f0ed)",
            height: "fit-content", // Allow height to adjust to content
            display: "flex",
            flexDirection: "column",
            boxShadow: `
                8px 8px 20px rgba(0, 0, 0, 0.15), 
                -4px -4px 10px rgba(255, 255, 255, 0.8)
              `,
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: `
                  10px 10px 25px rgba(0, 0, 0, 0.2), 
                  -5px -5px 12px rgba(255, 255, 255, 0.9)
                `,
            },
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: "600", mb: 3, color: palette.darkBrown }}
          >
            Seleccionar Método de Pago
          </Typography>

          <FormControl component="fieldset" sx={{ width: "100%", mb: 3 }}>
            <RadioGroup
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              sx={{ gap: 2 }} // Espacio entre opciones
            >
              {/* --- Opción Yape --- */}
              <FormControlLabel
                value="yape"
                control={
                  <Radio
                    sx={{
                      color: palette.orange,
                      "&.Mui-checked": { color: palette.rustRed },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      component="img"
                      src={yapeLogo}
                      alt="Yape"
                      sx={{ width: 24, height: 24 }}
                    />
                    <Typography sx={{ fontWeight: "500", color: palette.darkBrown }}>
                      Yape
                    </Typography>
                  </Box>
                }
                sx={{
                  width: "280px", // Fixed width for better proportion
                  border:
                    paymentMethod === "yape"
                      ? `2px solid ${palette.rustRed}`
                      : `1px solid #ddd`,
                  borderRadius: "12px",
                  p: 1.5,
                  m: 0, // Resetear margen
                  transition: "all 0.2s ease",
                  backgroundColor:
                    paymentMethod === "yape"
                      ? `${palette.rustRed}1A` // Tinte sutil
                      : palette.white,
                }}
              />
              {/* --- Opción Plin --- */}
              <FormControlLabel
                value="plin"
                control={
                  <Radio
                    sx={{
                      color: palette.orange,
                      "&.Mui-checked": { color: palette.rustRed },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      component="img"
                      src={plinLogo}
                      alt="Plin"
                      sx={{ width: 24, height: 24 }}
                    />
                    <Typography sx={{ fontWeight: "500", color: palette.darkBrown }}>
                      Plin
                    </Typography>
                  </Box>
                }
                sx={{
                  width: "280px", // Fixed width for better proportion
                  border:
                    paymentMethod === "plin"
                      ? `2px solid ${palette.rustRed}`
                      : `1px solid #ddd`,
                  borderRadius: "12px",
                  p: 1.5,
                  m: 0, // Resetear margen
                  transition: "all 0.2s ease",
                  backgroundColor:
                    paymentMethod === "plin"
                      ? `${palette.rustRed}1A` // Tinte sutil
                      : palette.white,
                }}
              />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          <Typography
            variant="h6"
            sx={{ fontWeight: "600", mb: 3, color: palette.darkBrown }}
          >
            Información de Pago
          </Typography>

          <TextField
            fullWidth
            label="Número de Teléfono"
            placeholder="987654321"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (errors.phoneNumber) {
                setErrors({ ...errors, phoneNumber: "" });
              }
            }}
            error={!!errors.phoneNumber}
            helperText={errors.phoneNumber}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                "&.Mui-focused fieldset": {
                  borderColor: palette.rustRed, // Color al enfocar
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: palette.rustRed, // Color de label al enfocar
              },
            }}
          />

          <TextField
            fullWidth
            label="Código de Verificación"
            placeholder="123456"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value);
              if (errors.verificationCode) {
                setErrors({ ...errors, verificationCode: "" });
              }
            }}
            error={!!errors.verificationCode}
            helperText={errors.verificationCode}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                "&.Mui-focused fieldset": {
                  borderColor: palette.rustRed, // Color al enfocar
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: palette.rustRed, // Color de label al enfocar
              },
            }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handlePayment}
            disabled={isLoading}
            sx={{
              backgroundColor: palette.rustRed, // Botón primario
              color: palette.white,
              py: 1.5,
              fontSize: "16px",
              fontWeight: "600",
              borderRadius: "12px",
              textTransform: "none",
              boxShadow: "0px 4px 15px -5px rgba(175, 68, 47, 0.7)",
              "&:hover": {
                backgroundColor: palette.darkBrown, // Hover más oscuro
                boxShadow: "none",
              },
              "&:disabled": {
                backgroundColor: palette.lightPeach, // Color deshabilitado
                color: palette.darkBrown,
                opacity: 0.7
              },
              mt: "auto"
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: palette.white }} />
                Procesando...
              </>
            ) : (
              "Confirmar Pago"
            )}
          </Button>
        </Paper>
      </Box>

      {/* Botón Volver */}
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Button
          onClick={() => navigate("/cart")}
          sx={{
            color: palette.rustRed, // Color de acento
            textTransform: "none",
            fontWeight: "600",
            borderRadius: "8px",
            mb: 4,
            "&:hover": {
              backgroundColor: `${palette.rustRed}1A`, // Fondo sutil al pasar el mouse
            },
          }}
        >
          ← Volver al Carrito
        </Button>
      </Box>
    </Box>
  );
};

export default Payment;