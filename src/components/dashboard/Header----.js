"use client";

import { useUserContext } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function Header({ user }) {
  const router = useRouter();
  const { logout } = useUserContext();

  const handleLogout = () => {
    logout();
    console.log("User logged out successfully");
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm py-4 px-6 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/dashboard">
          <h1 className="text-2xl font-bold text-gray-800">سامانه تیکتینگ</h1>
        </Link>
        <header className="bg-white border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-xl font-bold">داشبورد</h1>
            {/* <UserInfo /> */}
          </div>
        </header>
        <div className="flex items-center space-x-4 space-x-reverse">
          <span className="text-gray-600">
            {user?.fullName} | {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}
