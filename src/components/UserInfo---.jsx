"use client";

import { ROLES } from "@/lib/permissions";
import { useEffect, useState } from "react";
// import { ROLES } from "@/constants/roles";

const getRoleName = (role) => {
    switch (role) {
        case ROLES.ADMIN:
            return "مدیر";
        case ROLES.SUPER_ADMIN:
            return "مدیر کل";
        case ROLES.SYSTEM_ADMIN:
            return "مدیر سیستم";
        case ROLES.EXAM_CENTER_ADMIN:
            return "مدیر مرکز آزمون";
        case ROLES.DISTRICT_ADMIN:
            return "مدیر منطقه";
        case ROLES.PROVINCE_ADMIN:
            return "مدیر استان";
        default:
            return "کاربر";
    }
};

export default function UserInfo() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch("/api/auth/me", {
                    credentials: "include",
                });
                const data = await response.json();

                console.log("data--->", data);
                if (data.success) {
                    setUser(data.user);
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                در حال بارگذاری...
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                        {user.fullName?.charAt(0) || "؟"}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="font-medium">{user.fullName}</span>
                    <span className="text-sm text-gray-500">{getRoleName(user.role)}</span>
                </div>
            </div>
        </div>
    );
} 