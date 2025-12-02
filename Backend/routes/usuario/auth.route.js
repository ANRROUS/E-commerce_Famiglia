import express from "express";
import { register, login, getPerfil, logout } from "../../controllers/usuario/auth.controller.js";
import { setup2FA, verify2FA, verify2FAByEmail, disable2FA } from "../../controllers/usuario/2fa.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { validateSchema } from "../../middleware/validateSchema.js";
import { registerSchema, loginSchema } from "../../schemas/authSchema.js";


const router = express.Router();

router.post("/register", validateSchema(registerSchema), register);
router.post("/login", validateSchema(loginSchema), login);
router.post("/logout", verifyToken, logout);
router.get("/perfil", verifyToken, getPerfil);
router.post("/perfil/setup", verifyToken, setup2FA);
router.post("/perfil/verify", verifyToken, verify2FA);
router.post("/perfil/disable", verifyToken, disable2FA);
router.post("/verify-2fa", verify2FAByEmail);

export default router;
