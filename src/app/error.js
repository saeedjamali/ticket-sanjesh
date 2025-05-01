"use client";
import styles from "@/style/404.module.css";
import Link from "next/link";

const page = () => {
  return (
    <div id="error-page" className="h-screen w-full flex-center mt-16">
      <div className="text-center font-iranyekanMedium w-full h-screen">
        <h1 className="mb-4 text-6xl font-semibold text-red-500">404</h1>
        <p className="mb-4 text-lg text-gray-600">خطا در دسترسی به این صفحه</p>
        <div className="animate-bounce">
          <svg
            className="mx-auto h-16 w-16 text-blue-500 rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            ></path>
          </svg>
        </div>
        <p className="mt-4 text-gray-600">
          برگرد به صفحه اصلی{" "}
          <Link href="/" className="text-blue-500" >
            خانه
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default page;
