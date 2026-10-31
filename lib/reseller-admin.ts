import { getAppUrl } from './app-url';

/** The WhatsApp message that invites a reseller. Edit wording here. */
export function resellerInviteMessage(name: string, email: string, appUrl = getAppUrl()): string {
  const first = name.split(/\s+/)[0] || name;
  return (
    `Bonjour ${first}, bienvenue chez Boostov !\n\n` +
    `Votre espace revendeur est prêt. Pour vous connecter :\n` +
    `1. Ouvrez ${appUrl}/login\n` +
    `2. Choisissez "Continuer avec Google" ou entrez votre email : ${email}\n` +
    `3. Si vous choisissez l'email, entrez le code reçu.\n\n` +
    `À bientôt !`
  );
}

/** About 100 years: Supabase's way of saying "banned until unbanned". */
export const SUSPEND_BAN_DURATION = '876000h';
