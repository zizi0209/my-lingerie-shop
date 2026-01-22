/**
 * Hybrid Auth Hook
 * Bridges NextAuth session with legacy AuthContext
 * 
 * This hook syncs NextAuth session (social + credentials) with the existing
 * AuthContext, allowing gradual migration while maintaining backward compatibility.
 */

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types/auth";

export function useHybridAuth() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Set backend token from NextAuth session (if exists)
      if (session.backendToken) {
        api.setToken(session.backendToken);
        // Set a long expiry for social login tokens
        api.setTokenExpiry(7 * 24 * 60 * 60); // 7 days
      }
    } else if (status === "unauthenticated") {
      // Clear backend token when logged out
      api.removeToken();
    }
  }, [session, status]);

  // Map NextAuth session to User type
  const user: User | null = session?.user
    ? {
        id: parseInt(session.user.id),
        email: session.user.email || "",
        name: session.user.name || null,
        avatar: session.user.image || null,
        roleId: null,
        role: session.user.role ? { id: 0, name: session.user.role } : null,
        phone: null,
        birthday: null,
        memberTier: "BRONZE",
        pointBalance: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      }
    : null;

  return {
    user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    session,
  };
}
