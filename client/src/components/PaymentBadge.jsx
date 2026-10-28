import { CheckCircle2, Clock, Hotel, RotateCcw, AlertCircle } from 'lucide-react';

const paymentStatusConfig = {
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  pay_at_hotel: {
    label: 'Pay at Hotel',
    icon: Hotel,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  pending: {
    label: 'Payment Pending',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  refunded: {
    label: 'Refunded',
    icon: RotateCcw,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  partially_refunded: {
    label: 'Partially Refunded',
    icon: RotateCcw,
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  failed: {
    label: 'Payment Failed',
    icon: AlertCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export default function PaymentBadge({ status = 'pending', className = '', showIcon = true }) {
  const config = paymentStatusConfig[status] || {
    label: status,
    icon: Clock,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}

