import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import 'react-day-picker/dist/style.css';

export default function DateRangePicker({ checkIn, checkOut, onChange }) {
  const [range, setRange] = useState({
    from: checkIn ? new Date(checkIn) : undefined,
    to: checkOut ? new Date(checkOut) : undefined,
  });

  const handleSelect = (newRange) => {
    setRange(newRange);
    if (newRange.from && newRange.to) {
      onChange(
        format(newRange.from, 'yyyy-MM-dd'),
        format(newRange.to, 'yyyy-MM-dd')
      );
    }
  };

  const tomorrow = addDays(new Date(), 1);

  return (
    <div className="card p-4">
      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        fromDate={tomorrow}
        toDate={addDays(new Date(), 365)}
        numberOfMonths={2}
        classNames={{
          root: 'flex gap-4',
          month: 'w-64',
          day: 'w-10 h-10',
        }}
        modifiers={{
          blocked: {
            className: 'text-gray-300 opacity-50 cursor-not-allowed',
          },
        }}
      />
    </div>
  );
}