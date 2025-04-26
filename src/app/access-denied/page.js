import Link from "next/link";

export const metadata = {
  title: "دسترسی غیرمجاز",
  description: "شما به این صفحه دسترسی ندارید",
};

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-red-600 dark:text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mx-auto h-16 w-16"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          دسترسی غیرمجاز
        </h1>

        <p className="mb-8 text-gray-700 dark:text-gray-300">
          شما به این صفحه دسترسی ندارید. لطفاً با مدیر سیستم تماس بگیرید یا به
          صفحه اصلی بازگردید.
        </p>

        <div className="flex justify-center space-x-4 space-x-reverse">
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            بازگشت به داشبورد
          </Link>

          <Link
            href="/auth/login"
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            خروج و ورود مجدد
          </Link>
        </div>
      </div>
    </div>
  );
}
