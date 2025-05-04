"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export default function EditTicketForm({
  user,
  ticket,
  setIsEditing,
  isEditing,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
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
        }
      : {},
  });

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

  const onSubmit = async (data, isDraft = false) => {
    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("priority", data.priority);
      formData.append("description", data.description);
      formData.append("receiver", data.receiver);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      // console.log("formData---->", formData);
      const res = await fetch(`/api/tickets/${ticket._id}`, {
        method: "PUT",
        header: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "خطا در ویرایش تیکت");
        // setLoading(false);
        return;
      }

      // موفقیت: ریدایرکت یا پیام موفقیت
      // router.push(`/dashboard/tickets/${ticket._id}`);
      setIsSubmitting(true);
      setIsEditing(false);
      // router.refresh();
      location.reload();
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
          defaultValue={ticket.title}
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
          defaultValue={ticket.priority}
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
        <label htmlFor="description" className="form-label">
          شرح مشکل
        </label>
        <textarea
          id="description"
          defaultValue={ticket.description}
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
        <label htmlFor="receiver" className="form-label">
          دریافت کننده
        </label>
        <select
          id="receiver"
          defaultValue={ticket.receiver}
          className={`form-control ${errors.receiver ? "border-red-500" : ""}`}
          {...register("receiver", {
            required: "انتخاب دریافت کننده الزامی است",
          })}
        >
          <option value="">انتخاب کنید</option>
          <option value="education">کارشناس سنجش منطقه</option>
          <option value="tech">کارشناس فناوری منطقه</option>
        </select>
        {errors.receiver && (
          <p className="mt-1 text-xs text-red-500">{errors.receiver.message}</p>
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
          onClick={() => setIsEditing(false)}
          className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          disabled={isSubmitting}
        >
          انصراف
        </button>
        {/* 
        {!isEditing && (
          <button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, true))}
            className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
            disabled={isSubmitting}
          >
            ذخیره پیش‌نویس
          </button>
        )} */}

        <button
          type="submit"
          className="btn bg-orange-500"
          disabled={isSubmitting}
          onClick={handleSubmit((data) => onSubmit(data, false))}
        >
          {isSubmitting
            ? "در حال ثبت..."
            : isEditing
            ? "به‌روزرسانی تیکت"
            : "ویرایش تیکت"}
        </button>
      </div>
    </form>
  );
}
