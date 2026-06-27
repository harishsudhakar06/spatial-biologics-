import React from "react";

export default function Badge({
  children,
  variant = "info",
  className = "",
  ...props
}) {
  const baseStyle = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border";
  
  const variants = {
    info: "bg-blue-50 text-blue-700 border-blue-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-red-50 text-red-700 border-red-100",
    pink: "bg-pink-50 text-pink-700 border-pink-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
