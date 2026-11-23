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

const sharedRefund = { amountCents: 100 };
const sharedRefundOrders = [
  { id: 'one', status: 'paid', createdAt: '2026-01-03T00:00:00Z', totalCents: 1000, refunds: [sharedRefund] },
  { id: 'two', status: 'paid', createdAt: '2026-01-04T00:00:00Z', totalCents: 1000, refunds: [sharedRefund] },
];
assert.equal(monthlyRevenue(sharedRefundOrders, 2026, 1), 1900);

const sharedIdOrders = [
  { id: 'three', status: 'paid', createdAt: '2026-01-05T00:00:00Z', totalCents: 1000,
    refunds: [{ id: 'global-refund', amountCents: 100 }] },
  { id: 'four', status: 'paid', createdAt: '2026-01-06T00:00:00Z', totalCents: 1000,
    refunds: [{ id: 'global-refund', amountCents: 100 }] },
];
assert.equal(monthlyRevenue(sharedIdOrders, 2026, 1), 1900);

const distinctNoIdOrders = [
  { id: 'five', status: 'paid', createdAt: '2026-01-07T00:00:00Z', totalCents: 1000,
    refunds: [{ amountCents: 100 }] },
  { id: 'six', status: 'paid', createdAt: '2026-01-08T00:00:00Z', totalCents: 1000,
    refunds: [{ amountCents: 100 }] },
];
assert.equal(monthlyRevenue(distinctNoIdOrders, 2026, 1), 1800);
