import { validAmount } from './validation.js';

export function transfer(balances, from, to, amount) {
  if (!validAmount(amount)) throw new Error('invalid amount');
  balances[from] -= amount;
  balances[to] += amount;
  return balances;
}
