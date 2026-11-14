export function refundedCents(order) {
  return (order.refunds || []).reduce((sum, refund) => sum + refund.amountCents, 0);
}
