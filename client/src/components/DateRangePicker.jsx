import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import { XCircle } from 'lucide-react';
import 'react-day-picker/dist/style.css';

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  disabledDates = [],
  onClear,
  className = '',
}) {
  const [range, setRange] = useState({
    from: checkIn ? new Date(checkIn) : undefined,
    to: checkOut ? new Date(checkOut) : undefined,
  });

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

  const handleClear = (e) => {
    e.preventDefault();
    setRange({});
    if (onClear) {
      onClear();
    }
  };

  const tomorrow = addDays(new Date(), 1);
  const maxDate = addDays(new Date(), 365);

  const hasSelection = Boolean(range?.from || range?.to);

  return (
    <div className={`w-full max-w-[320px] mx-auto select-none ${className}`}>
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-taupe shadow-xs">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={handleSelect}
          fromDate={tomorrow}
          toDate={maxDate}
          disabled={disabledDates}
          numberOfMonths={1}
          classNames={{
            months: 'flex flex-col items-center w-full',
            month: 'w-full space-y-3',
            caption: 'flex items-center justify-between pb-2 mb-1 border-b border-taupe/80 relative',
            caption_label: 'text-sm font-bold text-forest tracking-tight',
            nav: 'flex items-center gap-1',
            nav_button:
              'w-8 h-8 rounded-lg flex items-center justify-center text-charcoal hover:text-forest hover:bg-taupe/40 border border-taupe/70 shadow-2xs transition-all active:scale-95',
            table: 'w-full border-separate border-spacing-y-1 border-spacing-x-0.5',
            head_row: 'flex justify-between mb-1',
            head_cell: 'w-9 sm:w-10 text-center text-[11px] font-bold text-charcoal/60 uppercase tracking-wider',
            row: 'flex justify-between w-full mt-0.5',
            cell: 'text-center p-0 relative',
            day: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-center text-charcoal hover:bg-forest/10 hover:text-forest',
          }}
          modifiersClassNames={{
            selected: 'bg-forest text-ivory font-bold hover:bg-forest/90 shadow-xs',
            range_start: 'rounded-xl bg-forest text-ivory font-bold shadow-xs',
            range_end: 'rounded-xl bg-forest text-ivory font-bold shadow-xs',
            range_middle: 'bg-brass/25 text-charcoal font-semibold rounded-lg hover:bg-brass/35',
            today: 'ring-2 ring-brass font-bold text-forest',
            disabled: 'text-charcoal/30 opacity-40 cursor-not-allowed hover:bg-transparent',
            outside: 'text-charcoal/20 opacity-30',
          }}
        />

        {hasSelection && onClear && (
          <div className="pt-2.5 mt-2 border-t border-taupe/70 text-right">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-semibold text-charcoal/70 hover:text-forest transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Clear dates
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
