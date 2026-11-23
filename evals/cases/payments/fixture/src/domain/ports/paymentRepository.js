/** Public repository port. Keep these method names and arguments stable. */
export const paymentRepositoryPort = Object.freeze([
  'getPayment(paymentId)',
  'findTransactionByPaymentId(paymentId)',
  'insertTransaction(transaction)',
  'markPaymentProcessed(paymentId)',
]);
