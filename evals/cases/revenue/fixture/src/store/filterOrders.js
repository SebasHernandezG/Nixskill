export function filterOrders(orders, status) {
  return orders.filter((order) => order.status === status);
}
