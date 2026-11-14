import { monthlyRevenue } from '../domain/revenue.js';
import { formatCents } from './formatMoney.js';

export function revenueCard(orders, year, month) {
  return { title: 'Revenue', value: formatCents(monthlyRevenue(orders, year, month)) };
}
