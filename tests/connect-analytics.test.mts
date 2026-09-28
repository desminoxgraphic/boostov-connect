import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildConnectActions,
  resolveConnectEventAction,
  summarizeConnectEvents,
} from '../lib/connect-actions.ts';
import type { ConnectBusiness, ConnectEvent, ConnectLink } from '../lib/connect-types.ts';

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const BASE = {
  phone: '',
  whatsapp_number: '',
  second_phone: '',
  office_phone: '',
  email: '',
  address: '',
  google_maps_url: '',
  website_url: '',
  gallery_images: [] as string[],
  instagram_handle: '',
  facebook_url: '',
  tiktok_handle: '',
  youtube_url: '',
} as unknown as ConnectBusiness;

function business(overrides: Partial<ConnectBusiness> = {}): ConnectBusiness {
  return { ...BASE, ...overrides } as ConnectBusiness;
}

function link(overrides: Partial<ConnectLink> = {}): ConnectLink {
  return {
    id: 'link-1',
    business_id: 'b1',
    label: '',
    url: '',
    icon: 'link',
    sort_order: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ConnectLink;
}

let seq = 0;
function ev(
  event_type: ConnectEvent['event_type'],
  extra: Partial<ConnectEvent> = {}
): ConnectEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    business_id: 'b1',
    event_type,
    link_id: null,
    metadata: {},
    created_at: `2026-01-01T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
    ...extra,
  } as ConnectEvent;
}

const keys = (list: { key: string }[]) => list.map((item) => item.key);
const labels = (list: { label: string }[]) => list.map((item) => item.label);
const stat = (summary: { actions: { key: string }[] }, key: string) =>
  summary.actions.find((row) => row.key === key);

/* ------------------------------------------------------------------ */
/* 1. The dashboard reflects the CURRENT profile configuration         */
/* ------------------------------------------------------------------ */

test('a business with a website reports a Website action', () => {
  const summary = summarizeConnectEvents(
    business({ website_url: 'https://shop.example' }),
    [],
    [ev('website', { metadata: { action_key: 'contact.website' } })]
  );
  assert.ok(keys(summary.actions).includes('contact.website'));
  assert.equal(stat(summary, 'contact.website')?.clicks, 1);
});

test('a business without a website has no Website row at all', () => {
  const summary = summarizeConnectEvents(business({ phone: '+212600000000' }), [], []);
  assert.ok(!labels(summary.actions).includes('Website'));
  assert.ok(!keys(summary.actions).some((k) => k.includes('website')));
});

test('platforms the business never configured are never invented', () => {
  const summary = summarizeConnectEvents(
    business({ whatsapp_number: '212600000000', website_url: 'https://shop.example' }),
    [],
    [ev('view'), ev('instagram'), ev('facebook'), ev('tiktok'), ev('youtube')]
  );
  const found = labels(summary.actions);
  assert.ok(found.includes('WhatsApp'));
  assert.ok(found.includes('Website'));
  // Those events belong to actions this profile does not have.
  assert.ok(!found.includes('Instagram'));
  assert.ok(!found.includes('Facebook'));
  assert.ok(!found.includes('TikTok'));
  assert.ok(!found.includes('YouTube'));
  assert.equal(summary.total_clicks, 0);
  assert.equal(summary.total_views, 1);
});

test('a configured-but-unclicked action is still listed, at zero', () => {
  const summary = summarizeConnectEvents(
    business({ website_url: 'https://shop.example' }),
    [link({ id: 'l1', label: 'Catalogue', url: 'https://shop.example/catalogue' })],
    []
  );
  const catalogue = stat(summary, 'link:l1');
  assert.ok(catalogue, 'the custom link should be listed before it is ever clicked');
  assert.equal(catalogue?.clicks, 0);
  assert.equal(catalogue?.percent, 0);
});

/* ------------------------------------------------------------------ */
/* 2. Custom links                                                      */
/* ------------------------------------------------------------------ */

test('custom links appear with their own labels and no custom-link business', () => {
  const summary = summarizeConnectEvents(
    business(),
    [
      link({ id: 'c1', label: 'Catalogue', url: 'https://shop.example/catalogue' }),
      link({ id: 'c2', label: 'Booking', url: 'https://booking.example/x' }),
      link({ id: 'c3', label: 'Portfolio', url: 'https://dribbble.com/me' }),
    ],
    [
      ev('custom_link', { link_id: 'c1', metadata: { action_key: 'link:c1' } }),
      ev('custom_link', { link_id: 'c1', metadata: { action_key: 'link:c1' } }),
      ev('custom_link', { link_id: 'c1', metadata: { action_key: 'link:c1' } }),
      ev('custom_link', { link_id: 'c2', metadata: { action_key: 'link:c2' } }),
      ev('custom_link', { link_id: 'c3', metadata: { action_key: 'link:c3' } }),
    ]
  );
  assert.equal(stat(summary, 'link:c1')?.label, 'Catalogue');
  assert.equal(stat(summary, 'link:c1')?.clicks, 3);
  assert.equal(stat(summary, 'link:c2')?.label, 'Booking');
  assert.equal(stat(summary, 'link:c2')?.clicks, 1);
  assert.equal(stat(summary, 'link:c3')?.label, 'Portfolio');
  assert.equal(stat(summary, 'link:c3')?.clicks, 1);
});

test('a business with no custom links has no custom link rows', () => {
  const summary = summarizeConnectEvents(business({ website_url: 'https://shop.example' }), [], []);
  assert.ok(!keys(summary.actions).some((k) => k.startsWith('link:')));
});

test('adding and removing a link updates the dashboard both ways', () => {
  const b = business({ website_url: 'https://shop.example' });

  const before = summarizeConnectEvents(b, [], []);
  assert.ok(!keys(before.actions).includes('link:c1'));

  const added = summarizeConnectEvents(
    b,
    [link({ id: 'c1', label: 'Catalogue', url: 'https://shop.example/catalogue' })],
    [ev('custom_link', { link_id: 'c1', metadata: { action_key: 'link:c1' } })]
  );
  assert.ok(keys(added.actions).includes('link:c1'));
  assert.equal(stat(added, 'link:c1')?.clicks, 1);

  // Removed again: the row disappears and its old clicks stop counting, rather
  // than lingering as a link the merchant can no longer see.
  const removed = summarizeConnectEvents(
    b,
    [],
    [ev('custom_link', { link_id: 'c1', metadata: { action_key: 'link:c1' } })]
  );
  assert.ok(!keys(removed.actions).includes('link:c1'));
  assert.equal(removed.total_clicks, 0);
});

test('an inactive link is not an active dashboard item', () => {
  const summary = summarizeConnectEvents(
    business(),
    [link({ id: 'c1', label: 'Catalogue', url: 'https://shop.example/c', is_active: false })],
    []
  );
  assert.ok(!keys(summary.actions).includes('link:c1'));
});

/* ------------------------------------------------------------------ */
/* 3. No duplicate rows - the Website bug                              */
/* ------------------------------------------------------------------ */

test('a website that is also a custom link produces exactly one row', () => {
  const summary = summarizeConnectEvents(
    business({ website_url: 'https://shop.example' }),
    [link({ id: 'w1', label: 'Website', url: 'https://shop.example' })],
    [
      ev('website', { metadata: { action_key: 'contact.website' } }),
      ev('custom_link', { link_id: 'w1' }),
    ]
  );
  const websiteRows = summary.actions.filter((row) => row.label.toLowerCase() === 'website');
  assert.equal(websiteRows.length, 1, 'Website must appear exactly once');
  // Both the historical contact-row click and the custom-link click belong to
  // the single surviving row.
  assert.equal(websiteRows[0].clicks, 2);
  assert.equal(websiteRows[0].key, 'contact.website');
});

test('a website and a different custom website stay separate', () => {
  const summary = summarizeConnectEvents(
    business({ website_url: 'https://shop.example' }),
    [link({ id: 'w1', label: 'Blog', url: 'https://blog.example' })],
    []
  );
  assert.ok(keys(summary.actions).includes('contact.website'));
  assert.ok(keys(summary.actions).includes('link:w1'));
});

test('the public card itself renders the website only once', () => {
  const { actions } = buildConnectActions(
    business({ website_url: 'https://shop.example', phone: '+212600000000' }),
    [link({ id: 'w1', label: 'Website', url: 'https://shop.example' })]
  );
  const rendered = actions.filter((a) => a.section === 'contact' || a.section === 'social');
  assert.equal(rendered.filter((a) => a.label === 'Website').length, 1);
});

test('a trailing slash does not create a second website row', () => {
  const summary = summarizeConnectEvents(
    business({ website_url: 'https://shop.example' }),
    [link({ id: 'w1', label: 'Website', url: 'https://shop.example/' })],
    []
  );
  assert.equal(summary.actions.filter((row) => row.label === 'Website').length, 1);
});

/* ------------------------------------------------------------------ */
/* 4. No invented numbers, nothing counted twice                       */
/* ------------------------------------------------------------------ */

test('profile views are never counted as clicks', () => {
  const summary = summarizeConnectEvents(business(), [], [ev('view'), ev('view'), ev('view')]);
  assert.equal(summary.total_views, 3);
  assert.equal(summary.total_clicks, 0);
  assert.equal(summary.ctr, 0);
});

test('click-through rate is clicks divided by profile views', () => {
  const summary = summarizeConnectEvents(
    business({ website_url: 'https://shop.example' }),
    [],
    [ev('view'), ev('view'), ev('view'), ev('view'), ev('website'), ev('website'), ev('vcard')]
  );
  assert.equal(summary.total_views, 4);
  assert.equal(summary.total_clicks, 3);
  assert.equal(summary.ctr, 75);
  assert.equal(summary.saved_contacts, 1);
});

test('the action rows always add up to total clicks', () => {
  const summary = summarizeConnectEvents(
    business({
      phone: '+212600000000',
      whatsapp_number: '212600000000',
      email: 'hi@shop.example',
      website_url: 'https://shop.example',
      gallery_images: ['a.jpg'],
    }),
    [link({ id: 'c1', label: 'Catalogue', url: 'https://shop.example/c' })],
    [
      ev('view'),
      ev('call'),
      ev('whatsapp'),
      ev('email'),
      ev('website'),
      ev('gallery_open'),
      ev('vcard'),
      ev('custom_link', { link_id: 'c1' }),
    ]
  );
  const summed = summary.actions.reduce((total, row) => total + row.clicks, 0);
  assert.equal(summed, summary.total_clicks);
  assert.equal(summary.saved_contacts, 1);
});

test('one interaction is never counted in two rows', () => {
  // Three phone numbers all emit `call`; the clicks must land in one bucket.
  const summary = summarizeConnectEvents(
    business({
      phone: '+212600000000',
      second_phone: '+212611111111',
      office_phone: '+212622222222',
    }),
    [],
    [ev('call'), ev('call'), ev('call'), ev('call')]
  );
  assert.equal(summary.total_clicks, 4);
  assert.equal(stat(summary, 'contact.mobile')?.clicks, 4);
  assert.equal(stat(summary, 'contact.second-mobile')?.clicks, 0);
  assert.equal(stat(summary, 'contact.office')?.clicks, 0);
});

test('a WhatsApp contact row and a WhatsApp link are counted once each, never merged', () => {
  const summary = summarizeConnectEvents(
    business({ whatsapp_number: '212600000000' }),
    [link({ id: 'w', label: 'Support', url: 'https://wa.me/212699999999' })],
    [ev('whatsapp'), ev('custom_link', { link_id: 'w' })]
  );
  assert.equal(stat(summary, 'contact.whatsapp')?.clicks, 1);
  assert.equal(stat(summary, 'link:w')?.clicks, 1);
  assert.equal(summary.total_clicks, 2);
});

test('email and gallery events are counted instead of being silently dropped', () => {
  const summary = summarizeConnectEvents(
    business({ email: 'hi@shop.example', gallery_images: ['a.jpg', 'b.jpg'] }),
    [],
    [ev('email'), ev('email'), ev('gallery_open')]
  );
  assert.equal(stat(summary, 'contact.email')?.clicks, 2);
  assert.equal(stat(summary, 'page.gallery')?.clicks, 1);
  assert.equal(summary.total_clicks, 3);
});

test('the gallery only appears when the profile has photos', () => {
  const withPhotos = summarizeConnectEvents(
    business({ gallery_images: ['a.jpg'] }),
    [],
    [ev('gallery_open')]
  );
  assert.ok(keys(withPhotos.actions).includes('page.gallery'));

  const without = summarizeConnectEvents(business(), [], [ev('gallery_open')]);
  assert.ok(!keys(without.actions).includes('page.gallery'));
  assert.equal(without.total_clicks, 0);
});

test('save contact is always present and always reported', () => {
  const summary = summarizeConnectEvents(business(), [], [ev('vcard'), ev('vcard')]);
  assert.equal(stat(summary, 'page.save')?.label, 'Save Contact');
  assert.equal(summary.saved_contacts, 2);
  assert.equal(summary.total_clicks, 2);
});

/* ------------------------------------------------------------------ */
/* 5. Attribution of older events                                      */
/* ------------------------------------------------------------------ */

test('events recorded before action keys existed still resolve', () => {
  const actionSet = buildConnectActions(
    business({ whatsapp_number: '212600000000', website_url: 'https://shop.example' }),
    [link({ id: 'c1', label: 'Catalogue', url: 'https://shop.example/c' })]
  );
  assert.equal(
    resolveConnectEventAction({ event_type: 'whatsapp', link_id: null, metadata: {} }, actionSet)?.key,
    'contact.whatsapp'
  );
  assert.equal(
    resolveConnectEventAction({ event_type: 'website', link_id: null, metadata: {} }, actionSet)?.key,
    'contact.website'
  );
  assert.equal(
    resolveConnectEventAction({ event_type: 'custom_link', link_id: 'c1', metadata: {} }, actionSet)?.key,
    'link:c1'
  );
});

test('an explicit action key wins over the event type', () => {
  const actionSet = buildConnectActions(business({ website_url: 'https://shop.example' }), []);
  const resolved = resolveConnectEventAction(
    { event_type: 'custom_link', link_id: null, metadata: { action_key: 'contact.website' } },
    actionSet
  );
  assert.equal(resolved?.key, 'contact.website');
});

test('an action key that no longer exists falls back to the event type', () => {
  const actionSet = buildConnectActions(business({ website_url: 'https://shop.example' }), []);
  const resolved = resolveConnectEventAction(
    { event_type: 'website', link_id: null, metadata: { action_key: 'link:deleted' } },
    actionSet
  );
  assert.equal(resolved?.key, 'contact.website');
});

test('a link that duplicates a contact row keeps its own history on that row', () => {
  const actionSet = buildConnectActions(
    business({ website_url: 'https://shop.example' }),
    [link({ id: 'w1', url: 'https://shop.example' })]
  );
  assert.equal(
    resolveConnectEventAction({ event_type: 'custom_link', link_id: 'w1', metadata: {} }, actionSet)?.key,
    'contact.website'
  );
});

test('an event for a deleted link is dropped rather than guessed at', () => {
  const summary = summarizeConnectEvents(
    business(),
    [],
    [ev('custom_link', { link_id: 'gone', metadata: { label: 'Old link' } })]
  );
  assert.equal(summary.total_clicks, 0);
  assert.equal(summary.actions.filter((r) => r.label === 'Old link').length, 0);
});

/* ------------------------------------------------------------------ */
/* 6. Human-readable activity                                          */
/* ------------------------------------------------------------------ */

test('activity titles read like a person wrote them', () => {
  const summary = summarizeConnectEvents(
    business({
      phone: '+212600000000',
      whatsapp_number: '212600000000',
      email: 'hi@shop.example',
      address: '1 Main Street',
      website_url: 'https://shop.example',
      gallery_images: ['a.jpg'],
    }),
    [link({ id: 'c1', label: 'Catalogue', url: 'https://shop.example/c' })],
    [
      ev('view'),
      ev('whatsapp'),
      ev('instagram'),
      ev('maps'),
      ev('vcard'),
      ev('custom_link', { link_id: 'c1', metadata: { action_key: 'link:c1' } }),
    ]
  );
  const titles = summary.recent_activity.map((row) => row.title);
  assert.ok(titles.includes('Profile viewed'));
  assert.ok(titles.includes('WhatsApp clicked'));
  assert.ok(titles.includes('Address opened'));
  assert.ok(titles.includes('Contact saved'));
  assert.ok(titles.includes('Catalogue clicked'));
  // Instagram is not on this profile, so it is not given a made-up label.
  assert.ok(!titles.includes('Instagram clicked'));
});

test('activity keeps a timestamp and is capped at 15 entries', () => {
  const events = Array.from({ length: 25 }, () => ev('view'));
  const summary = summarizeConnectEvents(business(), [], events);
  assert.equal(summary.recent_activity.length, 15);
  assert.ok(summary.recent_activity.every((row) => typeof row.created_at === 'string'));
});

/* ------------------------------------------------------------------ */
/* 7. Ordering and shape                                               */
/* ------------------------------------------------------------------ */

test('rows are ordered by clicks, most clicked first', () => {
  const summary = summarizeConnectEvents(
    business({ phone: '+212600000000', whatsapp_number: '212600000000' }),
    [],
    [ev('whatsapp'), ev('whatsapp'), ev('call')]
  );
  const top = summary.actions.slice(0, 2).map((row) => row.key);
  assert.deepEqual(top, ['contact.whatsapp', 'contact.mobile']);
});

test('equal click counts keep the order the card renders them in', () => {
  // Mobile is the first contact row, so a tie must not reshuffle the list
  // between refreshes.
  const summary = summarizeConnectEvents(
    business({ phone: '+212600000000', whatsapp_number: '212600000000' }),
    [],
    [ev('whatsapp'), ev('call')]
  );
  assert.deepEqual(
    summary.actions.slice(0, 2).map((row) => row.key),
    ['contact.mobile', 'contact.whatsapp']
  );
});

test('every action carries an icon the dashboard can draw', () => {
  const summary = summarizeConnectEvents(
    business({
      phone: '+212600000000',
      whatsapp_number: '212600000000',
      second_phone: '+212611111111',
      office_phone: '+212622222222',
      email: 'hi@shop.example',
      address: '1 Main Street',
      website_url: 'https://shop.example',
      gallery_images: ['a.jpg'],
      instagram_handle: '@shop',
    }),
    [link({ id: 'c1', label: 'Catalogue', url: 'https://shop.example/c' })],
    []
  );
  assert.ok(summary.actions.length >= 11);
  for (const row of summary.actions) {
    assert.ok(row.icon, `${row.key} needs an icon`);
    assert.ok(row.label.length > 0, `${row.key} needs a label`);
  }
});

test('percentages are shares of total clicks and sum to about 100', () => {
  const summary = summarizeConnectEvents(
    business({ website_url: 'https://shop.example', phone: '+212600000000' }),
    [],
    [ev('website'), ev('website'), ev('call')]
  );
  assert.equal(stat(summary, 'contact.website')?.percent, 66.7);
  assert.equal(stat(summary, 'contact.mobile')?.percent, 33.3);
  const total = summary.actions.reduce((sum, row) => sum + row.percent, 0);
  assert.ok(Math.abs(total - 100) < 0.5, `percentages summed to ${total}`);
});

test('a profile with nothing configured still reports its one action', () => {
  const summary = summarizeConnectEvents(business(), [], []);
  assert.equal(summary.actions.length, 1);
  assert.equal(summary.actions[0].key, 'page.save');
  assert.equal(summary.total_views, 0);
  assert.equal(summary.total_clicks, 0);
  assert.equal(summary.ctr, 0);
  assert.equal(summary.saved_contacts, 0);
  assert.deepEqual(summary.recent_activity, []);
});
