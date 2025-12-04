import axios from "axios";
import prisma from "../../prismaClient.js";

const AWS_UPLOAD_API_URL = process.env.AWS_UPLOAD_API_URL;

export const uploadProfileImage = async (req, res) => {
    try {
        const { image, fileName, contentType } = req.body;
        const userId = req.user.id; // From auth middleware

        if (!image) {
            return res.status(400).json({ message: "No image provided" });
        }

        if (!AWS_UPLOAD_API_URL) {
            return res.status(500).json({ message: "AWS upload API not configured" });
        }

        // Call AWS Lambda via API Gateway
        const response = await axios.post(
            `${AWS_UPLOAD_API_URL}/upload-profile-image`,
            {
                image,
                fileName,
                contentType,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 30000, // 30 second timeout
            }
        );

        const { imageUrl } = response.data;

        if (!imageUrl) {
            throw new Error("Failed to get image URL from AWS");
        }

        // Update user profile in database
        const updatedUser = await prisma.usuario.update({
            where: { id_usuario: BigInt(userId) },
            data: { url_imagen: imageUrl },
            select: {
                id_usuario: true,
                nombre: true,
                correo: true,
                url_imagen: true,
                rol: true,
            },
        });

        res.json({
            message: "Profile image uploaded successfully",
            imageUrl,
            usuario: {
                id: Number(updatedUser.id_usuario),
                nombre: updatedUser.nombre,
                correo: updatedUser.correo,
                url_imagen: updatedUser.url_imagen,
                rol: updatedUser.rol,
            },
        });
    } catch (error) {
        console.error("Error uploading profile image:", error);
        res.status(500).json({
            message: "Error uploading profile image",
            error: error.response?.data?.error || error.message,
        });
    }
};
