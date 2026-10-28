export const HOTEL_CONFIG = {
  name: 'The Grand Horizon Hotel',
  tagline: 'Experience unparalleled comfort, serenity, and world-class hospitality.',
  checkInTime: '2:00 PM',
  checkOutTime: '11:00 AM',
  defaultCancellationWindowHours: 48,

  // Helper to format cancellation policy dynamically
  getCancellationPolicy: (hours = 48) =>
    `Free cancellation up to ${hours} hours before check-in`,

  // Key specifications rendered in split layout
  specs: [
    {
      id: 'check-in-out',
      icon: 'Clock',
      title: 'Check-in & Check-out',
      description: 'Check-in 2:00 PM • Check-out 11:00 AM',
    },
    {
      id: 'room-types',
      icon: 'BedDouble',
      title: 'Curated Room Types',
      description: 'Single, Double, Deluxe & Suite (1–4 guests)',
    },
    {
      id: 'wifi',
      icon: 'Wifi',
      title: 'High-Speed Wi-Fi',
      description: 'Complimentary fiber Wi-Fi in all rooms & areas',
    },
    {
      id: 'front-desk',
      icon: 'Headphones',
      title: '24/7 Front Desk',
      description: 'Round-the-clock concierge & assistance',
    },
    {
      id: 'ac',
      icon: 'Wind',
      title: 'Climate Controlled',
      description: 'Individual air conditioning in all rooms',
    },
    {
      id: 'breakfast',
      icon: 'Coffee',
      title: 'Gourmet Breakfast',
      description: 'Complimentary on select room categories',
    },
    {
      id: 'parking',
      icon: 'Car',
      title: 'Secure Parking',
      description: 'Free on-site parking for resident guests',
    },
    {
      id: 'airport',
      icon: 'Plane',
      title: 'Airport Transfers',
      description: 'Chauffeured pickup on request',
    },
    {
      id: 'cancellation',
      icon: 'ShieldCheck',
      title: 'Flexible Cancellation',
      // description is populated dynamically with cancellationWindowHours
      description: 'Free cancellation up to 48 hours before check-in',
    },
    {
      id: 'payments',
      icon: 'CreditCard',
      title: 'Payment Options',
      description: 'Secure online payment (cards, UPI) or pay at hotel',
    },
  ],

  // Trust badges shown at the bottom
  trustBadges: [
    {
      id: 'instant-confirmation',
      icon: 'Zap',
      text: 'Instant confirmation',
    },
    {
      id: 'email-dispatch',
      icon: 'Mail',
      text: 'Booking details sent by email',
    },
    {
      id: 'verified',
      icon: 'CheckCircle2',
      text: 'Best rate guarantee',
    },
  ],

  // 3 key spec chips for compact mobile banner
  mobileChips: [
    'Check-in 2 PM / Out 11 AM',
    'Free Wi-Fi & Parking',
    'Pay Online or at Hotel',
  ],
};
