export function isSettled(order) {
  return ['paid', 'partially_refunded', 'refunded'].includes(order.status);
}
