"use client";

import Header from "@/components/dashboard/Header";
import Footer from "@/components/dashboard/Footer";
import Sidebar from "@/components/dashboard/Sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import Loading from "@/components/ui/Loading";

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
        console.error("Authentication verification failed:", error);
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
    <div dir="rtl" className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex flex-col flex-1">
        <div className="flex-1 p-6">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
