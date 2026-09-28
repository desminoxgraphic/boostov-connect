'use client';

import React, { useId, useState } from 'react';
import { useTheme } from 'next-themes';
import { Palette, Sparkles, Store, TriangleAlert } from 'lucide-react';
import {
  buildThemeForMode,
  isValidThemeColor,
  normalizeThemeColor,
  themeStyle,
  CONNECT_THEME_PRESETS,
} from '@/lib/connect-theme';
import { CONNECT_CATEGORY_MAX } from '@/lib/connect-utils';
import { cn } from '@/lib/utils';

export interface ConnectCustomizationValues {
  themeColor: string;
  category: string;
  /** Preview-only copies of the Bottom Message fields, so the theme swatch
   *  preview can show the real bottom card. Nothing is persisted here. */
  bottomTaglinePreview: string;
  bottomButtonPreview: string;
}

interface Props {
  values: ConnectCustomizationValues;
  onChange: (patch: Partial<ConnectCustomizationValues>) => void;
  supported: boolean;
  categorySupported: boolean;
}

export default function ConnectCustomizationFields({
  values,
  onChange,
  supported,
  categorySupported,
}: Props) {
  const { resolvedTheme } = useTheme();
  const theme = buildThemeForMode(
    values.themeColor,
    resolvedTheme === 'dark' ? 'dark' : 'light'
  );
  const [customHex, setCustomHex] = useState<string | null>(null);
  const fieldId = useId();

  const hexInput = customHex ?? values.themeColor;
  const hexValid = isValidThemeColor(hexInput);

  if (!supported) {
    return (
      <section className="ct-card border-warning-border bg-warning-soft p-5">
        <div className="flex items-center gap-2 text-warning">
          <TriangleAlert className="h-5 w-5 shrink-0" />
          <h2 className="ct-section-title">3. Card Appearance</h2>
        </div>
        <p className="ct-body mt-3 text-warning">
          The database is missing the brand colour columns, so the theme and the contact details
          cannot be saved yet.
        </p>
        <div className="ct-inset mt-4 space-y-1.5 border-warning-border">
          <p className="ct-label text-warning">Run in Supabase → SQL Editor</p>
          <code className="ct-num block break-all text-[11px] text-ink">
            202609270001_add_connect_gallery.sql
          </code>
          <code className="ct-num block break-all text-[11px] text-ink">
            202609270002_add_connect_theming.sql
          </code>
          <code className="ct-num block break-all text-[11px] text-ink">
            202609270003_add_connect_contact_rows.sql
          </code>
          <p className="pt-1 text-[11px] leading-relaxed text-warning">
            In that order. The form picks them up automatically within a minute — no redeploy.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ct-card p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="ct-tile h-9 w-9 bg-brand-soft text-brand-text">
          <Palette className="h-[18px] w-[18px]" />
        </span>
        <h2 className="ct-section-title">3. Card Appearance</h2>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <label className="ct-label">Brand Colour</label>
          <p className="ct-hint mt-1.5">
            Drives the Save Contact button, section accents, row icons, borders, hover states and
            the bottom card on the public profile. The text colour flips automatically so it stays
            readable.
          </p>

          <div style={themeStyle(theme)} className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {CONNECT_THEME_PRESETS.map((preset) => {
                const active = normalizeThemeColor(values.themeColor) === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    aria-label={preset.label}
                    aria-pressed={active}
                    onClick={() => {
                      setCustomHex(null);
                      onChange({ themeColor: preset.value });
                    }}
                    className={cn(
                      'h-9 w-9 rounded-tile ring-offset-2 ring-offset-surface transition-all duration-150',
                      active ? 'scale-105 ring-2 ring-ink' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: preset.value }}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="relative shrink-0">
                <span className="sr-only">Pick a custom colour</span>
                <input
                  type="color"
                  value={normalizeThemeColor(hexInput)}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    onChange({ themeColor: e.target.value });
                  }}
                  className="h-11 w-11 cursor-pointer rounded-tile border border-line bg-surface p-0"
                />
              </label>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  if (isValidThemeColor(e.target.value)) {
                    onChange({ themeColor: e.target.value });
                  }
                }}
                onBlur={() => setCustomHex(null)}
                placeholder="#2563eb"
                spellCheck={false}
                aria-invalid={!hexValid}
                className={cn(
                  'ct-control ct-num w-36 uppercase',
                  !hexValid && 'border-danger-border bg-danger-soft text-danger'
                )}
              />
              {!hexValid && customHex !== null && (
                <span className="ct-hint text-danger">Use a 6-digit hex colour</span>
              )}
            </div>

            <div className="ct-inset space-y-3 border-brand-soft-border bg-brand-soft">
              <p className="ct-label text-brand-text">Live preview</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="ct-btn ct-btn-sm bg-brand text-on-brand shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Save Contact
                </span>
                <span className="ct-btn ct-btn-sm bg-brand text-on-brand shadow-sm">
                  {values.bottomButtonPreview || 'Bottom button'}
                </span>
                <span className="ct-btn ct-btn-sm border border-brand bg-surface text-brand-text">
                  {values.bottomTaglinePreview || 'Bottom tagline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {categorySupported && (
          <div>
            <label htmlFor={`${fieldId}-category`} className="ct-label">
              <span className="inline-flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" /> Category
              </span>
            </label>
            <input
              id={`${fieldId}-category`}
              type="text"
              value={values.category}
              maxLength={CONNECT_CATEGORY_MAX}
              onChange={(e) => onChange({ category: e.target.value })}
              placeholder="Beauty Salon"
              className="ct-control"
            />
            <p className="ct-hint mt-1.5">
              Sits under the business name on the card. {values.category.length}/
              {CONNECT_CATEGORY_MAX}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
