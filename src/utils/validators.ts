export function isValidIdentityId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 1;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
