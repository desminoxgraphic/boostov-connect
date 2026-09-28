'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Phone, Globe, Plus, X, MapPin } from 'lucide-react';
import {
  CONNECT_ADDRESS_MAX,
  CONNECT_EMAIL_MAX,
  CONNECT_PHONE_MAX,
} from '@/lib/connect-utils';
import {
  WhatsAppIcon,
  BuildingIcon,
  PrinterIcon,
  SmartphoneIcon,
} from '@/components/connect-platform-icons';
import { cn } from '@/lib/utils';

export interface ConnectContactValues {
  email: string;
  phone: string;
  websiteUrl: string;
  whatsappNumber: string;
  secondPhone: string;
  officePhone: string;
  address: string;
  fax: string;
}

interface Props {
  values: ConnectContactValues;
  onChange: (patch: Partial<ConnectContactValues>) => void;
  /** False until 202609270002 has been applied (gates the Address row). */
  addressSupported: boolean;
  /** False until 202609270003 has been applied (gates second mobile / office / fax). */
  extraPhonesSupported: boolean;
}

type OptionalKey = 'whatsappNumber' | 'secondPhone' | 'officePhone' | 'address' | 'fax';

interface OptionalRow {
  key: OptionalKey;
  label: string;
  placeholder: string;
  maxLength: number;
  icon: React.ReactNode;
  available: boolean;
  hint?: string;
}

const EMPTY_VALUES: ConnectContactValues = {
  email: '',
  phone: '',
  websiteUrl: '',
  whatsappNumber: '',
  secondPhone: '',
  officePhone: '',
  address: '',
  fax: '',
};

export default function ConnectContactFields({
  values,
  onChange,
  addressSupported,
  extraPhonesSupported,
}: Props) {
  const [added, setAdded] = useState<OptionalKey[]>([]);

  /**
   * Optional rows are revealed by the admin pressing "+ Add", but a row that
   * already has a value (an existing business being edited, or a save that came
   * back from the server) has to appear on its own. Adding is one-way on
   * purpose: clearing an input keeps the row open so the value is not
   * destroyed by a stray keystroke, and the row only closes via its X button.
   */
  useEffect(() => {
    setAdded((prev) => {
      const next = [...prev];
      let changed = false;
      const rows: OptionalKey[] = ['whatsappNumber', 'secondPhone', 'officePhone', 'address', 'fax'];
      for (const row of rows) {
        const hasValue = Boolean((values[row] || '').trim());
        if (hasValue && !next.includes(row)) {
          next.push(row);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [
    values.whatsappNumber,
    values.secondPhone,
    values.officePhone,
    values.address,
    values.fax,
  ]);

  const optionalRows: OptionalRow[] = [
    {
      key: 'whatsappNumber',
      label: 'WhatsApp',
      placeholder: '+212 600000000',
      maxLength: CONNECT_PHONE_MAX,
      icon: <WhatsAppIcon className="h-4 w-4" />,
      available: true,
    },
    {
      key: 'secondPhone',
      label: 'Second mobile',
      placeholder: '+212 661234567',
      maxLength: CONNECT_PHONE_MAX,
      icon: <SmartphoneIcon className="h-4 w-4" />,
      available: extraPhonesSupported,
    },
    {
      key: 'officePhone',
      label: 'Office phone',
      placeholder: '+212 522000000',
      maxLength: CONNECT_PHONE_MAX,
      icon: <BuildingIcon className="h-4 w-4" />,
      available: extraPhonesSupported,
    },
    {
      key: 'address',
      label: 'Address',
      placeholder: '12 Rue Mohammed V, Casablanca',
      maxLength: CONNECT_ADDRESS_MAX,
      icon: <MapPin className="h-4 w-4" />,
      available: addressSupported,
    },
    {
      key: 'fax',
      label: 'Fax',
      placeholder: '+212 522000001',
      maxLength: CONNECT_PHONE_MAX,
      icon: <PrinterIcon className="h-4 w-4" />,
      available: extraPhonesSupported,
    },
  ];

  const addRow = (key: OptionalKey) =>
    setAdded((prev) => (prev.includes(key) ? prev : [...prev, key]));

  const removeRow = (key: OptionalKey) => {
    setAdded((prev) => prev.filter((item) => item !== key));
    onChange({ [key]: '' } as Partial<ConnectContactValues>);
  };

  const visibleRows = optionalRows.filter((row) => added.includes(row.key));
  const addableRows = optionalRows.filter((row) => !added.includes(row.key) && row.available);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="ct-section-title">4. Contact</h2>
        <p className="ct-hint mt-1.5">
          The three base fields show on every card. Add a row only if the business uses it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="ct-label">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </span>
          </label>
          <input
            type="email"
            value={values.email}
            maxLength={CONNECT_EMAIL_MAX}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="hello@business.com"
            className="ct-control"
          />
        </div>

        <div>
          <label className="ct-label">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Mobile
            </span>
          </label>
          <input
            type="tel"
            value={values.phone}
            maxLength={CONNECT_PHONE_MAX}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+212 600000000"
            className="ct-control"
          />
        </div>

        <div className="md:col-span-2">
          <label className="ct-label">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Website
            </span>
          </label>
          <input
            type="text"
            value={values.websiteUrl}
            onChange={(e) => onChange({ websiteUrl: e.target.value })}
            placeholder="https://royalbarber.ma"
            className="ct-control"
          />
        </div>
      </div>

      {addableRows.length > 0 && (
        <div>
          <p className="ct-label mb-2">Optional</p>
          <div className="flex flex-wrap gap-2">
            {addableRows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => addRow(row.key)}
                className="inline-flex items-center gap-1.5 rounded-control border border-dashed border-line-strong bg-surface-2 px-3 py-2 text-[12.5px] font-medium text-ink-2 transition-colors duration-150 hover:border-brand-soft-border hover:bg-brand-soft hover:text-brand-text"
              >
                <Plus className="h-3.5 w-3.5" />
                {row.icon}
                {row.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {visibleRows.length > 0 && (
        <div className="ct-inset space-y-3.5">
          {visibleRows.map((row) => (
            <div key={row.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="ct-label">
                  {row.icon}
                  {row.label}
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={`Remove ${row.label}`}
                  className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-[11.5px] font-medium text-muted-2 transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              <input
                type={row.key === 'address' ? 'text' : 'tel'}
                value={values[row.key] || ''}
                maxLength={row.maxLength}
                onChange={(e) => onChange({ [row.key]: e.target.value } as Partial<ConnectContactValues>)}
                placeholder={row.placeholder}
                className="ct-control"
              />
            </div>
          ))}
        </div>
      )}

      {!addressSupported && (
        <p className="ct-hint text-warning">
          The Address row needs{' '}
          <span className="font-mono">202609270002_add_connect_theming.sql</span>. Second mobile,
          office phone and fax need{' '}
          <span className="font-mono">202609270003_add_connect_contact_rows.sql</span>.
        </p>
      )}
      {addressSupported && !extraPhonesSupported && (
        <p className="ct-hint text-warning">
          Run <span className="font-mono">202609270003_add_connect_contact_rows.sql</span> to unlock
          second mobile, office phone and fax.
        </p>
      )}
    </div>
  );
}

export { EMPTY_VALUES as EMPTY_CONTACT_VALUES };
export type { OptionalKey as ConnectOptionalContactKey };
