"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import {
  FaComments,
  FaPaperPlane,
  FaTimes,
  FaImage,
  FaTrash,
  FaUser,
  FaUserTie,
  FaCircle,
  FaDownload,
} from "react-icons/fa";

export default function ChatBox({ appealRequestId, userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState("open");
  const [unreadCount, setUnreadCount] = useState(0);
  const [expertUnreadCount, setExpertUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // دانلود تصویر
  const downloadImage = (imageSrc, messageId) => {
    try {
      // اگر تصویر به صورت base64 است
      if (imageSrc.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = imageSrc;
        const fileExtension = imageSrc.split(",")[0].includes("jpeg")
          ? "jpg"
          : "png";
        link.download = `chat-image-${
          messageId || Date.now()
        }.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("تصویر دانلود شد");
      } else {
        // اگر تصویر از سرور است (URL)
        fetch(imageSrc)
          .then((response) => response.blob())
          .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `chat-image-${messageId || Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("تصویر دانلود شد");
          })
          .catch(() => {
            toast.error("خطا در دانلود تصویر");
          });
      }
    } catch (error) {
      console.error("خطا در دانلود تصویر:", error);
      toast.error("خطا در دانلود تصویر");
    }
  };

  // بارگذاری پیام‌ها
  const loadMessages = async () => {
    try {
      const response = await fetch(
        `/api/chat-messages?appealRequestId=${appealRequestId}`
      );
      const result = await response.json();

      if (result.success) {
        setMessages(result.data.messages || []);
        setChatStatus(result.data.chatStatus || "open");

        // شمارش پیام‌های خوانده نشده (کارشناس به متقاضی)
        const unread =
          result.data.messages?.filter(
            (msg) => !msg.isRead && msg.senderRole !== userRole
          ).length || 0;
        setUnreadCount(unread);

        // شمارش پیام‌های خوانده نشده کارشناس (متقاضی به کارشناس)
        const expertUnread =
          result.data.messages?.filter(
            (msg) => !msg.isRead && msg.senderRole === userRole
          ).length || 0;
        setExpertUnreadCount(expertUnread);
      }
    } catch (error) {
      console.error("خطا در بارگذاری پیام‌ها:", error);
    }
  };

  useEffect(() => {
    if (appealRequestId) {
      loadMessages();

      // بارگذاری مجدد هر 10 ثانیه
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [appealRequestId]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // وقتی چت باز می‌شود، پیام‌ها را به‌روزرسانی کن
      loadMessages();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // انتخاب تصویر
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        toast.error("حجم فایل نباید بیش از 5 مگابایت باشد");
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // حذف تصویر
  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ارسال پیام
  const sendMessage = async () => {
    if ((!newMessage.trim() && !image) || loading) return;

    if (chatStatus === "closed" && userRole === "transferApplicant") {
      toast.error("گفتگو توسط کارشناس بسته شده است");
      return;
    }

    setLoading(true);

    try {
      let imageBase64 = null;
      if (image) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(image);
        });
      }

      const response = await fetch("/api/chat-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appealRequestId,
          message: newMessage.trim(),
          image: imageBase64,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNewMessage("");
        removeImage();
        await loadMessages();
        scrollToBottom();
      } else {
        toast.error(result.error || "خطا در ارسال پیام");
      }
    } catch (error) {
      toast.error("خطا در ارسال پیام");
      console.error("خطا در ارسال پیام:", error);
    } finally {
      setLoading(false);
    }
  };

  // فرمت کردن زمان
  const formatTime = (date) => {
    return new Date(date).toLocaleString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <>
      {/* دکمه گفتگو */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors relative"
      >
        <FaComments className="h-4 w-4" />
        <div className="flex flex-col">
          <span>گفتگو با کارشناس</span>
          {expertUnreadCount > 0 && (
            <span className="text-xs text-blue-200">
              {expertUnreadCount} پیام در انتظار پاسخ کارشناس
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* مودال گفتگو */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md h-96 flex flex-col">
            {/* هدر */}
            <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <FaComments className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-800">گفتگو با کارشناس</h3>
                {chatStatus === "closed" && (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                    بسته شده
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            {/* پیام‌ها */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <FaComments className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>هنوز پیامی ارسال نشده</p>
                  <p className="text-sm">اولین پیام خود را ارسال کنید</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.messageId || index}
                    className={`flex ${
                      msg.senderRole === userRole
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        msg.senderRole === userRole
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {/* آیکون فرستنده */}
                      <div className="flex items-center gap-1 mb-1">
                        {msg.senderRole === "transferApplicant" ? (
                          <FaUser className="h-3 w-3" />
                        ) : (
                          <FaUserTie className="h-3 w-3" />
                        )}
                        <span className="text-xs opacity-70">
                          {msg.senderRole === "transferApplicant"
                            ? "شما"
                            : "کارشناس"}
                        </span>
                      </div>

                      {/* تصویر */}
                      {msg.image && (
                        <div className="relative mb-2">
                          <img
                            src={msg.image}
                            alt="تصویر پیام"
                            className="w-full rounded max-h-32 object-cover cursor-pointer"
                            onClick={() =>
                              downloadImage(msg.image, msg.messageId)
                            }
                          />
                          <button
                            onClick={() =>
                              downloadImage(msg.image, msg.messageId)
                            }
                            className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1 rounded-full text-xs transition-all"
                            title="دانلود تصویر"
                          >
                            <FaDownload className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* متن پیام */}
                      <p className="text-sm">{msg.message}</p>

                      {/* زمان */}
                      <p className="text-xs opacity-60 mt-1">
                        {formatTime(msg.sentAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ورودی پیام */}
            {chatStatus !== "closed" && (
              <div className="p-4 border-t bg-gray-50 rounded-b-xl">
                {/* پیش‌نمایش تصویر */}
                {imagePreview && (
                  <div className="mb-3 relative inline-block">
                    <img
                      src={imagePreview}
                      alt="پیش‌نمایش"
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="پیام خود را بنویسید..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    disabled={loading}
                  />

                  {/* دکمه انتخاب تصویر */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <FaImage className="h-4 w-4" />
                  </button>

                  {/* دکمه ارسال */}
                  <button
                    onClick={sendMessage}
                    disabled={loading || (!newMessage.trim() && !image)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <FaPaperPlane className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            )}

            {chatStatus === "closed" && (
              <div className="p-4 border-t bg-red-50 text-center">
                <p className="text-red-700 text-sm">
                  گفتگو توسط کارشناس بسته شده است
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
