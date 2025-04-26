const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
};

export default function LoadingSpinner({
    size = 'md',
    className = '',
    light = false,
}) {
    const baseClasses = 'inline-block rounded-full animate-spin';
    const colorClasses = light
        ? 'border-white/20 border-t-white'
        : 'border-gray-200 border-t-blue-600';

    return (
        <div
            className={`${baseClasses} ${sizeClasses[size]} ${colorClasses} ${className}`}
            role="status"
            aria-label="در حال بارگذاری..."
        >
            <span className="sr-only">در حال بارگذاری...</span>
        </div>
    );
} 