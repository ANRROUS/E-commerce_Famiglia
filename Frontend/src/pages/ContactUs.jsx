import React, { useState, useEffect } from "react";
import { useVoice } from "../context/VoiceContext";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import RoomIcon from "@mui/icons-material/Room";
import axios from "axios";

const palette = {
  dark: "#6B3730",
  dark2: "#AF442F",
  accent: "#EF9D58",
  primary: "#C94549",
  pastel: "#EBBABC",
  white: "#FFFFFF",
  pageBg: "#FBF2F2",
};

const ContactUs = () => {
  const { speak, registerCommands, unregisterCommands } = useVoice();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  // ============================================
  // COMANDOS DE VOZ ESPECÍFICOS DE CONTACTO
  // ============================================
  useEffect(() => {
    const voiceCommands = {
      // LEER INFORMACIÓN DE CONTACTO
      'leer teléfono': () => {
        speak('Nuestro número de llamada es: más cincuenta y uno, nueve treinta y tres, cero cuarenta y tres, cero sesenta y seis');
      },
      'leer número': () => {
        speak('Nuestro número de llamada es: más cincuenta y uno, nueve treinta y tres, cero cuarenta y tres, cero sesenta y seis');
      },
      'cuál es el teléfono': () => {
        speak('Puedes llamarnos al: más cincuenta y uno, nueve treinta y tres, cero cuarenta y tres, cero sesenta y seis');
      },
      'leer email': () => {
        speak('Nuestro correo electrónico es: luna romero arroba famiglia punto com');
      },
      'leer correo': () => {
        speak('Nuestro correo electrónico es: luna romero arroba famiglia punto com');
      },
      'cuál es el email': () => {
        speak('Puedes escribirnos a: luna romero arroba famiglia punto com');
      },
      'leer ubicación': () => {
        speak('Nuestra ubicación es: Avenida Arenales 330, Lima');
      },
      'dónde están ubicados': () => {
        speak('Estamos ubicados en: Avenida Arenales 330, Lima');
      },
      'cuál es la dirección': () => {
        speak('Nuestra dirección es: Avenida Arenales 330, Lima');
      },
      'leer toda la información': () => {
        speak('Número de llamada: más cincuenta y uno, nueve treinta y tres, cero cuarenta y tres, cero sesenta y seis. Email: luna romero arroba famiglia punto com. Ubicación: Avenida Arenales 330, Lima');
      },

      // LLENAR FORMULARIO
      'llenar nombre (.+)': (nombreVoz) => {
        setNombre(nombreVoz);
        speak(`Nombre ingresado: ${nombreVoz}`);
      },
      'mi nombre es (.+)': (nombreVoz) => {
        setNombre(nombreVoz);
        speak(`Nombre ingresado: ${nombreVoz}`);
      },
      'llenar email (.+)': (emailVoz) => {
        setEmail(emailVoz);
        speak(`Email ingresado: ${emailVoz}`);
      },
      'mi correo es (.+)': (emailVoz) => {
        setEmail(emailVoz);
        speak(`Correo ingresado: ${emailVoz}`);
      },
      'llenar mensaje (.+)': (mensajeVoz) => {
        setMensaje(mensajeVoz);
        speak(`Mensaje ingresado`);
      },
      'mi mensaje es (.+)': (mensajeVoz) => {
        setMensaje(mensajeVoz);
        speak(`Mensaje ingresado`);
      },

      // ENVIAR FORMULARIO
      'enviar mensaje': () => {
        if (!nombre || !email || !mensaje) {
          speak('Por favor completa todos los campos antes de enviar');
          return;
        }
        if (loading) {
          speak('Ya se está enviando el mensaje');
          return;
        }
        speak('Enviando mensaje');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      },
      'enviar formulario': () => {
        if (!nombre || !email || !mensaje) {
          speak('Por favor completa todos los campos antes de enviar');
          return;
        }
        if (loading) {
          speak('Ya se está enviando el mensaje');
          return;
        }
        speak('Enviando formulario');
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      },

      // LEER RESULTADO
      'leer resultado': () => {
        if (!alert.show) {
          speak('No hay resultados todavía. Envía el formulario primero');
          return;
        }
        if (alert.type === 'success') {
          speak('Tu mensaje fue enviado correctamente');
        } else {
          speak('Ocurrió un error al enviar el mensaje. Puedes intentarlo nuevamente');
        }
      },
      'se envió el mensaje': () => {
        if (!alert.show) {
          speak('No hay resultados todavía');
          return;
        }
        if (alert.type === 'success') {
          speak('Sí, tu mensaje fue enviado exitosamente');
        } else {
          speak('No, ocurrió un error. Puedes intentar enviarlo de nuevo');
        }
      },

      // OTRAS ACCIONES
      'limpiar formulario': () => {
        setNombre('');
        setEmail('');
        setMensaje('');
        setAlert({ show: false, type: '', message: '' });
        speak('Formulario limpiado');
      },
      'qué campos faltan': () => {
        const faltantes = [];
        if (!nombre) faltantes.push('nombre');
        if (!email) faltantes.push('correo electrónico');
        if (!mensaje) faltantes.push('mensaje');

        if (faltantes.length === 0) {
          speak('Todos los campos están completos. Puedes enviar el mensaje');
        } else {
          speak(`Faltan los siguientes campos: ${faltantes.join(', ')}`);
        }
      },
    };

    registerCommands(voiceCommands);
    console.log('[ContactUs] ✅ Comandos de voz registrados:', Object.keys(voiceCommands).length);

    return () => {
      unregisterCommands();
      console.log('[ContactUs] 🗑️ Comandos de voz eliminados');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, email, mensaje, loading, alert, speak]);

  // Efecto para leer automáticamente el resultado del envío
  useEffect(() => {
    if (alert.show) {
      if (alert.type === 'success') {
        speak('Tu mensaje fue enviado correctamente');
      } else {
        speak('Ocurrió un error al enviar el mensaje. Puedes intentarlo nuevamente más tarde');
      }
    }
  }, [alert.show, alert.type, speak]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ show: false, type: "", message: "" });

    try {
      await axios.post("http://localhost:3000/contact/send-email", {
        nombre,
        email,
        mensaje,
      });

      setAlert({
        show: true,
        type: "success",
        message: "¡Tu mensaje fue enviado correctamente!",
      });
      setNombre("");
      setEmail("");
      setMensaje("");
    } catch (error) {
      setAlert({
        show: true,
        type: "error",
        message: "Ocurrió un error al enviar el mensaje. Intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: palette.white,
        width: "100%",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 8,
        px: { xs: 3, md: 10 },
        py: 10,
        fontFamily: "Montserrat",
      }}
    >
      {/* ---------- IZQUIERDA: INFORMACIÓN DE CONTACTO ---------- */}
      <Box
        className="contact-info"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          maxWidth: 380,
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Lilita One', cursive",
            fontWeight: 700,
            color: palette.dark,
            fontSize: "1.5rem",
            mb: 1,
          }}
        >
          Contáctanos
        </Typography>

        {/* CARD - Teléfono */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
            backgroundColor: palette.white,
          }}
        >
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <PhoneIcon sx={{ fontSize: 36, color: palette.primary }} />
            <Box>
              <Typography
                sx={{ fontWeight: 600, color: palette.dark, fontSize: "0.95rem" }}
              >
                Número de llamada
              </Typography>
              <Typography sx={{ color: palette.dark2, fontSize: "0.9rem" }}>
                +51 933 043 066
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* CARD - Email */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
            backgroundColor: palette.white,
          }}
        >
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <EmailIcon sx={{ fontSize: 36, color: palette.primary }} />
            <Box>
              <Typography
                sx={{ fontWeight: 600, color: palette.dark, fontSize: "0.95rem" }}
              >
                Email
              </Typography>
              <Typography sx={{ color: palette.dark2, fontSize: "0.9rem" }}>
                lunaromero@famiglia.com
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* CARD - Ubicación */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
            backgroundColor: palette.white,
          }}
        >
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <RoomIcon sx={{ fontSize: 36, color: palette.primary }} />
            <Box>
              <Typography
                sx={{ fontWeight: 600, color: palette.dark, fontSize: "0.95rem" }}
              >
                Ubicación
              </Typography>
              <Typography sx={{ color: palette.dark2, fontSize: "0.9rem" }}>
                Av. Arenales 330 – Lima
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* ---------- DERECHA: FORMULARIO DE CONTACTO ---------- */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          maxWidth: 450,
          backgroundColor: "#fcfbf9ff",
          borderRadius: 3,
          p: 4,
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            color: palette.primary,
            fontSize: "1.1rem",
            mb: 3,
            textAlign: "center",
          }}
        >
          Envíanos un mensaje
        </Typography>

        {/* Campo Nombre */}
        <Typography sx={{ color: palette.dark, fontWeight: 600, mb: 0.5 }}>
          Nombre
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "& fieldset": { borderColor: palette.pastel },
              "&:hover fieldset": { borderColor: palette.primary },
              "&.Mui-focused fieldset": { borderColor: palette.dark2 },
            },
          }}
        />

        {/* Campo Email */}
        <Typography
          sx={{ color: palette.dark, fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          Correo electrónico
        </Typography>
        <TextField
          fullWidth
          type="email"
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "& fieldset": { borderColor: palette.pastel },
              "&:hover fieldset": { borderColor: palette.primary },
              "&.Mui-focused fieldset": { borderColor: palette.dark2 },
            },
          }}
        />

        {/* Campo Mensaje */}
        <Typography
          sx={{ color: palette.dark, fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          Mensaje
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          required
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "& fieldset": { borderColor: palette.pastel },
              "&:hover fieldset": { borderColor: palette.primary },
              "&.Mui-focused fieldset": { borderColor: palette.dark2 },
            },
          }}
        />

        {/* Botón de envío centrado */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button
            type="submit"
            disabled={loading}
            sx={{
              width: "170px",
              height: "42px",
              backgroundColor: palette.primary,
              color: palette.white,
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.9rem",
              borderRadius: 2,
              boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
              "&:hover": { backgroundColor: palette.dark2 },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={18} sx={{ color: palette.white, mr: 1 }} />
                Enviando...
              </>
            ) : (
              "Enviar Mensaje"
            )}
          </Button>
        </Box>

        {/* Alerta de estado */}
        {alert.show && (
          <Alert
            severity={alert.type}
            sx={{
              mt: 3,
              borderRadius: 2,
              textAlign: "center",
              backgroundColor:
                alert.type === "success" ? "#f4fff4" : "#fff4f4",
            }}
          >
            {alert.message}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default ContactUs;
