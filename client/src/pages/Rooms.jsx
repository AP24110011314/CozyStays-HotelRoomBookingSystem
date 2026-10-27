import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { SlidersHorizontal, X, Search, RotateCcw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 rounded-3xl text-white p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-pattern opacity-10 pointer-events-none"></div>
        <div className="relative max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-indigo-100 backdrop-blur-md">
            ✨ Guaranteed Best Rates Online
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Find Your Dream Stay
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base max-w-2xl leading-relaxed">
            Discover luxury rooms, ocean views, and modern comforts with live cloud availability and instant confirmation.
          </p>
        </div>

        {/* Date Selection Box */}
        <div className="mt-8 bg-white text-slate-900 rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Select Your Stay Dates</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {nights} Night{nights !== 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {format(new Date(checkIn), 'MMM d, yyyy')} &rarr; {format(new Date(checkOut), 'MMM d, yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openDrawer}
                className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 min-h-[44px]"
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={handleDateChange}
          />
        </div>
      </div>

      {/* Main Content Layout with Desktop Filters & Mobile Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-1 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-6 sticky top-28">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Filter className="w-4 h-4 text-indigo-600" />
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Room Type</label>
            <select
              value={type}
              onChange={(e) => updateParam('type', e.target.value)}
              className="w-full text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Guests</label>
            <select
              value={guests}
              onChange={(e) => updateParam('guests', e.target.value)}
              className="w-full text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Any Guests</option>
              <option value="1">1+ Guest</option>
              <option value="2">2+ Guests</option>
              <option value="3">3+ Guests</option>
              <option value="4">4+ Guests</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Price Range (₹)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => updateParam('minPrice', e.target.value)}
                className="w-full text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value)}
                className="w-full text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Amenities Multi-select */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amenities</label>
            <div className="space-y-2">
              {COMMON_AMENITIES.map((item) => {
                const currentList = amenities ? amenities.split(',').filter(Boolean) : [];
                const isChecked = currentList.includes(item);
                return (
                  <label key={item} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const nextList = e.target.checked
                          ? [...currentList, item]
                          : currentList.filter((a) => a !== item);
                        updateParam('amenities', nextList.join(','));
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <section className="col-span-1 lg:col-span-3 space-y-6">
          {/* Controls Bar: Count and Sort */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {isLoading ? 'Searching...' : `${meta.total} Room${meta.total !== 1 ? 's' : ''} Available`}
              </span>
              {activeFilterCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="text-xs sm:text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 font-medium py-1.5"
              >
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
                <option value="type">Room Type</option>
              </select>

              {/* Mobile Filter Trigger Button */}
              <button
                type="button"
                onClick={openDrawer}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 min-h-[36px]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Room Cards: 1 column on mobile, 2 on tablet, 3 on desktop */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-4 animate-pulse">
                  <div className="aspect-[4/3] bg-slate-200 rounded-xl"></div>
                  <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-slate-200 rounded w-16"></div>
                    <div className="h-6 bg-slate-200 rounded w-16"></div>
                  </div>
                  <div className="h-8 bg-slate-200 rounded w-1/3 pt-4"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-rose-100 p-8">
              <p className="text-rose-600 text-base font-bold">Failed to load rooms</p>
              <p className="text-slate-500 text-sm mt-1">Please try again or check your dates.</p>
            </div>
          ) : roomsList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
              <Search className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">No rooms available</h4>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                No rooms match your chosen criteria. Try adjusting dates or removing some filters.
              </p>
              {activeFilterCount > 0 && (
                <button
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
              <span className="px-4 text-xs font-semibold text-slate-600">
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
        </section>
      </div>

      {/* Mobile Slide-in Drawer / Bottom Sheet for Filters */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsFilterDrawerOpen(false)}
          ></div>

          {/* Drawer Body */}
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-900">Filter Rooms</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 min-h-[44px]"
                aria-label="Close Filter Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Room Type</label>
              <select
                value={tempType}
                onChange={(e) => setTempType(e.target.value)}
                className="w-full text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-3"
              >
                <option value="">All Types</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Guests */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Guests</label>
              <select
                value={tempGuests}
                onChange={(e) => setTempGuests(e.target.value)}
                className="w-full text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-3"
              >
                <option value="">Any Guests</option>
                <option value="1">1+ Guest</option>
                <option value="2">2+ Guests</option>
                <option value="3">3+ Guests</option>
                <option value="4">4+ Guests</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Price Range (₹)</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Min Price"
                  value={tempMinPrice}
                  onChange={(e) => setTempMinPrice(e.target.value)}
                  className="w-full text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-3"
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  value={tempMaxPrice}
                  onChange={(e) => setTempMaxPrice(e.target.value)}
                  className="w-full text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 py-3"
                />
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amenities</label>
              <div className="grid grid-cols-2 gap-2.5">
                {COMMON_AMENITIES.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      tempAmenities.includes(item)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
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

            {/* Actions: Apply & Clear (min 44px tap targets) */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
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