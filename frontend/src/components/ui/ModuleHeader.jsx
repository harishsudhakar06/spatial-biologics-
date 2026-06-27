import React from "react";

export default function ModuleHeader({
  title,
  description,
  icon: Icon,
  actions,
  className = "",
}) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-150 mb-6 gap-4 ${className}`}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight leading-tight mb-1">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-slate-500 font-normal">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
