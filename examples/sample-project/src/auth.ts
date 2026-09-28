export interface User {
  id: string;
  email: string;
}

export function validateEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

export function authenticate(user: User, password: string): boolean {
  if (!user || !password) return false;
  return password.length >= 8;
}

function unrelatedUtility(value: string): string {
  return value.trim().toLowerCase();
}
