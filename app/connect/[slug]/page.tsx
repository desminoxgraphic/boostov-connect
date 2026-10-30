import ConnectProfileView from '@/components/ConnectProfileView';

export default function PublicConnectProfilePage({ params }: { params: { slug: string } }) {
  return <ConnectProfileView slug={params.slug} />;
}
