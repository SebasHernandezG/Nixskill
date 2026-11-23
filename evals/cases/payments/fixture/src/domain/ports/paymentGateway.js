/** A gateway deduplicates requests that carry the same idempotency key. */
export const paymentGatewayPort = Object.freeze(['charge({ paymentId, amountCents, idempotencyKey })']);
