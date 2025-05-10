/**
 * ResponsiveContainer component provides consistent padding and sizing 
 * for responsive layouts across the application
 */
export default function ResponsiveContainer({
    children,
    className = "",
    as: Component = "div"
}) {
    return (
        <Component
            className={`p-3 sm:p-4 md:p-6 bg-white shadow-sm rounded-lg mb-16 ${className}`}
        >
            {children}
        </Component>
    );
}
