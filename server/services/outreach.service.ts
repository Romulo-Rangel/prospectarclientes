export interface LeadData {
  id?: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  formatted_phone?: string;
  website?: string;
  has_website?: number | boolean;
  website_status?: string;
  opportunity_tags?: string | string[];
}

export interface RenderedOutreach {
  channel: 'whatsapp' | 'email' | 'instagram' | 'call';
  subject?: string;
  message: string;
  whatsappUrl?: string;
  mailtoUrl?: string;
}

export function formatPhoneNumber(rawPhone?: string, country: string = 'Brasil'): { cleanPhone: string; displayPhone: string } {
  if (!rawPhone) return { cleanPhone: '', displayPhone: '' };

  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return { cleanPhone: '', displayPhone: rawPhone };

  // Strip leading zero if present (e.g. 027992489096 -> 27992489096)
  if (digits.startsWith('0') && digits.length >= 11) {
    digits = digits.substring(1);
  }

  const countryNormalized = country.toLowerCase();

  // Handle Portugal (+351)
  if (countryNormalized.includes('portugal') || countryNormalized === 'pt') {
    if (!digits.startsWith('351') && digits.length === 9) {
      digits = '351' + digits;
    }
  } 
  // Handle Brasil (+55)
  else if (countryNormalized.includes('brasil') || countryNormalized.includes('brazil') || countryNormalized === 'br') {
    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = '55' + digits;
    }
  }
  // Handle USA / Canada (+1)
  else if (countryNormalized.includes('united states') || countryNormalized.includes('eua') || countryNormalized === 'us') {
    if (!digits.startsWith('1') && digits.length === 10) {
      digits = '1' + digits;
    }
  }
  // Handle Spain (+34)
  else if (countryNormalized.includes('espanha') || countryNormalized.includes('spain') || countryNormalized === 'es') {
    if (!digits.startsWith('34') && digits.length === 9) {
      digits = '34' + digits;
    }
  }

  // Format display phone
  let displayPhone = rawPhone;
  if (digits.startsWith('55') && digits.length === 13) {
    displayPhone = `(${digits.substring(2, 4)}) ${digits.substring(4, 9)}-${digits.substring(9)}`;
  } else if (digits.startsWith('55') && digits.length === 12) {
    displayPhone = `(${digits.substring(2, 4)}) ${digits.substring(4, 8)}-${digits.substring(8)}`;
  }

  return {
    cleanPhone: digits,
    displayPhone
  };
}

export function renderOutreachTemplate(
  templateContent: string,
  templateSubject: string | undefined,
  lead: LeadData,
  senderName: string = 'Rômulo',
  senderPhone: string = '(27) 98817-2973'
): RenderedOutreach {
  const companyName = lead.name || 'Empresa';
  const niche = lead.category || 'o seu segmento';
  const city = lead.city || 'sua região';
  const country = lead.country || 'Brasil';
  const website = lead.website || 'não cadastrado';

  let diagnosticNote = 'não identificamos website próprio cadastrado';
  if (lead.website_status === 'error' || lead.website_status === 'offline') {
    diagnosticNote = `o site ${lead.website} parece estar com instabilidades ou fora do ar`;
  }

  const replacements: Record<string, string> = {
    '{{empresa}}': companyName,
    '{{nicho}}': niche,
    '{{cidade}}': city,
    '{{pais}}': country,
    '{{website}}': website,
    '{{meu_nome}}': senderName,
    '{{meu_telefone}}': senderPhone,
    '{{diagnostico}}': diagnosticNote,
    '{{problema}}': diagnosticNote
  };

  let message = templateContent;
  for (const [key, value] of Object.entries(replacements)) {
    message = message.split(key).join(value);
  }

  let subject = templateSubject;
  if (subject) {
    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.split(key).join(value);
    }
  }

  const { cleanPhone } = formatPhoneNumber(lead.phone, lead.country);
  const encodedMsg = encodeURIComponent(message);
  // Universal WhatsApp link (opens native app on mobile phones and desktop app/web on PC)
  const whatsappUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}` : undefined;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject || 'Parceria & Soluções Web')}&body=${encodedMsg}`;

  return {
    channel: 'whatsapp',
    subject,
    message,
    whatsappUrl,
    mailtoUrl
  };
}
