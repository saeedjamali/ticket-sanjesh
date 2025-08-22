"use client";

import NextAuthProvider from "@/components/providers/NextAuthProvider";
import { SidebarProvider } from "@/context/SidebarContext";
import { UserProvider } from "@/context/UserContext";

export default function Providers({ children }) {
  return (
    <UserProvider>
      <SidebarProvider>
        <NextAuthProvider>{children}</NextAuthProvider>
      </SidebarProvider>
    </UserProvider>
  );
}

