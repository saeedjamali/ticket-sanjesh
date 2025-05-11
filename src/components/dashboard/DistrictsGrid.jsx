'use client';

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import { format, formatDistance } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

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
    const [openDetails, setOpenDetails] = useState({});  // برای نگهداری وضعیت باز یا بسته بودن جزئیات هر کارت

    // تابع تبدیل اعداد انگلیسی به فارسی
    const toFarsiNumber = (n) => {
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return n
            .toString()
            .replace(/\d/g, x => farsiDigits[x]);
    };

    // تابع برای فرمت‌بندی تاریخ نسبی (مثلا "10 دقیقه قبل")
    const formatRelativeTime = (date) => {
        if (!date) return 'نامشخص';

        try {
            // تبدیل رشته تاریخ به آبجکت تاریخ اگر به صورت رشته باشد
            const dateObj = typeof date === 'string' ? new Date(date) : date;

            // محاسبه فاصله زمانی به صورت نسبی
            return formatDistance(dateObj, new Date(), {
                addSuffix: true,
                locale: faIR
            });
        } catch (error) {
            console.error("Error formatting date:", error);
            return 'نامشخص';
        }
    };

    // تابع برای فرمت‌بندی تاریخ به صورت "امروز ساعت 14:30" یا "1402/02/25"
    const formatLastUpdate = (date) => {
        if (!date) return 'نامشخص';

        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            const today = new Date();

            // بررسی می‌کنیم آیا تاریخ مربوط به امروز است
            if (
                dateObj.getDate() === today.getDate() &&
                dateObj.getMonth() === today.getMonth() &&
                dateObj.getFullYear() === today.getFullYear()
            ) {
                return `امروز ${format(dateObj, 'HH:mm')}`;
            }

            // در غیر این صورت تاریخ کامل را نمایش می‌دهیم
            return format(dateObj, 'yyyy/MM/dd', { locale: faIR });

        } catch (error) {
            console.error("Error formatting date:", error);
            return 'نامشخص';
        }
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
            console.log("Districts data:", data);
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

    const toggleDetails = (districtId) => {
        setOpenDetails(prev => ({
            ...prev,
            [districtId]: !prev[districtId]
        }));
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
                    className="btn-responsive bg-blue-500 text-white hover:bg-blue-600"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 btn-icon"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    <span className="btn-text">تلاش مجدد</span>
                </button>
            </div>
        );
    }

    // فقط ردیف اول مناطق را نمایش می‌دهیم اگر showAllDistricts فعال نباشد
    const displayedDistricts = showAllDistricts ? districts : districts.slice(0, gridSize);
    const totalDistricts = districts.length;
    const hiddenDistrictsCount = totalDistricts - gridSize;

    return (
        <div className={`space-y-6 z-10 ${isFullScreen ? 'fixed inset-0 bg-white p-6 overflow-auto' : ''}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {user && user.role === "generalManager" ? (
                        <>
                            گزارش مناطق استان <span className="text-blue-600">{user?.provinceName}</span>
                        </>
                    ) : 'گزارش مناطق'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <select
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                        className="text-sm border rounded px-2 py-1"
                    >
                        <option value="2">2</option>
                        <option value="4">4</option>
                        <option value="8">8</option>
                        <option value="12">12</option>
                        <option value="16">16</option>
                    </select>
                    <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg flex-wrap">
                        <label className="text-sm text-gray-700 hidden sm:inline">بروزرسانی خودکار:</label>
                        <label className="text-sm text-gray-700 sm:hidden">خودکار:</label>
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
                                <option value="15">15ث</option>
                                <option value="30">30ث</option>
                                <option value="60">1د</option>
                                <option value="300">5د</option>
                            </select>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleFullScreen}
                            className="btn-responsive bg-gray-500 text-white hover:bg-gray-600"
                        >
                            {isFullScreen ? (
                                <>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 btn-icon"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                    <span className="btn-text">خروج از حالت تمام صفحه</span>
                                </>
                            ) : (
                                <>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 btn-icon"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                                        />
                                    </svg>
                                    <span className="btn-text">نمایش تمام صفحه</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={fetchDistricts}
                            className="btn-responsive bg-blue-500 text-white hover:bg-blue-600"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 btn-icon"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            <span className="btn-text">بروزرسانی اطلاعات</span>
                        </button>
                    </div>
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
                            {/* <p className="text-sm text-blue-600 mt-1">فقط مناطق متعلق به استان شما در این صفحه نمایش داده می‌شوند</p> */}
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
                                className={`${status.bgGradient} border ${status.color.replace('bg-', 'border-')} rounded-lg shadow-sm hover:shadow transition-all duration-300 overflow-hidden cursor-pointer h-auto`}
                            >
                                <div className="p-3">
                                    <div className="flex justify-between items-center mb-2" onClick={() => toggleDetails(district._id)}>
                                        <h3 className="text-base font-bold text-gray-800 truncate">
                                            {toFarsiNumber(district.name)}
                                        </h3>
                                        <div className={`p-1 rounded-full flex items-center justify-center ${status.color}`}>
                                            {status.icon}
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-500">کل تیکت‌ها</span>
                                            <span className="text-sm font-semibold">{toFarsiNumber(district.totalTicketsCount)}</span>
                                        </div>
                                        {/* نمایش دایره‌های رنگی با عدد */}
                                        <div className="flex items-center justify-around mt-2 mb-1">
                                            {/* تیکت‌های جدید */}
                                            <div className="flex flex-col items-center">
                                                <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-xs font-semibold text-red-700">
                                                    {toFarsiNumber(district.openTicketsCount)}
                                                </div>
                                                <span className="text-[8px] text-gray-500 mt-0.5">جدید</span>
                                            </div>

                                            {/* تیکت‌های در حال بررسی */}
                                            <div className="flex flex-col items-center">
                                                <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-xs font-semibold text-amber-700">
                                                    {toFarsiNumber(district.inProgressTicketsCount)}
                                                </div>
                                                <span className="text-[8px] text-gray-500 mt-0.5">بررسی</span>
                                            </div>

                                            {/* تیکت‌های ارجاع به استان */}
                                            <div className="flex flex-col items-center">
                                                <div className="w-6 h-6 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-xs font-semibold text-purple-700">
                                                    {toFarsiNumber(district.referredTicketsCount)}
                                                </div>
                                                <span className="text-[8px] text-gray-500 mt-0.5">ارجاع</span>
                                            </div>

                                            {/* تیکت‌های حل شده */}
                                            <div className="flex flex-col items-center">
                                                <div className="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-xs font-semibold text-green-700">
                                                    {toFarsiNumber(district.resolvedTicketsCount + district.closedTicketsCount)}
                                                </div>
                                                <span className="text-[8px] text-gray-500 mt-0.5">حل شده</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* دکمه نمایش/مخفی جزئیات */}
                                    <div className="border-t border-gray-200 mt-1 pt-1 text-center">
                                        <button
                                            onClick={() => toggleDetails(district._id)}
                                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors duration-200 focus:outline-none"
                                            aria-expanded={openDetails[district._id] ? "true" : "false"}
                                            aria-controls={`details-${district._id}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg"
                                                className={`h-3 w-3 transition-transform duration-300 ${openDetails[district._id] ? 'transform rotate-180' : ''}`}
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            <span className="sr-only">
                                                {openDetails[district._id] ? 'مخفی کردن جزئیات' : 'نمایش جزئیات'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* محتوای قابل باز/بسته شدن */}
                                    <div
                                        id={`details-${district._id}`}
                                        className={`overflow-hidden transition-all duration-300 ${openDetails[district._id] ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
                                    >
                                        <div className="pt-2 border-t border-gray-200 text-xs">
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                                {/* آمار ایستگاه‌ها و کارشناسان - ردیف اول */}
                                                <div className="flex items-center space-x-1 space-x-reverse">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                                    </svg>
                                                    <span className="truncate">مراکز: <b>{toFarsiNumber(district.examCentersCount || 0)}</b></span>
                                                </div>
                                                <div className="flex items-center space-x-1 space-x-reverse">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-purple-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                                    </svg>
                                                    <span className="truncate">کارشناسان: <b>{toFarsiNumber(district.expertsCount || 0)}</b></span>
                                                </div>

                                                {/* آمار فوریت‌ها - ردیف دوم */}
                                                <div className="flex items-center space-x-1 space-x-reverse">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="truncate">فوریت بالا: <b>{toFarsiNumber(district.highPriorityTicketsCount || '۰')}</b></span>
                                                </div>
                                                <div className="flex items-center space-x-1 space-x-reverse">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="truncate">معمولی: <b>{toFarsiNumber(district.normalPriorityTicketsCount || district.totalTicketsCount - (district.highPriorityTicketsCount || 0))}</b></span>
                                                </div>

                                                {/* ردیف اطلاعات اضافی */}
                                                <div className="col-span-2 mt-1 border-t border-gray-100 pt-1">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                        <div className="flex justify-between text-[8px]">
                                                            <span className="text-gray-500">کد:</span>
                                                            <span className="font-medium truncate max-w-[60px] sm:max-w-[80px]">{district.code}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[8px]">
                                                            <span className="text-gray-500">استان:</span>
                                                            <span className="font-medium truncate max-w-[60px] sm:max-w-[80px]">{district.province_name}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[8px]">
                                                            <span className="text-gray-500">آخرین فعالیت:</span>
                                                            <span className="font-medium truncate max-w-[60px] sm:max-w-[80px]">{formatRelativeTime(district.lastActivityTime)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[8px]">
                                                            <span className="text-gray-500">به‌روزرسانی:</span>
                                                            <span className="font-medium truncate max-w-[60px] sm:max-w-[80px]">{formatLastUpdate(district.lastActivityTime)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
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
                        className="btn-responsive bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 btn-icon"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="btn-text">نمایش همه {toFarsiNumber(totalDistricts)} منطقه ({toFarsiNumber(hiddenDistrictsCount)} منطقه بیشتر)</span>
                    </button>
                </div>
            )}

            {/* دکمه برگشت به حالت اولیه */}
            {showAllDistricts && (
                <div className="flex justify-center mt-4">
                    <button
                        onClick={() => setShowAllDistricts(false)}
                        className="btn-responsive bg-gray-600 text-white hover:bg-gray-700 shadow-md"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 btn-icon"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="btn-text">نمایش فقط ردیف اول</span>
                    </button>
                </div>
            )}
        </div>
    );
} 