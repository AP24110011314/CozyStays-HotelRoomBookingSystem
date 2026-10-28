import {
  Clock,
  BedDouble,
  Wifi,
  Headphones,
  Wind,
  Coffee,
  Car,
  Plane,
  ShieldCheck,
  CreditCard,
  Zap,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { HOTEL_CONFIG } from '../config/hotel';

const ICON_MAP = {
  Clock,
  BedDouble,
  Wifi,
  Headphones,
  Wind,
  Coffee,
  Car,
  Plane,
  ShieldCheck,
  CreditCard,
  Zap,
  Mail,
  CheckCircle2,
};

export default function HotelSpecs({ cancellationHours, variant = 'full' }) {
  const hours = cancellationHours || HOTEL_CONFIG.defaultCancellationWindowHours;

  const specs = HOTEL_CONFIG.specs.map((spec) => {
    if (spec.id === 'cancellation') {
      return {
        ...spec,
        description: HOTEL_CONFIG.getCancellationPolicy(hours),
      };
    }
    return spec;
  });

  return (
    <div className="space-y-6">
      {/* 2-column specifications grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4" data-testid="hotel-specs-grid">
        {specs.map((spec) => {
          const Icon = ICON_MAP[spec.icon] || ShieldCheck;
          return (
            <div
              key={spec.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                variant === 'overlay'
                  ? 'bg-forest-950/60 backdrop-blur-md border border-forest-700/60 text-ivory'
                  : 'bg-white border border-taupe shadow-xs'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  variant === 'overlay'
                    ? 'bg-forest-800/80 text-brass border border-brass/20'
                    : 'bg-forest-50 text-brass border border-taupe/80'
                }`}
              >
                <Icon className="w-4 h-4 text-brass" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold leading-tight ${
                    variant === 'overlay' ? 'text-ivory' : 'text-charcoal'
                  }`}
                >
                  {spec.title}
                </p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug ${
                    variant === 'overlay' ? 'text-ivory/80' : 'text-charcoal/70'
                  }`}
                >
                  {spec.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Badges Row */}
      <div
        className={`pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          variant === 'overlay'
            ? 'border-ivory/15 text-ivory/90'
            : 'border-taupe text-charcoal/80'
        }`}
        data-testid="hotel-trust-row"
      >
        {HOTEL_CONFIG.trustBadges.map((badge) => {
          const BadgeIcon = ICON_MAP[badge.icon] || CheckCircle2;
          return (
            <div key={badge.id} className="flex items-center gap-1.5 font-medium">
              <BadgeIcon className="w-3.5 h-3.5 text-brass" />
              <span>{badge.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
