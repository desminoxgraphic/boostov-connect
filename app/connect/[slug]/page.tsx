import ConnectProfileView from '@/components/ConnectProfileView';
import { loadPublicCard } from '@/lib/public-card';

export const dynamic = 'force-dynamic';

export default async function PublicConnectProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const { business, links } = await loadPublicCard(slug);
  return <ConnectProfileView business={business} links={links} />;
}
