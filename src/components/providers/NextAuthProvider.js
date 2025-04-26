"use client";

import { UserProvider } from "@/context/UserContext";

export default function NextAuthProvider({ children }) {
  return <UserProvider>{children}</UserProvider>;
}
