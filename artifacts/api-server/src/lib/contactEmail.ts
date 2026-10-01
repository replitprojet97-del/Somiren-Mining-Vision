import { ReplitConnectors } from "@replit/connectors-sdk";
import { Resend } from "resend";

type ContactEmail = {
  from: string;
  to: string[];
  replyTo: string;
  subject: string;
  html: string;
};

export async function sendContactEmail(message: ContactEmail): Promise<void> {
  // Preserve API-key delivery for the existing external hosting setup.
  if (process.env.RESEND_API_KEY) {
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send(message);
    if (error || !data?.id) throw new Error("Resend rejected the contact email");
    return;
  }

  // The connector manages credentials and refreshes authentication per request.
  const connectors = new ReplitConnectors();
  const { replyTo, ...payload } = message;
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, reply_to: replyTo }),
  });
  const result = await response.json() as { id?: string };
  if (!response.ok || !result.id) {
    throw new Error(`Resend rejected the contact email (HTTP ${response.status})`);
  }
}