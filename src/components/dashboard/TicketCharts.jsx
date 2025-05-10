'use client';

import { useState } from 'react';

export default function TicketCharts() {
  // Placeholder data - in a real app, this would come from your API
  const [stats] = useState({
    totalTickets: 150,
    openTickets: 45,
    closedTickets: 95,
    inProgressTickets: 10,
  });

  const StatCard = ({ title, value, color }) => (
    <div className={`bg-white rounded-lg shadow p-6 ${color}`}>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 ">آمار تیکت‌ها</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="کل تیکت‌ها"
          value={stats.totalTickets}
          color="border-l-4 border-blue-500"
        />
        <StatCard
          title="تیکت‌های باز"
          value={stats.openTickets}
          color="border-l-4 border-yellow-500"
        />
        <StatCard
          title="تیکت‌های بسته"
          value={stats.closedTickets}
          color="border-l-4 border-green-500"
        />
        <StatCard
          title="در حال بررسی"
          value={stats.inProgressTickets}
          color="border-l-4 border-purple-500"
        />
      </div>

      {/* Placeholder for future charts */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">نمودار تیکت‌های هفته اخیر</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          نمودار به زودی اضافه خواهد شد
        </div>
      </div>
    </div>
  );
} 