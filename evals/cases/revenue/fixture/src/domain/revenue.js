import { isSettled } from './status.js';
import { refundedCents } from './refunds.js';

export function monthlyRevenue(orders, year, month) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return orders
    .filter((order) => order.createdAt.slice(0, 7) === key)
    .reduce((total, order) => total + order.totalCents, 0);
}
