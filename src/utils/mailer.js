const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const FROM_EMAIL = process.env.SMTP_FROM || 'CliniCore <noreply@clinicore.com>';

/**
 * Envía un correo electrónico
 */
async function enviarEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP no configurado. Email no enviado a:', to);
    console.log('📧 Contenido del email:', { subject, text: text || html });
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html
    });

    console.log('✅ Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    throw error;
  }
}

/**
 * Envía código de recuperación de contraseña
 */
async function enviarCodigoRecuperacion(email, codigo) {
  const subject = 'Código de recuperación de contraseña - CliniCore';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 32px 24px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 32px 24px; }
        .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; }
        .text { color: #475569; font-size: 15px; line-height: 1.6; margin: 16px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 24px 0; }
        .warning p { color: #92400e; margin: 0; font-size: 14px; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 13px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Recuperación de contraseña</h1>
        </div>
        <div class="content">
          <p class="text">Hola,</p>
          <p class="text">Recibimos una solicitud para restablecer la contraseña de tu cuenta en CliniCore. Usa el siguiente código para continuar:</p>
          
          <div class="code-box">
            <span class="code">${codigo}</span>
          </div>
          
          <div class="warning">
            <p>⏰ Este código expira en <strong>15 minutos</strong>.</p>
          </div>
          
          <p class="text">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} CliniCore. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Código de recuperación de contraseña - CliniCore

Tu código de verificación es: ${codigo}

Este código expira en 15 minutos.

Si no solicitaste este cambio, ignora este correo.

© ${new Date().getFullYear()} CliniCore
  `.trim();

  return enviarEmail({ to: email, subject, html, text });
}

/**
 * Envía confirmación de cambio de contraseña
 */
async function enviarConfirmacionCambioPassword(email) {
  const subject = 'Contraseña actualizada - CliniCore';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px 24px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 32px 24px; }
        .text { color: #475569; font-size: 15px; line-height: 1.6; margin: 16px 0; }
        .success-icon { text-align: center; font-size: 64px; margin: 24px 0; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 13px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Contraseña actualizada</h1>
        </div>
        <div class="content">
          <div class="success-icon">🎉</div>
          <p class="text">¡Tu contraseña ha sido actualizada exitosamente!</p>
          <p class="text">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <p class="text">Si no realizaste este cambio, contacta inmediatamente a nuestro equipo de soporte.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} CliniCore. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return enviarEmail({ to: email, subject, html, text: 'Tu contraseña ha sido actualizada exitosamente en CliniCore.' });
}

/**
 * Envía bienvenida a nuevo usuario registrado
 */
async function enviarBienvenida(email, nombres) {
  const subject = '¡Bienvenido a CliniCore!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 32px 24px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 32px 24px; }
        .text { color: #475569; font-size: 15px; line-height: 1.6; margin: 16px 0; }
        .welcome-icon { text-align: center; font-size: 64px; margin: 24px 0; }
        .cta { display: block; text-align: center; background: #3b82f6; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 13px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 ¡Bienvenido a CliniCore!</h1>
        </div>
        <div class="content">
          <div class="welcome-icon">👋</div>
          <p class="text">Hola ${nombres},</p>
          <p class="text">Tu cuenta ha sido creada exitosamente. Estamos emocionados de tenerte con nosotros.</p>
          <p class="text">CliniCore es la plataforma integral para la gestión de tu clínica. Desde atención de pacientes hasta control operativo, todo en un solo lugar.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} CliniCore. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return enviarEmail({ to: email, subject, html, text: `¡Bienvenido a CliniCore, ${nombres}!` });
}

module.exports = {
  enviarEmail,
  enviarCodigoRecuperacion,
  enviarConfirmacionCambioPassword,
  enviarBienvenida
};
