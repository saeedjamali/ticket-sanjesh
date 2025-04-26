export default function Loading() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Spinner */}
        <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
        <div className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>

        {/* Loading text */}
        <div className="mt-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
          در حال بارگذاری...
        </div>
      </div>
    </div>
  );
}
