import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      backendToken?: string;
    } & DefaultSession["user"];
    backendToken?: string;
  }

  interface User {
    role?: string;
    backendToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    backendToken?: string;
    provider?: string;
  }
}
