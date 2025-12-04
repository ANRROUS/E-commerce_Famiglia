import jwt from "jsonwebtoken";

export const googleAuthCallback = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/login?error=authentication_failed`
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: Number(user.id_usuario),
                correo: user.correo,
                rol: user.rol,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${token}`);
    } catch (error) {
        console.error("Google auth callback error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};
