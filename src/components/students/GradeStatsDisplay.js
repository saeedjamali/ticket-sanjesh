"use client";

import { useMemo } from "react";

export default function GradeStatsDisplay({
  students,
  title = "آمار به تفکیک پایه",
}) {
  const gradeStats = useMemo(() => {
    if (!students || students.length === 0) return [];

    // گروه‌بندی دانش‌آموزان بر اساس پایه
    const gradeGroups = students.reduce((acc, student) => {
      const gradeKey = student.gradeName || "نامشخص";
      if (!acc[gradeKey]) {
        acc[gradeKey] = {
          gradeName: gradeKey,
          gradeCode: student.gradeCode || "unknown",
          count: 0,
          maleCount: 0,
          femaleCount: 0,
        };
      }

      acc[gradeKey].count++;
      if (student.gender === "male") {
        acc[gradeKey].maleCount++;
      } else if (student.gender === "female") {
        acc[gradeKey].femaleCount++;
      }

      return acc;
    }, {});

    // تبدیل به آرایه و مرتب‌سازی
    return Object.values(gradeGroups).sort((a, b) => {
      // مرتب‌سازی بر اساس کد پایه
      if (a.gradeCode === "unknown") return 1;
      if (b.gradeCode === "unknown") return -1;
      return a.gradeCode.localeCompare(b.gradeCode);
    });
  }, [students]);

  const totalStudents = students?.length || 0;

  if (!students || students.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
        <h4 className="text-md font-semibold text-gray-700 mb-2">{title}</h4>
        <p className="text-gray-500 text-sm">
          هیچ دانش‌آموزی برای نمایش آمار وجود ندارد
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
      <h4 className="text-md font-semibold text-gray-700 mb-3">{title}</h4>

      {gradeStats.length === 0 ? (
        <p className="text-gray-500 text-sm">داده‌ای برای نمایش وجود ندارد</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {gradeStats.map((grade) => (
            <div
              key={grade.gradeCode}
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-medium text-gray-800 text-sm">
                    {grade.gradeName}
                  </h5>
                  {grade.gradeCode !== "unknown" && (
                    <p className="text-xs text-gray-500">
                      کد: {grade.gradeCode}
                    </p>
                  )}
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                  {grade.count} نفر
                </span>
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>پسر: {grade.maleCount}</span>
                <span>دختر: {grade.femaleCount}</span>
              </div>

              {totalStudents > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-500">درصد از کل:</span>
                    <span className="font-medium text-gray-700">
                      {Math.round((grade.count / totalStudents) * 100)}%
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(grade.count / totalStudents) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {gradeStats.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>تعداد پایه‌های مختلف:</span>
            <span className="font-medium">{gradeStats.length} پایه</span>
          </div>
        </div>
      )}
    </div>
  );
}
