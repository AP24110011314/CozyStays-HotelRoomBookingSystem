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
    <div className="space-y-6">
      {/* 2-column specifications grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5" data-testid="hotel-specs-grid">
        {specs.map((spec) => {
          const Icon = ICON_MAP[spec.icon] || ShieldCheck;
          return (
            <div
              key={spec.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                isOverlay
                  ? 'bg-[#0c1f19]/92 backdrop-blur-md border border-brass/40 shadow-md hover:border-brass/70'
                  : 'bg-white border border-taupe-300 shadow-xs hover:border-forest/40'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                  isOverlay
                    ? 'bg-brass text-charcoal'
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
                    isOverlay ? 'text-white' : 'text-charcoal'
                  }`}
                >
                  {spec.title}
                </p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug font-medium ${
                    isOverlay ? 'text-taupe-100' : 'text-charcoal-700'
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
          isOverlay
            ? 'border-brass/30 text-white font-semibold'
            : 'border-taupe text-charcoal font-semibold'
        }`}
        data-testid="hotel-trust-row"
      >
        {HOTEL_CONFIG.trustBadges.map((badge) => {
          const BadgeIcon = ICON_MAP[badge.icon] || CheckCircle2;
          return (
            <div key={badge.id} className="flex items-center gap-1.5 font-medium">
              <BadgeIcon
                className={`w-3.5 h-3.5 ${isOverlay ? 'text-brass' : 'text-forest'}`}
              />
              <span>{badge.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
