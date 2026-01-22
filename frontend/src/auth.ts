import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
});

// Export handlers for API routes
export { handlers, auth, signIn, signOut };
