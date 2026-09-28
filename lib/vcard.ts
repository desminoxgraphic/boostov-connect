export interface VCardInput {
  name: string;
  phone?: string;
  whatsapp?: string;
  secondPhone?: string;
  officePhone?: string;
  fax?: string;
  email?: string;
  address?: string;
  description?: string;
  websiteUrl?: string;
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function generateVCardString(input: VCardInput): string {
  const cleanName = (input.name || 'Contact').trim();
  const phone = (input.phone || input.whatsapp || '').trim();
  const note = (input.description || '').trim();
  const url = (input.websiteUrl || '').trim();
  const email = (input.email || '').trim();
  const address = (input.address || '').trim().replace(/[\r\n]+/g, ', ');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(cleanName)}`,
    `ORG:${escapeVCardValue(cleanName)}`,
  ];

  if (phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${phone}`);
  }

  if (input.whatsapp) {
    lines.push(`TEL;TYPE=CELL,WHATSAPP:${input.whatsapp.trim()}`);
  }

  if (input.secondPhone) {
    lines.push(`TEL;TYPE=CELL:${input.secondPhone.trim()}`);
  }

  if (input.officePhone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${input.officePhone.trim()}`);
  }

  if (input.fax) {
    lines.push(`TEL;TYPE=WORK,FAX:${input.fax.trim()}`);
  }

  if (email) {
    lines.push(`EMAIL;TYPE=INTERNET:${email}`);
  }

  if (address) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(address)};;;;`);
  }

  if (note) {
    lines.push(`NOTE:${escapeVCardValue(note)}`);
  }

  if (url) {
    lines.push(`URL:${url}`);
  }

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

export function downloadVCard(input: VCardInput): void {
  const vcardText = generateVCardString(input);
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-contact.vcf`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
