'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Icon-only by default; pass `label` for a text button. */
export default function CopyButton({
  value,
  label,
  className,
  disabled = false,
}: {
  value: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const icon = copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />;

  if (label) {
    return (
      <button
        type="button"
        onClick={copy}
        disabled={disabled}
        className={cn('ct-btn ct-btn-sm h-10 border border-line bg-surface px-4', className)}
      >
        {icon}
        <span>{copied ? 'Copied' : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      className={cn('ct-btn ct-btn-icon h-9 w-9 bg-surface', className)}
      title="Copy"
      aria-label="Copy"
    >
      {icon}
    </button>
  );
}
