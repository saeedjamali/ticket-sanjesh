'use client';

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";

export default function DistrictsGrid() {
    const { user } = useUserContext();
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30); // Default 30 seconds
    const [gridSize, setGridSize] = useState(6);
    useEffect(() => {
        fetchDistricts();
    }, []);

    useEffect(() => {
        let intervalId;
        if (autoRefresh) {
            intervalId = setInterval(fetchDistricts, refreshInterval * 1000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [autoRefresh, refreshInterval]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    const fetchDistricts = async () => {
        try {
            setLoading(true);
            const accessToken = localStorage.getItem("accessToken");
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            };

            const response = await fetch("/api/stats/districts", { headers });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || "خطا در دریافت اطلاعات مناطق");
            }

            setDistricts(data.districts);
        } catch (error) {
            console.error("Error fetching districts:", error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const getDistrictStatus = (district) => {
        if (district.totalTicketsCount === 0) {
            return {
                color: "bg-blue-100 text-blue-800",
                text: "بدون تیکت",
            };
        }

        if (district.newTicketsCount > 0) {
            return {
                color: "bg-red-100 text-red-800",
                text: "جدید",
            };
        }

        if ((district.inProgressTicketsCount > 0 || district.openTicketsCount > 0) && district.newTicketsCount === 0) {
            return {
                color: "bg-orange-100 text-orange-800",
                text: "در حال بررسی",
            };
        }

        return {
            color: "bg-green-100 text-green-800",
            text: "کامل",
        };
    };



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
                    onClick={fetchDistricts}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                    تلاش مجدد
                </button>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${isFullScreen ? 'fixed inset-0 bg-white p-6 overflow-auto' : ''}`}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">گزارش مناطق</h2>
                <div className="flex items-center gap-2">
                    <select
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                        className="text-sm border rounded px-2 py-1"
                    >
                        <option value="4">4</option>
                        <option value="8">8</option>
                        <option value="12">12</option>
                        <option value="16">16</option>
                    </select>
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
                        onClick={toggleFullScreen}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        {isFullScreen ? 'خروج از حالت تمام صفحه' : 'نمایش تمام صفحه'}
                    </button>
                    <button
                        onClick={fetchDistricts}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        بروزرسانی اطلاعات
                    </button>
                </div>
            </div>

            {/* راهنمای رنگ */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-100"></div>
                    <span className="text-sm text-gray-700">مناطق دارای تیکت جدید</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-100"></div>
                    <span className="text-sm text-gray-700">مناطق دارای تیکت در حال بررسی</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-100"></div>
                    <span className="text-sm text-gray-700">مناطق تیکت‌های حل شده</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100"></div>
                    <span className="text-sm text-gray-700">مناطق بدون تیکت</span>
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 `}
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    gap: "1rem"
                }}>
                {districts.map((district) => {
                    const status = getDistrictStatus(district);
                    return (
                        <div
                            key={district._id}
                            className={`${getDistrictStatus(district).color} rounded-lg shadow p-6 hover:shadow-lg transition-shadow`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {district.name}
                                </h3>
                                {/* <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                    {status.text}
                                </span> */}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">کل تیکت‌ها:</span>
                                    <span className="font-medium">{district.totalTicketsCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">تیکت‌های جدید:</span>
                                    <span className="font-medium text-red-600">
                                        {district.openTicketsCount}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">در حال بررسی:</span>
                                    <span className="font-medium text-yellow-600">
                                        {district.inProgressTicketsCount}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">حل شده:</span>
                                    <span className="font-medium text-green-600">
                                        {district.resolvedTicketsCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 