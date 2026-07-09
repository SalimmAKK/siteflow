// All outbound email for the app goes through Web3Forms (https://web3forms.com)
// — a plain fetch POST to their API, no SDK/dependency required. EmailJS has
// been fully dropped (it previously backed both the marketing Contact form
// and team invite emails in src/pages/Team.tsx).

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

async function postToWeb3Forms(fields: Record<string, string>): Promise<void> {
  const accessKey = import.meta.env.VITE_WEB3FORMS_KEY;

  if (!accessKey) {
    throw new Error('Email is not configured yet (missing VITE_WEB3FORMS_KEY).');
  }

  const res = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_key: accessKey, ...fields }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to send email. Please try again.');
  }
}

export interface ContactRequestPayload {
  name: string;
  company: string;
  email: string;
  phone?: string;
  siteCount: string;
  message: string;
}

/** Submits the marketing site's Contact form. Throws on missing config or a failed submission. */
export async function sendContactRequest(payload: ContactRequestPayload): Promise<void> {
  await postToWeb3Forms({
    subject: `New contact request from ${payload.name} (${payload.company})`,
    name: payload.name,
    company: payload.company,
    email: payload.email,
    phone: payload.phone || 'Not provided',
    sites: payload.siteCount,
    message: payload.message,
  });
}

export interface TeamInvitePayload {
  toEmail: string;
  managerName: string;
  projectName: string;
  signupLink: string;
}

/** Sends a project invite notification. Throws on missing config or a failed submission. */
export async function sendTeamInviteEmail(payload: TeamInvitePayload): Promise<void> {
  await postToWeb3Forms({
    subject: `${payload.managerName} invited you to ${payload.projectName} on SiteFlow`,
    to_email: payload.toEmail,
    manager_name: payload.managerName,
    project_name: payload.projectName,
    signup_link: payload.signupLink,
    message: `${payload.managerName} invited you to join "${payload.projectName}" on SiteFlow. Sign up at ${payload.signupLink} to get access.`,
  });
}
