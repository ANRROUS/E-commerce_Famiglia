import { Router } from 'express';
// import { crearContacto } from '../controllers/contacto.controllers.js';
// import { contactSchema } from '../validators/contact.validator.js';
import { sendContactMail, sendComplaintMail } from '../utils/mailer.js';

const router = Router();

router.post("/send-email", async (req, res) => {
  try {
    const { nombre, email, mensaje } = req.body;

    await sendContactMail({ nombre, email, mensaje });

    res.status(200).json({ message: "Correo enviado correctamente" });
  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ message: "Error al enviar el correo" });
  }
});

router.post("/send-complaint", async (req, res) => {
  try {
    const { nombre, email, motivo } = req.body;

    if (!nombre || !email || !motivo) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    await sendComplaintMail({ nombre, email, motivo });

    res.status(200).json({ message: "Reclamo enviado correctamente" });
  } catch (error) {
    console.error("Error enviando reclamo:", error);
    res.status(500).json({ message: "Error al enviar el reclamo" });
  }
});

// router.post('/contact', (req, res, next) => {
//   const result = contactSchema.safeParse(req.body);
//   if (!result.success) {
//     return res.status(400).json({ errors: result.error.errors });
//   }
//   next();
// }, crearContacto);

export default router;