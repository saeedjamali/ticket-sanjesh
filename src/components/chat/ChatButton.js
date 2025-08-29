"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import {
  FaComments,
  FaPaperPlane,
  FaTimes,
  FaImage,
  FaUser,
  FaUserTie,
  FaLockOpen,
  FaLock,
  FaCircle,
  FaDownload,
} from "react-icons/fa";

export default function ChatButton({
  appealRequestId,
  unreadCount = 0,
  chatStatus = "open",
}) {
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentChatStatus, setCurrentChatStatus] = useState(chatStatus);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // بارگذاری پیام‌ها
  const loadMessages = async () => {
    try {
      console.log(
        "ChatButton - Loading messages for appealRequestId:",
        appealRequestId
      );
      const response = await fetch(
        `/api/chat-messages?appealRequestId=${appealRequestId}`
      );
      console.log("ChatButton - Response status:", response.status);

      const result = await response.json();
      console.log("ChatButton - Response result:", result);

      if (result.success) {
        setMessages(result.data.messages || []);
        setCurrentChatStatus(result.data.chatStatus || "open");
        console.log(
          "ChatButton - Messages loaded:",
          result.data.messages?.length || 0
        );
      } else {
        console.error("ChatButton - Failed to load messages:", result.error);
      }
    } catch (error) {
      console.error("خطا در بارگذاری پیام‌ها:", error);
    }
  };

  useEffect(() => {
    if (isOpen && appealRequestId) {
      loadMessages();
    }
  }, [isOpen, appealRequestId]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // انتخاب تصویر
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        // 1MB
        toast.error("حجم فایل نباید بیش از 1 مگابایت باشد");
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

  // تغییر وضعیت گفتگو
  const toggleChatStatus = async () => {
    setUpdatingStatus(true);

    try {
      const action = currentChatStatus === "open" ? "close" : "open";

      const response = await fetch("/api/chat-messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appealRequestId,
          action,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentChatStatus(result.data.chatStatus);
        toast.success(result.message);
      } else {
        toast.error(result.error || "خطا در تغییر وضعیت گفتگو");
      }
    } catch (error) {
      toast.error("خطا در تغییر وضعیت گفتگو");
      console.error("خطا در تغییر وضعیت گفتگو:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

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
        className="relative bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
        title="گفتگو با متقاضی"
      >
        <FaComments className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
        {currentChatStatus === "closed" && (
          <span className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full h-3 w-3 flex items-center justify-center">
            <FaLock className="h-2 w-2" />
          </span>
        )}
      </button>

      {/* مودال گفتگو */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg h-96 flex flex-col">
            {/* هدر */}
            <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <FaComments className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-800">گفتگو با متقاضی</h3>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    currentChatStatus === "open"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {currentChatStatus === "open" ? "باز" : "بسته"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* دکمه تغییر وضعیت */}
                <button
                  onClick={toggleChatStatus}
                  disabled={updatingStatus}
                  className={`p-2 rounded transition-colors ${
                    currentChatStatus === "open"
                      ? "bg-red-100 hover:bg-red-200 text-red-600"
                      : "bg-green-100 hover:bg-green-200 text-green-600"
                  }`}
                  title={
                    currentChatStatus === "open"
                      ? "بستن گفتگو"
                      : "بازکردن گفتگو"
                  }
                >
                  {updatingStatus ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : currentChatStatus === "open" ? (
                    <FaLock className="h-4 w-4" />
                  ) : (
                    <FaLockOpen className="h-4 w-4" />
                  )}
                </button>

                {/* دکمه بستن مودال */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* پیام‌ها */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <FaComments className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>هنوز پیامی ارسال نشده</p>
                  <p className="text-sm">منتظر پیام متقاضی باشید</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.messageId || index}
                    className={`flex ${
                      msg.senderRole === "districtTransferExpert"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        msg.senderRole === "districtTransferExpert"
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
                            ? "متقاضی"
                            : "شما"}
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
                  placeholder="پاسخ خود را بنویسید..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  disabled={loading}
                />

                {/* دکمه انتخاب تصویر */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg transition-colors"
                  disabled={loading}
                  title="افزودن تصویر (حداکثر 1MB)"
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
          </div>
        </div>
      )}
    </>
  );
}
