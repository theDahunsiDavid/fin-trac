import React from 'react';
import type { DateRange } from '../hooks/useDateRangeFilter';

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

  const handleCustomDateChange = (field: 'from' | 'to') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
        className="px-3 py-2 border border-gray-300 rounded text-sm"
      >
        <option value="all-time">All time</option>
        <option value="7-days">Last 7 days</option>
        <option value="30-days">Last 30 days</option>
        <option value="90-days">Last 90 days</option>
        <option value="custom">Custom range</option>
      </select>

      {selectedRange === 'custom' && (
        <>
          <input
            type="date"
            value={customRange.from}
            onChange={handleCustomDateChange('from')}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={handleCustomDateChange('to')}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </>
      )}
    </div>
  );
};
