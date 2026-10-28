import { CheckCircle2, Clock, Hotel, RotateCcw, AlertCircle, XCircle } from 'lucide-react';

const paymentStatusConfig = {
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    className: 'bg-forest text-ivory border-forest shadow-2xs',
  },
  pay_at_hotel: {
    label: 'Pay at Hotel',
    icon: Hotel,
    className: 'bg-taupe-100 text-forest font-bold border-taupe',
  },
  pending: {
    label: 'Pending Payment',
    icon: Clock,
    className: 'bg-brass-50 text-brass-800 border-brass font-bold',
  },
  pending_payment: {
    label: 'Pending Payment',
    icon: Clock,
    className: 'bg-brass-50 text-brass-800 border-brass font-bold',
  },
  refunded: {
    label: 'Refunded',
    icon: RotateCcw,
    className: 'bg-taupe-100 text-charcoal/80 border-taupe',
  },
  partially_refunded: {
    label: 'Partially Refunded',
    icon: RotateCcw,
    className: 'bg-taupe-100 text-charcoal/80 border-taupe',
  },
  failed: {
    label: 'Payment Failed',
    icon: AlertCircle,
    className: 'bg-brick-50 text-brick border-brick-200 font-bold',
  },
  expired: {
    label: 'Hold Expired',
    icon: XCircle,
    className: 'bg-brick-50 text-brick border-brick-200 font-bold',
  },
};

export default function PaymentBadge({ status = 'pending', className = '', showIcon = true }) {
  const config = paymentStatusConfig[status] || {
    label: status,
    icon: Clock,
    className: 'bg-taupe-100 text-charcoal/80 border-taupe',
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
