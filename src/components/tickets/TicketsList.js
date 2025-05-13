"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRoleName, getStatusText, ROLES } from "@/lib/permissions";

export default function TicketsList({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [authError, setAuthError] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [ticketNumber, setTicketNumber] = useState("");


  const fetchTickets = async (
    page = 1,
    statusFilter = "all",
    ticketNumberSearch = "",
    priorityFilter = "all"
  ) => {
    setLoading(true);
    setError("");
    setAuthError(false);

    // بررسی اولیه - اگر اطلاعات کاربر وجود ندارد، یک خطای احراز هویت نمایش دهیم
    if (!user || !user.role) {
      console.error("User information missing, cannot fetch tickets");
      setAuthError(true);
      setLoading(false);
      return;
    }

    try {
      // دریافت توکن احراز هویت از localStorage
      const accessToken = localStorage.getItem("accessToken");

      let url = `/api/tickets?page=${page}`;

      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      // اضافه کردن پارامتر جستجوی شماره تیکت
      if (ticketNumberSearch) {
        url += `&ticketNumber=${ticketNumberSearch}`;
      }

      // اضافه کردن پارامتر فیلتر فوریت
      if (priorityFilter !== "all") {
        url += `&priority=${priorityFilter}`;
      }

      // اضافه کردن پارامترهای کوئری برای فیلتر کردن تیکت‌ها بر اساس نقش کاربر
      if (user && user.role) {
        url += `&userRole=${user.role}`;

        if (user.id) {
          url += `&userId=${user.id}`;
        }

        if (user.examCenter) {
          url += `&examCenter=${user.examCenter}`;
        }

        if (user.district) {
          url += `&district=${user.district}`;
        }

        // اضافه کردن فیلتر استان برای مدیر کل استان
        if (user.province) {
          url += `&province=${user.province}`;
        }
      }


      // تنظیم هدرهای درخواست
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      // Now fetch the tickets
      const response = await fetch(url, {
        headers,
        credentials: "include",
      });
      console.log("Fetch response status:", response.status);

      // تشخیص و مدیریت خطاهای احراز هویت
      if (response.status === 401) {
        console.error("Authentication error (401): User not authenticated");
        setAuthError(true);
        // ذخیره مجدد اطلاعات کاربر در localStorage برای اطمینان
        if (user) {
          try {
            localStorage.setItem("user", JSON.stringify(user));
          } catch (storageError) {
            console.error("Error updating localStorage:", storageError);
          }
        }
        throw new Error("خطای احراز هویت: لطفاً مجدداً وارد شوید");
      }

      if (!response.ok) {
        console.error("Error response:", response.status, response.statusText);
        let errorData = "";
        try {
          const errorText = await response.text();
          console.error("Error details:", errorText);
          errorData = errorText;

          // Try to parse as JSON to get detailed error
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorData = errorJson.error;
              if (errorJson.details) {
                errorData += `: ${errorJson.details}`;
              }
            }
          } catch (parseError) {
            // Continue with text response if not valid JSON
          }
        } catch (textError) {
          console.error("Error getting response text:", textError);
        }

        throw new Error(
          `خطای دریافت تیکت‌ها: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json();

      if (data.tickets && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        setTotalPages(data.totalPages || 1);
      } else {
        console.error("Invalid response format:", data);
        setTickets([]);
        setTotalPages(1);
        setError("فرمت پاسخ دریافتی نامعتبر است");
      }
    } catch (error) {
      console.error("Error fetching tickets (full error):", error);
      setError(`خطا در بارگذاری تیکت‌ها: ${error.message}`);
      setTickets([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      
      fetchTickets(currentPage, filter, ticketNumber, priorityFilter);
    } else {
      setAuthError(true);
      setLoading(false);
    }
  }, [currentPage, filter, user, ticketNumber, priorityFilter]);

  // ایجاد یک تیکت تست
  const createTestTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/create-test-ticket");
      const data = await response.json();
      console.log("Test ticket creation response:", data);
      if (data.success) {
        alert(
          "تیکت تست با موفقیت ایجاد شد. لطفاً صفحه را دوباره بارگذاری کنید."
        );
        fetchTickets(currentPage, filter, ticketNumber, priorityFilter);
      } else {
        alert("خطا در ایجاد تیکت تست: " + data.message);
      }
    } catch (error) {
      console.error("Error creating test ticket:", error);
      alert("خطا در ایجاد تیکت تست: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // بررسی وضعیت پایگاه داده
  const checkDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/check-db");
      const data = await response.json();
      console.log("Database check response:", data);
      alert("لطفاً کنسول مرورگر را برای جزئیات بررسی کنید");
    } catch (error) {
      console.error("Error checking database:", error);
      alert("خطا در بررسی پایگاه داده: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (e) => {
    setPriorityFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleTicketNumberChange = (e) => {
    setTicketNumber(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchTickets(1, filter, ticketNumber, priorityFilter);
  };

  const clearSearch = () => {
    setTicketNumber("");
    setCurrentPage(1);
    fetchTickets(1, filter, "", priorityFilter);
  };

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
      case "provinceEducationExpert":
        return "کارشناس سنجش استان";
      case "provinceTechExpert":
        return "کارشناس فناوری استان";
      case "districtEducationExpert":
        return "کارشناس سنجش منطقه";
      case "districtTechExpert":
        return "کارشناس فناوری منطقه";
      default:
        return receiver;
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="loader h-8 w-8 rounded-full border-4 border-t-4 border-gray-200 border-t-blue-600 ease-linear"></div>
        <span className="mr-2">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">خطا: </strong>
          <span className="block sm:inline">{error}</span>

          <div className="mt-4 border-t border-red-300 pt-3">
            <details className="bg-white p-3 rounded shadow">
              <summary className="font-bold cursor-pointer">
                اطلاعات دیباگ (برای رفع مشکل)
              </summary>
              <div className="mt-2 text-sm">
                <p className="mb-2">اطلاعات کاربر:</p>
                <pre className="bg-gray-100 p-2 rounded overflow-auto text-left">
                  {JSON.stringify(user, null, 2)}
                </pre>

                {debugInfo && (
                  <>
                    <p className="mt-3 mb-2">اطلاعات دیباگ:</p>
                    <pre className="bg-gray-100 p-2 rounded overflow-auto text-left">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={createTestTicket}
                  className="btn-responsive bg-green-600 text-white hover:bg-green-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 btn-icon"
                  >
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  <span className="btn-text">ایجاد تیکت تست</span>
                </button>
                <button
                  onClick={checkDatabase}
                  className="btn-responsive bg-blue-600 text-white hover:bg-blue-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 btn-icon"
                  >
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                    <path
                      fillRule="evenodd"
                      d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="btn-text">بررسی پایگاه داده</span>
                </button>
                <button
                  onClick={() =>
                    fetchTickets(
                      currentPage,
                      filter,
                      ticketNumber,
                      priorityFilter
                    )
                  }
                  className="btn-responsive bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 btn-icon"
                  >
                    <path
                      fillRule="evenodd"
                      d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="btn-text">تلاش مجدد</span>
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <p className="mb-4">هیچ تیکتی یافت نشد.</p>
        {user.role === ROLES.EXAM_CENTER_MANAGER && (
          <Link href="/dashboard/tickets/create" className="btn btn-primary">
            ایجاد تیکت جدید
          </Link>
        )}
        {user.role === ROLES.SYSTEM_ADMIN && (
          <div className="mt-4">
            <button
              onClick={createTestTicket}
              className="btn-responsive bg-green-600 text-white hover:bg-green-700 ml-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 btn-icon"
              >
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span className="btn-text">ایجاد تیکت تست</span>
            </button>
            <button
              onClick={checkDatabase}
              className="btn-responsive bg-purple-600 text-white hover:bg-purple-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 btn-icon"
              >
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path
                  fillRule="evenodd"
                  d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="btn-text">بررسی پایگاه داده</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 border-t-4 border-blue-500">
      {authError ? (
        <div className="text-center p-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-16 h-16 mx-auto text-red-500 mb-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            خطا در احراز هویت
          </h2>
          <p className="text-gray-600 mb-6">
            برای مشاهده تیکت‌ها باید مجدداً وارد حساب کاربری خود شوید.
          </p>
          <Link
            href="/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md inline-block"
          >
            ورود مجدد
          </Link>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full flex-grow">
                <div className="flex flex-1">
                  <label htmlFor="filter" className="ml-2 text-sm font-medium">
                    فیلتر وضعیت:
                  </label>
                  <select
                    id="filter"
                    value={filter}
                    onChange={handleFilterChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-1 dark:border-gray-600 dark:bg-gray-700 "
                  >
                    <option value="all">همه</option>
                    <option value="new">جدید</option>
                    <option value="seen">دیده شده</option>
                    <option value="inProgress">در حال بررسی</option>
                    <option value="resolved">پاسخ داده شده</option>
                    <option value="referred_province">ارجاع به استان</option>
                    <option value="closed">بسته شده</option>
                  </select>
                </div>

                <div className="flex flex-1">
                  <label
                    htmlFor="priorityFilter"
                    className="ml-2 text-sm font-medium"
                  >
                    فیلتر فوریت:
                  </label>
                  <select
                    id="priorityFilter"
                    value={priorityFilter}
                    onChange={handlePriorityFilterChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-1 dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="all">همه</option>
                    <option value="high">آنی</option>
                    <option value="medium">فوری</option>
                    <option value="low">عادی</option>
                  </select>
                </div>

                <div className="flex flex-2">
                  <form
                    onSubmit={handleSearch}
                    className="w-full flex items-center"
                  >
                    <label
                      htmlFor="ticketNumber"
                      className="ml-2 text-sm font-medium"
                    >
                      شماره تیکت:
                    </label>
                    <input
                      id="ticketNumber"
                      type="text"
                      value={ticketNumber}
                      onChange={handleTicketNumberChange}
                      placeholder="جستجو شماره تیکت..."
                      className="rounded-md border border-gray-300 px-3 py-1 dark:border-gray-600 dark:bg-gray-700 ml-2"
                    />
                    <button
                      type="submit"
                      className="btn-responsive bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 btn-icon"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="btn-text">جستجو</span>
                    </button>
                    {ticketNumber && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="btn-responsive bg-gray-300 text-gray-700 hover:bg-gray-400 mr-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4 btn-icon"
                        >
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                        <span className="btn-text">پاک کردن</span>
                      </button>
                    )}
                  </form>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                نمایش {tickets.length} تیکت از {totalPages} صفحه
                {user.role === "generalManager" && user.provinceName && (
                  <span className="mr-2 text-blue-600 font-medium">
                    (فقط تیکت‌های استان {user.provinceName})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    شماره پیگیری
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    عنوان
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    فوریت
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    فرستنده
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    دریافت کننده
                  </th>
                  {(user.role === ROLES.GENERAL_MANAGER ||
                    user.role === ROLES.PROVINCE_EDUCATION_EXPERT ||
                    user.role === ROLES.PROVINCE_TECH_EXPERT) && (
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      منطقه
                    </th>
                  )}
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    تاریخ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-center font-mono text-gray-500 dark:text-gray-400">
                      {ticket.ticketNumber || "---"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                      {ticket.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`badge ${getPriorityBadgeClass(
                          ticket.priority
                        )}`}
                      >
                        {getPriorityText(ticket.priority)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                      {ticket.examCenter && ticket.examCenter.name
                        ? getRoleName(ticket.createdBy.role) +
                          "  |  " +
                          ticket.examCenter.name
                        : "---"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                      {getReceiverText(ticket.receiver) 
                        // " | " +
                        // ticket?.district?.name
                        }
                    </td>
                    {(user.role === ROLES.GENERAL_MANAGER ||
                      user.role === ROLES.PROVINCE_EDUCATION_EXPERT ||
                      user.role === ROLES.PROVINCE_TECH_EXPERT) && (
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                        {ticket.district && ticket.district.name
                          ? ticket.district.name
                          : "---"}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`badge ${getStatusBadgeClass(
                          ticket.status
                        )}`}
                      >
                        {getStatusText(ticket.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                      {(() => {
                        const date = new Date(ticket.createdAt);
                        const persianDate = date.toLocaleDateString("fa-IR");
                        const time = date.toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return `${persianDate} - ${time}`;
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                      <Link
                        href={`/dashboard/tickets/${ticket._id}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 space-x-reverse p-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-responsive border border-gray-300 disabled:opacity-50 dark:border-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 btn-icon"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="btn-text">قبلی</span>
              </button>

              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => handlePageChange(index + 1)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    currentPage === index + 1
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn-responsive border border-gray-300 disabled:opacity-50 dark:border-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 btn-icon"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="btn-text">بعدی</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
