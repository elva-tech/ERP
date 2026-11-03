export function matchesSearch(query, ...values) {
  const searchTerm = String(query ?? "").trim().toLowerCase();
  if (!searchTerm) return true;

  return values.some((value) => String(value ?? "").toLowerCase().includes(searchTerm));
}
