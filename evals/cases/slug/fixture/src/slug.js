export function slugify(input) {
  return input.trim().toLowerCase().replaceAll(' ', '-');
}
