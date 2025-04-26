export default function LoadingSpinner({ size = "sm", className = "" }) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-2 border-gray-200 dark:border-gray-700`}
      ></div>
      <div
        className={`absolute left-0 top-0 ${sizeClasses[size]} animate-spin rounded-full border-2 border-blue-500 border-t-transparent`}
      ></div>
    </div>
  );
}
