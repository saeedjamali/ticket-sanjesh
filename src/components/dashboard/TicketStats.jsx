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
        highPriorityTickets: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30); // Default 30 seconds

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
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">حل شده</h3>
                    <p className="text-3xl font-bold text-green-600">{stats.resolvedTickets}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">اولویت بالا</h3>
                    <p className="text-3xl font-bold text-purple-600">{stats.highPriorityTickets}</p>
                </div>
            </div>
        </div>
    );
} 