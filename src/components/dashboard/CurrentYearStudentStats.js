"use client";

import { useState, useEffect } from "react";
import {
  FaSync,
  FaEye,
  FaEyeSlash,
  FaUsers,
  FaMale,
  FaFemale,
  FaSchool,
  FaChartBar,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function CurrentYearStudentStats({ filters = {} }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    districts: [],
    gradeBreakdown: [],
    lastUpdated: null,
  });

  useEffect(() => {
    fetchCurrentYearStats();
  }, [filters]);

  const fetchCurrentYearStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams({
        yearFilter: "current", // برای دریافت آمار سال جاری
        ...(filters.course && { course: filters.course }),
        ...(filters.branch && { branch: filters.branch }),
        ...(filters.province && { province: filters.province }),
      });

      const response = await fetch(
        `/api/students/current-year-stats?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "خطا در دریافت آمار سال جاری");
      }
    } catch (error) {
      console.error("Error fetching current year stats:", error);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCurrentYearStats();
    setRefreshing(false);
    toast.success("آمار سال جاری بروزرسانی شد");
  };

  if (!isVisible) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            آمار دانش‌آموزان ثبت نام شده سال جاری
          </h3>
          <button
            onClick={() => setIsVisible(true)}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <FaEye />
            نمایش آمار
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 ring-2 ring-gray-200">
      <div className="flex items-center justify-between my-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FaChartBar className="ml-2 text-green-600" />
          آمار دانش‌آموزان ثبت نام شده سال جاری
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm ${
              refreshing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            } text-white`}
          >
            <FaSync className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "در حال بروزرسانی..." : "بروزرسانی"}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            <FaEyeSlash />
            مخفی کردن
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* آمار کلی */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">
                    ثبت نام در سامانه
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {stats.totalStudents?.toLocaleString("fa-IR") || 0}
                  </p>
                </div>
                <FaUsers className="text-green-500 text-2xl" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    دانش‌آموزان پسر
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    {stats.maleStudents?.toLocaleString("fa-IR") || 0}
                  </p>
                </div>
                <FaMale className="text-blue-500 text-2xl" />
              </div>
            </div>

            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-600 text-sm font-medium">
                    دانش‌آموزان دختر
                  </p>
                  <p className="text-2xl font-bold text-pink-800">
                    {stats.femaleStudents?.toLocaleString("fa-IR") || 0}
                  </p>
                </div>
                <FaFemale className="text-pink-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* آمار به تفکیک پایه */}
          {stats.gradeBreakdown && stats.gradeBreakdown.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3">
                آمار به تفکیک پایه تحصیلی
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.gradeBreakdown.map((grade) => (
                  <div
                    key={grade._id}
                    className="bg-gray-50 p-3 rounded-lg border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium text-gray-800 text-sm">
                          {grade.gradeName || `پایه ${grade._id}`}
                        </h5>
                        <p className="text-xs text-gray-500">
                          کد پایه: {grade._id}
                        </p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                        {grade.count} نفر
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mb-2">
                      <span>پسر: {grade.maleCount || 0}</span>
                      <span>دختر: {grade.femaleCount || 0}</span>
                    </div>
                    {stats.totalStudents > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-500">درصد از کل:</span>
                          <span className="font-medium text-gray-700">
                            {Math.round(
                              (grade.count / stats.totalStudents) * 100
                            )}
                            %
                          </span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (grade.count / stats.totalStudents) * 100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* آمار به تفکیک منطقه (برای کارشناس استان و منطقه) */}
          {stats.districts && stats.districts.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3">
                آمار به تفکیک منطقه
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {stats.districts.map((district) => (
                  <div
                    key={district._id}
                    className="bg-gray-50 p-4 rounded-lg border"
                  >
                    {/* هدر کاشی منطقه */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-medium text-gray-800 text-lg">
                          {district.districtName || `منطقه ${district._id}`}
                        </h5>
                        <p className="text-xs text-gray-500">
                          کد منطقه: {district._id}
                        </p>
                      </div>
                      <div className="text-left">
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded">
                          {district.count} نفر
                        </span>
                      </div>
                    </div>

                    {/* آمار کلی منطقه */}
                    <div className="flex justify-between text-sm text-gray-600 mb-3 pb-3 border-b">
                      <span>پسر: {district.maleCount || 0}</span>
                      <span>دختر: {district.femaleCount || 0}</span>
                    </div>

                    {/* آمار به تفکیک دوره */}
                    {district.courseStats && district.courseStats.length > 0 ? (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                          آمار به تفکیک دوره:
                        </h6>
                        <div className="space-y-2">
                          {district.courseStats.map((course, index) => (
                            <div
                              key={`${district._id}-${course.course}-${index}`}
                              className="bg-white p-3 rounded border"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-green-700">
                                  {course.course || "نامشخص"}
                                </span>
                                <div className="text-left">
                                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                                    {course.total} نفر
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-2">
                                <div>
                                  <span>پسر: {course.maleCount}</span>
                                  <br />
                                  <span>دختر: {course.femaleCount}</span>
                                </div>
                                <div className="text-left">
                                  <span className="text-green-600">
                                    {Math.round(
                                      (course.total / district.count) * 100
                                    )}
                                    % از منطقه
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-700">
                          اطلاعات تفکیک دوره موجود نیست
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* زمان آخرین بروزرسانی */}
          {stats.lastUpdated && (
            <div className="text-xs text-gray-500 text-center border-t pt-3">
              آخرین بروزرسانی:{" "}
              {new Date(stats.lastUpdated).toLocaleString("fa-IR")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
