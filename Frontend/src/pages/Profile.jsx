import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Button,
  Container,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Fade
} from "@mui/material";
import {
  ShoppingBag,
  CameraAlt,
  CalendarToday,
  CreditCard,
  ArrowBack,
  ArrowForward,
  Security,
  VerifiedUser,
  GppBad,
  Close,
  ChevronRight,
  ReceiptLong
} from "@mui/icons-material";
import defaultAvatar from "../assets/images/img-default-avatar.png";
import { pedidoAPI, authAPI } from "../services/api";
import { twofaAPI } from "../services/api/twofaAPI";
import * as crypto from "crypto-js";

export default function Profile() {
  const { user } = useSelector((state) => state.auth);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const defaultFoto = defaultAvatar;
  const [foto, setFoto] = useState(() => {
    return localStorage.getItem("fotoPerfil") || user?.url_imagen || defaultFoto;
  });

  // pagination
  const itemsPerPage = 5;
  const [page, setPage] = useState(0);

  const [tabValue, setTabValue] = useState(0);
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [error, setError] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [codigo2FA, setCodigo2FA] = useState("");
  const [twofaEnabled, setTwofaEnabled] = useState(
    user?.autenticacion_2fa?.habilitado || false
  );

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  // New state for filtering
  const [filterStatus, setFilterStatus] = useState("todos");

  // Modern Palette
  const palette = {
    bg: "#FFFFFF", // Changed to White
    surface: "#FFFFFF",
    primary: "#C94549", // Brand Red
    primarySoft: "rgba(201, 69, 73, 0.08)",
    textMain: "#111827", // Gray 900
    textSec: "#6B7280", // Gray 500
    border: "#E5E7EB", // Gray 200
    success: "#10B981",
    warning: "#F59E0B",
    info: "#3B82F6",
    error: "#EF4444"
  };

  const hashOrderId = (id) => {
    const hash = crypto.SHA256(id.toString()).toString();
    return `ORDER-${hash.substring(0, 8).toUpperCase()}`;
  };

  useEffect(() => {
    if (tabValue === 0) fetchPedidos();
    setPage(0);
  }, [tabValue]);

  useEffect(() => {
    if (foto) {
      localStorage.setItem("fotoPerfil", foto);
    }
  }, [foto]);

  const fetchPedidos = async () => {
    setLoadingPedidos(true);
    setError("");
    try {
      const response = await pedidoAPI.getHistorialPedidos();
      setPedidos(response.data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los pedidos.");
    } finally {
      setLoadingPedidos(false);
    }
  };

  const getEstadoColor = (estado) => {
    const map = {
      confirmado: palette.success,
      entregado: palette.info,
      cancelado: palette.error,
      pendiente: palette.warning
    };
    return map[estado?.toLowerCase()] || palette.textSec;
  };

  const formatDateShort = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("es-PE", { year: '2-digit', month: 'short', day: 'numeric' });
  };

  const handleOpenModal = (order) => {
    setSelectedOrder(order);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedOrder(null);
  };

  // Filter logic
  const filteredPedidos = pedidos.filter(p =>
    filterStatus === "todos" ? true : p.estado?.toLowerCase() === filterStatus.toLowerCase()
  );

  const displayedPedidos = filteredPedidos;
  const totalItems = displayedPedidos.length;
  const pageData = displayedPedidos.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  const statusOptions = ["Todos", "Confirmado", "Entregado", "Cancelado"];

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: palette.bg, py: { xs: 4, md: 8 } }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: { xs: 4, md: "5%" }, alignItems: "flex-start" }}>

          {/* --- LEFT SIDEBAR (30%) --- */}
          <Box sx={{ width: { xs: "100%", md: "30%" } }}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                bgcolor: palette.surface,
                border: `1px solid ${palette.border}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                textAlign: "center"
              }}
            >
              <Box sx={{ position: "relative", display: "inline-block", mb: 2 }}>
                <Avatar
                  src={foto}
                  sx={{ width: 120, height: 120, border: `4px solid ${palette.bg}`, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
                />
                <input
                  type="file"
                  accept="image/*"
                  id="input-foto"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const archivo = e.target.files[0];
                    if (!archivo) return;

                    // Validate file size (max 5MB)
                    if (archivo.size > 5 * 1024 * 1024) {
                      enqueueSnackbar("La imagen no puede superar los 5MB", { variant: "error" });
                      return;
                    }

                    // Show preview immediately
                    setFoto(URL.createObjectURL(archivo));

                    try {
                      // Convert to base64
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64Image = reader.result;

                        try {
                          const response = await authAPI.uploadProfileImage({
                            image: base64Image,
                            fileName: archivo.name,
                            contentType: archivo.type
                          });

                          if (response.data.imageUrl) {
                            setFoto(response.data.imageUrl);
                            // Update localStorage with new image URL
                            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                            storedUser.url_imagen = response.data.imageUrl;
                            localStorage.setItem("user", JSON.stringify(storedUser));
                            enqueueSnackbar("Foto de perfil actualizada", { variant: "success" });
                          }
                        } catch (uploadError) {
                          console.error("Error uploading image:", uploadError);
                          enqueueSnackbar("Error al subir la imagen", { variant: "error" });
                          // Revert to previous image
                          setFoto(user?.url_imagen || defaultAvatar);
                        }
                      };
                      reader.readAsDataURL(archivo);
                    } catch (err) {
                      console.error("Error processing image:", err);
                      enqueueSnackbar("Error al procesar la imagen", { variant: "error" });
                    }
                  }}
                />
                <label htmlFor="input-foto">
                  <IconButton
                    component="span"
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      bgcolor: palette.primary,
                      color: "white",
                      "&:hover": { bgcolor: palette.primary },
                      boxShadow: 3,
                      p: 1
                    }}
                  >
                    <CameraAlt sx={{ fontSize: 18 }} />
                  </IconButton>
                </label>
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textMain, mb: 0.5 }}>
                {user?.nombre || "Usuario"}
              </Typography>
              <Typography variant="body2" sx={{ color: palette.textSec, mb: 3 }}>
                {user?.correo || "correo@ejemplo.com"}
              </Typography>

              <Chip
                icon={twofaEnabled ? <VerifiedUser sx={{ fontSize: "16px !important" }} /> : <GppBad sx={{ fontSize: "16px !important" }} />}
                label={twofaEnabled ? "Cuenta Protegida" : "Seguridad Baja"}
                sx={{
                  bgcolor: twofaEnabled ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                  color: twofaEnabled ? palette.success : palette.warning,
                  fontWeight: 600,
                  border: "none",
                  px: 1
                }}
              />

              <Divider sx={{ my: 4, borderColor: palette.border }} />

              <Box sx={{ textAlign: "left" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: palette.textMain, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <Security fontSize="small" color="action" /> Configuración de Seguridad
                </Typography>

                <Box sx={{ bgcolor: palette.bg, p: 2.5, borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: palette.textSec, fontWeight: 500, mb: 2 }}>
                    Autenticación de dos factores (2FA)
                  </Typography>

                  {qrImageUrl && (
                    <Fade in={true}>
                      <Box sx={{ textAlign: "center", mb: 3, p: 2, bgcolor: "white", borderRadius: 2 }}>
                        <img src={qrImageUrl} alt="QR" style={{ width: "100%", maxWidth: 140, borderRadius: 8 }} />
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: palette.textSec }}>
                          Escanea con Google Authenticator
                        </Typography>
                      </Box>
                    </Fade>
                  )}

                  {!twofaEnabled && qrImageUrl && (
                    <Box sx={{ mb: 2 }}>
                      <input
                        type="text"
                        maxLength={6}
                        value={codigo2FA}
                        onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000 000"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px",
                          borderRadius: "8px",
                          border: `1px solid ${palette.border}`,
                          textAlign: "center",
                          letterSpacing: "2px",
                          fontWeight: "bold",
                          marginBottom: "12px",
                          fontSize: "0.9rem",
                          outline: "none"
                        }}
                      />
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={codigo2FA.length !== 6}
                        onClick={async () => {
                          try {
                            await twofaAPI.verify(codigo2FA);
                            enqueueSnackbar("✅ 2FA activado correctamente", { variant: "success" });
                            setTwofaEnabled(true);
                            setQrImageUrl(null);
                            setCodigo2FA("");
                          } catch (err) {
                            enqueueSnackbar("❌ Código incorrecto", { variant: "error" });
                          }
                        }}
                        sx={{ bgcolor: palette.primary, textTransform: "none", borderRadius: 2 }}
                      >
                        Verificar Código
                      </Button>
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant={twofaEnabled ? "outlined" : "contained"}
                    color={twofaEnabled ? "error" : "primary"}
                    onClick={async () => {
                      try {
                        if (twofaEnabled) {
                          await twofaAPI.disable();
                          enqueueSnackbar("2FA Desactivado", { variant: "info" });
                          setTwofaEnabled(false);
                        } else {
                          const res = await twofaAPI.setup();
                          setQrImageUrl(res.data.qrImageUrl);
                        }
                      } catch (err) {
                        enqueueSnackbar("Error al cambiar 2FA", { variant: "error" });
                      }
                    }}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      boxShadow: "none",
                      bgcolor: !twofaEnabled ? palette.primary : "transparent",
                      color: !twofaEnabled ? "white" : palette.error,
                      borderColor: palette.error,
                      "&:hover": {
                        bgcolor: !twofaEnabled ? "#b03e42" : "rgba(239, 68, 68, 0.05)",
                        boxShadow: "none"
                      }
                    }}
                  >
                    {twofaEnabled ? "Desactivar 2FA" : "Configurar 2FA"}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* --- RIGHT CONTENT (65%) --- */}
          <Box sx={{ width: { xs: "100%", md: "65%" } }}>

            {/* Custom Tabs */}
            <Paper elevation={0} sx={{ mb: 4, borderRadius: 3, p: 0.5, bgcolor: "transparent", border: `1px solid ${palette.border}`, display: "inline-flex" }}>
              <Tabs
                value={tabValue}
                onChange={(e, v) => setTabValue(v)}
                sx={{
                  minHeight: 44,
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    borderRadius: 2,
                    minHeight: 44,
                    px: 3,
                    mr: 0.5,
                    transition: "all 0.2s",
                    color: palette.textSec
                  },
                  "& .Mui-selected": {
                    color: palette.primary,
                    bgcolor: "transparent"
                  },
                  "& .MuiTabs-indicator": { display: "none" },
                }}
              >
                <Tab label="Mis Pedidos" icon={<ReceiptLong sx={{ fontSize: 18, mr: 1 }} />} iconPosition="start" disableRipple />
              </Tabs>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            <Fade in={tabValue === 0} unmountOnExit>
              <Box>
                {/* Filters */}
                <Stack direction="row" spacing={1} sx={{ mb: 3, overflowX: "auto", pb: 1 }}>
                  {statusOptions.map((status) => {
                    const isActive = filterStatus === status.toLowerCase();
                    return (
                      <Chip
                        key={status}
                        label={status}
                        onClick={() => { setFilterStatus(status.toLowerCase()); setPage(0); }}
                        sx={{
                          fontWeight: 600,
                          bgcolor: isActive ? palette.textMain : "transparent",
                          color: isActive ? "white" : palette.textSec,
                          border: `1px solid ${isActive ? palette.textMain : palette.border}`,
                          "&:hover": { bgcolor: isActive ? palette.textMain : palette.border },
                          transition: "all 0.2s"
                        }}
                      />
                    );
                  })}
                </Stack>

                {loadingPedidos ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress sx={{ color: palette.primary }} /></Box>
                ) : displayedPedidos.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 8,
                      textAlign: "center",
                      borderRadius: 4,
                      bgcolor: palette.surface,
                      border: `1px solid ${palette.border}`,
                      borderStyle: "dashed"
                    }}
                  >
                    <ShoppingBag sx={{ fontSize: 64, color: palette.border, mb: 2 }} />
                    <Typography variant="h6" color="textPrimary" fontWeight={700} gutterBottom>
                      No hay pedidos encontrados
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      {filterStatus === "todos" ? "Aún no has realizado ninguna compra." : `No tienes pedidos con estado "${filterStatus}".`}
                    </Typography>
                    {filterStatus === "todos" && (
                      <Button
                        variant="contained"
                        onClick={() => navigate('/carta')}
                        sx={{ bgcolor: palette.primary, textTransform: "none", borderRadius: 2, px: 4 }}
                      >
                        Ir a Comprar
                      </Button>
                    )}
                  </Paper>
                ) : (
                  <Stack spacing={3}>
                    {pageData.map((p) => (
                      <Paper
                        key={p.id_pedido}
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 4,
                          border: `1px solid ${palette.border}`,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            borderColor: palette.primary,
                            boxShadow: "0 12px 24px rgba(0,0,0,0.04)",
                            transform: "translateY(-2px)"
                          }
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={800} color={palette.textMain}>
                              {hashOrderId(p.id_pedido)}
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mt: 0.5, color: palette.textSec }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.85rem" }}>
                                <CalendarToday fontSize="inherit" /> {formatDateShort(p.fecha)}
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.85rem" }}>
                                <CreditCard fontSize="inherit" /> {p.pago?.medio || "Pago"}
                              </Box>
                            </Stack>
                          </Box>
                          <Chip
                            label={p.estado}
                            size="small"
                            sx={{
                              bgcolor: "transparent",
                              color: getEstadoColor(p.estado),
                              border: `1px solid ${getEstadoColor(p.estado)}`,
                              fontWeight: 700,
                              textTransform: "capitalize"
                            }}
                          />
                        </Box>

                        <Divider sx={{ mb: 2, borderStyle: "dashed" }} />

                        <Stack spacing={2} sx={{ mb: 2 }}>
                          {p.items?.slice(0, 3).map((item) => (
                            <Box key={item.id_detalle} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                              <img
                                src={item.producto?.url_imagen || "/images/placeholder-product.jpg"}
                                alt={item.producto?.nombre}
                                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: `1px solid ${palette.border}` }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600} color={palette.textMain}>
                                  {item.producto?.nombre}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {item.cantidad} x S/{Number(item.producto?.precio).toFixed(2)}
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight={700} color={palette.textMain}>
                                S/{Number(item.cantidad * item.producto?.precio).toFixed(2)}
                              </Typography>
                            </Box>
                          ))}
                          {p.items?.length > 3 && (
                            <Button
                              size="small"
                              onClick={() => handleOpenModal(p)}
                              sx={{ alignSelf: "flex-start", textTransform: "none", color: palette.primary }}
                            >
                              + {p.items.length - 3} productos más...
                            </Button>
                          )}
                        </Stack>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 2, borderTop: `1px solid ${palette.border}` }}>
                          <Button
                            variant="text"
                            endIcon={<ChevronRight />}
                            onClick={() => handleOpenModal(p)}
                            sx={{ textTransform: "none", color: palette.textMain, fontWeight: 600 }}
                          >
                            Ver Detalles Completos
                          </Button>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="caption" color="textSecondary" display="block">Total del Pedido</Typography>
                            <Typography variant="h6" color={palette.primary} fontWeight={800}>
                              S/{Number(p.total).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Fade>

            {/* Pagination Controls */}
            {Math.ceil(totalItems / itemsPerPage) > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 6, gap: 2 }}>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => setPage((s) => Math.max(0, s - 1))}
                  disabled={page === 0}
                  sx={{ color: palette.textMain, textTransform: "none" }}
                >
                  Anterior
                </Button>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => setPage((s) => s + 1)}
                  disabled={(page + 1) * itemsPerPage >= totalItems}
                  sx={{ color: palette.textMain, textTransform: "none" }}
                >
                  Siguiente
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      {/* Order Details Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        {selectedOrder && (
          <>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color={palette.textMain}>
                  Detalles del Pedido
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {hashOrderId(selectedOrder.id_pedido)}
                </Typography>
              </Box>
              <IconButton onClick={handleCloseModal} size="small" sx={{ bgcolor: palette.bg }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderTop: `1px solid ${palette.border}`, borderBottom: `1px solid ${palette.border}` }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: palette.textMain }}>
                  Productos ({selectedOrder.items?.length})
                </Typography>
                <Stack spacing={2}>
                  {selectedOrder.items?.map((item) => (
                    <Box key={item.id_detalle} sx={{ display: "flex", gap: 2, alignItems: "center", p: 1.5, borderRadius: 2, border: `1px solid ${palette.border}` }}>
                      <img
                        src={item.producto?.url_imagen || "/images/placeholder-product.jpg"}
                        alt={item.producto?.nombre}
                        style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: palette.textMain }}>
                          {item.producto?.nombre}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Cantidad: {item.cantidad}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" fontWeight={700} color={palette.primary}>
                        S/{Number(item.producto?.precio).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ bgcolor: palette.bg, p: 3, borderRadius: 3 }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="textSecondary">Fecha de Compra</Typography>
                    <Typography variant="body2" fontWeight={600} color={palette.textMain}>{formatDateShort(selectedOrder.fecha)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="textSecondary">Método de Pago</Typography>
                    <Typography variant="body2" fontWeight={600} color={palette.textMain}>{selectedOrder.pago?.medio || "N/A"}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="textSecondary">Estado</Typography>
                    <Chip
                      label={selectedOrder.estado}
                      size="small"
                      sx={{
                        bgcolor: "white",
                        color: getEstadoColor(selectedOrder.estado),
                        border: `1px solid ${getEstadoColor(selectedOrder.estado)}`,
                        fontWeight: 700,
                        height: 24
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="caption" color="textSecondary" display="block">Monto Total</Typography>
                <Typography variant="h5" fontWeight={800} color={palette.primary}>
                  S/{Number(selectedOrder.total).toFixed(2)}
                </Typography>
              </Box>
              <Button onClick={handleCloseModal} variant="contained" sx={{ bgcolor: palette.textMain, textTransform: "none", borderRadius: 2, px: 4 }}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
