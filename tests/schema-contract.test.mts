import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');

test('schema enforces per-business serial uniqueness and database sequencing', () => {
  assert.match(schema, /next_serial integer not null default 1/i);
  assert.match(schema, /unique \(business_id, serial_number\)/i);
  assert.match(schema, /for update/i);
  assert.match(schema, /next_serial = next_serial \+ 1/i);
});

test('schema enforces one-way redeemed state consistency', () => {
  assert.match(schema, /status in \('ACTIVE', 'USED'\)/i);
  assert.match(schema, /status = 'USED' and redeemed_at is not null/i);
  assert.match(schema, /prevent_reward_reactivation/i);
  assert.match(schema, /old\.status = 'USED' and new\.status <> 'USED'/i);
});
