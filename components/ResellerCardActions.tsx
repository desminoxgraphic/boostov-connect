'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Loader2, QrCode, Trash2 } from 'lucide-react';
import QrDialog from './QrDialog';
import { cn } from '@/lib/utils';

/** QR, edit and delete buttons on a reseller's card. Disabled in the admin's read-only view. */
export default function ResellerCardActions({
  id,
  name,
  slug,
  publicUrl,
  readOnly,
}: {
  id: string;
  name: string;
  slug: string;
  publicUrl: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [showQr, setShowQr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const base = 'ct-btn ct-btn-icon h-10 w-10 border bg-surface';
  const off = readOnly && 'pointer-events-none opacity-40';

  const remove = async () => {
    if (!confirm(`Supprimer « ${name} » ?\n\nSon lien NFC et son QR code ne fonctionneront plus, et ses statistiques seront effacées. Action définitive.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/reseller/connect/businesses/${id}`, { method: 'DELETE' });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Suppression impossible.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setShowQr(true)} disabled={readOnly} title="QR code" aria-label="QR code" className={cn(base, 'border-line', off)}>
        <QrCode className="h-4 w-4" />
      </button>
      {readOnly ? (
        <span aria-disabled title="Edit (read only)" className={cn(base, 'border-line', off)}>
          <Edit className="h-4 w-4" />
        </span>
      ) : (
        <Link href={`/dashboard/merchants/${id}`} title="Modifier" aria-label="Modifier" className={cn(base, 'border-line')}>
          <Edit className="h-4 w-4" />
        </Link>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={readOnly || deleting}
        title="Supprimer"
        aria-label="Supprimer la carte"
        className={cn(base, 'border-danger-border text-danger hover:bg-danger-soft', off)}
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
      {showQr && <QrDialog url={publicUrl} name={name} fileName={slug} onClose={() => setShowQr(false)} />}
    </div>
  );
}
