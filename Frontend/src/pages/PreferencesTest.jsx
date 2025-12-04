import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button as MuiButton,
  Container,
  TextField,
  Stack,
  Chip,
  CircularProgress,
  Fade,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  IconButton,
  Pagination
} from "@mui/material";
import {
  Science,
  AddShoppingCart,
  Quiz,
  History as HistoryIcon,
  ArrowForward,
  Close,
  AutoAwesome,
  CheckCircle
} from "@mui/icons-material";
import {
  generateTest,
  getRecommendation,
  setAnswer,
  nextQuestion,
  previousQuestion,
  loadTestFromStorage,
  clearTest,
  completeTest
} from '../redux/slices/preferencesSlice';
import { addToCartAsync } from "../redux/slices/cartSlice";
import { preferencesAPI, ProductosAPI } from "../services/api";
import ProductCard from '../components/common/ProductCard';
import NotificationSnackbar from '../components/common/NotificationSnackbar';

export default function PreferencesTest() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Redux State for Test
  const {
    questions,
    answers,
    currentQuestion,
    isLoading,
    isGeneratingTest,
    isGettingRecommendation,
    recommendation,
    testCompleted
  } = useSelector((state) => state.preferences);

  // Local State
  const [userPrompt, setUserPrompt] = useState('');
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Cart Loading State
  const [addingToCart, setAddingToCart] = useState({}); // { productId: boolean }
  const [notification, setNotification] = useState({ open: false, message: "" });

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 4;

  // Palette
  const palette = {
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    primary: "#C94549",
    textMain: "#111827",
    textSec: "#6B7280",
    border: "#E5E7EB",
  };

  useEffect(() => {
    dispatch(loadTestFromStorage());
    fetchHistory();
    fetchProducts();
  }, [dispatch]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await preferencesAPI.getHistorialTests();
      setHistory(response.data?.data || []);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await ProductosAPI.getAll();
      setProducts(response.data || []);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  const handleStartTest = async () => {
    if (!userPrompt.trim()) return;
    setIsTestModalOpen(true);
    await dispatch(generateTest(userPrompt));
  };

  const handleAnswerSelect = (answer) => {
    dispatch(setAnswer({ questionIndex: currentQuestion, answer }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      dispatch(nextQuestion());
    } else {
      dispatch(completeTest());
      dispatch(getRecommendation());
    }
  };

  const handleAddToCart = async (productId) => {
    if (!productId) return;

    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    try {
      await dispatch(addToCartAsync({ id_producto: productId, cantidad: 1 })).unwrap();
      setNotification({
        open: true,
        message: "¡Producto agregado al carrito!",
      });
    } catch (err) {
      setNotification({
        open: true,
        message: "Error al agregar al carrito",
        severity: "error"
      });
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleCloseModal = () => {
    setIsTestModalOpen(false);
    dispatch(clearTest());
    setUserPrompt('');
    fetchHistory(); // Refresh history
  };

  const formatDateShort = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("es-PE", { year: '2-digit', month: 'short', day: 'numeric' });
  };

  // Pagination Logic
  const count = Math.ceil(history.length / itemsPerPage);
  const pageData = history.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Render Test Content inside Modal
  const renderTestContent = () => {
    if (isLoading || isGeneratingTest || isGettingRecommendation) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: palette.primary, mb: 3 }} size={60} />
          <Typography variant="h6" color={palette.textMain} fontWeight={700}>
            {isGeneratingTest ? 'Diseñando tu experiencia...' : 'Analizando tus gustos...'}
          </Typography>
          <Typography variant="body2" color={palette.textSec}>
            Nuestra IA está trabajando para ti.
          </Typography>
        </Box>
      );
    }

    if (testCompleted && recommendation && recommendation.product) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center", textAlign: "center" }}>
          <Typography variant="h4" fontWeight={800} color={palette.primary} sx={{ mb: 2 }}>
            ¡Tu Match Ideal!
          </Typography>

          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4, width: "100%", alignItems: "center" }}>
            {/* Left: Product Card */}
            <Box sx={{ flex: 1, maxWidth: 320, width: "100%" }}>
              <ProductCard product={recommendation.product} showAddButton={false} layout="grid" />
            </Box>

            {/* Right: Explanation & Actions */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
              <Paper elevation={0} sx={{ p: 3, bgcolor: "#FFF5F5", border: `1px solid ${palette.primary}`, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color={palette.primary} gutterBottom>
                  ¿Por qué este producto?
                </Typography>
                <Typography variant="body1" color={palette.textMain} sx={{ lineHeight: 1.6 }}>
                  {recommendation.explanation}
                </Typography>
              </Paper>

              <Stack direction="row" spacing={2} sx={{ mt: "auto" }}>
                <MuiButton
                  onClick={() => {
                    handleAddToCart(recommendation.product.id_producto);
                    handleCloseModal();
                  }}
                  disabled={addingToCart[recommendation.product.id_producto]}
                  sx={{
                    flex: 1,
                    bgcolor: palette.primary,
                    color: "white",
                    py: 1.5,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "1rem",
                    boxShadow: "0 4px 12px rgba(201, 69, 73, 0.3)",
                    "&:hover": { bgcolor: "#b03e42" }
                  }}
                  startIcon={addingToCart[recommendation.product.id_producto] ? <CircularProgress size={20} color="inherit" /> : <AddShoppingCart />}
                >
                  {addingToCart[recommendation.product.id_producto] ? "Agregando..." : "Agregar y Finalizar"}
                </MuiButton>
                <MuiButton
                  variant="outlined"
                  onClick={handleCloseModal}
                  sx={{
                    px: 4,
                    borderColor: palette.border,
                    color: palette.textSec,
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 3,
                    "&:hover": { borderColor: palette.textMain, color: palette.textMain, bgcolor: "transparent" }
                  }}
                >
                  Cerrar
                </MuiButton>
              </Stack>
            </Box>
          </Box>
        </Box>
      );
    }

    if (questions.length > 0) {
      const q = questions[currentQuestion];
      return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" fontWeight={700} color={palette.primary} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
              Pregunta {currentQuestion + 1} de {questions.length}
            </Typography>
            <Typography variant="h5" fontWeight={800} color={palette.textMain} sx={{ mt: 1 }}>
              {q.question}
            </Typography>
          </Box>

          {/* Options Grid - 2 Columns */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            flex: 1,
            overflowY: "auto",
            mb: 2
          }}>
            {q.options.map((opt, idx) => (
              <Paper
                key={idx}
                elevation={0}
                onClick={() => handleAnswerSelect(opt.value)}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: `2px solid ${answers[currentQuestion] === opt.value ? palette.primary : palette.border}`,
                  bgcolor: answers[currentQuestion] === opt.value ? "#FFF5F5" : "white",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  "&:hover": { borderColor: palette.primary, transform: "translateY(-2px)" }
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} color={answers[currentQuestion] === opt.value ? palette.primary : palette.textMain}>
                  {opt.label}
                </Typography>
                {opt.description && (
                  <Typography variant="body2" color={palette.textSec} sx={{ mt: 0.5 }}>
                    {opt.description}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>

          <Box sx={{ mt: "auto", display: "flex", justifyContent: "space-between", pt: 2, borderTop: `1px solid ${palette.border}` }}>
            <MuiButton
              disabled={currentQuestion === 0}
              onClick={() => dispatch(previousQuestion())}
              sx={{ color: palette.textSec, textTransform: "none" }}
            >
              Anterior
            </MuiButton>
            <MuiButton
              variant="contained"
              disabled={!answers[currentQuestion]}
              onClick={handleNext}
              endIcon={<ArrowForward />}
              sx={{ bgcolor: palette.primary, textTransform: "none", borderRadius: 2, px: 4, boxShadow: "none" }}
            >
              {currentQuestion === questions.length - 1 ? 'Finalizar' : 'Siguiente'}
            </MuiButton>
          </Box>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: palette.bg, py: { xs: 4, md: 6 } }}>
      <Container maxWidth={false} sx={{ width: "95%", maxWidth: "1600px", mx: "auto" }}>

        <Box sx={{ display: "flex", flexDirection: { xs: "column-reverse", md: "row" }, gap: { xs: 6, md: "5%" } }}>

          {/* --- LEFT COLUMN (65%) - History --- */}
          <Box sx={{ width: { xs: "100%", md: "65%" }, flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <HistoryIcon sx={{ color: palette.primary }} />
              <Typography variant="h5" fontWeight={800} color={palette.textMain}>
                Historial de Tests
              </Typography>
            </Box>

            {loadingHistory ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: palette.primary }} />
              </Box>
            ) : history.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 8,
                  textAlign: "center",
                  borderRadius: 4,
                  bgcolor: "#F9FAFB",
                  border: `2px dashed ${palette.border}`,
                }}
              >
                <Science sx={{ fontSize: 64, color: palette.textSec, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="textPrimary" fontWeight={700} gutterBottom>
                  Aún no tienes historial
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  ¡Anímate a realizar tu primer test! Tus resultados aparecerán aquí.
                </Typography>
              </Paper>
            ) : (
              <>
                <Stack spacing={3}>
                  {pageData.map((t) => {
                    const product = products.find(p => p.id_producto == t.resultado) || {};
                    const isAdding = addingToCart[t.resultado];

                    return (
                      <Paper
                        key={t.id}
                        elevation={0}
                        sx={{
                          borderRadius: 4,
                          overflow: "hidden",
                          border: `1px solid ${palette.border}`,
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          transition: "all 0.2s ease",
                          bgcolor: "white",
                          "&:hover": {
                            borderColor: palette.primary,
                            boxShadow: "0 12px 24px rgba(0,0,0,0.04)",
                            transform: "translateY(-2px)"
                          }
                        }}
                      >
                        <Box sx={{ width: { xs: "100%", sm: 200 }, height: { xs: 180, sm: "auto" }, position: "relative" }}>
                          {t.url_resultado ? (
                            <img
                              src={t.url_resultado}
                              alt="Resultado"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <Box sx={{ width: "100%", height: "100%", bgcolor: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Quiz sx={{ color: palette.textSec, fontSize: 40 }} />
                            </Box>
                          )}
                          <Box sx={{ position: "absolute", top: 10, left: 10 }}>
                            <Chip
                              label={formatDateShort(t.fecha)}
                              size="small"
                              sx={{ bgcolor: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: "0.75rem", backdropFilter: "blur(4px)" }}
                            />
                          </Box>
                        </Box>

                        <Box sx={{ p: 3, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <Typography variant="subtitle2" fontWeight={700} color={palette.primary} sx={{ mb: 0.5, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 0.5 }}>
                            Tu Antojo
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color={palette.textMain} gutterBottom sx={{ fontSize: "1.1rem", lineHeight: 1.3, fontStyle: "italic" }}>
                            "{t.consulta || "Test de preferencia"}"
                          </Typography>
                          <Typography variant="body2" color={palette.textSec} sx={{ mb: 2 }}>
                            Resultado: <strong>{product.nombre || "Producto Recomendado"}</strong> - {product.descripcion || "Producto recomendado basado en tus gustos."}
                          </Typography>

                          {/* Custom Button similar to Catalog */}
                          <MuiButton
                            onClick={() => handleAddToCart(t.resultado)}
                            disabled={isAdding}
                            sx={{
                              alignSelf: "flex-start",
                              px: 3,
                              py: 1.2,
                              bgcolor: "#fff0f0",
                              color: "#8b3e3e",
                              border: "1px solid #fee2e2",
                              borderRadius: 3,
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              boxShadow: "none",
                              transition: "all 0.3s",
                              "&:hover": {
                                bgcolor: "#8b3e3e",
                                color: "white",
                                borderColor: "#8b3e3e",
                                boxShadow: "0 4px 12px rgba(139, 62, 62, 0.2)"
                              },
                              "&.Mui-disabled": {
                                bgcolor: "#f3f4f6",
                                color: "#9ca3af",
                                borderColor: "#e5e7eb"
                              }
                            }}
                          >
                            {isAdding ? (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <CircularProgress size={16} color="inherit" />
                                <span>Agregando...</span>
                              </Box>
                            ) : (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <span>Agregar al Carrito</span>
                                <AddShoppingCart sx={{ fontSize: 18 }} />
                              </Box>
                            )}
                          </MuiButton>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>

                {/* Pagination */}
                {count > 1 && (
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <Pagination
                      count={count}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                      sx={{
                        "& .MuiPaginationItem-root": { fontWeight: 700 }
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* --- RIGHT COLUMN (30%) - Input Trigger --- */}
          <Box sx={{ width: { xs: "100%", md: "30%" }, mb: { xs: 6, md: 0 }, flexShrink: 0 }}>
            <Box sx={{ position: "sticky", top: 24 }}>
              <Typography variant="h4" fontWeight={800} color={palette.textMain} gutterBottom sx={{ lineHeight: 1.2 }}>
                ¿Qué se te antoja hoy?
              </Typography>
              <Typography variant="body1" color={palette.textSec} sx={{ mb: 4 }}>
                Cuéntanos tus gustos y nuestra IA te recomendará el postre perfecto.
              </Typography>

              <Box sx={{ position: "relative" }}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Ej: Me encantan los postres con mucho chocolate, o prefiero algo frutal y ligero..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 4,
                      bgcolor: "white",
                      p: 3,
                      "& fieldset": { borderColor: palette.border, borderWidth: 2 },
                      "&:hover fieldset": { borderColor: palette.primary },
                      "&.Mui-focused fieldset": { borderColor: palette.primary }
                    }
                  }}
                />
                <MuiButton
                  fullWidth
                  variant="contained"
                  onClick={handleStartTest}
                  disabled={!userPrompt.trim()}
                  startIcon={<AutoAwesome />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    bgcolor: palette.primary,
                    color: "white",
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "1rem",
                    boxShadow: "0 4px 12px rgba(201, 69, 73, 0.3)",
                    "&:hover": { bgcolor: "#b03e42" }
                  }}
                >
                  Comenzar Aventura
                </MuiButton>
              </Box>
            </Box>
          </Box>

        </Box>
      </Container>

      {/* --- Test Modal --- */}
      <Dialog
        open={isTestModalOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            handleCloseModal();
          }
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, minHeight: 500 }
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
          <IconButton onClick={handleCloseModal}>
            <Close />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 4, pt: 0 }}>
          {renderTestContent()}
        </DialogContent>
      </Dialog>

      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity || 'success'}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </Box>
  );
}
