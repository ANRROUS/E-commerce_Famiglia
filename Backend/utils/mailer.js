import nodemailer from "nodemailer";

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: "arthuropipa@gmail.com",
    pass: "fcgfgaweyvnunidz",
  },
});

transporter
  .verify()
  .then(() => console.log("✅ Listo para enviar correos con Gmail"))
  .catch((err) => console.error("❌ Error verificando transporte:", err));

export const sendContactMail = async ({ nombre, email, mensaje }) => {
  await transporter.sendMail({
    from: `"${nombre}" <${email}>`,
    to: "arthuropipa@gmail.com",
    subject: "Famiglia - Nuevo Mensaje de Contacto ⚠",
    html: `
      <div style="
        font-family: 'Helvetica Neue', Arial, sans-serif;
        background-color: #f7f7f7;
        padding: 0;
        margin: 0;
      ">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="background-color: #753b3b; padding: 20px 0;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 1px;">
                FAMIGLIA
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"
                style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: left;">
                <tr>
                  <td style="padding: 40px 50px;">
                    <h2 style="color: #753b3b; font-size: 20px; margin-bottom: 15px; font-weight: 600;">
                      Nuevo mensaje de contacto
                    </h2>
                    <p style="font-size: 15px; color: #444; margin-bottom: 25px;">
                      Has recibido un nuevo mensaje a través del formulario de contacto de <strong>Famiglia</strong>.
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="6" border="0" width="100%"
                      style="background-color: #f9f9f9; border-left: 4px solid #b25555; border-radius: 4px;">
                      <tr>
                        <td style="color: #000; font-size: 15px;">
                          <strong>Nombre:</strong> ${nombre}<br/>
                          <strong>Correo:</strong> ${email}<br/>
                          <strong>Mensaje:</strong><br/>${mensaje}
                        </td>
                      </tr>
                    </table>

                    <p style="margin-top: 30px; font-size: 13px; color: #999;">
                      Este correo fue generado automáticamente desde el sitio web de Famiglia.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 20px; color: #888; font-size: 12px;">
              © ${new Date().getFullYear()} Famiglia — Todos los derechos reservados
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};

export const sendComplaintMail = async ({ nombre, email, motivo }) => {
  await transporter.sendMail({
    from: `"${nombre}" <${email}>`,
    to: "arthuropipa@gmail.com",
    subject: "Famiglia - Nuevo Reclamo - Libro de Reclamaciones 📋",
    html: `
      <div style="
        font-family: 'Helvetica Neue', Arial, sans-serif;
        background-color: #f7f7f7;
        padding: 0;
        margin: 0;
      ">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="background-color: #753b3b; padding: 20px 0;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 1px;">
                FAMIGLIA
              </h1>
              <p style="color: #ffcccc; font-size: 12px; margin: 5px 0 0 0;">
                📋 Libro de Reclamaciones
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"
                style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: left;">
                <tr>
                  <td style="padding: 40px 50px;">
                    <h2 style="color: #753b3b; font-size: 20px; margin-bottom: 15px; font-weight: 600;">
                      ⚠️ Nuevo Reclamo Recibido
                    </h2>
                    <p style="font-size: 15px; color: #444; margin-bottom: 25px;">
                      Se ha registrado un nuevo reclamo a través del <strong>Libro de Reclamaciones</strong> de Famiglia.
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="12" border="0" width="100%"
                      style="background-color: #fff5f5; border-left: 4px solid #d32f2f; border-radius: 4px;">
                      <tr>
                        <td style="color: #000; font-size: 15px;">
                          <strong>Nombre del cliente:</strong> ${nombre}<br/><br/>
                          <strong>Correo electrónico:</strong> ${email}<br/><br/>
                          <strong>Motivo del reclamo:</strong><br/>
                          <div style="margin-top: 10px; padding: 15px; background-color: #ffffff; border-radius: 4px; border: 1px solid #efb0b0;">
                            ${motivo.replace(/\n/g, '<br/>')}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin-top: 25px; font-size: 14px; color: #666; background-color: #fff9e6; padding: 12px; border-radius: 4px; border-left: 4px solid #ffc107;">
                      📌 <strong>Importante:</strong> Este reclamo debe ser respondido en un plazo máximo de 30 días calendario según la normativa vigente.
                    </p>

                    <p style="margin-top: 30px; font-size: 13px; color: #999;">
                      Este correo fue generado automáticamente desde el Libro de Reclamaciones de Famiglia.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 20px; color: #888; font-size: 12px;">
              © ${new Date().getFullYear()} Famiglia — Todos los derechos reservados
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};
