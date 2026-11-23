export function createPaymentGateway({ loseFirstResponse = false } = {}) {
  const chargesByKey = new Map();
  const calls = [];
  let shouldLoseResponse = loseFirstResponse;

  return {
    async charge({ paymentId, amountCents, idempotencyKey }) {
      calls.push({ paymentId, amountCents, idempotencyKey });
      let charge = chargesByKey.get(idempotencyKey);
      if (!charge) {
        charge = { id: `gateway-${chargesByKey.size + 1}`, paymentId, amountCents };
        chargesByKey.set(idempotencyKey, charge);
        if (shouldLoseResponse) {
          shouldLoseResponse = false;
          throw new Error('Gateway response lost after processing');
        }
      }
      return { ...charge };
    },
    get calls() { return calls.map((call) => ({ ...call })); },
    get createdCount() { return chargesByKey.size; },
  };
}
