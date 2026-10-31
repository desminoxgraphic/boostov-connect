import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { dedupeWindowMinutes, visitorId } from '@/lib/visitor';
import ConnectProfileView from '@/components/ConnectProfileView';
import { loadPublicCard } from '@/lib/public-card';
import { supabaseServer } from '@/lib/supabase/server';
import { growPublicUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

/**
 * The stable link programmed on reseller NFC cards: /m/<slug>.
 * Connect merchants render in place (the URL never changes); Grow merchants
 * get a temporary (307) redirect to the Grow app, so the target can move later
 * without reprogramming any card.
 */
export default async function MerchantLinkPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
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
    const visitor = visitorId(await headers());
    const since = new Date(Date.now() - dedupeWindowMinutes('view') * 60 * 1000).toISOString();
    const { count } = await supabaseServer
      .from('merchant_taps')
      .select('id', { count: 'exact', head: true })
      .eq('slug', entry.slug)
      .eq('visitor', visitor)
      .gte('created_at', since);
    if (!count) await supabaseServer.from('merchant_taps').insert({ slug: entry.slug, visitor });
    redirect(growPublicUrl(entry.slug));
  }

  const { business, links } = await loadPublicCard(entry.slug);
  return <ConnectProfileView business={business} links={links} />;
}
