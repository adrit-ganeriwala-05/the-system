import { prisma } from "./prisma";

/** Single-user app: there is exactly one User row, seeded once. */
export async function getSoleUser() {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user row found — run `npm run db:seed`.");
  }
  return user;
}
