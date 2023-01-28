export function capitalizeString(predicate: string): string {
  if (predicate.length) {
    return `${predicate[0].toUpperCase()}${predicate.slice(1)}`;
  }
  return "";
}
