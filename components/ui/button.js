export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition ${className}`}
    >
      {children}
    </button>
  );
}
