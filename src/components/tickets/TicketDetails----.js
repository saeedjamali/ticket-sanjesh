"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROLES, getRolePermissions, getStatusText } from "@/lib/permissions";

export default function TicketDetails({ ticket, user }) {
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  const permissions = getRolePermissions(user.role);
  const canRespond =
    permissions.canRespondToTickets &&
    ticket.status !== "closed" &&
    user.id === ticket.createdBy._id;

  // بررسی امکان ویرایش تیکت توسط مسئول مرکز آزمون قبل از پاسخگویی
  const canEdit =
    user.role === ROLES.EXAM_CENTER_MANAGER &&
    user.id === ticket.createdBy._id &&
    user.examCenter === ticket.examCenter._id &&
    (!ticket.responses || ticket.responses.length === 0) &&
    ticket.status !== "closed";

  // بررسی امکان بستن تیکت توسط کارشناسان مجاز
  const canCloseTicket =
    ticket.status !== "closed" &&
    ((user.role === ROLES.DISTRICT_EDUCATION_EXPERT &&
      ticket.receiver === "education" &&
      user.district === ticket.district._id) ||
      (user.role === ROLES.DISTRICT_TECH_EXPERT &&
        ticket.receiver === "tech" &&
        user.district === ticket.district._id) ||
      (user.role === ROLES.PROVINCE_EDUCATION_EXPERT &&
        ticket.receiver === "education" &&
        user.province === ticket.province._id) ||
      (user.role === ROLES.PROVINCE_TECH_EXPERT &&
        ticket.receiver === "tech" &&
        user.province === ticket.province._id) ||
      user.role === ROLES.SYSTEM_ADMIN);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "draft":
        return "status-draft";
      case "new":
        return "status-new";
      case "seen":
        return "status-seen";
      case "inProgress":
        return "status-inProgress";
      case "resolved":
        return "status-resolved";
      case "closed":
        return "status-closed";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high":
        return "آنی";
      case "medium":
        return "فوری";
      case "low":
        return "عادی";
      default:
        return priority;
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "high":
        return "badge-danger";
      case "medium":
        return "badge-warning";
      case "low":
        return "badge-info";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getReceiverText = (receiver) => {
    switch (receiver) {
      case "education":
        return "کارشناس سنجش منطقه";
      case "tech":
        return "کارشناس فناوری منطقه";
      default:
        return receiver;
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();

    if (!response.trim()) {
      setError("لطفا پاسخ خود را وارد کنید");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // ساخت پارامترهای درخواست
      const payload = {
        response: response.trim(),
        status: status,
      };

      // دریافت توکن احراز هویت
      const authToken = localStorage.getItem("authToken");

      // تنظیم هدرهای درخواست
      const headers = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // افزودن پارامترهای کوئری برای احراز هویت جایگزین
      let url = `/api/tickets/${ticket._id}/response`;

      // اضافه کردن پارامترهای کاربر به URL
      if (user) {
        url += `?userRole=${user.role}`;

        if (user.examCenter) {
          url += `&examCenter=${user.examCenter}`;
        }

        if (user.district) {
          url += `&district=${user.district}`;
        }

        if (user.province) {
          url += `&province=${user.province}`;
        }

        if (user.id) {
          url += `&userId=${user.id}`;
        }
      }

      console.log("Submitting response to URL:", url);

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      // بررسی پاسخ سرور
      if (!res.ok) {
        let errorMessage = "خطا در ثبت پاسخ";
        try {
          const errorData = await res.json();
          errorMessage =
            errorData.message || errorData.error || "خطا در ثبت پاسخ";
          console.error("Error response:", errorData);
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("Response saved successfully:", data);

      // بازنشانی فرم و رفرش صفحه
      router.refresh();
      setResponse("");

      // نمایش پیغام موفقیت‌آمیز (اختیاری)
      alert("پاسخ شما با موفقیت ثبت شد.");
    } catch (error) {
      console.error("Error submitting response:", error);
      setError(error.message || "خطا در ثبت پاسخ. لطفا دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If the ticket is new and the user is the intended receiver, change it to 'seen'
  const updateTicketStatus = async () => {
    if (
      ticket.status === "new" &&
      ((user.role === ROLES.DISTRICT_EDUCATION_EXPERT &&
        ticket.receiver === "education") ||
        (user.role === ROLES.DISTRICT_TECH_EXPERT &&
          ticket.receiver === "tech"))
    ) {
      try {
        await fetch(`/api/tickets/${ticket._id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "seen" }),
        });

        setStatus("seen");
        ticket.status = "seen";
      } catch (error) {
        console.error("Error updating ticket status:", error);
      }
    }
  };

  // اضافه کردن دکمه ارسال برای تیکت‌های پیش‌نویس
  const submitDraft = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/tickets/${ticket._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "new" }),
      });

      if (!res.ok) {
        throw new Error("خطا در ارسال تیکت");
      }

      router.refresh();
    } catch (error) {
      setError("خطا در ارسال تیکت. لطفا دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (
      !confirm("آیا از بستن این تیکت اطمینان دارید؟ این عمل قابل بازگشت نیست.")
    ) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tickets/${ticket._id}/close`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در بستن تیکت");
      }

      setSuccessMessage("تیکت با موفقیت بسته شد");
      setStatus("closed");
      ticket.status = "closed";
      router.refresh();
    } catch (error) {
      setError(error.message || "خطا در بستن تیکت");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Call updateTicketStatus when the component mounts
  useState(() => {
    updateTicketStatus();
  }, []);

  return (
    <div className="container p-4 mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">جزئیات تیکت</h1>
        <Link
          href="/dashboard/tickets"
          className="text-blue-600 hover:underline"
        >
          بازگشت به لیست تیکت‌ها
        </Link>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Add status info alert */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded mb-6">
        <h3 className="font-bold text-lg mb-2">راهنمای وضعیت تیکت:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            با مشاهده تیکت توسط کارشناس، وضعیت به{" "}
            <strong>&quot;دیده شده&quot;</strong> تغییر می‌کند.
          </li>
          <li>
            با پاسخ کارشناس، وضعیت به <strong>&quot;پاسخ داده شده&quot;</strong>{" "}
            تغییر می‌کند.
          </li>
          <li>
            در صورت سوال مجدد مسئول مرکز، وضعیت به{" "}
            <strong>&quot;دیده نشده&quot;</strong> تغییر می‌کند تا کارشناس متوجه
            شود.
          </li>
          <li>
            کارشناسان می‌توانند بعد از رفع مشکل، تیکت را{" "}
            <strong>&quot;بسته&quot;</strong> کنند. پس از بستن تیکت، امکان ارسال
            پاسخ دیگر وجود ندارد.
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-4 flex flex-wrap items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {ticket.title}
                </h1>
                {ticket.ticketNumber && (
                  <div className="mt-1 text-sm text-gray-500">
                    <span className="font-medium">شماره پیگیری:</span>{" "}
                    {ticket.ticketNumber}
                  </div>
                )}
              </div>

              <div className="mt-2 flex space-x-2 space-x-reverse sm:mt-0">
                {canEdit && (
                  <Link
                    href={`/dashboard/tickets/${ticket._id}/edit`}
                    className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                  >
                    ویرایش
                  </Link>
                )}

                {ticket.status === "draft" &&
                  user.id === ticket.createdBy._id && (
                    <button
                      onClick={submitDraft}
                      disabled={isSubmitting}
                      className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                    >
                      ارسال تیکت
                    </button>
                  )}

                {canCloseTicket && (
                  <button
                    onClick={handleCloseTicket}
                    disabled={isSubmitting}
                    className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                  >
                    بستن تیکت
                  </button>
                )}

                <span
                  className={`badge ${getPriorityBadgeClass(ticket.priority)}`}
                >
                  {getPriorityText(ticket.priority)}
                </span>
                <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                  {getStatusText(ticket.status)}
                </span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  ایجاد کننده:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {ticket.createdBy.fullName}
                </span>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  مرکز آزمون:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {ticket.examCenter.name}
                </span>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  منطقه:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {ticket.district.name}
                </span>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  استان:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {ticket.province.name}
                </span>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  دریافت کننده:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {getReceiverText(ticket.receiver)}
                </span>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  تاریخ ایجاد:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {(() => {
                    const date = new Date(ticket.createdAt);
                    const persianDate = date.toLocaleDateString("fa-IR");
                    const time = date.toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return `${persianDate} - ${time}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <h2 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              شرح مشکل
            </h2>
            <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-700">
              <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {ticket.description}
              </p>
            </div>

            {ticket.image && (
              <div className="mt-4">
                <h3 className="mb-2 text-md font-medium text-gray-900 dark:text-white">
                  تصویر خطا
                </h3>
                <div className="overflow-hidden rounded-md">
                  <img
                    src={ticket.image}
                    alt="تصویر خطا"
                    className="h-auto max-w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {ticket.responses && ticket.responses.length > 0 && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-700">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                پاسخ‌ها
              </h2>
              <div className="space-y-4">
                {ticket.responses.map((resp, index) => (
                  <div
                    key={index}
                    className="rounded-md bg-gray-50 p-4 dark:bg-gray-700"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {resp.createdBy?.fullName || "کاربر"}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {(() => {
                          const date = new Date(resp.createdAt);
                          const persianDate = date.toLocaleDateString("fa-IR");
                          const time = date.toLocaleTimeString("fa-IR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return `${persianDate} - ${time}`;
                        })()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {resp.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticket.status === "closed" && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-4 p-3 bg-amber-100 text-amber-700 rounded-md">
                این تیکت بسته شده است و امکان پاسخ دادن به آن وجود ندارد.
              </div>
            </div>
          )}

          {canRespond && ticket.status !== "closed" && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-700">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                ارسال پاسخ
              </h2>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitResponse} className="space-y-4">
                <div className="form-group">
                  <label htmlFor="response" className="form-label">
                    پاسخ شما
                  </label>
                  <textarea
                    id="response"
                    rows="4"
                    className="form-control"
                    placeholder="پاسخ خود را اینجا بنویسید"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    required
                  ></textarea>
                </div>

                {permissions.canRespondToTickets && (
                  <div className="form-group">
                    <label htmlFor="status" className="form-label">
                      تغییر وضعیت
                    </label>
                    <select
                      id="status"
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="seen">دیده شده</option>
                      <option value="inProgress">در حال بررسی</option>
                      <option value="resolved">پاسخ داده شده</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-4 space-x-reverse">
                  <Link
                    href="/dashboard/tickets"
                    className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    بازگشت
                  </Link>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "در حال ارسال..." : "ارسال پاسخ"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
