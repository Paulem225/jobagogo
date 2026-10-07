import { ReplitConnectors } from "@replit/connectors-sdk";

const DEFAULT_FROM = "Jobagogo <onboarding@resend.dev>";

export async function sendLoginCode(email: string, code: string): Promise<void> {
  const connectors = new ReplitConnectors();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Ton code de connexion Jobagogo",
      text: `Ton code Jobagogo est ${code}. Il expire dans 10 minutes et ne peut être utilisé qu'une seule fois.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#17202a">
          <h1 style="font-size:24px">Connexion à Jobagogo</h1>
          <p>Utilise ce code pour continuer :</p>
          <p style="font-size:34px;font-weight:700;letter-spacing:8px">${code}</p>
          <p>Ce code expire dans 10 minutes et ne peut être utilisé qu'une seule fois.</p>
          <p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Resend a refusé l'envoi du code (${response.status}): ${detail}`);
  }
}