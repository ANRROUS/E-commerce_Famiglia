import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  useMediaQuery,
  useTheme,
  Chip,
  IconButton,
  Pagination,
} from "@mui/material";
import Drawer from "@mui/material/Drawer";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import { ProductosAPI, categoriaAPI } from "../services/api";
import { useDispatch } from "react-redux";
import { addToCartAsync } from "../redux/slices/cartSlice";
import NotificationSnackbar from "../components/common/NotificationSnackbar";
import BuscadorProductos from "../components/common/BuscadorProductos";
import FiltroPrecio from "../components/common/FiltroPrecio";
import ProductCard from "../components/common/ProductCard";
import { useLocation } from "react-router-dom";
import { useVoice } from "../context/VoiceContext";

const ITEMS_PER_PAGE = 10;

export default function Catalog() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [openFilters, setOpenFilters] = useState(false);
  const location = useLocation();

  // Hook de voz
  const { speak, registerCommands, unregisterCommands } = useVoice();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [selectedCategories, setSelectedCategories] = useState([]); // array of ids
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [priceBounds, setPriceBounds] = useState([0, 100]);

  // UI
  const [notification, setNotification] = useState({ open: false, message: "" });

  // pagination
  const [page, setPage] = useState(1);

  // fetch products + categories
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const [prodsRes, catsRes] = await Promise.all([
          ProductosAPI.getAll(),
          categoriaAPI.getAll(),
        ]);
        const prods = prodsRes.data || [];
        const normalized = prods.map((p) => ({
          id: p.id_producto ?? p.id ?? null,
          nombre: p.nombre ?? p.name ?? "",
          descripcion: p.descripcion ?? p.description ?? "",
          precio: Number(p.precio ?? p.price ?? 0) || 0,
          url_imagen: p.url_imagen ?? p.imagen ?? p.image ?? "/images/placeholder-product.jpg",
          id_categoria: p.id_categoria ?? p.categoriaId ?? null,
          totalVendido: p.totalVendido ?? p.total_vendido ?? 0,
        }));
        if (!mounted) return;
        setProductos(normalized);
        setCategorias(catsRes.data || []);
        const prices = normalized.map((x) => x.precio || 0);
        const min = prices.length ? Math.min(...prices) : 0;
        const max = prices.length ? Math.max(...prices) : 100;
        setPriceBounds([min, max]);
        setPriceRange([min, max]);
      } catch (err) {
        console.error("Error loading catalog:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    if (categorias.length === 0) return; // Espera que carguen las categorías

    const categoriaGuardada = localStorage.getItem("categoriaSeleccionada");

    if (categoriaGuardada) {
      const categoriaEncontrada = categorias.find(
        (cat) => cat.nombre.toLowerCase() === categoriaGuardada.toLowerCase()
      );

      if (categoriaEncontrada) {
        setSelectedCategories([String(categoriaEncontrada.id_categoria)]);
      }
    }
  }, [categorias]);

  // Escuchar eventos de navegación por voz para cambiar filtros
  useEffect(() => {
    const handleSetPriceRange = (event) => {
      const { min, max } = event.detail;
      console.log('[Catalog] Navegación por voz: cambiar rango de precio a', min, '-', max);
      setPriceRange([min, max]);
    };

    window.addEventListener('setPriceRange', handleSetPriceRange);

    return () => {
      window.removeEventListener('setPriceRange', handleSetPriceRange);
    };
  }, []);



  // filtered results (memoized)
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return productos.filter((p) => {
      if (!p) return false;
      if (p.precio < priceRange[0] || p.precio > priceRange[1]) return false;
      // categories: if none selected -> include all
      if (selectedCategories.length > 0 && !selectedCategories.includes(String(p.id_categoria))) {
        return false;
      }
      if (!q) return true;
      return (
        (p.nombre || "").toLowerCase().includes(q) ||
        (p.descripcion || "").toLowerCase().includes(q)
      );
    });
  }, [productos, priceRange, selectedCategories, searchTerm]);

  // pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  useEffect(() => {
    // reset page if filters change and page out of bounds
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const currentPageProducts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, page]);

  // handlers
  const toggleCategory = useCallback((catId) => {
    setPage(1);
    setSelectedCategories((prev) => {
      const s = new Set(prev.map(String));
      if (s.has(String(catId))) {
        s.delete(String(catId));
      } else {
        s.add(String(catId));
      }
      return Array.from(s);
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategories([]);
    setPriceRange(priceBounds);
    setSearchTerm("");
    setPage(1);
  }, [priceBounds]);

  // Escuchar evento de limpieza de filtros desde MCP
  useEffect(() => {
    const handleClearEvent = () => {
      console.log('[Catalog] Evento voice:clear-filters recibido');
      handleClearFilters();
    };
    window.addEventListener('voice:clear-filters', handleClearEvent);
    return () => window.removeEventListener('voice:clear-filters', handleClearEvent);
  }, [handleClearFilters]);

  const handleAddToCart = useCallback(
    (product) => {
      dispatch(addToCartAsync(product))
        .unwrap()
        .then(() => setNotification({ open: true, message: "Producto agregado al carrito" }))
        .catch((err) =>
          setNotification({
            open: true,
            message: (err && err.error) || "Error al agregar al carrito",
          })
        );
    },
    [dispatch]
  );

  // ============================================
  // COMANDOS DE VOZ ESPECÍFICOS DE CATÁLOGO
  // ============================================
  useEffect(() => {
    const voiceCommands = {
      // Agregar producto al carrito
      'agregar al carrito': () => {
        if (currentPageProducts.length > 0) {
          const firstProduct = currentPageProducts[0];
          handleAddToCart(firstProduct);
          speak(`Agregando ${firstProduct.nombre} al carrito`);
        } else {
          speak('No hay productos disponibles para agregar');
        }
      },

      // Agregar producto por índice (primero, segundo, tercero)
      'agregar el primero': () => {
        if (currentPageProducts[0]) {
          handleAddToCart(currentPageProducts[0]);
          speak(`Agregando ${currentPageProducts[0].nombre} al carrito`);
        } else {
          speak('No hay productos disponibles');
        }
      },
      'agregar el segundo': () => {
        if (currentPageProducts[1]) {
          handleAddToCart(currentPageProducts[1]);
          speak(`Agregando ${currentPageProducts[1].nombre} al carrito`);
        } else {
          speak('No hay un segundo producto disponible');
        }
      },
      'agregar el tercero': () => {
        if (currentPageProducts[2]) {
          handleAddToCart(currentPageProducts[2]);
          speak(`Agregando ${currentPageProducts[2].nombre} al carrito`);
        } else {
          speak('No hay un tercer producto disponible');
        }
      },

      // Agregar producto por nombre (NUEVO - CRÍTICO)
      'agregar (.+) al carrito': (nombreProducto) => {
        const productoEncontrado = filteredProducts.find(
          (p) => p.nombre.toLowerCase().includes(nombreProducto.toLowerCase())
        );
        if (productoEncontrado) {
          handleAddToCart(productoEncontrado);
          speak(`Agregando ${productoEncontrado.nombre} al carrito`);
        } else {
          speak(`No se encontró el producto ${nombreProducto}`);
        }
      },

      // Filtrar por categoría (con parámetro)
      'filtrar por (.+)': (categoria) => {
        const categoriaEncontrada = categorias.find(
          (cat) => cat.nombre.toLowerCase() === categoria?.toLowerCase()
        );
        if (categoriaEncontrada) {
          toggleCategory(categoriaEncontrada.id_categoria);
          speak(`Filtrando por ${categoriaEncontrada.nombre}`);
        } else {
          speak(`No se encontró la categoría ${categoria}`);
        }
      },

      // Buscar productos (con parámetro)
      'buscar (.+)': (query) => {
        setSearchTerm(query || '');
        setPage(1);
        speak(query ? `Buscando ${query}` : 'Limpiando búsqueda');
      },

      // Limpiar filtros
      'mostrar todos los productos': () => {
        handleClearFilters();
        speak('Mostrando todos los productos');
      },
      'limpiar filtros': () => {
        handleClearFilters();
        speak('Filtros eliminados');
      },

      // Control de precio por voz (NUEVO)
      'precio mínimo (.+)': (precio) => {
        const precioNum = parseInt(precio);
        if (!isNaN(precioNum)) {
          setPriceRange([precioNum, priceRange[1]]);
          speak(`Precio mínimo establecido en ${precioNum} soles`);
        } else {
          speak('Precio no válido');
        }
      },
      'precio máximo (.+)': (precio) => {
        const precioNum = parseInt(precio);
        if (!isNaN(precioNum)) {
          setPriceRange([priceRange[0], precioNum]);
          speak(`Precio máximo establecido en ${precioNum} soles`);
        } else {
          speak('Precio no válido');
        }
      },
      'restablecer precios': () => {
        setPriceRange(priceBounds);
        speak('Rango de precios restablecido');
      },

      // Navegación de páginas
      'siguiente página': () => {
        if (page < totalPages) {
          setPage(page + 1);
          speak(`Página ${page + 1} de ${totalPages}`);
        } else {
          speak('Ya estás en la última página');
        }
      },
      'página anterior': () => {
        if (page > 1) {
          setPage(page - 1);
          speak(`Página ${page - 1} de ${totalPages}`);
        } else {
          speak('Ya estás en la primera página');
        }
      },
      'primera página': () => {
        setPage(1);
        speak('Primera página');
      },
      'última página': () => {
        setPage(totalPages);
        speak(`Última página, página ${totalPages}`);
      },

      // Consultas de información (NUEVO)
      'cuántos productos hay': () => {
        speak(`Hay ${filteredProducts.length} productos disponibles`);
      },
      'qué filtros están activos': () => {
        const activos = [];
        if (selectedCategories.length > 0) {
          const nombresCateg = selectedCategories.map(id =>
            categorias.find(c => String(c.id_categoria) === id)?.nombre
          ).filter(Boolean);
          activos.push(`Categorías: ${nombresCateg.join(', ')}`);
        }
        if (searchTerm) activos.push(`Búsqueda: ${searchTerm}`);
        if (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]) {
          activos.push(`Precio: ${priceRange[0]} a ${priceRange[1]}`);
        }
        if (activos.length === 0) {
          speak('No hay filtros activos');
        } else {
          speak(`Filtros activos: ${activos.join('. ')}`);
        }
      },
      'en qué página estoy': () => {
        speak(`Estás en la página ${page} de ${totalPages}`);
      },
    };

    // Registrar comandos para esta página
    registerCommands(voiceCommands);
    console.log('[Catalog] ✅ Comandos de voz registrados:', Object.keys(voiceCommands).length);

    // Cleanup: eliminar comandos al desmontar
    return () => {
      unregisterCommands();
      console.log('[Catalog] 🗑️ Comandos de voz eliminados');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPageProducts,
    categorias,
    handleAddToCart,
    handleClearFilters,
    toggleCategory,
    page,
    totalPages,
    speak,
    // NO incluir registerCommands ni unregisterCommands para evitar loop infinito
  ]);

  if (loading) {
    return (
      <Box className="flex justify-center items-center min-h-screen">
        <CircularProgress sx={{ color: "#8b3e3e" }} />
      </Box>
    );
  }

  return (
    <Box className="w-full min-h-screen bg-[#FFFFFF] font-['Montserrat']" sx={{ py: { xs: 4, md: 8 }, px: { xs: 3, sm: 6, md: 10, lg: 16 } }}>
      <Box className="max-w-7xl mx-auto" sx={{ display: "flex", gap: { xs: 2, md: 8 }, flexDirection: { xs: "column", md: "row" } }}>
        {/* SIDEBAR */}
        {isMobile ? (
          <>
            {/* Botón FILTRAR visible solo en móvil */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<MenuIcon />}
                onClick={() => setOpenFilters(true)}
                sx={{
                  backgroundColor: "#8b3e3e",
                  "&:hover": { backgroundColor: "#a05050" },
                  borderRadius: "999px",
                  textTransform: "none",
                  fontFamily: "'Lilita One', sans-serif",
                }}
              >
                Filtrar
              </Button>
            </Box>

            {/* Drawer lateral para móviles */}
            <Drawer
              anchor="left"
              open={openFilters}
              onClose={() => setOpenFilters(false)}
              PaperProps={{
                sx: {
                  width: "80%",
                  maxWidth: 300,
                  p: 3,
                  backgroundColor: "#fff",
                },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography
                  sx={{
                    color: "#8b3e3e",
                    fontWeight: 600,
                    fontFamily: "'Lilita One', sans-serif",
                    fontSize: "1.4rem",
                  }}
                >
                  Filtros
                </Typography>
                <Button
                  onClick={() => setOpenFilters(false)}
                  sx={{
                    color: "#8b3e3e",
                    fontWeight: 700,
                    textTransform: "none",
                  }}
                >
                  ✕
                </Button>
              </Box>

              {/* Contenido del sidebar dentro del Drawer */}
              <Box>
                {/* Categorías */}
                <Typography
                  sx={{
                    color: "#F29D4C",
                    fontWeight: 400,
                    fontFamily: "'Lilita One', sans-serif",
                    fontSize: "1.5rem",
                    mb: 2,
                  }}
                >
                  Categorías
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 4 }}>
                  {categorias.map((cat) => (
                    <Button
                      key={cat.id_categoria}
                      onClick={() => toggleCategory(cat.id_categoria)}
                      variant="text"
                      sx={{
                        justifyContent: "flex-start",
                        textTransform: "none",
                        color: selectedCategories.includes(String(cat.id_categoria))
                          ? "#fff"
                          : "#8b3e3e",
                        backgroundColor: selectedCategories.includes(String(cat.id_categoria))
                          ? "#8b3e3e"
                          : "transparent",
                        borderRadius: "999px",
                        px: 2,
                        py: 0.5,
                        fontFamily: "'Lilita One', sans-serif",
                        fontSize: "1.1rem",
                        "&:hover": {
                          backgroundColor: selectedCategories.includes(String(cat.id_categoria))
                            ? "#8b3e3e"
                            : "#EACCCC",
                        },
                      }}
                    >
                      {cat.nombre}
                    </Button>
                  ))}
                </Box>

                {/* Filtro de precios */}
                <Typography
                  sx={{
                    color: "#F29D4C",
                    fontWeight: 400,
                    fontFamily: "'Lilita One', sans-serif",
                    fontSize: "1.5rem",
                    mb: 2,
                  }}
                >
                  Precios
                </Typography>
                <FiltroPrecio
                  min={priceBounds[0]}
                  max={priceBounds[1]}
                  value={priceRange}
                  onChange={(v) => {
                    setPriceRange(v);
                    setPage(1);
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: "#8b3e3e",
                    display: "block",
                    mt: 1,
                    fontSize: "0.8rem",
                  }}
                >
                  Precio: S/{priceRange[0]} - S/{priceRange[1]}
                </Typography>
              </Box>
            </Drawer>
          </>
        ) : (
          // Sidebar original (para escritorio)
          <Box
            sx={{
              width: 260,
              position: "sticky",
              top: "1rem",
              height: "fit-content",
              display: { xs: "none", md: "block" },
            }}
          >
            {/* SIDEBAR */}
            <Box sx={{ width: 260, position: "sticky", top: "1rem", height: "fit-content", display: { xs: "none", md: "block" } }}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  sx={{
                    color: "#F29D4C",
                    fontWeight: 400,
                    fontFamily: "'Lilita One', sans-serif",
                    fontSize: "1.5rem", // Título grande
                  }}
                >
                  Categorías
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 4 }}>
                {categorias.map((cat) => (
                  <Button
                    key={cat.id_categoria}
                    onClick={() => toggleCategory(cat.id_categoria)}
                    variant="text"
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      color: selectedCategories.includes(String(cat.id_categoria)) ? "#fff" : "#8b3e3e",
                      backgroundColor: selectedCategories.includes(String(cat.id_categoria)) ? "#8b3e3e" : "transparent",
                      borderRadius: "999px",
                      px: 2,
                      py: 0.5,
                      fontFamily: "'Lilita One', sans-serif",
                      fontSize: "1.1rem",
                      "&:hover": {
                        backgroundColor: selectedCategories.includes(String(cat.id_categoria))
                          ? "#8b3e3e"
                          : "#EACCCC",
                      },
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          border: "2px solid #8b3e3e",
                          display: "inline-block",
                          marginRight: 8,
                          opacity: selectedCategories.includes(String(cat.id_categoria)) ? 1 : 0.5,
                        }}
                      />
                      {cat.nombre}
                    </span>
                  </Button>
                ))}
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography
                  sx={{
                    color: "#F29D4C",
                    fontWeight: 400,
                    fontFamily: "'Lilita One', sans-serif",
                    fontSize: "1.5rem",
                  }}
                >
                  Precios
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <FiltroPrecio
                    min={priceBounds[0]}
                    max={priceBounds[1]}
                    value={priceRange}
                    onChange={(v) => {
                      setPriceRange(v);
                      setPage(1);
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "#8b3e3e", display: "block", mt: 1, fontSize: "0.8rem", }}>
                    Precio: S/{priceRange[0]} - S/{priceRange[1]}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}


        {/* MAIN */}
        <Box sx={{ flex: 1 }}>
          {/* Buscador */}
          <Box sx={{ maxWidth: 900, mx: "auto", mb: 3 }}>
            <BuscadorProductos value={searchTerm} onChange={(v) => { setSearchTerm(v); setPage(1); }} placeholder="Buscar por nombre o descripción" />
          </Box>

          {/* Filters header only if there are selected categories */}
          {selectedCategories.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", mb: 3, gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={{
                  color: "#c62828",
                  fontWeight: 400,
                  fontFamily: "'Lilita One', sans-serif",
                  fontSize: "1.3rem",
                }}>Filtros:</Typography>
                {/* show clear filters button */}
                <IconButton size="small" onClick={handleClearFilters} aria-label="limpiar-filtros">
                  ✕
                </IconButton>
              </Box>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                {/* tags for selected categories */}
                {selectedCategories.map((sc) => {
                  const cat = categorias.find((c) => String(c.id_categoria) === String(sc));
                  return cat ? <Chip key={sc} label={cat.nombre} size="small" sx={{ backgroundColor: "#fff0f0", color: "#8b3e3e", border: "1px solid #f4cfcf" }} /> : null;
                })}
              </Box>
            </Box>
          )}

          {/* Products list */}
          {filteredProducts.length === 0 ? (
            <Typography className="text-center text-gray-500 mt-12">No hay productos disponibles con esos filtros.</Typography>
          ) : (
            <Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {currentPageProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      id_producto: p.id,
                      nombre: p.nombre,
                      descripcion: p.descripcion,
                      precio: p.precio,
                      url_imagen: p.url_imagen,
                      totalVendido: p.totalVendido || 0,
                    }}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </Box>

              {/* Pagination */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  shape="rounded"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: "#8b3e3e",
                      border: "1px solid #f2dcdc",
                      fontSize: "1.2rem",
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    "& .MuiPaginationItem-root.Mui-selected": {
                      backgroundColor: "#8b3e3e",
                      color: "#fff",
                      border: "1px solid #8b3e3e",
                      "&:hover": {
                        backgroundColor: "#9e4646",
                      },
                    },
                    "& .MuiPaginationItem-root:hover": {
                      backgroundColor: "#faeded",
                    },
                    "& .MuiPaginationItem-previousNext": {
                      color: "#8b3e3e",
                    },
                    "& .MuiPaginationItem-ellipsis": {
                      color: "#8b3e3e",
                      fontSize: "1.5rem",
                      lineHeight: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <NotificationSnackbar open={notification.open} message={notification.message} onClose={() => setNotification({ ...notification, open: false })} />
    </Box>
  );
}
