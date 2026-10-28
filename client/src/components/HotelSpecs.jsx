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

  const isOverlay = variant === 'overlay';

  return (
    <div className="space-y-3.5 xl:space-y-4">
      {/* 2-column specifications grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3" data-testid="hotel-specs-grid">
        {specs.map((spec) => {
          const Icon = ICON_MAP[spec.icon] || ShieldCheck;
          return (
            <div
              key={spec.id}
              className={`flex items-start gap-2.5 p-2.5 sm:p-3 rounded-2xl transition-all ${
                isOverlay
                  ? 'mac-glass mac-glass-hover'
                  : 'bg-white border border-taupe shadow-xs hover:border-forest/40'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isOverlay
                    ? 'bg-gradient-to-b from-brass-300 via-brass to-brass-600 text-charcoal shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]'
                    : 'bg-forest text-ivory'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isOverlay ? 'text-charcoal stroke-[2.4]' : 'text-ivory stroke-[2.2]'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold leading-tight ${
                    isOverlay ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-charcoal'
                  }`}
                >
                  {spec.title}
                </p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug font-medium ${
                    isOverlay ? 'text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]' : 'text-charcoal-700'
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
        className={`pt-2.5 xl:pt-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
          isOverlay
            ? 'mac-glass-card rounded-2xl px-4 py-3 shadow-lg'
            : 'border-t border-taupe text-charcoal font-semibold'
        }`}
        data-testid="hotel-trust-row"
      >
        {HOTEL_CONFIG.trustBadges.map((badge) => {
          const BadgeIcon = ICON_MAP[badge.icon] || CheckCircle2;
          return (
            <div key={badge.id} className="flex items-center gap-1.5 font-bold">
              <BadgeIcon
                className={`w-4 h-4 ${isOverlay ? 'text-brass-300 drop-shadow-sm' : 'text-forest'}`}
              />
              <span
                className={
                  isOverlay
                    ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                    : 'text-charcoal'
                }
              >
                {badge.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
