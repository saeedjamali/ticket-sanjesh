"use client";

import { useState, useEffect } from "react";
import { 
  FaEye, 
  FaChevronDown, 
  FaChevronUp,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendar,
  FaCalendarAlt
} from "react-icons/fa";

export default function WebsiteVisitStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    if (loading) return; // جلوگیری از درخواست‌های مکرر
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/stats/website-visits", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || "خطا در دریافت آمار");
      }
    } catch (error) {
      console.error("Error fetching visit stats:", error);
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  // بارگذاری داده‌ها فقط زمانی که کامپوننت باز می‌شود
  useEffect(() => {
    if (expanded && !stats && !loading) {
      fetchStats();
    }
  }, [expanded]);

  const formatNumber = (num) => {
    if (!num) return "0";
    return num.toLocaleString("fa-IR");
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* هدر کوچک - همیشه نمایش */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-md">
            <FaEye className="h-3 w-3 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">آمار بازدید</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* نمایش سریع آمار روزانه */}
          <span className="text-xs text-gray-500">
            {stats ? formatNumber(stats.daily) : "---"}
          </span>
          
          {expanded ? (
            <FaChevronUp className="h-3 w-3 text-gray-400" />
          ) : (
            <FaChevronDown className="h-3 w-3 text-gray-400" />
          )}
        </div>
      </div>

      {/* جزئیات کامل - فقط در صورت باز بودن */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="mr-2 text-xs text-gray-600">در حال بارگذاری...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-xs text-red-600 mb-2">{error}</p>
              <button 
                onClick={fetchStats}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                تلاش مجدد
              </button>
            </div>
          ) : stats ? (
            <div className="space-y-2">
              {/* گرید کوچک آمار */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-md p-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FaCalendarDay className="h-2.5 w-2.5 text-green-500" />
                    <span className="text-xs text-gray-600">روزانه</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {formatNumber(stats.daily)}
                  </span>
                </div>
                
                <div className="bg-white rounded-md p-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FaCalendarWeek className="h-2.5 w-2.5 text-blue-500" />
                    <span className="text-xs text-gray-600">هفتگی</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {formatNumber(stats.weekly)}
                  </span>
                </div>
                
                <div className="bg-white rounded-md p-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FaCalendar className="h-2.5 w-2.5 text-purple-500" />
                    <span className="text-xs text-gray-600">ماهانه</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {formatNumber(stats.monthly)}
                  </span>
                </div>
                
                <div className="bg-white rounded-md p-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FaCalendarAlt className="h-2.5 w-2.5 text-orange-500" />
                    <span className="text-xs text-gray-600">سالانه</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {formatNumber(stats.yearly)}
                  </span>
                </div>
              </div>
              
              {/* آخرین بروزرسانی */}
              <div className="text-center pt-1 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  آخرین بروزرسانی: {new Date(stats.lastUpdated).toLocaleTimeString("fa-IR")}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="text-xs text-gray-500">داده‌ای موجود نیست</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
