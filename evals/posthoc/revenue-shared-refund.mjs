import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Discovered after the first matched pair completed. Keep this check separate
// from the frozen case hash recorded in that pilot's manifest.
const workspace = process.argv[2];
if (!workspace) throw new Error('Usage: node revenue-shared-refund.mjs <workspace>');
const { monthlyRevenue } = await import(pathToFileURL(resolve(workspace, 'src/domain/revenue.js')));
const sharedRefund = { amountCents: 100 };
const orders = [
  { id: 'one', status: 'paid', createdAt: '2026-01-03T00:00:00Z', totalCents: 1000, refunds: [sharedRefund] },
  { id: 'two', status: 'paid', createdAt: '2026-01-04T00:00:00Z', totalCents: 1000, refunds: [sharedRefund] },
];
assert.equal(monthlyRevenue(orders, 2026, 1), 1900);
