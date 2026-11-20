export function findOrder(orders, id) {
  return orders.find((order) => order.id === id) ?? null;
}
