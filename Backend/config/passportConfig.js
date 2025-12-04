import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../prismaClient.js";
import bcrypt from "bcrypt";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        // Check if user exists by email
        let user = await prisma.usuario.findUnique({
          where: { correo: email },
        });

        if (!user) {
          // Create new user with Google data
          const randomPassword = await bcrypt.hash(
            Math.random().toString(36).slice(-8),
            10
          );

          user = await prisma.usuario.create({
            data: {
              nombre: name,
              correo: email,
              contraseña: randomPassword,
              rol: "U", // Default user role
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id_usuario);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
