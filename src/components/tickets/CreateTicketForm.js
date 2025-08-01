"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ROLES } from "@/lib/permissions";

export default function CreateTicketForm({ user, ticket, isEditing = false }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(ticket?.image || "");
  const [examCenters, setExamCenters] = useState([]);
  const [isLoadingExamCenters, setIsLoadingExamCenters] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: isEditing
      ? {
          title: ticket.title,
          priority: ticket.priority,
          description: ticket.description,
          receiver: ticket.receiver,
          examCenter: ticket.examCenter?._id || ticket.examCenter,
        }
      : {},
  });

  // برای کارشناسان منطقه، لیست واحدهای سازمانی مربوط به منطقه را بارگذاری می‌کنیم
  useEffect(() => {
    // console.log("CreateTicketForm - useEffect running with user:", user);
    // console.log("User role:", user.role);
    // console.log("District ID:", user.district);
    // console.log(
    //   "Is district expert:",
    //   user.role === ROLES.DISTRICT_EDUCATION_EXPERT ||
    //     user.role === ROLES.DISTRICT_TECH_EXPERT
    // );

    if (
      user.role === ROLES.DISTRICT_EDUCATION_EXPERT ||
      user.role === ROLES.DISTRICT_TECH_EXPERT ||
      user.role === ROLES.DISTRICT_EVAL_EXPERT
    ) {
      const loadExamCenters = async () => {
        if (!user.district) {
          console.error(
            "Cannot load exam centers: No district ID found for user"
          );
          setError("خطا: شناسه منطقه برای کاربر یافت نشد");
          return;
        }

        // console.log("Loading exam centers for district:", user.district);
        setIsLoadingExamCenters(true);

        try {
          const accessToken = localStorage.getItem("accessToken");
          // console.log("Access token available:", !!accessToken);

          const apiUrl = `/api/exam-centers?district=${user.district}`;
          // console.log("Fetching exam centers from:", apiUrl);

          const response = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          // console.log("API response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            // console.log("Exam centers data received:", data);

            if (data.examCenters && data.examCenters.length > 0) {
              // console.log(`Found ${data.examCenters.length} exam centers`);
              setExamCenters(data.examCenters);
            } else {
              console.warn("No exam centers found for this district");
              setError("هیچ واحد سازمانیی در منطقه شما یافت نشد");
            }
          } else {
            console.error("Failed to load exam centers:", response.statusText);
            const errorText = await response.text();
            console.error("Error response:", errorText);
            setError("خطا در بارگیری لیست واحدهای سازمانی");
          }
        } catch (error) {
          console.error("Error loading exam centers:", error);
          setError("خطا در ارتباط با سرور");
        } finally {
          setIsLoadingExamCenters(false);
        }
      };

      loadExamCenters();
    }
  }, [user?.district, user?.role]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("لطفا یک فایل تصویر انتخاب کنید.");
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم تصویر باید کمتر از 2 مگابایت باشد.");
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  // تابع برای تعیین گیرندگان تیکت بر اساس نقش کاربر
  const getReceiverOptions = () => {
    if (user.role === ROLES.DISTRICT_TECH_EXPERT) {
      // کارشناس فناوری منطقه فقط می‌تواند به کارشناس فناوری استان تیکت ارسال کند
      return [{ value: "provinceTechExpert", label: "کارشناس فناوری استان" }];
    } else if (user.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
      // کارشناس سنجش منطقه فقط می‌تواند به کارشناس سنجش استان تیکت ارسال کند
      return [
        { value: "provinceEducationExpert", label: "کارشناس سنجش استان" },
      ];
    } else if (user.role === ROLES.DISTRICT_EVAL_EXPERT) {
      // کارشناس ارزیابی منطقه فقط می‌تواند به کارشناس ارزیابی استان تیکت ارسال کند
      return [{ value: "provinceEvalExpert", label: "کارشناس ارزیابی استان" }];
    } else if (user.role === ROLES.EXAM_CENTER_MANAGER) {
      // مدیر واحد سازمانی می‌تواند به کارشناسان منطقه تیکت ارسال کند
      return [
        { value: "districtEducationExpert", label: "کارشناس سنجش منطقه" },
        { value: "districtTechExpert", label: "کارشناس فناوری منطقه" },
        { value: "districtEvalExpert", label: "کارشناس ارزیابی منطقه" },
      ];
    } else {
      // سایر نقش‌ها (پیش‌فرض)
      return [
        { value: "districtEducationExpert", label: "کارشناس سنجش منطقه" },
        { value: "districtTechExpert", label: "کارشناس فناوری منطقه" },
        { value: "districtEvalExpert", label: "کارشناس ارزیابی منطقه" },
      ];
    }
  };

  // دریافت گزینه‌های گیرنده بر اساس نقش کاربر
  const receiverOptions = getReceiverOptions();

  const onSubmit = async (data, isDraft = false) => {
    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("priority", data.priority);
      formData.append("description", data.description);
      formData.append("receiver", data.receiver);

      // اضافه کردن وضعیت پیش‌نویس
      if (isDraft) {
        formData.append("status", "draft");
      } else {
        formData.append("status", "new");
      }

      // اضافه کردن واحد سازمانی به فرم در صورتی که کارشناس منطقه باشد و واحد سازمانی انتخاب شده باشد
      if (
        (user.role === ROLES.DISTRICT_EDUCATION_EXPERT ||
          user.role === ROLES.DISTRICT_TECH_EXPERT ||
          user.role === ROLES.DISTRICT_EVAL_EXPERT) &&
        data.examCenter
      ) {
        formData.append("examCenter", data.examCenter);
        // console.log("Adding examCenter to form data:", data.examCenter);
      }

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      // نمایش اطلاعات کاربر در کنسول
      // console.log("Current user data:", user);

      // اضافه کردن اطلاعات کاربر به URL برای احراز هویت
      let url = isEditing ? `/api/tickets/${ticket._id}` : "/api/tickets";

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

      // console.log("Submitting ticket to:", url);
      const method = isEditing ? "PUT" : "POST";

      // دریافت توکن احراز هویت از localStorage
      const accessToken = localStorage.getItem("accessToken");
      // console.log("Auth token available:", !!accessToken);

      // تنظیم هدرهای درخواست - فقط هدرهای مربوط به احراز هویت
      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      // console.log("Request headers:", headers);
      // console.log("Form data entries:", [...formData.entries()]);

      const response = await fetch(url, {
        method,
        body: formData,
        headers,
        credentials: "include",
      });

      // console.log("Response status:", response.status);
      // console.log(
      //   "Response headers:",
      //   Object.fromEntries([...response.headers.entries()])
      // );

      if (!response.ok) {
        const responseText = await response.text();
        console.error("Error response text:", responseText);

        let errorMessage = "خطا در عملیات";
        let errorData = {};

        try {
          errorData = JSON.parse(responseText);
          errorMessage =
            errorData.message || errorData.error || "خطا در عملیات";
          console.error("Parsed error data:", errorData);
        } catch (e) {
          console.error("Failed to parse error response as JSON:", e);
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      // console.log("Ticket successfully submitted:", responseData);

      router.push("/dashboard/tickets");
      router.refresh();
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setError(error.message || "خطا در عملیات. لطفا دوباره تلاش کنید.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title" className="form-label">
          عنوان تیکت
        </label>
        <input
          id="title"
          type="text"
          className={`form-control ${errors.title ? "border-red-500" : ""}`}
          placeholder="عنوان مشکل را وارد کنید"
          {...register("title", { required: "عنوان تیکت الزامی است" })}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="priority" className="form-label">
          فوریت
        </label>
        <select
          id="priority"
          className={`form-control ${errors.priority ? "border-red-500" : ""}`}
          {...register("priority", { required: "انتخاب فوریت الزامی است" })}
        >
          <option value="">انتخاب کنید</option>
          <option value="high">آنی</option>
          <option value="medium">فوری</option>
          <option value="low">عادی</option>
        </select>
        {errors.priority && (
          <p className="mt-1 text-xs text-red-500">{errors.priority.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="receiver" className="form-label">
          دریافت کننده
        </label>
        <select
          id="receiver"
          className={`form-control ${errors.receiver ? "border-red-500" : ""}`}
          {...register("receiver", {
            required: "انتخاب دریافت کننده الزامی است",
          })}
        >
          <option value="">انتخاب کنید</option>
          {receiverOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.receiver && (
          <p className="mt-1 text-xs text-red-500">{errors.receiver.message}</p>
        )}
      </div>

      {/* اضافه کردن فیلد انتخاب واحد سازمانی برای کارشناسان منطقه */}
      {(user.role === ROLES.DISTRICT_EDUCATION_EXPERT ||
        user.role === ROLES.DISTRICT_TECH_EXPERT ||
        user.role === ROLES.DISTRICT_EVAL_EXPERT) && (
        <div className="form-group">
          <label htmlFor="examCenter" className="form-label">
            واحد سازمانی
          </label>
          <select
            id="examCenter"
            className={`form-control ${
              errors.examCenter ? "border-red-500" : ""
            }`}
            {...register("examCenter", {
              required: "انتخاب واحد سازمانی الزامی است",
            })}
          >
            <option value="">انتخاب کنید</option>
            {isLoadingExamCenters ? (
              <option disabled>در حال بارگذاری...</option>
            ) : (
              examCenters.map((center) => (
                <option key={center._id} value={center._id}>
                  {center.name}
                </option>
              ))
            )}
          </select>
          {errors.examCenter && (
            <p className="mt-1 text-xs text-red-500">
              {errors.examCenter.message}
            </p>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          شرح مشکل
        </label>
        <textarea
          id="description"
          rows="5"
          className={`form-control ${
            errors.description ? "border-red-500" : ""
          }`}
          placeholder="لطفا مشکل را به طور کامل شرح دهید"
          {...register("description", {
            required: "شرح مشکل الزامی است",
            minLength: {
              value: 10,
              message: "شرح مشکل باید حداقل 10 کاراکتر باشد",
            },
          })}
        ></textarea>
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="image" className="form-label">
          تصویر خطا (اختیاری)
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          className="form-control"
          onChange={handleImageChange}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          حداکثر حجم فایل: 2 مگابایت
        </p>

        {previewUrl && (
          <div className="mt-2">
            <img
              src={previewUrl}
              alt="پیش نمایش"
              className="h-32 w-auto rounded-md object-contain"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 space-x-reverse pt-4 gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-responsive bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          disabled={isSubmitting}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 btn-icon"
          >
            <path
              fillRule="evenodd"
              d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z"
              clipRule="evenodd"
            />
          </svg>
          <span className="btn-text">انصراف</span>
        </button>

        <button
          type="submit"
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700"
          disabled={isSubmitting}
          onClick={handleSubmit((data) => onSubmit(data, false))}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4 btn-icon"
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
              <span className="btn-text">در حال ثبت...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 btn-icon"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="btn-text">
                {isEditing ? "به‌روزرسانی تیکت" : "ثبت تیکت"}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
