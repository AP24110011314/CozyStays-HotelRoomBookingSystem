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
  showClearButton = true,
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
    <div className={`w-full select-none ${className}`}>
      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        fromDate={tomorrow}
        toDate={maxDate}
        disabled={disabledDates}
        numberOfMonths={1}
        showOutsideDays={true}
        classNames={{
          months: 'w-full',
          month: 'w-full space-y-2',
          caption: 'flex items-center justify-between pb-2 mb-2 border-b border-taupe/80 relative',
          caption_label: 'text-sm font-bold text-forest tracking-tight',
          nav: 'flex items-center gap-1',
          nav_button:
            'w-7 h-7 rounded-lg flex items-center justify-center text-charcoal hover:text-forest hover:bg-taupe/40 border border-taupe/70 shadow-2xs transition-all active:scale-95',
          table: 'w-full table-fixed border-collapse',
          head_row: '',
          head_cell: 'text-center text-[11px] font-bold text-charcoal/70 uppercase tracking-wider py-1',
          row: '',
          cell: 'text-center p-0.5 relative',
          day: 'w-8 h-8 mx-auto rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center text-charcoal hover:bg-forest/10 hover:text-forest',
        }}
        modifiersClassNames={{
          selected: 'bg-forest text-ivory font-bold hover:bg-forest shadow-xs',
          range_start: 'rounded-lg bg-forest text-ivory font-bold shadow-xs',
          range_end: 'rounded-lg bg-forest text-ivory font-bold shadow-xs',
          range_middle: 'bg-brass/25 text-charcoal font-bold rounded-none hover:bg-brass/35',
          today: 'ring-2 ring-brass font-bold text-forest',
          disabled: 'text-charcoal/45 font-medium cursor-not-allowed hover:bg-transparent',
          outside: 'text-taupe-400 font-normal opacity-50',
        }}
      />

      {showClearButton && hasSelection && onClear && (
        <div className="pt-2 mt-2 border-t border-taupe/70 text-right">
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
  );
}
