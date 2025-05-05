'use client';

import { useState, useEffect } from 'react';
import { useUserContext } from '@/context/UserContext';
import { toast } from 'react-hot-toast';

export default function TicketStats() {
    const { user } = useUserContext();
    const [stats, setStats] = useState({
        totalTickets: 0,
        newTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        highPriorityTickets: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30); // Default 30 seconds
    const [showTooltip, setShowTooltip] = useState(false);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const accessToken = localStorage.getItem("accessToken");
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            };

            const response = await fetch("/api/stats/tickets", { headers });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || "خطا در دریافت آمار تیکت‌ها");
            }

            setStats(data.stats);
        } catch (error) {
            console.error("Error fetching ticket stats:", error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        let intervalId;
        if (autoRefresh) {
            intervalId = setInterval(fetchStats, refreshInterval * 1000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [autoRefresh, refreshInterval]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-500 p-4">
                <p>{error}</p>
                <button
                    onClick={fetchStats}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                    تلاش مجدد
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">آمار تیکت‌ها</h2>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                        <label className="text-sm text-gray-700">بروزرسانی خودکار:</label>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="h-4 w-4 text-blue-600"
                        />
                        {autoRefresh && (
                            <select
                                value={refreshInterval}
                                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                className="text-sm border rounded px-2 py-1"
                            >
                                <option value="15">15 ثانیه</option>
                                <option value="30">30 ثانیه</option>
                                <option value="60">1 دقیقه</option>
                                <option value="300">5 دقیقه</option>
                            </select>
                        )}
                    </div>
                    <button
                        onClick={fetchStats}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        بروزرسانی اطلاعات
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">کل تیکت‌ها</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalTickets}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">تیکت‌های جدید</h3>
                    <p className="text-3xl font-bold text-red-600">{stats.newTickets}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">در حال بررسی</h3>
                    <p className="text-3xl font-bold text-yellow-600">{stats.inProgressTickets}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 relative">
                    <div className="flex items-center gap-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">حل شده</h3>
                        <button
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            onClick={() => setShowTooltip(!showTooltip)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-3xl font-bold text-green-600">{Number(stats.resolvedTickets) + Number(stats.closedTickets)}</p>
                    {showTooltip && (
                        <div className="absolute left-0 top-full mt-2 bg-gray-800 text-white text-sm p-3 rounded-lg shadow-lg z-10 w-64">
                            <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mt-0.5 ml-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <p className="text-right">
                                    <span className="font-bold block mb-1">راهنما:</span>
                                    تیکت‌های حل شده شامل تیکت‌های پاسخ داده شده و تیکت‌های بسته می‌باشد.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">اولویت بالا</h3>
                    <p className="text-3xl font-bold text-purple-600">{stats.highPriorityTickets}</p>
                </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm mt-4">
                <div className="flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h4 className="text-lg font-medium text-blue-800 mb-1">راهنمای آمار تیکت‌ها</h4>
                        <ul className="list-disc mr-5 text-sm text-blue-700 space-y-1">
                            <li>تیکت‌های <strong>جدید</strong>: تیکت‌هایی که هنوز بررسی نشده‌اند</li>
                            <li>تیکت‌های <strong>در حال بررسی</strong>: تیکت‌هایی که توسط کارشناسان در حال رسیدگی هستند</li>
                            <li>تیکت‌های <strong>حل شده</strong>: مجموع تیکت‌های پاسخ داده شده و تیکت‌های بسته</li>
                            <li>تیکت‌های <strong>اولویت بالا</strong>: تیکت‌هایی که نیاز به رسیدگی فوری دارند</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
} 