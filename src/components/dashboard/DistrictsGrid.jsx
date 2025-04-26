'use client';

import { useState } from 'react';

export default function DistrictsGrid() {
    // Placeholder data - should be replaced with actual API data
    const [districts] = useState([
        {
            id: 1,
            name: 'منطقه ۱',
            totalTickets: 45,
            openTickets: 12,
            status: 'active',
            lastUpdate: '۱۴۰۲/۱۲/۱۵',
        },
        {
            id: 2,
            name: 'منطقه ۲',
            totalTickets: 38,
            openTickets: 8,
            status: 'active',
            lastUpdate: '۱۴۰۲/۱۲/۱۵',
        },
        {
            id: 3,
            name: 'منطقه ۳',
            totalTickets: 52,
            openTickets: 15,
            status: 'active',
            lastUpdate: '۱۴۰۲/۱۲/۱۵',
        },
        {
            id: 4,
            name: 'منطقه ۴',
            totalTickets: 29,
            openTickets: 6,
            status: 'maintenance',
            lastUpdate: '۱۴۰۲/۱۲/۱۵',
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
                return 'در حال تعمیر';
            default:
                return 'نامشخص';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">گزارش مناطق</h2>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                    بروزرسانی اطلاعات
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {districts.map((district) => (
                    <div
                        key={district.id}
                        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-gray-900">{district.name}</h3>
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    district.status
                                )}`}
                            >
                                {getStatusText(district.status)}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">تعداد کل تیکت‌ها:</span>
                                <span className="font-semibold">{district.totalTickets}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">تیکت‌های باز:</span>
                                <span className="font-semibold">{district.openTickets}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>آخرین بروزرسانی:</span>
                                <span>{district.lastUpdate}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            <button className="w-full text-blue-500 hover:text-blue-600 text-sm font-medium">
                                مشاهده جزئیات
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 