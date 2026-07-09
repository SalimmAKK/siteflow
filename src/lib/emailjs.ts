import emailjs from '@emailjs/browser';

// Shared EmailJS wrapper for the public marketing site. src/pages/Team.tsx has
// its own inline emailjs.send() call for invite emails (dashboard-side,
// untouched here) — this is the first shared helper, for the Contact page.

export interface ContactRequestPayload {
  name: string;
  company: string;
  email: string;
  phone?: string;
  siteCount: string;
  message: string;
}

/** Sends a contact/sales-request email via EmailJS. Throws on missing config or send failure. */
export async function sendContactRequest(payload: ContactRequestPayload): Promise<void> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Contact form is not configured yet. Please email us directly instead.');
  }

  await emailjs.send(
    serviceId,
    templateId,
    {
      from_name: payload.name,
      company: payload.company,
      from_email: payload.email,
      phone: payload.phone || 'Not provided',
      site_count: payload.siteCount,
      message: payload.message,
    },
    publicKey
  );
}
