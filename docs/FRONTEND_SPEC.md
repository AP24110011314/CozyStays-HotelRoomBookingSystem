# Frontend Specification

## Tech Stack
- React 18 + Vite
- Tailwind CSS
- React Router v6
- TanStack Query v5
- Axios
- React Hook Form + Zod
- React Day Picker
- date-fns

## Routes
| Path | Component | Auth | Role |
|------|-----------|------|------|
| `/` | Home | public | - |
| `/rooms` | RoomsList | public | - |
| `/rooms/:id` | RoomDetail | public | - |
| `/login` | Login | public | - |
| `/register` | Register | public | - |
| `/bookings` | MyBookings | required | guest |
| `/bookings/:id` | BookingDetail | required | guest (owner) |
| `/booking/confirm` | BookingConfirm | required | guest |
| `/admin` | AdminDashboard | required | admin |
| `/admin/rooms` | AdminRooms | required | admin |
| `/admin/bookings` | AdminBookings | required | admin |
| `/admin/occupancy` | AdminOccupancy | required | admin |
| `/admin/emails` | AdminFailedEmails | required | admin |

## Global Layout
- **Header**: Logo, nav (Rooms, My Bookings), user menu (Login/Register or Profile/Logout), Admin link (if admin)
- **Footer**: Simple copyright
- **Toast**: Global notifications (success/error)

## Pages

### Home (`/`)
- Hero with search form: checkIn, checkOut, guests → redirects to `/rooms?checkIn=...&checkOut=...&guests=...`
- Feature highlights (3 cards)
- CTA to browse rooms

### Rooms List (`/rooms`)
- **URL state**: All filters in query params (shareable, browser back works)
- **Sidebar/Filter bar**:
  - Date picker (React Day Picker, range, shows unavailable from API)
  - Guests (number input)
  - Price range (dual slider or min/max inputs)
  - Type (multi-select: single, double, suite)
  - Amenities (multi-select checkboxes)
  - Sort (select)
- **Results**: Grid of RoomCards
  - Image, name, type, basePrice/night, maxGuests, amenities badges
  - **Computed**: nights, totalPrice (from API)
  - "View Details" → `/rooms/:id`
- **Pagination**: Prev/Next, page numbers
- **Empty state**: "No rooms match your filters"

### Room Detail (`/rooms/:id`)
- Gallery (main image + thumbnails)
- Name, type, description
- Amenities list
- Max guests, base price/night
- **Booking widget** (if dates in URL or selected):
  - Date picker (pre-filled from URL)
  - Guests input
  - Shows nights × price = total
  - "Book Now" → if logged in → POST /bookings → `/booking/confirm`; if not → `/login?redirect=...`

### Login (`/login`)
- Email, password, "Remember me"
- Link to Register
- On success → redirect to `redirect` param or `/`

### Register (`/register`)
- Name, email, password, confirm password
- Link to Login
- On success → auto-login → `/`

### My Bookings (`/bookings`)
- **Tabs**: Upcoming, Active, Past, Cancelled
- **List**: BookingCard per booking
  - Room image, name, type
  - Dates, guests, totalPrice
  - Status badge
  - "View Details" → `/bookings/:id`
  - "Cancel" (if `canCancel`) → confirm modal → DELETE
- **Pagination**

### Booking Detail (`/bookings/:id`)
- Full booking info
- Room details
- Timeline: Booked → Check-in → Check-out
- Actions: Modify (if upcoming), Cancel (if `canCancel`)
- **Modify**: Opens modal with date picker, guests → PATCH → refresh

### Booking Confirm (`/booking/confirm`)
- Success page after booking
- Shows reference, room, dates, total
- "View My Bookings" button
- Email sent notice

### Admin Dashboard (`/admin`)
- **Stats cards** (grid): Total Rooms, Active Bookings, Occupancy %, Revenue (30d)
- **Quick links** to Rooms, Bookings, Occupancy, Failed Emails

### Admin Rooms (`/admin/rooms`)
- **Table**: Name, Type, Base Price, Max Guests, Active, Actions
- **Create/Edit Modal**: Form with all fields
- **Toggle Active**: Inline switch
- **Delete**: Confirm modal

### Admin Bookings (`/admin/bookings`)
- **Filters**: Status, Date range (from/to), Guest email
- **Table**: Reference, Guest, Room, Dates, Guests, Total, Status, Actions
- **Cancel**: Any booking (bypasses 48h)

### Admin Occupancy (`/admin/occupancy`)
- **Month selector** (prev/next, current default)
- **Calendar grid**: Rows = rooms, Columns = days of month
- **Cell**: Booked (colored) / Free (empty) / Today (border)
- **Hover**: Tooltip with booking reference, guest name
- **Room filter** (optional dropdown)

### Admin Failed Emails (`/admin/emails`)
- **Table**: To, Subject, Status, Attempts, Last Error, Next Retry, Created, Actions
- **Retry button**: POST `/admin/failed-emails/:id/retry` → toast
- **Status badges**: pending (yellow), sending (blue), sent (green), failed (red)

## Components

### UI Primitives
- `Button` (variant: primary, secondary, danger, ghost; size: sm, md, lg)
- `Input` (label, error, helper)
- `Select` (options, multi)
- `Checkbox`, `Radio`
- `Modal` (portal, trap focus, ESC to close)
- `Table` (head, body, sortable, loading, empty)
- `Card` (image, content, footer)
- `Badge` (variant: default, success, warning, danger, info)
- `DateRangePicker` (wrapper around React Day Picker)
- `Toast` (via react-hot-toast or custom)

### Composite
- `RoomCard` (image, name, type, price, nights, total, amenities)
- `BookingCard` (room, dates, guests, total, status, actions)
- `StatsCard` (label, value, icon, trend?)
- `OccupancyCalendar` (month grid, room rows, cell rendering)

## State Management
- **Auth**: `AuthContext` — user, token, login, logout, register; persists in localStorage
- **Server state**: TanStack Query — all API data, caching, invalidation
- **Form state**: React Hook Form + Zod resolvers
- **URL state**: React Router `useSearchParams` for filters

## API Layer
### `client/src/api/axios.js`
```javascript
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  r => r,
  error => {
    if (error.response?.status === 401) {
      AuthContext.logout();
      navigate('/login');
    }
    return Promise.reject(error);
  }
);
```

### `client/src/api/queries/`
- `useRooms(params)` — GET /rooms
- `useRoom(id)` — GET /rooms/:id
- `useUnavailableDates(id, from, to)` — GET /rooms/:id/unavailable-dates
- `useMyBookings(status, page)` — GET /bookings
- `useBooking(id)` — GET /bookings/:id
- `useAdminStats()` — GET /admin/stats
- `useAdminRooms(page)` — GET /admin/rooms
- `useAdminBookings(filters)` — GET /admin/bookings
- `useAdminOccupancy(month)` — GET /admin/occupancy
- `useFailedEmails(page)` — GET /admin/failed-emails

### `client/src/api/mutations/`
- `useLogin()`, `useRegister()`
- `useCreateBooking()`, `useModifyBooking()`, `useCancelBooking()`
- `useCreateRoom()`, `useUpdateRoom()`, `useToggleRoom()`, `useDeleteRoom()`
- `useAdminCancelBooking()`, `useRetryEmail()`

## Utils
- `formatPrice(cents)` → `$XX.XX`
- `formatDate(date)` → `MMM d, yyyy`
- `formatDateRange(checkIn, checkOut)` → `MMM d – MMM d, yyyy`
- `dateToInputValue(date)` → `yyyy-MM-dd`
- `generateICS()` — client-side not needed, server sends attachment

## Styling
- Tailwind config: custom colors (primary, secondary), font (Inter)
- Dark mode: class strategy (optional, not required)
- Responsive: mobile-first, breakpoints sm (640), md (768), lg (1024), xl (1280)

## Accessibility
- Semantic HTML
- Focus visible outlines
- ARIA labels on icon buttons
- Color contrast AA
- Keyboard navigable modals, date pickers