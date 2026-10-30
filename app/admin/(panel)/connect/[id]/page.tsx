import ConnectBusinessEditForm from '@/components/ConnectBusinessEditForm';

export default function EditConnectBusinessPage({ params }: { params: { id: string } }) {
  return <ConnectBusinessEditForm id={params.id} variant="admin" />;
}
