import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

/**
 * Auth.js Configuration
 * Hybrid approach: NextAuth for social + credentials gateway to Express backend
 */
export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Enable account linking
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Enable account linking
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call Express backend for authentication
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            console.error("Backend auth failed:", data.error);
            return null;
          }

          // Return user object + custom fields (will be passed to JWT callback)
          return {
            id: data.data.user.id.toString(),
            email: data.data.user.email,
            name: data.data.user.name,
            image: data.data.user.avatar,
            role: data.data.user.role?.name || "USER",
            backendToken: data.data.accessToken,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login-register",
    error: "/login-register",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For social login, ensure user has verified email
      if (account?.provider === "google" || account?.provider === "github") {
        return true; // Google/GitHub emails are already verified
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Store backend token from credentials login
        if ("backendToken" in user && user.backendToken) {
          token.backendToken = user.backendToken as string;
        }
      }

      // Store OAuth tokens for social accounts
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        if (token.backendToken) {
          session.backendToken = token.backendToken as string;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt", // Use JWT for stateless sessions
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  trustHost: true,
} satisfies NextAuthConfig;
