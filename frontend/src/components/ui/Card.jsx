import React from "react";

export function Card({ children, className = "", hover = true, ...props }) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm transition-all duration-200 ${
        hover ? "hover:shadow-md hover:-translate-y-[2px] hover:border-blue-200/60" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`p-5 border-b border-slate-100 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`p-5 border-t border-slate-100 bg-slate-50/30 rounded-b-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}
