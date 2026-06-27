import React from "react";

export default function Loader({ text = "Loading..." }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-xs text-gray-400">{text}</span>
      </div>
    </div>
  );
}