import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={18} />,
            error: <XCircle className="text-red-500 flex-shrink-0" size={18} />,
            warning: <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />,
            info: <Info className="text-blue-500 flex-shrink-0" size={18} />,
          };
          
          const bgColors = {
            success: "bg-white border-emerald-100 shadow-emerald-50/10",
            error: "bg-white border-red-100 shadow-red-50/10",
            warning: "bg-white border-amber-100 shadow-amber-50/10",
            info: "bg-white border-blue-100 shadow-blue-50/10",
          };

          return (
            <div
              key={toast.id}
              className={`flex items-center justify-between gap-3 p-4 rounded-xl border shadow-lg animate-slide-in pointer-events-auto transition-all ${bgColors[toast.type]}`}
            >
              <div className="flex items-center gap-2.5">
                {icons[toast.type]}
                <span className="text-sm font-medium text-slate-800">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
