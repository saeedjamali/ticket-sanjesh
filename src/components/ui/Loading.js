export default function Loading() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center justify-center">
        {/* Spinner */}
        {/* <div className="h-12 w-12 rounded-full  border-4 border-blue-500 border-t-transparent"></div> */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>

        {/* Loading text */}
        <div className="mt-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
          در حال بارگذاری...
        </div>
      </div>
    </div>
  );
}
