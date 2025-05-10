"use client";

import Footer from "@/components/dashboard/Footer";
import Sidebar from "@/components/dashboard/Sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import Loading from "@/components/ui/Loading";
import LogoutButton from "@/components/LogoutButton";
import Header from "@/components/Header";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, loading, checkAuth } = useUserContext();
  const [verified, setVerified] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        setAuthChecking(true);
        await checkAuth();
        setVerified(true);
      } catch (error) {
        // console.error("Authentication verification failed:", error);
        router.push("/login");
      } finally {
        setAuthChecking(false);
      }
    };

    verifyAuth();
  }, []);

  useEffect(() => {
    if (!loading && !authChecking && !user) {
      router.push("/login");
    }
  }, [loading, authChecking, user, router]);

  if (loading || authChecking) {
    return (
      <div className="h-screen flex justify-center items-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div dir="rtl" className="flex min-h-screen flex-col lg:flex-row">
      {/* <Header /> */}
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="container mx-auto p-6">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
