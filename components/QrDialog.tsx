'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, Loader2, X } from 'lucide-react';

/**
 * QR code of a card's public link, shown in a dialog with Download (PNG, print
 * quality), Copy link and Open. Generated in the browser: nothing to load.
 */
export default function QrDialog({ url, name, fileName, onClose }: { url: string; name: string; fileName: string; onClose: () => void }) {
  const [png, setPng] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M' })
      .then((data) => alive && setPng(data))
      .catch(() => alive && setPng(null));
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  // Rendered at the top of the page: a parent card with a transform would
  // otherwise trap this "fixed" overlay inside the card.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`QR code ${name}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-t-[24px] bg-surface p-5 text-left shadow-2xl sm:rounded-[24px] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-bold text-ink">{name}</h3>
            <p className="ct-num truncate text-[12px] text-muted">{url.replace(/^https?:\/\//, '')}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto grid aspect-square w-full max-w-[260px] place-items-center rounded-[20px] bg-white p-3 shadow-sm">
          {png ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={png} alt={`QR code for ${name}`} className="h-full w-full" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          )}
        </div>
        <p className="mt-3 text-center text-[12.5px] text-muted">Scanning it opens the digital card.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a
            href={png ?? undefined}
            download={`qr-${fileName}.png`}
            aria-disabled={!png}
            className="ct-btn ct-btn-md col-span-3 bg-ink text-canvas aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Download QR (PNG)
          </a>
          <button type="button" onClick={copy} className="ct-btn ct-btn-sm col-span-2 h-10 border border-line bg-surface">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="ct-btn ct-btn-sm h-10 border border-line bg-surface">
            <ExternalLink className="h-4 w-4" /> Open
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
