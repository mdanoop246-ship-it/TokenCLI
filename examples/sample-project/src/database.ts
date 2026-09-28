export function connectDatabase(url: string): void {
  console.log("Connecting to database:", url);
}

export function findUser(email: string): { id: string; email: string } | null {
  if (!email) return null;
  return { id: "demo", email };
}

export function closeDatabase(): void {
  console.log("Database closed");
}
