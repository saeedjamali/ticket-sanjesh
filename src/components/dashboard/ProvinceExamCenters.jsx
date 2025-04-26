'use client';

import { useState } from 'react';

export default function ProvinceExamCenters() {
    // Placeholder data - should be replaced with actual API data
    const [provinces] = useState([
        {
            id: 1,
            name: 'تهران',
            totalCenters: 12,
            activeCenters: 10,
            nextExamDate: '۱۴۰۲/۱۲/۲۵',
            registeredStudents: 450,
            status: 'active',
        },
        {
            id: 2,
            name: 'اصفهان',
            totalCenters: 8,
            activeCenters: 7,
            nextExamDate: '۱۴۰۲/۱۲/۲۶',
            registeredStudents: 280,
            status: 'active',
        },
        {
            id: 3,
            name: 'مشهد',
            totalCenters: 6,
            activeCenters: 6,
            nextExamDate: '۱۴۰۲/۱۲/۲۵',
            registeredStudents: 320,
            status: 'active',
        },
        {
            id: 4,
            name: 'شیراز',
            totalCenters: 5,
            activeCenters: 4,
            nextExamDate: '۱۴۰۲/۱۲/۲۷',
            registeredStudents: 180,
            status: 'maintenance',
        },
    ]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'maintenance':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'active':
                return 'فعال';
            case 'maintenance':
                return 'در حال بروزرسانی';
            default:
                return 'نامشخص';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">مراکز آزمون استان‌ها</h2>
                <div className="flex gap-2">
                    <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
                        افزودن مرکز جدید
                    </button>
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                        بروزرسانی اطلاعات
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {provinces.map((province) => (
                    <div
                        key={province.id}
                        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-gray-900">{province.name}</h3>
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    province.status
                                )}`}
                            >
                                {getStatusText(province.status)}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">تعداد کل مراکز:</span>
                                <span className="font-semibold">{province.totalCenters}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">مراکز فعال:</span>
                                <span className="font-semibold">{province.activeCenters}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">داوطلبان ثبت‌نامی:</span>
                                <span className="font-semibold">{province.registeredStudents}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>تاریخ آزمون بعدی:</span>
                                <span className="text-blue-600 font-medium">{province.nextExamDate}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t flex gap-2">
                            <button className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded text-sm font-medium">
                                لیست مراکز
                            </button>
                            <button className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 py-2 rounded text-sm font-medium">
                                مدیریت آزمون
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 