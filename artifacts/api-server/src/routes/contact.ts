import { Router, type IRouter } from "express";
import { Resend } from "resend";
import { z } from "zod";

const router: IRouter = Router();

const ContactSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(254),
  phone: z.string().max(30).optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

router.post("/contact", async (req, res) => {
  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }

  const { name, email, phone, subject, message } = parsed.data;

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    req.log.error("RESEND_API_KEY manquant");
    res.status(503).json({ error: "Service d'envoi d'email non configuré" });
    return;
  }

  const resend = new Resend(apiKey);
  const toEmail = process.env["CONTACT_EMAIL"] ?? "contact@somiren.com";

  const phoneSection = phone
    ? `<tr><td style="padding:6px 12px;color:#999;font-size:13px;">Téléphone</td><td style="padding:6px 12px;font-size:13px;">${phone}</td></tr>`
    : "";

  const fromEmail = process.env["RESEND_FROM_EMAIL"] ?? "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from: `Somiren S.A. <${fromEmail}>`,
    to: [toEmail],
    replyTo: email,
    subject: `[Contact Somiren] ${subject}`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Nouveau message — Somiren S.A.</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td>
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0d0d0d;border-top:3px solid #B8952A;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px;border-bottom:1px solid #222;">
            <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:2px;">SOMIREN S.A.</span><br>
            <span style="font-size:11px;color:#B8952A;letter-spacing:3px;">EXCELLENCE MINIÈRE</span>
          </td>
        </tr>
        <!-- Title -->
        <tr>
          <td style="padding:28px 40px 0;">
            <p style="margin:0;font-size:13px;color:#B8952A;letter-spacing:2px;text-transform:uppercase;">Nouveau message reçu</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;">${subject}</h1>
          </td>
        </tr>
        <!-- Fields -->
        <tr>
          <td style="padding:24px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:4px;">
              <tr style="border-bottom:1px solid #2a2a2a;">
                <td style="padding:6px 12px;color:#999;font-size:13px;">Nom</td>
                <td style="padding:6px 12px;font-size:13px;color:#fff;">${name}</td>
              </tr>
              <tr style="border-bottom:1px solid #2a2a2a;">
                <td style="padding:6px 12px;color:#999;font-size:13px;">Email</td>
                <td style="padding:6px 12px;font-size:13px;"><a href="mailto:${email}" style="color:#B8952A;">${email}</a></td>
              </tr>
              ${phoneSection}
            </table>
          </td>
        </tr>
        <!-- Message -->
        <tr>
          <td style="padding:0 28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:4px;border-left:3px solid #B8952A;">
              <tr>
                <td style="padding:20px 20px;font-size:14px;line-height:1.7;color:#ccc;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px;background:#080808;border-top:1px solid #222;">
            <p style="margin:0;font-size:11px;color:#555;">Ce message a été envoyé depuis le formulaire de contact de <a href="https://somiren.com" style="color:#B8952A;">somiren.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    req.log.error({ err: error }, "Erreur envoi email Resend");
    res.status(500).json({ error: "Échec de l'envoi, veuillez réessayer." });
    return;
  }

  res.json({ success: true });
});

export default router;
