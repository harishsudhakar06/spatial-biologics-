import React from "react";

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  className = "",
  ...props
}) {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm focus:ring-blue-500 border border-transparent",
    secondary: "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm focus:ring-blue-500",
    danger: "bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 focus:ring-red-500",
    success: "bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-600 focus:ring-emerald-500",
    ghost: "bg-transparent hover:bg-slate-50 text-slate-600 focus:ring-slate-400",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-5 py-3 text-base rounded-xl",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
