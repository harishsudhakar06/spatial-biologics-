import React, { useState, useEffect, useRef } from "react";
import { Card } from "./Card";

export function StatCounter({ value, duration = 1000 }) {
  const [current, setCurrent] = useState(0);
  const elementRef = useRef(null);
  
  const numMatch = String(value).match(/[\d.]+/);
  const targetNum = numMatch ? parseFloat(numMatch[0]) : 0;
  const suffix = String(value).replace(/[\d.]+/, "");

  useEffect(() => {
    let observer;
    let started = false;

    const startCount = () => {
      if (started) return;
      started = true;
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentCount = progress * targetNum;
        
        const isDecimal = String(targetNum).includes(".");
        setCurrent(isDecimal ? currentCount.toFixed(1) : Math.floor(currentCount));
        
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          setCurrent(targetNum);
        }
      };
      window.requestAnimationFrame(step);
    };

    if (elementRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            startCount();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(elementRef.current);
    }

    return () => {
      if (observer && elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [targetNum, duration]);

  const formatValue = () => {
    if (targetNum === 0) return value;
    if (String(value).includes(",")) {
      return Math.floor(current).toLocaleString() + suffix;
    }
    return current + suffix;
  };

  return <span ref={elementRef}>{formatValue()}</span>;
}

export default function StatCard({ title, value, icon: Icon, description, iconColor = "text-blue-600" }) {
  return (
    <Card hover={true} className="flex items-center justify-between p-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 mb-1 truncate">{title}</p>
        <h3 className="text-3xl font-semibold text-slate-900 leading-none">
          <StatCounter value={value} />
        </h3>
        {description && (
          <p className="text-xs text-slate-400 mt-1 truncate">{description}</p>
        )}
      </div>
      {Icon && (
        <div className={`w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center ${iconColor} ml-4 flex-shrink-0`}>
          <Icon size={20} />
        </div>
      )}
    </Card>
  );
}
