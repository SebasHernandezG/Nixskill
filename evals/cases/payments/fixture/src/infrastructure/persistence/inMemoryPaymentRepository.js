export function createPaymentRepository({ payments = [], transactions = [] } = {}) {
  const paymentRows = new Map(payments.map((payment) => [payment.id, { ...payment }]));
  const transactionRows = transactions.map((transaction) => ({ ...transaction }));

  return {
    async getPayment(paymentId) {
      const payment = paymentRows.get(paymentId);
      return payment ? { ...payment } : null;
    },
    async findTransactionByPaymentId(paymentId) {
      const row = transactionRows.find((transaction) => transaction.paymentId === paymentId);
      return row ? { ...row } : null;
    },
    async insertTransaction(transaction) {
      const row = { id: `transaction-${transactionRows.length + 1}`, ...transaction };
      transactionRows.push(row);
      return { ...row };
    },
    async markPaymentProcessed(paymentId) {
      const payment = paymentRows.get(paymentId);
      if (!payment) throw new Error(`Unknown payment: ${paymentId}`);
      paymentRows.set(paymentId, { ...payment, status: 'processed' });
    },
    get transactions() {
      return transactionRows.map((transaction) => ({ ...transaction }));
    },
  };
}
