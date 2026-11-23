export async function retryPayment({ paymentId, idempotencyKey }, { repository, gateway }) {
  const payment = await repository.getPayment(paymentId);
  if (!payment) throw new Error(`Unknown payment: ${paymentId}`);

  const charge = await gateway.charge({
    paymentId,
    amountCents: payment.amountCents,
    idempotencyKey,
  });
  const transaction = await repository.insertTransaction({
    paymentId,
    gatewayTransactionId: charge.id,
    idempotencyKey,
  });
  await repository.markPaymentProcessed(paymentId);
  return transaction;
}
