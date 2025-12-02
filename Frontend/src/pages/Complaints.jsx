import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Button, CircularProgress, Alert } from "@mui/material";
import { useVoice } from "../context/VoiceContext";

const Complaints = () => {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  // Hook de voz
  const { speak, registerCommands, unregisterCommands } = useVoice();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ show: false, type: "", message: "" });

    // Simulamos el envío con un retraso de 2 segundos
    setTimeout(() => {
      if (nombre && correo && motivo) {
        setAlert({
          show: true,
          type: "success",
          message: "Tu reclamo fue enviado correctamente. ¡Gracias por tu tiempo!",
        });
        setNombre("");
        setCorreo("");
        setMotivo("");
      } else {
        setAlert({
          show: true,
          type: "error",
          message: "Ocurrió un error al enviar tu reclamo. Revisa los campos e intenta nuevamente.",
        });
      }
      setLoading(false);
    }, 1000);
  };

  // Comandos de voz para Complaints
  useEffect(() => {
    const voiceCommands = {
      // Llenar campos del formulario
      'llenar nombre (.+)': (nombreVoz) => {
        setNombre(nombreVoz);
        speak(`Nombre establecido como ${nombreVoz}`);
      },
      'nombre (.+)': (nombreVoz) => {
        setNombre(nombreVoz);
        speak(`Nombre establecido`);
      },

      'llenar correo (.+)': (correoVoz) => {
        setCorreo(correoVoz);
        speak(`Correo establecido`);
      },
      'correo (.+)': (correoVoz) => {
        setCorreo(correoVoz);
        speak(`Correo establecido`);
      },

      'llenar motivo (.+)': (motivoVoz) => {
        setMotivo(motivoVoz);
        speak(`Motivo establecido`);
      },
      'motivo (.+)': (motivoVoz) => {
        setMotivo(motivoVoz);
        speak(`Motivo agregado`);
      },

      // Enviar y limpiar
      'enviar reclamo': () => {
        if (!nombre || !correo || !motivo) {
          speak('Por favor completa todos los campos antes de enviar');
          return;
        }
        const event = new Event('submit', { bubbles: true, cancelable: true });
        document.querySelector('form')?.dispatchEvent(event);
      },
      'enviar': () => {
        if (!nombre || !correo || !motivo) {
          speak('Por favor completa todos los campos antes de enviar');
          return;
        }
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn?.click();
      },

      'limpiar formulario': () => {
        setNombre('');
        setCorreo('');
        setMotivo('');
        setAlert({ show: false, type: '', message: '' });
        speak('Formulario limpiado');
      },

      // Consultas
      'qué campos faltan': () => {
        const faltantes = [];
        if (!nombre) faltantes.push('nombre');
        if (!correo) faltantes.push('correo');
        if (!motivo) faltantes.push('motivo');

        if (faltantes.length === 0) {
          speak('Todos los campos están completos');
        } else {
          speak(`Faltan los siguientes campos: ${faltantes.join(', ')}`);
        }
      },

      // Leer resultado
      'leer resultado': () => {
        if (!alert.show) {
          speak('No hay resultados todavía. Envía el formulario primero');
          return;
        }
        if (alert.type === 'success') {
          speak('Tu reclamo fue enviado correctamente. Gracias por tu tiempo');
        } else {
          speak('Ocurrió un error al enviar tu reclamo. Puedes intentarlo nuevamente más tarde');
        }
      },
      'se envió el reclamo': () => {
        if (!alert.show) {
          speak('No hay resultados todavía');
          return;
        }
        if (alert.type === 'success') {
          speak('Sí, tu reclamo fue enviado exitosamente');
        } else {
          speak('No, ocurrió un error. Intenta enviarlo de nuevo');
        }
      },
    };

    registerCommands(voiceCommands);
    console.log('[Complaints] ✅ Comandos registrados:', Object.keys(voiceCommands).length);

    return () => {
      unregisterCommands();
      console.log('[Complaints] 🗑️ Comandos eliminados');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, correo, motivo, alert, speak]);

  // Efecto para leer automáticamente el resultado del envío
  useEffect(() => {
    if (alert.show) {
      if (alert.type === 'success') {
        speak('Tu reclamo fue enviado correctamente. Gracias por tu tiempo');
      } else {
        speak('Ocurrió un error al enviar tu reclamo. Puedes intentarlo nuevamente más tarde');
      }
    }
  }, [alert.show, alert.type, speak]);

  return (
    <Box
      className="
        w-full 
        bg-white 
        flex flex-col justify-center items-center 
        py-20 px-6 sm:px-10 
        font-[Montserrat] text-[#753b3b]
      "
      sx={{
        maxWidth: "100vw",
        paddingTop: "40px",
        paddingBottom: "60px",
        overflowX: "hidden",
      }}
    >
      {/* Título principal */}
      <Typography
        sx={{
          fontFamily: "'Lilita One', cursive",
          fontWeight: 700,
          fontSize: "1.8rem",
          color: "#753b3b",
          mb: 4,
          textAlign: "center",
        }}
      >
        Libro de Reclamaciones
      </Typography>

      {/* Descripción */}
      <Typography
        sx={{
          maxWidth: "700px",
          textAlign: "center",
          fontSize: "1rem",
          mb: 6,
          color: "#5a2b2b",
        }}
      >
        En Pastelería Famiglia, tu satisfacción es nuestra prioridad. Si tienes alguna queja,
        reclamo o sugerencia, por favor completa el siguiente formulario. Nuestro equipo revisará tu solicitud lo antes posible.
      </Typography>

      {/* Formulario */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        className="max-w-md w-full"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          border: "1px solid #efb0b0",
          borderRadius: "10px",
          padding: "2rem 2rem",
          backgroundColor: "#fff",
          boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Nombre completo:</Typography>
        <TextField
          variant="outlined"
          fullWidth
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. María López"
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#efb0b0" },
              "&:hover fieldset": { borderColor: "#d47a7a" },
              "&.Mui-focused fieldset": { borderColor: "#b25555" },
            },
          }}
        />

        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mt: 1 }}>
          Correo electrónico:
        </Typography>
        <TextField
          type="email"
          variant="outlined"
          fullWidth
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="Ej. maria@gmail.com"
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#efb0b0" },
              "&:hover fieldset": { borderColor: "#d47a7a" },
              "&.Mui-focused fieldset": { borderColor: "#b25555" },
            },
          }}
        />

        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mt: 1 }}>
          Motivo del reclamo:
        </Typography>
        <TextField
          variant="outlined"
          multiline
          rows={4}
          fullWidth
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Describe brevemente el motivo de tu reclamo"
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#efb0b0" },
              "&:hover fieldset": { borderColor: "#d47a7a" },
              "&.Mui-focused fieldset": { borderColor: "#b25555" },
            },
          }}
        />

        <Button
          type="submit"
          disabled={loading}
          sx={{
            mt: 3,
            alignSelf: "center",
            width: "160px",
            height: "36px",
            backgroundColor: "#fde3e3",
            color: "#753b3b",
            fontWeight: 500,
            textTransform: "none",
            fontSize: "0.8rem",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            "&:hover": { backgroundColor: "#f9cccc" },
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={16} sx={{ color: "#753b3b" }} />
              Enviando...
            </>
          ) : (
            "Enviar Reclamo"
          )}
        </Button>

        {alert.show && (
          <Alert
            severity={alert.type}
            sx={{
              mt: 3,
              textAlign: "center",
              borderRadius: "8px",
              backgroundColor:
                alert.type === "success" ? "#f0fff0" : "#fff0f0",
            }}
          >
            {alert.message}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default Complaints;
