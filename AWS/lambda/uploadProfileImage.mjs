import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "sa-east-1" });
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "famiglia-profile-images";

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { image, fileName, contentType } = body;

        if (!image) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
                body: JSON.stringify({ error: "No image provided" }),
            };
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const extension = fileName ? fileName.split(".").pop() : "jpg";
        const uniqueFileName = `profile-images/${timestamp}-${randomString}.${extension}`;

        // Convert base64 to buffer
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueFileName,
            Body: buffer,
            ContentType: contentType || "image/jpeg",
            ACL: "public-read",
        });

        await s3Client.send(command);

        // Generate public URL
        const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "sa-east-1"}.amazonaws.com/${uniqueFileName}`;

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                message: "Image uploaded successfully",
                imageUrl,
            }),
        };
    } catch (error) {
        console.error("Error uploading image:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
