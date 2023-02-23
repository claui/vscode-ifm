export function capitalizeString(predicate: string): string {
  if (predicate.length) {
    return `${predicate[0].toUpperCase()}${predicate.slice(1)}`;
  }
  return "";
}

export function *searchSubstring(haystack: string, needle: string) {
  let index: number = haystack.indexOf(needle);
  while (index >= 0) {
    yield index;
    index = haystack.indexOf(needle, index + needle.length);
  }
}
