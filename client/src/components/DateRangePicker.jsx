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
    <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-sm overflow-x-auto flex justify-center">
      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        fromDate={tomorrow}
        toDate={addDays(new Date(), 365)}
        numberOfMonths={isMobile ? 1 : 2}
        classNames={{
          months: 'flex flex-col md:flex-row gap-6 lg:gap-10 justify-center items-center md:items-start p-1 sm:p-2',
          month: 'bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs w-full max-w-[320px] sm:w-[320px] space-y-3',
          caption: 'flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 relative',
          caption_label: 'text-sm font-bold text-slate-800 tracking-tight',
          nav: 'flex items-center gap-1.5',
          nav_button: 'w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white border border-slate-200/60 shadow-xs transition-all active:scale-95',
          table: 'w-full border-separate border-spacing-y-1.5 border-spacing-x-1',
          head_row: 'flex justify-between mb-1',
          head_cell: 'w-9 sm:w-10 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider',
          row: 'flex justify-between w-full',
          cell: 'text-center p-0 relative',
          day: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-center text-slate-700 hover:bg-indigo-50 hover:text-indigo-600',
        }}
        modifiersClassNames={{
          selected: 'bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-600/30',
          range_start: 'rounded-xl bg-indigo-600 text-white font-bold shadow-sm',
          range_end: 'rounded-xl bg-indigo-600 text-white font-bold shadow-sm',
          range_middle: 'bg-indigo-100/90 text-indigo-800 font-semibold rounded-lg hover:bg-indigo-100',
          today: 'border-2 border-indigo-500 text-indigo-700 font-bold',
          disabled: 'text-slate-300 opacity-40 cursor-not-allowed hover:bg-transparent',
          outside: 'text-slate-300 opacity-30',
        }}
      />
    </div>
  );
}