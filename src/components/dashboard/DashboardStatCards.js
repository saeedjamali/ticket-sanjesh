"use client";

import { useState, useEffect } from "react";
import { ROLES } from "@/lib/permissions";

export default function DashboardStatCards({ userRole, userId }) {
  const [stats, setStats] = useState({
    totalTickets: 0,
    pendingTickets: 0,
    resolvedTickets: 0,
    highPriorityTickets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let endpoint = "/api/stats";

        // Add role-specific query params
        if (userRole === ROLES.EXAM_CENTER_MANAGER) {
          endpoint += `?userId=${userId}`;
        } else if (
          userRole === ROLES.DISTRICT_EDUCATION_EXPERT ||
          userRole === ROLES.DISTRICT_TECH_EXPERT
        ) {
          endpoint += `?districtUser=${userId}`;
        } else if (
          userRole === ROLES.PROVINCE_EDUCATION_EXPERT ||
          userRole === ROLES.PROVINCE_TECH_EXPERT
        ) {
          endpoint += `?provinceUser=${userId}`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Failed to fetch stats");

        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userRole, userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600 dark:text-blue-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </div>
          <div className="mr-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              کل تیکت‌ها
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.totalTickets}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-yellow-600 dark:text-yellow-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="mr-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              تیکت‌های در انتظار
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.pendingTickets}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-600 dark:text-green-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="mr-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              تیکت‌های حل شده
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.resolvedTickets}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600 dark:text-red-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="mr-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              تیکت‌های فوری
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.highPriorityTickets}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
