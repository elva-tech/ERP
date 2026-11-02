export function expectStatus(result, expected, context = "") {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(result.status)) {
    throw new Error(
      `${context ? `${context}: ` : ""}expected HTTP ${allowed.join("/")}, got ${result.status} ${JSON.stringify(result.data)?.slice(0, 300)}`
    );
  }
}

export function expect(condition, message) {
  if (!condition) throw new Error(message);
}
