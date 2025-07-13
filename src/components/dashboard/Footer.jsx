"use client";

import { useState, useEffect } from "react";

export default function Footer() {
    const currentYear = new Date().toLocaleDateString("fa-IR", { year: "numeric" });
    const [activeAcademicYear, setActiveAcademicYear] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveAcademicYear();
    }, []);

    const fetchActiveAcademicYear = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/academic-years/active", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("خطا در دریافت اطلاعات سال تحصیلی");
            }

            const data = await response.json();
            console.log("Footer - API response data:", data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.name) {
                setActiveAcademicYear(data.name);
                console.log("Footer - Academic year set:", data.name);
            } else {
                throw new Error("سال تحصیلی یافت نشد");
            }
        } catch (error) {
            console.error("Footer - Error fetching active academic year:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <footer className="bg-white shadow-lg mt-auto sticky bottom-0 w-full z-10">
            <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between lg:px-8">
                <div className="text-center sm:text-right mt-3 sm:mt-0">
                    <p className="text-caption text-gray-500">
                        {currentYear} &copy; اداره کل آموزش و پرورش خراسان رضوی، تمامی حقوق محفوظ است.
                    </p>

                    {!loading && activeAcademicYear && (
                        <div className="flex items-center justify-center sm:justify-start mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                📅 سال تحصیلی: {activeAcademicYear}
                            </span>
                        </div>
                    )}

                    {!loading && !activeAcademicYear && (
                        <div className="flex items-center justify-center sm:justify-start mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                ⚠️ سال تحصیلی یافت نشد
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex justify-center sm:order-2">
                    <a
                        href="https://sabzlearn.ir"
                        className="text-caption text-gray-400 hover:text-gray-500"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        اداره فناوری اطلاعات
                    </a>
                </div>
            </div>
        </footer>
    );
} 