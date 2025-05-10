"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import Link from "next/link";
import { IoMdAttach, IoMdDownload, IoMdClose } from "react-icons/io";
import { getRoleName, getStatusText, ROLES } from "@/lib/permissions";

import { useUserContext } from "@/context/UserContext";
import EditTicketForm from "@/components/tickets/EditTicketForm";
import { Button } from "@mui/material";

export default function TicketDetails() {
    const params = useParams();
    const router = useRouter();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [showImage, setShowImage] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [replyImage, setReplyImage] = useState(null);
    const [replyImagePreview, setReplyImagePreview] = useState(null);
    const [responseImages, setResponseImages] = useState({});
    const { user } = useUserContext();

    console.log("user in ticket details ---->", user);
    useEffect(() => {
        fetchTicket();
        console.log("ticket in ticket details ---->", ticket);
    }, [params.id]);

    const fetchTicket = async () => {
        try {
            const response = await fetch(`/api/tickets/${params.id}`, {
                credentials: "include",
            });
            const data = await response.json();
            console.log("data---->", data);
            if (data.success) {
                setTicket(data.ticket);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error fetching ticket:", error);
            toast.error("خطا در دریافت اطلاعات تیکت");
        } finally {
            setLoading(false);
        }
    };

    const getImage = async () => {
        try {
            if (!ticket?.image) return;

            // اگر تصویر یک URL کامل است، مستقیماً از آن استفاده می‌کنیم
            if (ticket.image.startsWith('http')) {
                setImageUrl(ticket.image);
                setShowImage(true);
                return;
            }

            // در غیر این صورت، تصویر را از سرور دریافت می‌کنیم
            const response = await fetch(`/api/auth/getimg/${ticket.image}`);
            if (!response.ok) {
                throw new Error('خطا در دریافت تصویر');
            }

            // دریافت تصویر به صورت blob
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
            setShowImage(true);
        } catch (error) {
            console.error("Error fetching image:", error);
            toast.error("خطا در دریافت تصویر");
        }
    };

    const downloadImage = async () => {
        try {
            if (!imageUrl) return;

            // ایجاد لینک دانلود
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `ticket-image-${ticket.ticketNumber || 'attachment'}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading image:", error);
            toast.error("خطا در دانلود تصویر");
        }
    };

    const hideImage = () => {
        setShowImage(false);
    };

    const handleReply = async () => {
        if (!replyText.trim()) {
            toast.error("لطفا متن پاسخ را وارد کنید");
            return;
        }

        setSubmitting(true);
        try {
            // ایجاد فرم‌دیتا برای ارسال متن پاسخ و تصویر
            const formData = new FormData();
            formData.append("text", replyText);

            // اضافه کردن تصویر اگر انتخاب شده باشد
            if (replyImage) {
                formData.append("image", replyImage);
            }

            const response = await fetch(`/api/tickets/${params.id}/reply`, {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            const data = await response.json();
            console.log("data---->", data);
            if (data.success) {
                toast.success("پاسخ با موفقیت ارسال شد");
                setReplyText("");
                setReplyImage(null);
                setReplyImagePreview(null);
                fetchTicket(); // بروزرسانی اطلاعات تیکت
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error submitting reply:", error);
            toast.error("خطا در ارسال پاسخ");
        } finally {
            setSubmitting(false);
        }
    };

    // تابع انتخاب تصویر برای پاسخ
    const handleReplyImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReplyImage(file);

            // ایجاد پیش‌نمایش تصویر
            const reader = new FileReader();
            reader.onload = () => {
                setReplyImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // تابع حذف تصویر انتخاب شده
    const removeReplyImage = () => {
        setReplyImage(null);
        setReplyImagePreview(null);
    };

    const handleReferToProvince = async (ticketId) => {
        console.log("ارجاع به استان");
        try {
            const res = await fetch(`/api/tickets/${ticketId}/change-status`, {
                method: "PUT",
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Failed to change status:", errorData.message);
                // نمایش خطا به کاربر
                toast.error(`خطا: ${errorData.message}`);
                return;
            }

            const updatedTicket = await res.json();
            console.log("Status changed successfully:", updatedTicket);
            toast.success("وضعیت تیکت با موفقیت به 'ارجاع به استان' تغییر یافت.");
            fetchTicket(); // بروزرسانی اطلاعات تیکت
        } catch (error) {
            console.error("Error calling API:", error);
            toast.error("خطا در ارتباط با سرور.");
        }
    };

    const handleCloseTicket = async () => {
        if (!confirm("آیا از بستن این تیکت اطمینان دارید؟ این عمل قابل بازگشت نیست.")) {
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/tickets/${params.id}/close`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "خطا در بستن تیکت");
            }

            toast.success("تیکت با موفقیت بسته شد");
            fetchTicket(); // بروزرسانی اطلاعات تیکت
        } catch (error) {
            console.error("Error closing ticket:", error);
            toast.error(error.message || "خطا در بستن تیکت");
        } finally {
            setSubmitting(false);
        }
    };

    // تابع تغییر وضعیت تیکت به "در حال بررسی"
    const handleSetInProgress = async () => {
        if (!confirm("آیا از تغییر وضعیت تیکت به 'در حال بررسی' اطمینان دارید؟")) {
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/tickets/${params.id}/to-inprogress`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            const data = await response.json();
            console.log("data---->", data);
            if (!response.ok) {
                throw new Error(data.error || "خطا در تغییر وضعیت تیکت");
            }

            toast.success("وضعیت تیکت با موفقیت به 'در حال بررسی' تغییر یافت");
            fetchTicket(); // بروزرسانی اطلاعات تیکت
        } catch (error) {
            console.error("Error changing ticket status:", error);
            toast.error(error.message || "خطا در تغییر وضعیت تیکت");
        } finally {
            setSubmitting(false);
        }
    };

    // بررسی نقش کاربر و وضعیت تیکت
    const canEdit =
        user?.role === ROLES.EXAM_CENTER_MANAGER &&
        ticket?.status === "new";

    // بررسی امکان بستن تیکت توسط کارشناسان مجاز
    const canCloseTicket =
        ticket?.status !== "closed" &&
        (
            (user?.role === ROLES.DISTRICT_EDUCATION_EXPERT &&
                ticket?.receiver === ROLES.DISTRICT_EDUCATION_EXPERT &&
                user?.district === ticket?.district?._id) ||
            (user?.role === ROLES.DISTRICT_TECH_EXPERT &&
                ticket?.receiver === ROLES.DISTRICT_TECH_EXPERT &&
                user?.district === ticket?.district?._id) ||
            (user?.role === ROLES.PROVINCE_EDUCATION_EXPERT &&
                ticket?.receiver === ROLES.PROVINCE_EDUCATION_EXPERT &&
                user?.province === ticket?.province?._id) ||
            (user?.role === ROLES.PROVINCE_TECH_EXPERT &&
                ticket?.receiver === ROLES.PROVINCE_TECH_EXPERT &&
                user?.province === ticket?.province?._id) ||
            user?.role === ROLES.SYSTEM_ADMIN
        );

    // تابع نمایش تصویر پاسخ
    const showResponseImage = async (imageFileName, responseId) => {
        try {
            const response = await fetch(`/api/auth/getimg/${imageFileName}`);
            if (!response.ok) {
                throw new Error('خطا در دریافت تصویر');
            }

            // دریافت تصویر به صورت blob
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            setResponseImages(prev => ({
                ...prev,
                [responseId]: url
            }));
        } catch (error) {
            console.error("Error fetching response image:", error);
            toast.error("خطا در دریافت تصویر پاسخ");
        }
    };

    // تابع مخفی کردن تصویر پاسخ
    const hideResponseImage = (responseId) => {
        setResponseImages(prev => {
            const newState = { ...prev };
            delete newState[responseId];
            return newState;
        });
    };

    // تابع دانلود تصویر پاسخ
    const downloadResponseImage = (imageUrl, responseId) => {
        try {
            // ایجاد لینک دانلود
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `ticket-response-image-${responseId}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading response image:", error);
            toast.error("خطا در دانلود تصویر پاسخ");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">تیکت مورد نظر یافت نشد</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* اطلاعات تیکت */}
            <div className="mb-6 flex justify-start sm:justify-end items-center">
                <Link
                    href="/dashboard/tickets"
                    className="btn-responsive bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 btn-icon" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                    >
                        <path 
                            fillRule="evenodd" 
                            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                            clipRule="evenodd" 
                        />
                    </svg>
                    <span className="btn-text">بازگشت به لیست تیکت‌ها</span>
                </Link>
            </div>
            {/* Add status info alert */}
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded mb-6">
                <h3 className="font-bold text-lg mb-2">راهنمای وضعیت تیکت:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                        تیکت های با وضعیت
                        <strong>&quot;جدید  &quot;</strong> توسط مسئول مرکز قابل ویرایش هستند
                    </li>
                    <li>
                        با مشاهده تیکت توسط کارشناس، وضعیت به{" "}
                        <strong>&quot;دیده شده&quot;</strong> تغییر می‌کند.
                    </li>
                    {/* <li>
                        <strong className="text-red-600">جدید!</strong> فقط مدیر سیستم می‌تواند وضعیت تیکت را به{" "}
                        <strong>&quot;در حال بررسی&quot;</strong> تغییر دهد.
                    </li> */}
                    <li>
                        با پاسخ کارشناس، وضعیت به <strong>&quot;پاسخ داده شده&quot;</strong>{" "}
                        تغییر می‌کند.
                    </li>
                    <li>
                        کارشناسان می‌توانند بعد از رفع مشکل،,وضعیت تیکت را به <strong>&quot;بسته&quot;</strong> تغییر دهند.
                        پس از بستن تیکت، امکان ارسال پاسخ دیگر وجود ندارد.
                    </li>
                </ul>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between flex-col sm:flex-row gap-2 sm:gap-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold mb-2">{ticket.title}</h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500">
                            <span>شماره تیکت: {ticket.ticketNumber}</span>
                            <span>وضعیت: {getStatusText(ticket.status)}</span>
                            <span>
                                تاریخ ایجاد:{" "}
                                {format(new Date(ticket.createdAt), "dd MMMM yyyy", {
                                    locale: faIR,
                                })}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <span
                            className={`px-3 py-1 rounded-full text-sm ${ticket.priority === "high"
                                ? "bg-red-100 text-red-600"
                                : ticket.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-600"
                                    : "bg-green-100 text-green-600"
                                }`}
                        >
                            {ticket.priority === "high"
                                ? "آنی"
                                : ticket.priority === "medium"
                                    ? "فوری"
                                    : "عادی"}
                        </span>
                    </div>
                </div>

                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-2">توضیحات</h2>
                    <p className="text-gray-700 whitespace-pre-wrap p-2 mb-8">{ticket.description}</p>
                    {ticket?.image && (
                        <div className="mb-8">
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <button
                                    onClick={getImage}
                                    className="btn-icon-responsive bg-blue-50 hover:bg-blue-100 text-blue-600"
                                >
                                    <IoMdAttach className="h-5 w-5" />
                                    <span className="btn-text">تصویر پیوست</span>
                                </button>
                                {showImage && (
                                    <>
                                        <button
                                            onClick={downloadImage}
                                            className="btn-icon-responsive bg-green-50 hover:bg-green-100 text-green-600"
                                        >
                                            <IoMdDownload className="h-5 w-5" />
                                            <span className="btn-text">دانلود تصویر</span>
                                        </button>
                                        <button
                                            onClick={hideImage}
                                            className="btn-icon-responsive bg-red-50 hover:bg-red-100 text-red-600"
                                        >
                                            <IoMdClose className="h-5 w-5" />
                                            <span className="btn-text">بستن تصویر</span>
                                        </button>
                                    </>
                                )}
                            </div>
                            {showImage && imageUrl && (
                                <div className="mt-2">
                                    <img
                                        src={imageUrl}
                                        alt="تصویر پیوست شده"
                                        className="max-w-full h-auto rounded-lg shadow"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* پاسخ‌ها */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">پاسخ‌ها</h2>
                <div className="space-y-4">
                    {ticket.responses?.map((reply) => (
                        <div
                            key={reply._id}
                            className={`p-4 rounded-lg ${reply.isAdmin ? "bg-blue-50" : "bg-gray-50"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">
                                    {/* {reply.isAdmin ? getRoleName(reply.createdRole) : "کاربر"} */}
                                    {getRoleName(reply.createdRole)}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {format(new Date(reply.createdAt), "dd MMMM yyyy HH:mm", {
                                        locale: faIR,
                                    })}
                                </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{reply.text}</p>

                            {/* نمایش تصویر پاسخ */}
                            {reply.image && (
                                <div className="mt-4">
                                    {!responseImages[reply._id] ? (
                                        <button
                                            onClick={() => showResponseImage(reply.image, reply._id)}
                                            className="btn-icon-responsive bg-blue-50 hover:bg-blue-100 text-blue-600 mb-2"
                                        >
                                            <IoMdAttach className="h-5 w-5" />
                                            <span className="btn-text">تصویر پیوست</span>
                                        </button>
                                    ) : (
                                        <div>
                                            <div className="flex flex-wrap items-center gap-4 mb-2">
                                                <button
                                                    onClick={() => hideResponseImage(reply._id)}
                                                    className="btn-icon-responsive bg-red-50 hover:bg-red-100 text-red-600"
                                                >
                                                    <IoMdClose className="h-5 w-5" />
                                                    <span className="btn-text">بستن تصویر</span>
                                                </button>
                                                <button
                                                    onClick={() => downloadResponseImage(responseImages[reply._id], reply._id)}
                                                    className="btn-icon-responsive bg-green-50 hover:bg-green-100 text-green-600"
                                                >
                                                    <IoMdDownload className="h-5 w-5" />
                                                    <span className="btn-text">دانلود تصویر</span>
                                                </button>
                                            </div>
                                            <img
                                                src={responseImages[reply._id]}
                                                alt="تصویر پیوست پاسخ"
                                                className="max-w-full h-auto rounded-lg shadow mt-2 max-h-96"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* نمایش پیام در صورت بسته بودن تیکت */}
            {ticket.status === "closed" && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded mb-6">
                    <p className="font-medium">این تیکت بسته شده است و امکان پاسخ دادن به آن وجود ندارد.</p>
                </div>
            )}

            {/* فرم پاسخ */}
            {ticket.status !== "closed" && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">ارسال پاسخ</h2>
                    <div className="space-y-4">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="متن پاسخ خود را وارد کنید..."
                            className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        {/* بخش انتخاب تصویر برای پاسخ */}
                        <div className="mt-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="btn-icon-responsive bg-blue-50 hover:bg-blue-100 text-blue-600 cursor-pointer">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="btn-text">افزودن تصویر</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleReplyImageChange}
                                    />
                                </label>
                                {replyImagePreview && (
                                    <button
                                        onClick={removeReplyImage}
                                        className="btn-icon-responsive bg-red-50 hover:bg-red-100 text-red-600"
                                    >
                                        <IoMdClose className="h-5 w-5" />
                                        <span className="btn-text">حذف تصویر</span>
                                    </button>
                                )}
                            </div>

                            {/* نمایش پیش‌نمایش تصویر */}
                            {replyImagePreview && (
                                <div className="mt-3">
                                    <img
                                        src={replyImagePreview}
                                        alt="پیش‌نمایش تصویر"
                                        className="max-w-xs max-h-40 rounded-lg"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                            {(ticket.status === "inProgress" && (user?.role === ROLES.DISTRICT_EDUCATION_EXPERT || user?.role === ROLES.DISTRICT_TECH_EXPERT)) && (
                                <button className="btn-responsive bg-orange-800 text-white hover:bg-orange-900">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 btn-icon"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="btn-text" onClick={() => handleReferToProvince(ticket._id)}>ارجاع به استان</span>
                                </button>
                            )}

                            {canCloseTicket && (
                                <button
                                    className="btn-responsive bg-red-600 text-white hover:bg-red-700"
                                    onClick={handleCloseTicket}
                                    disabled={submitting}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 btn-icon"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="btn-text">بستن تیکت</span>
                                </button>
                            )}

                            {canEdit && (
                                <button
                                    className="btn-responsive bg-orange-500 text-white hover:bg-orange-600"
                                    onClick={() => setIsEditing(prev => !prev)}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 btn-icon"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                                        />
                                    </svg>
                                    <span className="btn-text">ویرایش تیکت</span>
                                </button>
                            )}

                            <button
                                onClick={handleReply}
                                disabled={submitting}
                                className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5 btn-icon"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <span className="btn-text">در حال ارسال...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 btn-icon"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="btn-text">ارسال پاسخ</span>
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}
            <div className="flex justify-end">
                {user?.role === ROLES.SYSTEM_ADMIN && ticket?.status === "closed" && (
                    <button
                        className="btn-responsive bg-yellow-600 text-white hover:bg-yellow-700"
                        onClick={handleSetInProgress}
                        disabled={submitting}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 btn-icon"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="btn-text">تغییر به در حال بررسی</span>
                    </button>
                )}
            </div>
            {isEditing && <div className="bg-white rounded-lg shadow p-6">
                <EditTicketForm user={user} ticket={ticket} setIsEditing={setIsEditing} />
            </div>}
        </div>
    );
} 