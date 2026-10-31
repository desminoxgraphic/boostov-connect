import { getAppUrl } from './app-url';

/** WhatsApp message with a reseller's sign-in details. Edit wording here. */
export function resellerAccessMessage(name: string, email: string, password: string, appUrl = getAppUrl()): string {
  const first = name.split(/\s+/)[0] || name;
  return (
    `Bonjour ${first}, bienvenue chez Boostov !\n\n` +
    `Votre espace revendeur est prêt :\n` +
    `🔗 ${appUrl}/connexion\n` +
    `📧 E-mail : ${email}\n` +
    `🔑 Mot de passe : ${password}\n\n` +
    `Gardez ce mot de passe pour vous.`
  );
}

/** About 100 years: Supabase's way of saying "banned until unbanned". */
export const SUSPEND_BAN_DURATION = '876000h';
