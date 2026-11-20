import assert from 'node:assert/strict';
import test from 'node:test';
import { revenueCard } from '../src/ui/revenueCard.js';

test('monthly card excludes cancelled value and repeated refunds', () => {
  const orders = [
    { id: 'a', status: 'paid', createdAt: '2026-01-04T12:00:00Z', totalCents: 10000 },
    { id: 'b', status: 'cancelled', createdAt: '2026-01-05T12:00:00Z', totalCents: 9999 },
    { id: 'c', status: 'partially_refunded', createdAt: '2026-01-06T12:00:00Z', totalCents: 8000,
      refunds: [{ id: 'r1', amountCents: 3000 }, { id: 'r1', amountCents: 3000 }] },
    { id: 'd', status: 'paid', createdAt: '2026-02-01T12:00:00Z', totalCents: 2000 },
  ];
  assert.deepEqual(revenueCard(orders, 2026, 1), { title: 'Revenue', value: '$150.00' });
});
