import React from "react";
import Button from "./Button";

export default function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-100 rounded-2xl shadow-sm ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
          <Icon size={22} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="secondary" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
