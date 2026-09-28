import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  detectConnectPlatform,
  formatConnectLinkValue,
  normalizeConnectUrl,
  connectLinkDedupeKey,
  defaultConnectLinkLabel,
  connectPlatformLabel,
  syncLegacySocialColumns,
} from '../lib/connect-platforms.ts';
import { normalizeConnectPhone } from '../lib/connect-utils.ts';
import { generateVCardString } from '../lib/vcard.ts';

const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');
const migration003 = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/202609270003_add_connect_contact_rows.sql'),
  'utf8'
);

test('detectConnectPlatform recognises every platform the card has an icon for', () => {
  const cases: [string, string][] = [
    ['https://instagram.com/royalbarber', 'instagram'],
    ['https://www.instagram.com/royalbarber/', 'instagram'],
    ['https://facebook.com/royalbarber', 'facebook'],
    ['https://fb.me/royalbarber', 'facebook'],
    ['https://www.tiktok.com/@royalbarber', 'tiktok'],
    ['https://youtube.com/@royalbarber', 'youtube'],
    ['https://youtu.be/abc123', 'youtube'],
    ['https://linkedin.com/company/royalbarber', 'linkedin'],
    ['https://x.com/royalbarber', 'x'],
    ['https://twitter.com/royalbarber', 'x'],
    ['https://t.me/royalbarber', 'telegram'],
    ['https://wa.me/212600000000', 'whatsapp'],
    ['https://open.spotify.com/artist/123', 'spotify'],
    ['https://royalbarber.ma', 'globe'],
  ];

  for (const [url, expected] of cases) {
    assert.equal(detectConnectPlatform(url).key, expected, url);
  }
});

test('detectConnectPlatform tolerates missing schemes, mobile hosts and junk', () => {
  assert.equal(detectConnectPlatform('instagram.com/royalbarber').key, 'instagram');
  assert.equal(detectConnectPlatform('m.facebook.com/royalbarber').key, 'facebook');
  assert.equal(detectConnectPlatform('vm.tiktok.com/ZMroyal').key, 'tiktok');
  assert.equal(detectConnectPlatform('  ').key, 'globe');
  assert.equal(detectConnectPlatform('not a url at all').key, 'globe');
});

test('formatConnectLinkValue renders handles for socials and bare hosts for the rest', () => {
  assert.equal(formatConnectLinkValue('https://instagram.com/royalbarber'), '@royalbarber');
  assert.equal(formatConnectLinkValue('https://www.tiktok.com/@royalbarber'), '@royalbarber');
  assert.equal(formatConnectLinkValue('https://x.com/royalbarber'), '@royalbarber');
  assert.equal(formatConnectLinkValue('https://t.me/royalbarber'), '@royalbarber');
  assert.equal(formatConnectLinkValue('https://youtube.com/@royalbarber'), '@royalbarber');
  assert.equal(formatConnectLinkValue('https://linkedin.com/company/royal'), 'company/royal');
  assert.equal(formatConnectLinkValue('https://youtu.be/abc123'), 'Watch on YouTube');
  assert.equal(formatConnectLinkValue('https://royalbarber.ma'), 'royalbarber.ma');
  assert.equal(formatConnectLinkValue('https://royalbarber.ma/some/deep/path?q=1'), 'royalbarber.ma/some/deep/path');
});

test('normalizeConnectUrl only invents a scheme when one is missing', () => {
  assert.equal(normalizeConnectUrl('royalbarber.ma'), 'https://royalbarber.ma');
  assert.equal(normalizeConnectUrl('https://royalbarber.ma'), 'https://royalbarber.ma');
  assert.equal(normalizeConnectUrl('  '), '');
});

test('defaultConnectLinkLabel and connectPlatformLabel name the row', () => {
  assert.equal(defaultConnectLinkLabel('https://instagram.com/royalbarber'), 'Instagram');
  assert.equal(defaultConnectLinkLabel('https://royalbarber.ma'), 'Website');
  assert.equal(connectPlatformLabel('tiktok'), 'TikTok');
  assert.equal(connectPlatformLabel('x'), 'X');
});

test('connectLinkDedupeKey collapses the same destination written two ways', () => {
  const fromLegacyColumn = connectLinkDedupeKey('https://instagram.com/royalbarber');
  const fromManagedLink = connectLinkDedupeKey('https://www.instagram.com/royalbarber/');
  assert.equal(fromLegacyColumn, fromManagedLink);
  assert.notEqual(
    connectLinkDedupeKey('https://instagram.com/royalbarber'),
    connectLinkDedupeKey('https://instagram.com/other')
  );
});

test('connectLinkDedupeKey keeps a plain website distinct from its trailing slash', () => {
  assert.equal(
    connectLinkDedupeKey('https://royalbarber.ma/'),
    connectLinkDedupeKey('https://royalbarber.ma')
  );
});

test('syncLegacySocialColumns mirrors managed links back into the fixed columns', () => {
  const patch = syncLegacySocialColumns([
    { url: 'https://instagram.com/royalbarber' },
    { url: 'https://tiktok.com/@royalbarber' },
    { url: 'https://linkedin.com/company/royal' },
    { url: 'https://royalbarber.ma' },
  ]);

  // Handle columns keep a leading @ so the public card can build
  // tiktok.com/@handle without guessing.
  assert.equal(patch.instagram_handle, '@royalbarber');
  assert.equal(patch.tiktok_handle, '@royalbarber');
  // LinkedIn and the website have no legacy column, so they are ignored.
  assert.equal(patch.facebook_url, '');
  assert.equal(patch.youtube_url, '');
});

test('syncLegacySocialColumns stores a facebook page path bare', () => {
  const patch = syncLegacySocialColumns([{ url: 'https://facebook.com/royalshop' }]);
  assert.equal(patch.facebook_url, 'royalshop');
});

test('syncLegacySocialColumns clears a platform the admin removed', () => {
  const patch = syncLegacySocialColumns([{ url: 'https://instagram.com/royalbarber' }]);
  assert.equal(patch.instagram_handle, '@royalbarber');
  assert.equal(patch.tiktok_handle, '');
});

test('syncLegacySocialColumns keeps the first link when a platform repeats', () => {
  const patch = syncLegacySocialColumns([
    { url: 'https://instagram.com/first' },
    { url: 'https://instagram.com/second' },
  ]);
  assert.equal(patch.instagram_handle, '@first');
});

test('normalizeConnectPhone tidies unicode separators and caps the length', () => {
  assert.equal(normalizeConnectPhone('+212\u2011600\u2011112233'), '+212-600-112233');
  assert.equal(normalizeConnectPhone('  +212 600 112233  '), '+212 600 112233');
  assert.equal(normalizeConnectPhone(null), '');
  assert.equal(normalizeConnectPhone('1'.repeat(80)).length, 40);
});

test('generateVCardString emits one TEL line per configured number', () => {
  const vcard = generateVCardString({
    name: 'Royal Barber',
    phone: '+212 600-000001',
    whatsapp: '+212 600-000002',
    secondPhone: '+212 661-000003',
    officePhone: '+212 522-000004',
    fax: '+212 522-000005',
  });

  assert.match(vcard, /TEL;TYPE=CELL,VOICE:\+212 600-000001/);
  assert.match(vcard, /TEL;TYPE=CELL,WHATSAPP:\+212 600-000002/);
  assert.match(vcard, /TEL;TYPE=CELL:\+212 661-000003/);
  assert.match(vcard, /TEL;TYPE=WORK,VOICE:\+212 522-000004/);
  assert.match(vcard, /TEL;TYPE=WORK,FAX:\+212 522-000005/);
});

test('schema ships the optional contact columns from migration 003', () => {
  for (const column of ['category', 'second_phone', 'office_phone', 'fax']) {
    assert.match(schema, new RegExp(`${column} text not null default ''`), column);
  }
});

test('migration 003 is additive and idempotent', () => {
  for (const column of ['category', 'second_phone', 'office_phone', 'fax']) {
    assert.match(
      migration003,
      new RegExp(`add column if not exists ${column} text not null default ''`),
      column
    );
  }
  // No destructive statement may sneak into the migration.
  assert.doesNotMatch(migration003, /drop\s+(table|column)/i);
  assert.doesNotMatch(migration003, /truncate/i);
  assert.doesNotMatch(migration003, /delete\s+from/i);
});
