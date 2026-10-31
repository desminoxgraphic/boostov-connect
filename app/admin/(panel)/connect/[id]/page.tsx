import ConnectBusinessEditForm from '@/components/ConnectBusinessEditForm';

export default async function EditConnectBusinessPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <ConnectBusinessEditForm id={params.id} variant="admin" />;
}
