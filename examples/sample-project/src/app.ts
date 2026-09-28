import { authenticate, validateEmail } from "./auth.js";
import { connectDatabase, findUser } from "./database.js";

export function login(email: string, password: string): boolean {
  connectDatabase("postgres://localhost/demo");
  if (!validateEmail(email)) return false;

  const user = findUser(email);
  return user !== null && authenticate(user, password);
}
