import prisma from "../../prismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logAuditoria } from "../../services/auditoriaService.js";
import { authenticator } from "otplib";

export const register = async (req, res) => {
  try {
    const { nombre, correo, contraseña } = req.body;

    if (!nombre || !correo || !contraseña) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    const existente = await prisma.usuario.findUnique({ where: { correo } });
    if (existente)
      return res.status(409).json({ message: "El correo ya está registrado" });

    const hashed = await bcrypt.hash(contraseña, 10);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        contrase_a: hashed,
        rol: "C",
        autenticacion_2fa: {
          create: {
            habilitado: false,
            secreto: null,
            temp_secreto: null,
          },
        },
      },
      include: {
        autenticacion_2fa: true,
      },
    });

    res.status(201).json({
      message: "Usuario registrado correctamente",
      usuario: {
        id: Number(nuevoUsuario.id_usuario),
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol || "C",
        autenticacion_2fa: nuevoUsuario.autenticacion_2fa,
      },
    });

    logAuditoria({
      usuarioId: nuevoUsuario?.id_usuario || null,
      accion: "register",
      recurso: "usuario",
      recursoId: nuevoUsuario?.id_usuario || null,
      req,
    }).catch((auditErr) => console.warn("Error en logAuditoria", auditErr));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error en el registro", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { correo, contraseña, token2fa } = req.body;

    if (!correo || !contraseña) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { correo },
      include: { autenticacion_2fa: true },
    });

    if (!usuario)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(contraseña, usuario.contrase_a);
    if (!isMatch)
      return res.status(401).json({ message: "Contraseña incorrecta" });

    const registro2FA = usuario.autenticacion_2fa;
    if (registro2FA?.habilitado) {
      // Si el usuario no ha enviado aún el token, pedimos el código
      if (!token2fa) {
        return res.status(200).json({
          message: "Autenticación 2FA requerida",
          twofa_required: true,
          userId: Number(usuario.id_usuario),
        });
      }

      // Si sí lo envió, verificamos
      const isValid = authenticator.check(token2fa, registro2FA.secreto);
      if (!isValid)
        return res.status(401).json({ message: "Código 2FA incorrecto" });
    }

    const rol = usuario.rol || "C";
    const token = jwt.sign(
      { id: Number(usuario.id_usuario), correo: usuario.correo, rol },
      process.env.JWT_SECRET || "famiglia-secret",
      { expiresIn: "1d" }
    );

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login exitoso",
      authToken: token,
      usuario: {
        id: Number(usuario.id_usuario),
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol,
        autenticacion_2fa: registro2FA,
      },
    });

    logAuditoria({
      usuarioId: usuario?.id_usuario || null,
      accion: "login",
      recurso: "usuario",
      recursoId: usuario?.id_usuario || null,
      req,
      meta: { metodo: "password" },
    }).catch((auditErr) => console.warn("Error en logAuditoria", auditErr));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al iniciar sesión", error: error.message });
  }
};

export const getPerfil = async (req, res) => {
  try {
    const userId = BigInt(req.user.id);

    const user = await prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        autenticacion_2fa: true,
      },
    });

    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({
      message: "Perfil obtenido correctamente",
      usuario: {
        id: Number(user.id_usuario),
        nombre: user.nombre,
        correo: user.correo,
        url_imagen: user.url_imagen,
        rol: user.rol || "C",
        autenticacion_2fa: user.autenticacion_2fa || null,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener el perfil", error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Obtener userId si está disponible
    const userId = req.user?.id || null;

    // Limpiar la cookie authToken
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });

    res.json({ message: "Logout exitoso" });

    // Log de auditoría
    if (userId) {
      logAuditoria({
        usuarioId: userId,
        accion: "logout",
        recurso: "usuario",
        recursoId: userId,
        req,
      }).catch((auditErr) => console.warn("Error en logAuditoria", auditErr));
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al cerrar sesión", error: error.message });
  }
};