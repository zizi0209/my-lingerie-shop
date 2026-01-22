import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import authConfig from "./auth.config";

/**
 * Initialize Prisma Client for Auth.js
 * Points to the same database as Express backend
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
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
