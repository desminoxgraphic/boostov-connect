import { notFound, redirect } from 'next/navigation';
import ConnectProfileView from '@/components/ConnectProfileView';
import { supabaseServer } from '@/lib/supabase/server';
import { growPublicUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

/**
 * The stable link programmed on reseller NFC cards: /m/<slug>.
 * Connect merchants render in place (the URL never changes); Grow merchants
 * get a temporary (307) redirect to the Grow app, so the target can move later
 * without reprogramming any card.
 */
export default async function MerchantLinkPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !supabaseServer) notFound();

  const { data: entry } = await supabaseServer
    .from('merchant_slugs')
    .select('slug, product')
    .eq('slug', slug)
    .maybeSingle();
  if (!entry) notFound();

  if (entry.product === 'grow') {
    // The Grow app logs no views, so the tap is counted here.
    await supabaseServer.from('merchant_taps').insert({ slug: entry.slug });
    redirect(growPublicUrl(entry.slug));
  }

  return <ConnectProfileView slug={entry.slug} />;
}
