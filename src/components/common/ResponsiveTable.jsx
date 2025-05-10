/**
 * ResponsiveTable component wraps tables in a responsive container
 * to handle horizontal scrolling on small screens
 */
export default function ResponsiveTable({ children, className = "" }) {
    return (
        <div className={`table-responsive ${className}`}>
            {children}
        </div>
    );
}