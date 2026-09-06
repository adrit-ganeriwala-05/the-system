import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  // Database sessions (not JWT-only) so a session can be revoked server-side.
  session: { strategy: "database" },
  trustHost: true,
  pages: { signIn: "/signin" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // New LeetCoders start on the Pareto 49 — the smallest set, so Rank moves early.
      const pareto = await prisma.problemSet.findUnique({ where: { key: "pareto49" } });
      if (pareto && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { activeProblemSetId: pareto.id },
        });
      }
    },
  },
});
