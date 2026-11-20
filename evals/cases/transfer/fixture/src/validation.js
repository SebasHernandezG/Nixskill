export function validAmount(amount) {
  return typeof amount === 'number' && amount > 0;
}
