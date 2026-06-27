import React from "react";

export default function Input({
  type = "text",
  placeholder = "",
  value,
  onChange,
  className = "",
  error = "",
  ...props
}) {
  return (
    <div className="w-full">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-white border border-slate-200 text-slate-900 text-sm px-4 py-2.5 rounded-xl transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 ${
          error ? "border-red-500 focus:ring-red-100 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
