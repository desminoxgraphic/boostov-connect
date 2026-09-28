import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateVCardString } from '../lib/vcard.ts';
import {
  normalizeConnectSlug,
  calculateConnectCTR,
  normalizeConnectText,
  normalizeConnectEmail,
  normalizeConnectAddress,
  pickConnectBusinessFields,
  CONNECT_DESCRIPTION_MAX,
  CONNECT_BOTTOM_TAGLINE_MAX,
  CONNECT_BOTTOM_BUTTON_MAX,
} from '../lib/connect-utils.ts';
import { normalizeThemeColor } from '../lib/connect-theme.ts';

const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');

test('Connect schema defines connect_businesses, connect_links, and connect_events tables', () => {
  assert.match(schema, /create table if not exists public\.connect_businesses/i);
  assert.match(schema, /create table if not exists public\.connect_links/i);
  assert.match(schema, /create table if not exists public\.connect_events/i);
  assert.match(schema, /dashboard_token text unique not null/i);
  assert.match(schema, /event_type text not null/i);
});

test('normalizeConnectSlug sanitizes spaces, special characters, and uppercase letters', () => {
  assert.equal(normalizeConnectSlug('  Royal Barber Shop & Salon! '), 'royal-barber-shop-salon');
  assert.equal(normalizeConnectSlug('Café---Le--Petit'), 'caf-le-petit');
  assert.equal(normalizeConnectSlug('APEX_GYM_2026'), 'apex-gym-2026');
});

test('generateVCardString formats valid vCard 3.0 file content', () => {
  const vcard = generateVCardString({
    name: 'Apex Fitness Gym',
    phone: '+212 600-112233',
    whatsapp: '+212 600-112233',
    description: 'Premium fitness facility in Casablanca',
    websiteUrl: 'https://domain.com/connect/apex-gym',
  });

  assert.match(vcard, /BEGIN:VCARD/);
  assert.match(vcard, /VERSION:3\.0/);
  assert.match(vcard, /FN:Apex Fitness Gym/);
  assert.match(vcard, /ORG:Apex Fitness Gym/);
  assert.match(vcard, /TEL;TYPE=CELL,VOICE:\+212 600-112233/);
  assert.match(vcard, /NOTE:Premium fitness facility in Casablanca/);
  assert.match(vcard, /URL:https:\/\/domain\.com\/connect\/apex-gym/);
  assert.match(vcard, /END:VCARD/);
});

test('calculateConnectCTR produces accurate percentage values', () => {
  const ctr = calculateConnectCTR(100, 45);
  assert.equal(ctr, 45.0);

  const zeroCtr = calculateConnectCTR(0, 45);
  assert.equal(zeroCtr, 0);
});

test('Connect schema ships the theming, bottom message, and extra contact columns', () => {
  for (const column of [
    'theme_color',
    'email',
    'address',
    'bottom_tagline',
    'bottom_button_text',
  ]) {
    assert.match(
      schema,
      new RegExp(`add column if not exists ${column}\\b`, 'i'),
      `baseline schema is missing the ${column} column`
    );
  }
});

test('bottom message migration adds both columns and stays idempotent', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/202609270004_add_connect_bottom_message.sql'),
    'utf8'
  );

  for (const column of ['bottom_tagline', 'bottom_button_text']) {
    assert.match(
      migration,
      new RegExp(`add column if not exists ${column}\\b`, 'i'),
      `migration is missing the ${column} column`
    );
  }

  // The legacy pair must be promoted rather than dropped, and the columns
  // themselves must survive so a rollback is possible.
  assert.match(migration, /information_schema\.columns/i);
  assert.match(migration, /description = r\.new_description/i);
  assert.doesNotMatch(migration, /drop\s+column/i, 'the migration must never drop a column');

  // The two new fields are single-line by contract, matching the admin
  // `maxLength` and the write normalizers.
  assert.match(migration, /connect_businesses_bottom_tagline_len[\s\S]*<= 80/);
  assert.match(migration, /connect_businesses_bottom_button_text_len[\s\S]*<= 60/);
  assert.match(migration, /connect_businesses_bottom_single_line/);

  // An existing row must never be able to abort this migration. The legacy
  // `tagline` column allowed 140 characters and `welcome_message` allowed 80,
  // so both copies are flattened and clipped to the new field limits.
  assert.match(
    migration,
    /left\(\s*regexp_replace\(btrim\(tagline\), '\[\^?\\n\\r\\t\]\+', ' ', 'g'\),\s*80\s*\)/,
    'the legacy tagline copy must be clipped to 80 characters'
  );
  assert.match(
    migration,
    /left\(\s*regexp_replace\(coalesce\(btrim\(welcome_message\), ''\), '\[\^?\\n\\r\\t\]\+', ' ', 'g'\),\s*60\s*\)/,
    'the legacy welcome_message copy must be clipped to 60 characters'
  );

  // `description` predates this migration and was never capped in the
  // database, so a length check here would block existing businesses from
  // saving. The 300-character limit lives in lib/connect-utils.ts instead.
  assert.doesNotMatch(
    migration,
    /connect_businesses_description_len/,
    'description must not gain a database length check that existing rows could violate'
  );
  assert.match(migration, /CONNECT_DESCRIPTION_MAX/);
});

test('normalizeConnectText collapses whitespace and enforces its length cap', () => {
  assert.equal(
    normalizeConnectText('  Beauty,   cosmetics,  perfumes.  ', CONNECT_DESCRIPTION_MAX),
    'Beauty, cosmetics, perfumes.'
  );
  assert.equal(
    normalizeConnectText('a'.repeat(500), CONNECT_DESCRIPTION_MAX).length,
    CONNECT_DESCRIPTION_MAX
  );
  assert.equal(normalizeConnectText('   ', CONNECT_DESCRIPTION_MAX), '');
  assert.equal(normalizeConnectText(null, CONNECT_DESCRIPTION_MAX), '');
  assert.equal(normalizeConnectText('مرحبا بكم دائماً', CONNECT_BOTTOM_BUTTON_MAX), 'مرحبا بكم دائماً');
});

test('bottom message fields collapse to empty so blank values stay hidden', () => {
  // The public card renders nothing for an empty string, so whitespace-only
  // input has to normalise away rather than become a blank pill.
  assert.equal(normalizeConnectText('   ', CONNECT_BOTTOM_TAGLINE_MAX), '');
  assert.equal(normalizeConnectText('', CONNECT_BOTTOM_TAGLINE_MAX), '');
  assert.equal(normalizeConnectText(null, CONNECT_BOTTOM_TAGLINE_MAX), '');
  assert.equal(normalizeConnectText('\n\t  ', CONNECT_BOTTOM_BUTTON_MAX), '');
  assert.equal(normalizeConnectText(undefined, CONNECT_BOTTOM_BUTTON_MAX), '');
});

test('bottom message budgets match the documented limits', () => {
  assert.equal(CONNECT_BOTTOM_TAGLINE_MAX, 80);
  assert.ok(CONNECT_BOTTOM_BUTTON_MAX <= CONNECT_BOTTOM_TAGLINE_MAX);
  assert.ok(CONNECT_DESCRIPTION_MAX > CONNECT_BOTTOM_TAGLINE_MAX);
});

test('normalizeConnectEmail only returns a well-formed address', () => {
  assert.equal(normalizeConnectEmail('  hello@salon.ma '), 'hello@salon.ma');
  assert.equal(normalizeConnectEmail('not-an-email'), '');
  assert.equal(normalizeConnectEmail('missing@tld'), '');
  assert.equal(normalizeConnectEmail('a b@mail.com'), '');
  assert.equal(normalizeConnectEmail(null), '');
});

test('normalizeConnectAddress keeps line breaks and trims outer whitespace', () => {
  assert.equal(normalizeConnectAddress('  12 Rue Mohammed V\nCasablanca  '), '12 Rue Mohammed V\nCasablanca');
  assert.equal(normalizeConnectAddress('   '), '');
  assert.equal(normalizeConnectAddress('x'.repeat(900)).length, 200);
});

test('pickConnectBusinessFields forwards every customisation field', () => {
  const picked = pickConnectBusinessFields({
    id: 'abc',
    name: 'Royal Barber',
    slug: 'royal-barber',
    theme_color: '#e11d48',
    email: 'hi@royal.ma',
    address: 'Casablanca',
    description: 'Premium grooming in the heart of the city.',
    bottom_tagline: 'Best cuts in town',
    bottom_button_text: 'Welcome anytime!',
    gallery_images: ['https://example.com/a.jpg'],
    is_active: true,
    should_not_pass: 'nope',
  });

  assert.equal(picked.theme_color, '#e11d48');
  assert.equal(picked.email, 'hi@royal.ma');
  assert.equal(picked.address, 'Casablanca');
  assert.equal(picked.description, 'Premium grooming in the heart of the city.');
  assert.equal(picked.bottom_tagline, 'Best cuts in town');
  assert.equal(picked.bottom_button_text, 'Welcome anytime!');
  assert.equal('should_not_pass' in picked, false);
});

test('pickConnectBusinessFields no longer forwards the deprecated copy columns', () => {
  // The old pair used to double up with `description`, so the API must ignore it
  // outright rather than letting a stale client reintroduce a second blurb.
  const picked = pickConnectBusinessFields({
    name: 'Royal Barber',
    slug: 'royal-barber',
    tagline: 'Stale hero copy',
    welcome_message: 'Stale welcome copy',
  });

  assert.equal('tagline' in picked, false);
  assert.equal('welcome_message' in picked, false);
});

test('pickConnectBusinessFields tolerates junk bodies', () => {
  assert.deepEqual(pickConnectBusinessFields(null), {});
  assert.deepEqual(pickConnectBusinessFields(undefined), {});
  assert.deepEqual(pickConnectBusinessFields('a string'), {});
  assert.deepEqual(pickConnectBusinessFields(42), {});
});

test('a bad theme colour can never reach the database as-is', () => {
  assert.equal(normalizeThemeColor('chartreuse'), '#2563eb');
  assert.equal(normalizeThemeColor('#GGG'), '#2563eb');
  assert.equal(normalizeThemeColor('#e11d48'), '#e11d48');
});

test('generateVCardString includes email and address when provided', () => {
  const vcard = generateVCardString({
    name: 'Salon Belle',
    phone: '+212600000000',
    email: 'bonjour@salonbelle.ma',
    address: '12 Rue Mohammed V',
    description: 'Hair and beauty',
  });

  assert.match(vcard, /EMAIL;TYPE=INTERNET:bonjour@salonbelle\.ma/);
  assert.match(vcard, /ADR;TYPE=WORK:;;12 Rue Mohammed V;;;;/);
});

test('generateVCardString escapes vCard reserved characters', () => {
  const vcard = generateVCardString({
    name: 'Cafe, Bar & Grill',
    address: 'Rue A; Rue B',
  });
  assert.match(vcard, /FN:Cafe\\, Bar & Grill/);
  assert.match(vcard, /ADR;TYPE=WORK:;;Rue A\\; Rue B;;;;/);
});
