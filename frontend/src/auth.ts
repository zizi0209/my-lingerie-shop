import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import authConfig from "./auth.config";

/**
 * Prisma Client for NextAuth
 * Uses the same database as backend
 */
const prisma = new PrismaClient();

const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  events: {
    async createUser({ user }) {
      console.log("✅ New user created via social login:", user.email);
      
      // TODO: Call backend to assign welcome coupon for social signup
      // This ensures social users get same benefits as email signups
    },
    async linkAccount({ user, account }) {
      console.log("🔗 Account linked:", { user: user.email, provider: account.provider });
    },
  },
});

// Export handlers for API routes
export { handlers, auth, signIn, signOut };
