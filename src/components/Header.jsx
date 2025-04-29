"use client";

import UserInfo from "./UserInfo---";
import LogoutButton from "./LogoutButton";
import { useEffect, useState } from "react";
import { useUserContext } from "@/context/UserContext";

const getJalaliDate = () => {
    const date = new Date();
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        calendar: 'persian'
    };
    return new Intl.DateTimeFormat('fa-IR', options).format(date);
};

export default function Header() {
    const [todayDate, setTodayDate] = useState("");
    const { user } = useUserContext();

    useEffect(() => {
        setTodayDate(getJalaliDate());
    }, []);

    return (
        <header className="bg-white border-b shadow-sm">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Right Side - Date */}

                <div className="flex items-center gap-2 text-gray-600">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                        />
                    </svg>
                    <span>{todayDate}</span>
                </div>

                {/* Left Side - User Info & Logout */}
                <div className="flex items-center gap-6">

                    <span className="text-gray-600">
                        {user?.fullName}
                    </span>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
} 