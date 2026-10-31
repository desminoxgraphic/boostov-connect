import { redirect } from 'next/navigation';

/** Old sign-in address (links already sent); the page is now /connexion. */
export default async function LoginRedirect(props: { searchParams: Promise<{ error?: string; suspended?: string }> }) {
  const sp = await props.searchParams;
  const q = sp.suspended ? '?suspended=1' : sp.error ? `?error=${encodeURIComponent(sp.error)}` : '';
  redirect(`/connexion${q}`);
}
