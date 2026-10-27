import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import 'react-day-picker/dist/style.css';

export default function DateRangePicker({ checkIn, checkOut, onChange }) {
  const [range, setRange] = useState({
    from: checkIn ? new Date(checkIn) : undefined,
    to: checkOut ? new Date(checkOut) : undefined,
  });

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setRange({
      from: checkIn ? new Date(checkIn) : undefined,
      to: checkOut ? new Date(checkOut) : undefined,
    });
  }, [checkIn, checkOut]);

  const handleSelect = (newRange) => {
    setRange(newRange || {});
    if (newRange?.from && newRange?.to) {
      onChange(
        format(newRange.from, 'yyyy-MM-dd'),
        format(newRange.to, 'yyyy-MM-dd')
      );
    }
  };

  const tomorrow = addDays(new Date(), 1);

  return (
    <div className="bg-white rounded-2xl p-2 sm:p-4 border border-slate-200/80 shadow-sm overflow-x-auto flex justify-center">
      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        fromDate={tomorrow}
        toDate={addDays(new Date(), 365)}
        numberOfMonths={isMobile ? 1 : 2}
        classNames={{
          root: 'flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-full',
          month: 'w-full max-w-[280px] sm:w-72 sm:min-w-72',
          month_caption: 'text-sm font-semibold text-slate-900 mb-2',
          month_captionLabel: 'text-sm font-semibold text-slate-900',
          month_grid: 'gap-1 w-full',
          day: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-medium transition-all duration-200 hover:bg-indigo-50 text-slate-700',
          day_today: 'bg-indigo-50 text-indigo-700 font-semibold',
          day_selected: 'bg-indigo-600 text-white hover:bg-indigo-700',
          day_range_start: 'bg-indigo-600 text-white rounded-l-xl',
          day_range_end: 'bg-indigo-600 text-white rounded-r-xl',
          day_range_middle: 'bg-indigo-50 text-indigo-700 rounded-none',
          day_disabled: 'text-slate-300 opacity-40 cursor-not-allowed',
          day_outside: 'text-slate-300',
          weekdays: 'text-xs font-medium text-slate-400',
          weekday: 'w-9 h-8 sm:w-10 sm:h-8',
        }}
        modifiers={{
          blocked: {
            className: 'text-slate-300 opacity-40 cursor-not-allowed',
          },
        }}
      />
    </div>
  );
}