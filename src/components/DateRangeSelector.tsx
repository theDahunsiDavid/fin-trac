import React from "react";
import type { DateRange } from "../hooks/useDateRangeFilter";

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  customRange: { from: string; to: string };
  onCustomRangeChange: (range: { from: string; to: string }) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
  customRange,
  onCustomRangeChange,
}) => {
  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRangeChange(e.target.value as DateRange);
  };

  const handleCustomDateChange =
    (field: "from" | "to") => (e: React.ChangeEvent<HTMLInputElement>) => {
      onCustomRangeChange({
        ...customRange,
        [field]: e.target.value,
      });
    };

  return (
    <div className="flex items-center gap-4 mb-6">
      <select
        value={selectedRange}
        onChange={handleRangeChange}
        className="pl-3 pr-9 py-2 border border-gray-300 rounded text-sm"
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6,9 12,15 18,9'></polyline></svg>")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          backgroundSize: "12px",
          appearance: "none",
        }}
      >
        <option value="all-time">All time</option>
        <option value="7-days">Last 7 days</option>
        <option value="30-days">Last 30 days</option>
        <option value="90-days">Last 90 days</option>
        <option value="custom">Custom range</option>
      </select>

      {selectedRange === "custom" && (
        <>
          <input
            type="date"
            value={customRange.from}
            onChange={handleCustomDateChange("from")}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={handleCustomDateChange("to")}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </>
      )}
    </div>
  );
};
