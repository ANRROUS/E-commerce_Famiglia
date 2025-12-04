import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
  Grid
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import RoomIcon from "@mui/icons-material/Room";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axios from "axios";

const palette = {
  dark: "#6B3730",
  dark2: "#AF442F",
  accent: "#EF9D58",
  primary: "#C94549",
  pastel: "#EBBABC",
  white: "#FFFFFF",
  pageBg: "#FBF2F2",
  textMain: "#4a2b2b"
};

const ContactUs = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

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

  const faqs = [
    {
      question: "¿Hacen envíos a todo Lima?",
      answer: "Sí, realizamos envíos a la mayoría de distritos de Lima Metropolitana. El costo varía según la ubicación."
    },
    {
      question: "¿Con cuánto tiempo de anticipación debo pedir?",
      answer: "Para tortas personalizadas recomendamos 48 horas. Para productos de la carta, puedes pedir para el mismo día (sujeto a stock)."
    },
    {
      question: "¿Tienen opciones sin gluten?",
      answer: "Sí, contamos con una línea especial de productos sin gluten y sin azúcar. Pregunta por nuestra carta saludable."
    },
    {
      question: "¿Puedo personalizar mi pedido?",
      answer: "¡Por supuesto! Escríbenos en el formulario o contáctanos por WhatsApp para coordinar los detalles de tu pedido personalizado."
    }
  ];

  return (
    <Box sx={{ backgroundColor: palette.white, minHeight: "100vh", py: 8, fontFamily: "Montserrat" }}>
      <Container maxWidth="lg">

        <Typography
          align="center"
          sx={{
            fontFamily: "'Lilita One', cursive",
            color: palette.dark,
            fontSize: { xs: "2rem", md: "2.5rem" },
            mb: 6
          }}
        >
          Contáctanos
        </Typography>

        {/* --- TOP SECTION: FORM & IMAGE --- */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4, mb: 8, alignItems: "stretch" }}>

          {/* Formulario */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              flex: 1,
              backgroundColor: "#fcfbf9",
              borderRadius: 4,
              p: { xs: 3, md: 5 },
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              border: `1px solid ${palette.pastel}`
            }}
          >
            <Typography sx={{ fontWeight: 700, color: palette.primary, fontSize: "1.2rem", mb: 3 }}>
              Envíanos un mensaje
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography sx={{ color: palette.dark, fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>Nombre</Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "&:hover fieldset": { borderColor: "#8b3e3e" },
                      "&.Mui-focused fieldset": { borderColor: "#8b3e3e" }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography sx={{ color: palette.dark, fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>Correo electrónico</Typography>
                <TextField
                  fullWidth
                  type="email"
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "&:hover fieldset": { borderColor: "#8b3e3e" },
                      "&.Mui-focused fieldset": { borderColor: "#8b3e3e" }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} style={{ width: "100%" }}>
                <Typography sx={{ color: palette.dark, fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>Mensaje</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  required
                  sx={{
                    width: "100%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "&:hover fieldset": { borderColor: "#8b3e3e" },
                      "&.Mui-focused fieldset": { borderColor: "#8b3e3e" }
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              disabled={loading}
              fullWidth
              sx={{
                mt: 3,
                height: "42px",
                backgroundColor: palette.primary,
                color: palette.white,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(201, 69, 73, 0.2)",
                "&:hover": { backgroundColor: palette.dark2 },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : "Enviar Mensaje"}
            </Button>

            {alert.show && (
              <Alert severity={alert.type} sx={{ mt: 2, borderRadius: 2 }}>
                {alert.message}
              </Alert>
            )}
          </Box>

          {/* Imagen */}
          <Box
            sx={{
              flex: 1,
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
              minHeight: 300,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
            }}
          >
            <Box
              component="img"
              src="https://aprende.com/wp-content/uploads/2022/12/publicitando-pasteleria.jpg"
              alt="Pastelería"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.85,
                transition: "transform 0.5s",
                "&:hover": { transform: "scale(1.02)" }
              }}
            />
          </Box>
        </Box>

        {/* --- MIDDLE SECTION: CONTACT INFO ITEMS --- */}
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, mb: 8 }}>
          {[
            { icon: <PhoneIcon />, title: "Llámanos", text: "+51 933 043 066" },
            { icon: <EmailIcon />, title: "Escríbenos", text: "lunaromero@famiglia.com" },
            { icon: <RoomIcon />, title: "Visítanos", text: "Av. Arenales 330 – Lima" }
          ].map((item, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                p: 3,
                borderRadius: 4,
                bgcolor: "#FFF5F5",
                border: `1px solid ${palette.pastel}`,
                minWidth: 280,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                transition: "all 0.3s ease",
                "&:hover": { transform: "translateY(-4px)", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }
              }}
            >
              <Box sx={{
                p: 1.5,
                borderRadius: "50%",
                bgcolor: palette.primary,
                color: palette.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 8px rgba(201, 69, 73, 0.3)"
              }}>
                {item.icon}
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: palette.dark, lineHeight: 1.2, mb: 0.5 }}>{item.title}</Typography>
                <Typography variant="body2" sx={{ color: palette.textMain, fontWeight: 500 }}>{item.text}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* --- BOTTOM SECTION: FAQ --- */}
        <Box sx={{ maxWidth: 800, mx: "auto" }}>
          <Typography variant="h4" align="center" sx={{ fontWeight: 800, color: palette.dark, mb: 5, fontFamily: "'Lilita One', cursive" }}>
            Preguntas Frecuentes
          </Typography>
          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              elevation={0}
              sx={{
                mb: 2,
                border: `1px solid ${palette.pastel}`,
                borderRadius: "16px !important",
                "&:before": { display: "none" },
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                transition: "all 0.2s",
                "&:hover": { borderColor: palette.primary }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: palette.primary }} />}
                sx={{ px: 3, py: 1, "& .MuiAccordionSummary-content": { my: 2 } }}
              >
                <Typography sx={{ fontWeight: 700, color: palette.textMain, fontSize: "1.05rem" }}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                <Typography sx={{ color: "#666", lineHeight: 1.6 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

      </Container>
    </Box>
  );
};

export default ContactUs;
