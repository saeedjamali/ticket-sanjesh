"use client";

import { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaExclamationTriangle,
  FaEye,
} from "react-icons/fa";

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      console.log("Fetching events for dashboard...");

      const response = await fetch("/api/events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Events API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Events API response data:", data);

        const eventsData = data.events || [];
        console.log(`Setting ${eventsData.length} events`);
        setEvents(eventsData);
      } else {
        const errorText = await response.text();
        console.error("Error response from events API:", errorText);
        setError(`خطا در دریافت رویدادها: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statusInfo) => {
    const colorClasses = {
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      red: "bg-red-100 text-red-800 border-red-200",
    };

    const icons = {
      blue: <FaClock className="w-3 h-3" />,
      green: <FaCalendarAlt className="w-3 h-3" />,
      orange: <FaExclamationTriangle className="w-3 h-3" />,
      red: <FaEye className="w-3 h-3" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${
          colorClasses[statusInfo.color]
        }`}
      >
        {icons[statusInfo.color]}
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} - ${timeStr}`;
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "critical":
        return <FaExclamationTriangle className="w-4 h-4 text-red-500" />;
      case "high":
        return <FaExclamationTriangle className="w-4 h-4 text-orange-500" />;
      case "medium":
        return <FaClock className="w-4 h-4 text-blue-500" />;
      default:
        return <FaClock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-gray-100 h-20 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FaExclamationTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchEvents}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <FaCalendarAlt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">در حال حاضر رویدادی وجود ندارد</p>
        <button
          onClick={fetchEvents}
          className="mt-2 px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
        >
          بروزرسانی
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const statusInfo = event.statusInfo || event.status;

        return (
          <div
            key={event._id}
            className={`bg-white border-r-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${
              statusInfo?.color === "green"
                ? "border-green-500"
                : statusInfo?.color === "orange"
                ? "border-orange-500"
                : statusInfo?.color === "red"
                ? "border-red-500"
                : "border-blue-500"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getPriorityIcon(event.priority)}
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  {getStatusBadge(statusInfo)}
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <FaCalendarAlt className="w-3 h-3" />
                    <span>شروع: {formatDateTime(event.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaCalendarAlt className="w-3 h-3" />
                    <span>پایان: {formatDateTime(event.endDate)}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  حوزه مجری: {event.organizationScope}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
