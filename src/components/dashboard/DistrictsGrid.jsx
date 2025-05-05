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
    const [gridSize, setGridSize] = useState(4);
    const [showAllDistricts, setShowAllDistricts] = useState(false);

    // تابع تبدیل اعداد انگلیسی به فارسی
    const toFarsiNumber = (n) => {
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return n
            .toString()
            .replace(/\d/g, x => farsiDigits[x]);
    };

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

            // مسیر API را بر اساس نقش کاربر و استان او تنظیم می‌کنیم
            let apiUrl = "/api/stats/districts";

            // اگر کاربر مدیرکل استان است، فقط مناطق استان او را درخواست می‌کنیم
            if (user && user.role === "generalManager" && user.province) {
                apiUrl = `/api/stats/districts?province=${user.province}`;
                console.log(`Filtering districts for province admin. Province ID: ${user.province}, Province Name: ${user.provinceName || 'Unknown'}`);
            }

            console.log("Fetching districts from:", apiUrl);
            console.log("User information:", user);

            const response = await fetch(apiUrl, {
                headers,
                credentials: "include"
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || "خطا در دریافت اطلاعات مناطق");
            }

            let filteredDistricts = data.districts;

            // فیلتر اضافی سمت کلاینت برای مدیران استان - برای اطمینان بیشتر
            if (user && user.role === "generalManager" && user.province) {
                filteredDistricts = filteredDistricts.filter(district =>
                    district.province === user.province
                );
                console.log(`Filtered districts to ${filteredDistricts.length} for province ${user.provinceName || user.province}`);
            }

            setDistricts(filteredDistricts);
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
                color: "bg-blue-100 border-blue-300 text-blue-800",
                bgGradient: "bg-gradient-to-br from-blue-50 to-blue-100",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                ),
                text: "بدون تیکت",
            };
        }

        if (district.newTicketsCount > 0) {
            return {
                color: "bg-red-100 border-red-300 text-red-800",
                bgGradient: "bg-gradient-to-br from-red-50 to-red-100",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ),
                text: "جدید",
            };
        }

        if ((district.inProgressTicketsCount > 0 || district.openTicketsCount > 0) && district.newTicketsCount === 0) {
            return {
                color: "bg-amber-100 border-amber-300 text-amber-800",
                bgGradient: "bg-gradient-to-br from-amber-50 to-amber-100",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                ),
                text: "در حال بررسی",
            };
        }

        return {
            color: "bg-green-100 border-green-300 text-green-800",
            bgGradient: "bg-gradient-to-br from-green-50 to-green-100",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            ),
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

    // فقط ردیف اول مناطق را نمایش می‌دهیم اگر showAllDistricts فعال نباشد
    const displayedDistricts = showAllDistricts ? districts : districts.slice(0, gridSize);
    const totalDistricts = districts.length;
    const hiddenDistrictsCount = totalDistricts - gridSize;

    return (
        <div className={`space-y-6 ${isFullScreen ? 'fixed inset-0 bg-white p-6 overflow-auto' : ''}`}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                    {user && user.role === "generalManager" ? (
                        <>
                            گزارش مناطق استان <span className="text-blue-600">{user?.provinceName}</span>
                        </>
                    ) : 'گزارش مناطق'}
                </h2>
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

            {user && user.role === "generalManager" && (
                <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-md my-4">
                    <div className="flex">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="font-medium text-blue-800">شما به عنوان مدیر کل استان {user.provinceName || ''} در سیستم وارد شده‌اید</p>
                            <p className="text-sm text-blue-600 mt-1">فقط مناطق متعلق به استان شما در این صفحه نمایش داده می‌شوند</p>
                        </div>
                    </div>
                </div>
            )}

            {/* راهنمای رنگ */}
            <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    </div>
                    <span className="text-sm text-gray-700">مناطق دارای تیکت جدید</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    </div>
                    <span className="text-sm text-gray-700">مناطق دارای تیکت در حال بررسی</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm text-gray-700">مناطق تیکت‌های حل شده</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    </div>
                    <span className="text-sm text-gray-700">مناطق بدون تیکت</span>
                </div>
            </div>

            {districts.length === 0 ? (
                <div className="p-8 text-center bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-blue-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-blue-800 mb-2">اطلاعاتی برای نمایش وجود ندارد</h3>
                    <p className="text-blue-600">هیچ منطقه‌ای برای استان شما یافت نشد یا دسترسی مناسب ندارید.</p>
                </div>
            ) : (
                <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 `}
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                        gap: "1rem"
                    }}>
                    {displayedDistricts.map((district) => {
                        const status = getDistrictStatus(district);
                        return (
                            <div
                                key={district._id}
                                className={`${status.bgGradient} border ${status.color.replace('bg-', 'border-')} rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden `}
                            >
                                <div className="p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-lg font-bold text-gray-800 truncate">
                                            {toFarsiNumber(district.name)}
                                        </h3>
                                        <div className={`p-1.5 rounded-full flex items-center justify-center ${status.color}`}>
                                            {status.icon}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-500">کل تیکت‌ها</span>
                                            <span className="text-sm font-semibold">{toFarsiNumber(district.totalTicketsCount)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`${status.color} h-1.5 rounded-full`}
                                                style={{ width: '100%' }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                                                <span className="text-xs text-gray-600">جدید:</span>
                                            </div>
                                            <span className="text-xs font-semibold text-red-600">{toFarsiNumber(district.openTicketsCount)}</span>
                                        </div>

                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                                                <span className="text-xs text-gray-600">در حال بررسی:</span>
                                            </div>
                                            <span className="text-xs font-semibold text-amber-600">{toFarsiNumber(district.inProgressTicketsCount)}</span>
                                        </div>

                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                                                <span className="text-xs text-gray-600">ارجاع به استان:</span>
                                            </div>
                                            <span className="text-xs font-semibold text-purple-600">{toFarsiNumber(district.referredTicketsCount)}</span>
                                        </div>

                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                                <span className="text-xs text-gray-600">حل شده:</span>
                                            </div>
                                            <span className="text-xs font-semibold text-green-600">{toFarsiNumber(district.resolvedTicketsCount)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`w-full h-1 ${status.color}`}></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* دکمه نمایش همه مناطق */}
            {!showAllDistricts && hiddenDistrictsCount > 0 && (
                <div className="flex justify-center mt-4">
                    <button
                        onClick={() => setShowAllDistricts(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>نمایش همه {toFarsiNumber(totalDistricts)} منطقه ({toFarsiNumber(hiddenDistrictsCount)} منطقه بیشتر)</span>
                    </button>
                </div>
            )}

            {/* دکمه برگشت به حالت اولیه */}
            {showAllDistricts && (
                <div className="flex justify-center mt-4">
                    <button
                        onClick={() => setShowAllDistricts(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <span>نمایش فقط ردیف اول</span>
                    </button>
                </div>
            )}
        </div>
    );
} 