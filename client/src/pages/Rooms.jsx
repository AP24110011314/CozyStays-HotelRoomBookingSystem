import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  SlidersHorizontal,
  X,
  Search,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
} from 'lucide-react';
import api from '../api/client';
import RoomCard from '../components/RoomCard';
import DateRangePicker from '../components/DateRangePicker';
import useDocumentTitle from '../hooks/useDocumentTitle';

const ROOM_TYPES = ['single', 'double', 'deluxe', 'suite'];
const COMMON_AMENITIES = [
  'Free WiFi',
  'Air Conditioning',
  'Smart TV',
  'Mini Bar',
  'Balcony',
  'Breakfast Included',
  'Ocean View',
  'Mountain View',
];

export default function Rooms() {
  useDocumentTitle('Search Rooms');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isMobileDatesOpen, setIsMobileDatesOpen] = useState(false);

  // Defaults
  const checkIn = searchParams.get('checkIn') || format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const checkOut = searchParams.get('checkOut') || format(addDays(new Date(), 3), 'yyyy-MM-dd');
  const guests = searchParams.get('guests') || '';
  const type = searchParams.get('type') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const amenities = searchParams.get('amenities') || '';
  const sort = searchParams.get('sort') || 'priceAsc';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local drawer state for mobile Apply / Clear
  const [tempType, setTempType] = useState(type);
  const [tempGuests, setTempGuests] = useState(guests);
  const [tempMinPrice, setTempMinPrice] = useState(minPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState(maxPrice);
  const [tempAmenities, setTempAmenities] = useState(amenities ? amenities.split(',') : []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (guests) count++;
    if (type) count++;
    if (minPrice || maxPrice) count++;
    if (amenities) count += amenities.split(',').filter(Boolean).length;
    return count;
  }, [guests, type, minPrice, maxPrice, amenities]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['rooms', 'availability', checkIn, checkOut, guests, type, minPrice, maxPrice, amenities, sort, page],
    queryFn: async () => {
      const params = {
        checkIn,
        checkOut,
        page,
        limit: 9,
        sort,
      };
      if (guests) params.guests = guests;
      if (type) params.type = type;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (amenities) params.amenities = amenities;

      const response = await api.get('/rooms', { params });
      return response.data;
    },
  });

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const handleDateChange = (newCheckIn, newCheckOut) => {
    const next = new URLSearchParams(searchParams);
    next.set('checkIn', newCheckIn);
    next.set('checkOut', newCheckOut);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleClearDates = () => {
    const next = new URLSearchParams(searchParams);
    const defaultIn = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const defaultOut = format(addDays(new Date(), 3), 'yyyy-MM-dd');
    next.set('checkIn', defaultIn);
    next.set('checkOut', defaultOut);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleApplyDrawerFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (tempType) next.set('type', tempType); else next.delete('type');
    if (tempGuests) next.set('guests', tempGuests); else next.delete('guests');
    if (tempMinPrice) next.set('minPrice', tempMinPrice); else next.delete('minPrice');
    if (tempMaxPrice) next.set('maxPrice', tempMaxPrice); else next.delete('maxPrice');
    if (tempAmenities.length > 0) next.set('amenities', tempAmenities.join(',')); else next.delete('amenities');
    next.set('page', '1');
    setSearchParams(next);
    setIsFilterDrawerOpen(false);
  };

  const handleClearAllFilters = () => {
    setTempType('');
    setTempGuests('');
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempAmenities([]);
    const next = new URLSearchParams();
    next.set('checkIn', checkIn);
    next.set('checkOut', checkOut);
    setSearchParams(next);
    setIsFilterDrawerOpen(false);
  };

  const toggleAmenity = (amenity) => {
    setTempAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const openDrawer = () => {
    setTempType(type);
    setTempGuests(guests);
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setTempAmenities(amenities ? amenities.split(',').filter(Boolean) : []);
    setIsFilterDrawerOpen(true);
  };

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const roomsList = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1 };

  const selectedRangeSummary = useMemo(() => {
    try {
      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      return `${format(inDate, 'd MMM')} to ${format(outDate, 'd MMM, yyyy')}, ${nights} night${nights !== 1 ? 's' : ''}`;
    } catch {
      return `${checkIn} to ${checkOut}, ${nights} nights`;
    }
  }, [checkIn, checkOut, nights]);

  const guestCountNum = parseInt(guests, 10) || 1;
  const handleGuestsChange = (newCount) => {
    const clamped = Math.max(1, Math.min(10, newCount));
    updateParam('guests', clamped > 1 ? clamped.toString() : '');
  };

  return (
    <div className="space-y-8">
      {/* Page Hero Header: macOS Liquid Vibrant Emerald Surface */}
      <div className="relative rounded-3xl text-ivory p-6 sm:p-10 overflow-hidden bg-gradient-to-br from-forest-800 via-forest to-forest-900 border border-forest-600/60 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),0_12px_36px_-4px_rgba(27,77,62,0.35)]">
        {/* Soft liquid light orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brass/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-sage/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mac-glass-badge text-ivory">
            ✨ Guaranteed Best Rates Online
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-xs">
            Find Your Dream Stay
          </h1>
          <p className="text-ivory/85 text-sm sm:text-base leading-relaxed">
            Discover boutique rooms, serene suites, and modern comforts with live cloud availability and instant confirmation.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Sidebar (Desktop) + Right Results */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* DESKTOP SIDEBAR (1024px and up): Exactly 320px wide, ordered: Calendar -> Summary -> Guests -> Filters */}
        <aside
          aria-label="Search and filter sidebar"
          className="hidden lg:flex flex-col gap-4 w-[320px] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1"
        >
          {/* 1. One-Month Calendar Card */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-taupe/60">
              <span className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-forest" />
                Select Dates
              </span>
              <button
                type="button"
                onClick={handleClearDates}
                className="text-[11px] font-semibold text-brass hover:text-forest transition-colors cursor-pointer"
              >
                Clear dates
              </button>
            </div>

            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={handleDateChange}
              onClear={handleClearDates}
            />

            {/* 2. Selected-Range Summary */}
            <div className="pt-2 border-t border-taupe/60 text-center mac-subpanel p-2.5">
              <p className="text-xs font-bold text-forest">
                {selectedRangeSummary}
              </p>
              <p className="text-[11px] text-charcoal/70 mt-0.5 font-medium">
                Standard Check-in 2:00 PM • Check-out 11:00 AM
              </p>
            </div>
          </div>

          {/* 3. Guests Stepper */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest block">Guests</label>
                <span className="text-[11px] text-charcoal/60">Adults & children</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGuestsChange(guestCountNum - 1)}
                  disabled={guestCountNum <= 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-taupe text-charcoal hover:bg-forest/10 hover:border-forest/40 disabled:opacity-30 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  aria-label="Decrease guests"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-bold text-charcoal" data-testid="guests-count">
                  {guestCountNum}
                </span>
                <button
                  type="button"
                  onClick={() => handleGuestsChange(guestCountNum + 1)}
                  disabled={guestCountNum >= 10}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-taupe text-charcoal hover:bg-forest/10 hover:border-forest/40 disabled:opacity-30 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  aria-label="Increase guests"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. FilterPanel */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-taupe pb-3">
              <h3 className="font-bold text-forest flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-forest" />
                Filter Rooms
              </h3>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-xs font-semibold text-brass hover:text-forest flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Room Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Room Type</label>
              <select
                value={type}
                onChange={(e) => updateParam('type', e.target.value)}
                className="input py-2 px-3 text-sm cursor-pointer"
              >
                <option value="">All Types</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Price Range (₹)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => updateParam('minPrice', e.target.value)}
                  className="input py-2 px-3 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => updateParam('maxPrice', e.target.value)}
                  className="input py-2 px-3 text-sm"
                />
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Sort By</label>
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="input py-2 px-3 text-sm cursor-pointer"
              >
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
                <option value="type">Room Type</option>
              </select>
            </div>

            {/* Amenities Multi-select */}
            <div className="space-y-2 pt-2 border-t border-taupe">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Amenities</label>
              <div className="space-y-2">
                {COMMON_AMENITIES.map((item) => {
                  const currentList = amenities ? amenities.split(',').filter(Boolean) : [];
                  const isChecked = currentList.includes(item);
                  return (
                    <label key={item} className="flex items-center gap-2 text-xs text-charcoal cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const nextList = e.target.checked
                            ? [...currentList, item]
                            : currentList.filter((a) => a !== item);
                          updateParam('amenities', nextList.join(','));
                        }}
                        className="rounded border-taupe text-forest focus:ring-forest w-4 h-4"
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* RESULTS AREA (Right Column) */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* MOBILE & TABLET CONTROLS (below 1024px) */}
          <div className="lg:hidden space-y-3">
            {/* Collapsible Dates Card */}
            <div className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setIsMobileDatesOpen(!isMobileDatesOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-forest/5 transition-colors"
                aria-expanded={isMobileDatesOpen}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-forest shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal/60 block">Dates</span>
                    <span className="text-xs font-semibold text-forest">
                      {selectedRangeSummary}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-brass">
                  <span>{isMobileDatesOpen ? 'Hide' : 'Change'}</span>
                  {isMobileDatesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isMobileDatesOpen && (
                <div className="p-3 pt-0 border-t border-taupe/60 space-y-3 mac-subpanel rounded-none">
                  <DateRangePicker
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onChange={(inD, outD) => {
                      handleDateChange(inD, outD);
                    }}
                    onClear={handleClearDates}
                  />
                </div>
              )}
            </div>

            {/* Filters Trigger Button directly below Dates card */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openDrawer}
                className="card flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-charcoal hover:bg-white min-h-[44px] transition-all active:scale-[0.98]"
              >
                <SlidersHorizontal className="w-4 h-4 text-forest" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-forest text-ivory text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="input text-xs py-2.5 px-3 font-medium text-charcoal min-h-[44px] w-auto shrink-0"
                aria-label="Sort options"
              >
                <option value="priceAsc">Price: Low-High</option>
                <option value="priceDesc">Price: High-Low</option>
                <option value="name">Name</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-charcoal">
                {isLoading ? 'Searching rooms...' : `${meta.total} Room${meta.total !== 1 ? 's' : ''} Available`}
              </span>
              {activeFilterCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-taupe/50 text-forest">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              )}
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs text-charcoal/60">
                {checkIn} &rarr; {checkOut} ({nights} night{nights !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Room Cards: 1 column on mobile, 2 on tablet, 3 on desktop */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-taupe p-4 space-y-4 animate-pulse">
                  <div className="aspect-[4/3] bg-taupe/50 rounded-xl"></div>
                  <div className="h-5 bg-taupe/50 rounded w-2/3"></div>
                  <div className="h-4 bg-taupe/50 rounded w-full"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-taupe/50 rounded w-16"></div>
                    <div className="h-6 bg-taupe/50 rounded w-16"></div>
                  </div>
                  <div className="h-8 bg-taupe/50 rounded w-1/3 pt-4"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-brick-200 p-8">
              <p className="text-brick text-base font-bold">Failed to load rooms</p>
              <p className="text-charcoal/70 text-sm mt-1">Please try again or check your dates.</p>
            </div>
          ) : roomsList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-taupe p-8 space-y-3">
              <Search className="w-12 h-12 text-taupe mx-auto" />
              <h4 className="text-base font-bold text-charcoal">No rooms available</h4>
              <p className="text-charcoal/70 text-sm max-w-sm mx-auto">
                No rooms match your chosen criteria. Try adjusting dates or removing some filters.
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="btn-secondary text-xs px-4 py-2 mt-2"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {roomsList.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  checkIn={checkIn}
                  checkOut={checkOut}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                type="button"
                onClick={() => updateParam('page', (page - 1).toString())}
                disabled={page <= 1}
                className="btn-secondary text-xs px-3 py-2 min-h-[44px] inline-flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="px-4 text-xs font-semibold text-charcoal">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => updateParam('page', (page + 1).toString())}
                disabled={page >= meta.totalPages}
                className="btn-secondary text-xs px-3 py-2 min-h-[44px] inline-flex items-center gap-1 disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-in Drawer / Bottom Sheet for Filters */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs"
            onClick={() => setIsFilterDrawerOpen(false)}
          ></div>

          {/* Drawer Body */}
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-taupe pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-forest" />
                <h3 className="font-bold text-lg text-forest">Filter Rooms</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-charcoal hover:bg-taupe/30 min-h-[44px]"
                aria-label="Close Filter Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Room Type</label>
              <select
                value={tempType}
                onChange={(e) => setTempType(e.target.value)}
                className="w-full text-base rounded-xl border border-taupe focus:border-forest focus:ring-forest py-3 px-3"
              >
                <option value="">All Types</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Guests */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Guests</label>
              <select
                value={tempGuests}
                onChange={(e) => setTempGuests(e.target.value)}
                className="w-full text-base rounded-xl border border-taupe focus:border-forest focus:ring-forest py-3 px-3"
              >
                <option value="">Any Guests</option>
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
                <option value="5">5+ Guests</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Price Range (₹)</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Min Price"
                  value={tempMinPrice}
                  onChange={(e) => setTempMinPrice(e.target.value)}
                  className="w-full text-base rounded-xl border border-taupe focus:border-forest focus:ring-forest py-3 px-3"
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  value={tempMaxPrice}
                  onChange={(e) => setTempMaxPrice(e.target.value)}
                  className="w-full text-base rounded-xl border border-taupe focus:border-forest focus:ring-forest py-3 px-3"
                />
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70">Amenities</label>
              <div className="grid grid-cols-2 gap-2.5">
                {COMMON_AMENITIES.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      tempAmenities.includes(item)
                        ? 'border-forest bg-forest/10 text-forest font-bold'
                        : 'border-taupe text-charcoal hover:bg-taupe/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={tempAmenities.includes(item)}
                      onChange={() => toggleAmenity(item)}
                      className="sr-only"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions: Apply & Clear */}
            <div className="pt-4 border-t border-taupe flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="btn-secondary flex-1 justify-center min-h-[48px] text-sm"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={handleApplyDrawerFilters}
                className="btn-primary flex-1 justify-center min-h-[48px] text-sm shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
