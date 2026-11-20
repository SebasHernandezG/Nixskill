import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const workdir = process.argv[2];
const { monthlyRevenue } = await import(pathToFileURL(resolve(workdir, 'src/domain/revenue.js')));
const { revenueCard } = await import(pathToFileURL(resolve(workdir, 'src/ui/revenueCard.js')));
const orders = [
  { id: 'boundary', status: 'paid', createdAt: '2026-02-01T00:30:00+02:00', totalCents: 1000 },
  { id: 'full', status: 'refunded', createdAt: '2026-01-15T00:00:00Z', totalCents: 4000,
    refunds: [{ id: 'r1', amountCents: 2000 }, { id: 'r2', amountCents: 2000 }] },
  { id: 'over', status: 'partially_refunded', createdAt: '2026-01-18T00:00:00Z', totalCents: 3000,
    refunds: [{ id: 'r3', amountCents: 3000 }, { id: 'r3', amountCents: 3000 }] },
  { id: 'pending', status: 'pending', createdAt: '2026-01-20T00:00:00Z', totalCents: 9000 },
];
assert.equal(monthlyRevenue(orders, 2026, 1), 1000);
assert.deepEqual(revenueCard(orders, 2026, 1), { title: 'Revenue', value: '$10.00' });
assert.equal(monthlyRevenue(orders, 2026, 2), 0);
