"use client";

import UserInfo from "./UserInfo---";
import LogoutButton from "./LogoutButton";
import { useEffect, useState, useRef } from "react";
import { useUserContext } from "@/context/UserContext";
import { getRoleName } from "@/lib/permissions";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    const [notificationCount, setNotificationCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        setTodayDate(getJalaliDate());
        fetchNotifications();

        // Set up polling for notifications every minute
        const interval = setInterval(fetchNotifications, 60000);

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const accessToken = localStorage.getItem("accessToken");
            const response = await fetch('/api/stats/tickets', {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNotificationCount(data.stats.newTickets || 0);

                    // If we have new tickets and the dropdown is open, fetch ticket details
                    if (data.stats.newTickets > 0 && isDropdownOpen) {
                        fetchTicketDetails();
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetails = async () => {
        try {
            const accessToken = localStorage.getItem("accessToken");
            const response = await fetch('/api/tickets?status=new&limit=5', {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.tickets) {
                    setNotifications(data.tickets);
                }
            }
        } catch (error) {
            console.error("Error fetching ticket details:", error);
        }
    };

    const toggleDropdown = () => {
        const newState = !isDropdownOpen;
        setIsDropdownOpen(newState);

        // Fetch ticket details when opening dropdown
        if (newState && notificationCount > 0) {
            fetchTicketDetails();
        }
    };

    const handleNotificationClick = (ticketId) => {
        setIsDropdownOpen(false);
        router.push(`/dashboard/tickets/${ticketId}`);
    };

    // Convert English numbers to Persian
    const toFarsiNumber = (n) => {
        if (!n && n !== 0) return '';
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return n.toString().replace(/\d/g, x => farsiDigits[x]);
    };

    // Format date for notifications
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return `${date.toLocaleDateString('fa-IR')} - ${date.toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } catch (e) {
            return dateString;
        }
    };

    return (
        <header className="bg-white border-b shadow-sm">
            <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 py-3">
                {/* Right Side - Date */}
                <div className="flex items-center gap-2 text-gray-600 mr-2 sm:mr-10">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 sm:w-5 sm:h-5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                        />
                    </svg>
                    <span className="text-nowrap text-paragraph">{todayDate}</span>
                </div>

                {/* Left Side - Notifications, User Info & Logout */}
                <div className="flex items-center gap-3 sm:gap-6">
                    {/* Notification Bell */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={toggleDropdown}
                            className="relative p-1 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="اعلان‌های جدید"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-6 h-6 text-gray-600"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                                />
                            </svg>
                            {notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                                    {notificationCount > 99 ? '99+' : toFarsiNumber(notificationCount)}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {isDropdownOpen && (
                            <div className="absolute left-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border border-gray-200 overflow-hidden">
                                <div className="py-2 px-3 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-gray-700">اعلان‌های جدید</h3>
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                        {toFarsiNumber(notificationCount)} تیکت جدید
                                    </span>
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                    {loading ? (
                                        <div className="flex justify-center items-center py-4">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                            <span className="mr-2 text-xs text-gray-500">در حال بارگیری...</span>
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-gray-500">
                                            هیچ اعلان جدیدی وجود ندارد
                                        </div>
                                    ) : (
                                        <ul>
                                            {notifications.map((ticket) => (
                                                <li
                                                    key={ticket._id}
                                                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                                                    onClick={() => handleNotificationClick(ticket._id)}
                                                >
                                                    <div className="p-3">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                                                                {ticket.title}
                                                            </h4>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ticket.priority === 'high'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {ticket.priority === 'high' ? 'فوری' : 'عادی'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500 truncate">
                                                            {ticket.content?.substring(0, 60)}...
                                                        </div>
                                                        <div className="mt-1.5 flex justify-between items-center">
                                                            <span className="text-[9px] text-gray-400">
                                                                {formatDate(ticket.createdAt)}
                                                            </span>
                                                            <div className="flex items-center text-[9px] text-blue-600">
                                                                <span>مشاهده</span>
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-3 h-3 mr-1">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="py-2 px-3 border-t border-gray-100 bg-gray-50">
                                    <Link
                                        href="/dashboard/tickets"
                                        className="text-xs text-blue-600 hover:text-blue-800 flex justify-center items-center"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <span>مشاهده همه تیکت‌ها</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-3 h-3 mr-1">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    <span className="text-gray-600 hidden sm:inline text-paragraph">
                        {getRoleName(user?.role)}
                    </span>
                    <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
} 