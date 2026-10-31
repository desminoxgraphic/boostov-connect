import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/site/SiteHeader';
import PasswordLoginForm from '@/components/site/PasswordLoginForm';
import { createUserClient } from '@/lib/supabase/ssr';
import { loadAccessContext } from '@/lib/authz';
import { LOGIN_MESSAGES } from '@/lib/post-login';
import { BOOSTOV_SUPPORT_WHATSAPP, buildWhatsAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Se connecter · Boostov',
  robots: { index: false, follow: false },
};

/** The single sign-in page: super admin and resellers, email + password. */
export default async function ConnexionPage(props: { searchParams: Promise<{ error?: string; suspended?: string }> }) {
  const searchParams = await props.searchParams;

  const ctx = await loadAccessContext(await createUserClient());
  if (ctx?.role === 'super_admin') redirect(ctx.hasTotp && ctx.aal !== 'aal2' ? '/admin/mfa' : '/admin');
  if (ctx?.role === 'reseller' && ctx.resellerStatus === 'active') redirect('/dashboard');

  const key = searchParams.suspended ? 'suspended' : searchParams.error;
  const initialError = key ? LOGIN_MESSAGES[key] ?? LOGIN_MESSAGES.error : null;
  const supportUrl = buildWhatsAppUrl(BOOSTOV_SUPPORT_WHATSAPP, 'Bonjour Boostov, j’ai oublié mon mot de passe.');

  return (
    <div className="min-h-dvh bg-[#f4f6fb]">
      <SiteHeader minimal />
      <main className="flex justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-[420px] rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-[0_24px_60px_-30px_rgba(11,21,48,0.35)] sm:p-8">
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-[#0b1530]">Se connecter</h1>
          <p className="mt-1.5 text-[14.5px] text-[#5b6478]">Avec l’e-mail et le mot de passe fournis par Boostov.</p>
          <div className="mt-6">
            <PasswordLoginForm initialError={initialError} supportUrl={supportUrl} />
          </div>
          <p className="mt-6 border-t border-black/[0.06] pt-5 text-center text-[14px] text-[#5b6478]">
            Pas encore revendeur ?{' '}
            <Link href="/#devenir-revendeur" className="font-semibold text-[#1d5cff] hover:underline">
              Devenir revendeur
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
