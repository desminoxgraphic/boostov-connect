'use client';

import React, { useId } from 'react';
import { MessageSquareText, MousePointerClick, TriangleAlert } from 'lucide-react';
import {
  CONNECT_BOTTOM_BUTTON_MAX,
  CONNECT_BOTTOM_TAGLINE_MAX,
} from '@/lib/connect-utils';

export interface ConnectBottomMessageValues {
  bottomTagline: string;
  bottomButtonText: string;
}

interface Props {
  values: ConnectBottomMessageValues;
  onChange: (patch: Partial<ConnectBottomMessageValues>) => void;
  supported: boolean;
}

export default function ConnectBottomMessageFields({ values, onChange, supported }: Props) {
  const fieldId = useId();

  if (!supported) {
    return (
      <section className="ct-card border-warning-border bg-warning-soft p-5">
        <div className="flex items-center gap-2 text-warning">
          <TriangleAlert className="h-5 w-5 shrink-0" />
          <h2 className="ct-section-title">7. Bottom Message</h2>
        </div>
        <p className="ct-body mt-3 text-warning">
          The database is missing the bottom message columns, so the tagline and the bottom button
          cannot be saved yet.
        </p>
        <div className="ct-inset mt-4 space-y-1.5 border-warning-border">
          <p className="ct-label text-warning">Run in Supabase → SQL Editor</p>
          <code className="ct-num block break-all text-[11px] text-ink">
            202609270004_add_connect_bottom_message.sql
          </code>
          <p className="pt-1 text-[11px] leading-relaxed text-warning">
            The form picks it up automatically within a minute — no redeploy.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ct-card p-5 sm:p-6">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="ct-tile h-9 w-9 bg-brand-soft text-brand-text">
            <MessageSquareText className="h-[18px] w-[18px]" />
          </span>
          <h2 className="ct-section-title">7. Bottom Message</h2>
        </div>
        <p className="ct-hint mt-2">
          The last thing a visitor reads, below the photo gallery. Leave either field empty and it
          disappears completely from the public profile.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor={`${fieldId}-tagline`} className="ct-label">
            Bottom Tagline
          </label>
          <input
            id={`${fieldId}-tagline`}
            type="text"
            value={values.bottomTagline}
            maxLength={CONNECT_BOTTOM_TAGLINE_MAX}
            onChange={(e) => onChange({ bottomTagline: e.target.value })}
            placeholder="Best clothes for every style"
            className="ct-control"
          />
          <p className="ct-hint mt-1.5">
            One short line above the bottom card. {values.bottomTagline.length}/
            {CONNECT_BOTTOM_TAGLINE_MAX}
          </p>
        </div>

        <div>
          <label htmlFor={`${fieldId}-button`} className="ct-label">
            <span className="inline-flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" /> Bottom Button Text
            </span>
          </label>
          <input
            id={`${fieldId}-button`}
            type="text"
            value={values.bottomButtonText}
            maxLength={CONNECT_BOTTOM_BUTTON_MAX}
            onChange={(e) => onChange({ bottomButtonText: e.target.value })}
            placeholder="Welcome anytime!"
            className="ct-control"
          />
          <p className="ct-hint mt-1.5">
            The large text inside the bottom card. It uses the brand colour above, and the text
            colour flips automatically to stay readable. {values.bottomButtonText.length}/
            {CONNECT_BOTTOM_BUTTON_MAX}
          </p>
        </div>
      </div>
    </section>
  );
}
