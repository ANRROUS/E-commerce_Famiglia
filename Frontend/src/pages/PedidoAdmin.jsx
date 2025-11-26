import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import crypto from 'crypto-js';
import { pedidoAPI } from '../services/api';
import BuscadorProductos from '../components/common/BuscadorProductos';
import PedidoCard from '../components/common/PedidoCard';
import { useVoice } from '../context/VoiceContext';

const FILTER_OPTIONS = [
  { label: 'Reservados', value: 'confirmado' },
  { label: 'Entregados', value: 'entregado' },
  { label: 'Cancelados', value: 'cancelado' },
];

const hashOrderId = (id) => {
  const hash = crypto.SHA256(id.toString()).toString();
  return `SA-${hash.substring(0, 8).toUpperCase()}`;
};

export default function PedidosAdmin() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEstado, setSelectedEstado] = useState(FILTER_OPTIONS[0].value);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(null);
  const { registerCommands, unregisterCommands, speak } = useVoice();

  useEffect(() => {
    const commands = {
      'mostrar reservados': () => {
        setSelectedEstado('confirmado');
        speak('Mostrando pedidos reservados');
      },
      'mostrar entregados': () => {
        setSelectedEstado('entregado');
        speak('Mostrando pedidos entregados');
      },
      'mostrar cancelados': () => {
        setSelectedEstado('cancelado');
        speak('Mostrando pedidos cancelados');
      },
      'buscar *': (term) => {
        setSearchTerm(term);
        speak(`Buscando pedidos con ${term}`);
      },
      'limpiar búsqueda': () => {
        setSearchTerm('');
        speak('Búsqueda limpiada');
      }
    };

    registerCommands(commands);
    return () => unregisterCommands();
  }, [registerCommands, unregisterCommands, speak]);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        const res = await pedidoAPI.getPedidosAdmin();
        const data = res.data || [];

        const normalized = data.map((p) => {
          const estadoNormalizado = (p.estado || '').toLowerCase();
          return {
            id_pedido: Number(p.id_pedido) || 0,
            codigo: p.codigo || hashOrderId(p.id_pedido || 0),
            fecha: p.fecha ?? null,
            estado: estadoNormalizado,
            envio: p.envio ?? '',
            usuario: p.usuario ?? { nombre: 'Sin usuario' },
            detalle_pedido: p.detalle_pedido ?? [],
            pago: p.pago ?? [],
          };
        });

        setPedidos(normalized);
      } catch (error) {
        console.error('Error al cargar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((pedido) => {
      if (!pedido) {
        return false;
      }

      if (pedido.estado !== selectedEstado) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const fechaStr = pedido.fecha
          ? new Date(pedido.fecha).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).toLowerCase()
          : '';

        if (query.startsWith('#')) {
          const target = query.substring(1);
          const codigo = pedido.codigo?.toLowerCase() || '';
          return codigo === target || String(pedido.id_pedido) === target;
        }

        return (
          pedido.codigo.toLowerCase().includes(query) ||
          pedido.usuario?.nombre?.toLowerCase().includes(query) ||
          fechaStr.includes(query) ||
          String(pedido.id_pedido).includes(query)
        );
      }

      return true;
    });
  }, [pedidos, searchTerm, selectedEstado]);

  const handleEstadoChange = async (id_pedido, estado) => {
    setUpdating(id_pedido);
    try {
      const { data } = await pedidoAPI.updatePedidoEstadoAdmin(id_pedido, estado);
      setPedidos((prev) =>
        prev.map((pedido) =>
          pedido.id_pedido === id_pedido
            ? {
              ...pedido,
              estado: (data.estado || estado).toLowerCase(),
              codigo: data.codigo || pedido.codigo,
              fecha: data.fecha ?? pedido.fecha,
              usuario: data.usuario ?? pedido.usuario,
              detalle_pedido: data.detalle_pedido ?? pedido.detalle_pedido,
              pago: data.pago ?? pedido.pago,
            }
            : pedido
        )
      );
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
    } finally {
      setUpdating(null);
    }
  };

  const buildActions = (pedido) => {
    const estado = pedido.estado;
    if (estado === 'confirmado') {
      return [
        { label: 'Marcar como entregado', nextEstado: 'entregado', color: 'success' },
        { label: 'Cancelar pedido', nextEstado: 'cancelado', color: 'error' },
      ];
    }
    if (estado === 'cancelado') {
      return [
        { label: 'Restablecer a confirmado', nextEstado: 'confirmado', color: 'warning' },
      ];
    }
    return [];
  };

  if (loading) {
    return (
      <Box className="flex justify-center items-center min-h-screen">
        <CircularProgress sx={{ color: '#8b3e3e' }} />
      </Box>
    );
  }

  return (
    <Box
      className="w-full min-h-screen bg-[#FFF5F0] font-['Montserrat']"
      sx={{ py: { xs: 4, md: 8 }, px: { xs: 3, sm: 6, md: 10, lg: 16 } }}
    >
      <Box
        className="max-w-7xl mx-auto"
        sx={{ display: 'flex', gap: { xs: 3, md: 8 }, flexDirection: { xs: 'column', md: 'row' } }}
      >
        <Box
          sx={{
            width: 260,
            position: 'sticky',
            top: '1rem',
            height: 'fit-content',
            backgroundColor: 'rgba(255,255,255,0.8)',
            borderRadius: 3,
            p: 3,
            boxShadow: { md: '0 10px 25px rgba(0,0,0,0.05)' },
            backdropFilter: 'blur(4px)',
          }}
        >
          <Typography sx={{ color: '#8b3e3e', fontWeight: 700, mb: 2 }}>
            Estados de pedidos
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                onClick={() => setSelectedEstado(option.value)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                  color: selectedEstado === option.value ? '#fff' : '#8b3e3e',
                  backgroundColor:
                    selectedEstado === option.value ? '#8b3e3e' : 'transparent',
                  borderRadius: '999px',
                  px: 2.5,
                  '&:hover': {
                    backgroundColor:
                      selectedEstado === option.value ? '#8b3e3e' : '#EACCCC',
                  },
                }}
              >
                {option.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#8b3e3e',
              fontSize: { xs: '1.75rem', md: '3rem' },
              mb: 4,
            }}
          >
            Gestión de pedidos
          </Typography>

          <Box sx={{ maxWidth: 720, mx: 'auto', mb: 6 }}>
            <BuscadorProductos
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por código, cliente o fecha"
            />
          </Box>

          {filteredPedidos.length === 0 ? (
            <Typography className="text-center text-gray-500 mt-12">
              No hay pedidos para este estado o búsqueda.
            </Typography>
          ) : (
            <div className="space-y-3">
              {filteredPedidos.map((pedido) => (
                <PedidoCard
                  key={pedido.id_pedido}
                  pedido={pedido}
                  actions={buildActions(pedido)}
                  onAction={(estado) => handleEstadoChange(pedido.id_pedido, estado)}
                  isUpdating={updating === pedido.id_pedido}
                />
              ))}
            </div>
          )}
        </Box>
      </Box>
    </Box>
  );
}
