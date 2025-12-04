import express from "express";
import { register, login, getPerfil, logout } from "../../controllers/usuario/auth.controller.js";
import { setup2FA, verify2FA, verify2FAByEmail, disable2FA } from "../../controllers/usuario/2fa.controller.js";
import { googleAuthCallback } from "../../controllers/usuario/googleAuth.controller.js";
import { uploadProfileImage } from "../../controllers/usuario/uploadImage.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { validateSchema } from "../../middleware/validateSchema.js";
import { registerSchema, loginSchema } from "../../schemas/authSchema.js";
import passport from "../../config/passportConfig.js";


const router = express.Router();

router.post("/register", validateSchema(registerSchema), register);
router.post("/login", validateSchema(loginSchema), login);
router.post("/logout", logout);
router.get("/perfil", verifyToken, getPerfil);
router.post("/perfil/setup", verifyToken, setup2FA);
router.post("/perfil/verify", verifyToken, verify2FA);
router.post("/perfil/disable", verifyToken, disable2FA);
router.post("/perfil/upload-image", verifyToken, uploadProfileImage);
router.post("/verify-2fa", verify2FAByEmail);

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/login" }), googleAuthCallback);

export default router;
