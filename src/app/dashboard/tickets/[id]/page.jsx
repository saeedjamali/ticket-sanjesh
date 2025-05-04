"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import Link from "next/link";
import { IoMdAttach, IoMdDownload, IoMdClose } from "react-icons/io";
import { getStatusText } from "@/lib/permissions";
export default function TicketDetails() {
    const params = useParams();
    const router = useRouter();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [showImage, setShowImage] = useState(false);

    useEffect(() => {
        fetchTicket();
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
            const response = await fetch(`/api/tickets/${params.id}/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: replyText }),
                credentials: "include",
            });

            const data = await response.json();
            console.log("data---->", data);
            if (data.success) {
                toast.success("پاسخ با موفقیت ارسال شد");
                setReplyText("");
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
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">{ticket.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
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
                    <div className="flex items-center gap-2">
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
                            <div className="flex items-center gap-4 mb-4">
                                <span onClick={getImage} className="text-blue-500 flex items-center gap-2 cursor-pointer hover:text-blue-600">
                                    <IoMdAttach />تصویر پیوست
                                </span>
                                {showImage && (
                                    <>
                                        <span onClick={downloadImage} className="text-green-500 flex items-center gap-2 cursor-pointer hover:text-green-600">
                                            <IoMdDownload />دانلود تصویر
                                        </span>
                                        <span onClick={hideImage} className="text-red-500 flex items-center gap-2 cursor-pointer hover:text-red-600">
                                            <IoMdClose />بستن تصویر
                                        </span>
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
                                    {reply.isAdmin ? "پشتیبانی" : "شما"}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {format(new Date(reply.createdAt), "dd MMMM yyyy HH:mm", {
                                        locale: faIR,
                                    })}
                                </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{reply.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* فرم پاسخ */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">ارسال پاسخ</h2>
                <div className="space-y-4">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="متن پاسخ خود را وارد کنید..."
                        className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleReply}
                            disabled={submitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? "در حال ارسال..." : "ارسال پاسخ"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 