import React from "react";

export function TableContainer({ children, className = "" }) {
  return (
    <div className={`w-full overflow-x-auto border border-slate-200/80 rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Table({ children, className = "", ...props }) {
  return (
    <table className={`w-full text-left border-collapse bg-white ${className}`} {...props}>
      {children}
    </table>
  );
}

export function TableHeader({ children, className = "" }) {
  return (
    <thead className={`bg-slate-50/70 border-b border-slate-200/80 text-slate-700 text-[11px] font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = "" }) {
  return (
    <tbody className={`divide-y divide-slate-100 text-sm text-slate-600 ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = "", hover = true, striped = false, ...props }) {
  return (
    <tr
      className={`transition-colors ${
        striped ? "odd:bg-white even:bg-slate-50/30" : "bg-white"
      } ${hover ? "hover:bg-slate-50/50" : ""} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "", header = false, ...props }) {
  if (header) {
    return (
      <th className={`px-6 py-4 font-semibold text-slate-800 border-b border-slate-200/80 ${className}`} {...props}>
        {children}
      </th>
    );
  }
  return (
    <td className={`px-6 py-4 border-b border-slate-100/50 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) {
  return (
    <div className={`flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-white rounded-b-2xl ${className}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Showing Page <span className="font-semibold text-slate-850">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-850">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-55 focus:z-20 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-55 focus:z-20 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
