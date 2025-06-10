"use client";

import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { FaUpload, FaFile, FaTimes, FaSpinner } from "react-icons/fa";

export default function FileUpload({
  onFileUploaded,
  onFileRemoved,
  maxFiles = 5,
  existingFiles = [],
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(existingFiles);
  const fileInputRef = useRef(null);

  const allowedExtensions = [".zip", ".rar", ".7z", ".tar", ".gz"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);

    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`حداکثر ${maxFiles} فایل مجاز است`);
      return;
    }

    for (const file of files) {
      await uploadFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file) => {
    // بررسی نوع فایل
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error(
        `فقط فایل‌های فشرده مجاز هستند: ${allowedExtensions.join(", ")}`
      );
      return;
    }

    // بررسی سایز فایل
    if (file.size > maxFileSize) {
      toast.error(
        `حجم فایل نباید بیشتر از ${maxFileSize / (1024 * 1024)}MB باشد`
      );
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const newFile = data.file;
        setUploadedFiles((prev) => [...prev, newFile]);

        if (onFileUploaded) {
          onFileUploaded(newFile);
        }

        toast.success("فایل با موفقیت آپلود شد");
      } else {
        toast.error(data.message || "خطا در آپلود فایل");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("خطا در آپلود فایل");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    const fileToRemove = uploadedFiles[index];
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);

    if (onFileRemoved) {
      onFileRemoved(fileToRemove, index);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (filename) => {
    const extension = filename
      .toLowerCase()
      .substring(filename.lastIndexOf("."));
    return <FaFile className="text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("border-blue-400", "bg-blue-50");
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");

          if (disabled || uploading || uploadedFiles.length >= maxFiles) return;

          const files = Array.from(e.dataTransfer.files);
          if (uploadedFiles.length + files.length > maxFiles) {
            toast.error(`حداکثر ${maxFiles} فایل مجاز است`);
            return;
          }

          files.forEach(uploadFile);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".zip,.rar,.7z,.tar,.gz"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading || uploadedFiles.length >= maxFiles}
        />

        <div className="space-y-2">
          <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                disabled || uploading || uploadedFiles.length >= maxFiles
              }
              className="text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <FaSpinner className="animate-spin ml-2" />
                  در حال آپلود...
                </span>
              ) : (
                "انتخاب فایل فشرده"
              )}
            </button>
            <span className="text-gray-500"> یا فایل را اینجا بکشید</span>
          </div>
          <p className="text-xs text-gray-500">
            فقط فایل‌های فشرده (ZIP, RAR, 7Z, TAR, GZ) - حداکثر 10MB
          </p>
          <p className="text-xs text-gray-500">
            حداکثر {maxFiles} فایل ({uploadedFiles.length}/{maxFiles})
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            فایل‌های آپلود شده:
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.originalName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="flex-shrink-0 p-1 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title="حذف فایل"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
