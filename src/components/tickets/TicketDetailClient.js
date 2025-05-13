"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";

export default function TicketDetailClient({ ticketId }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user } = useUserContext();

  useEffect(() => {
    async function fetchTicket() {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "خطا در دریافت اطلاعات تیکت");
        }

        setTicket(data.ticket);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <p className="text-yellow-700">تیکت مورد نظر یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {ticket.title}
        </h1>
        <div className="flex items-center text-sm text-gray-500">
          <span>وضعیت: {ticket.status}</span>
          <span className="mx-2">•</span>
          <span>
            ایجاد شده در:{" "}
            {new Date(ticket.createdAt).toLocaleDateString("fa-IR")}
          </span>
        </div>
      </div>

      <div className="prose max-w-none mb-8">
        <p className="text-gray-700">{ticket.description}</p>
      </div>

      {ticket.responses && ticket.responses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">پاسخ‌ها</h2>
          {ticket.responses.map((response, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">
                  {response.user.fullName}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(response.createdAt).toLocaleDateString("fa-IR")}
                </span>
              </div>
              <p className="text-gray-700">{response.content}</p>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="mt-6">
          <button
            onClick={() =>
              router.push(`/dashboard/tickets/${ticketId}/response`)
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            ثبت پاسخ
          </button>
        </div>
      )}
    </div>
  );
}
