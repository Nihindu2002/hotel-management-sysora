import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomSearchSection from './RoomSearchSection';
import { getAvailableRooms } from '../../services/availabilityService';
import type { Room } from '../../types/room';
import type { AvailabilitySearchParams } from '../../types/availability';

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useState<AvailabilitySearchParams | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const calculateNights = (inDate: string, outDate: string): number => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const getErrorMessage = (error: any): string => {
    // Backend is unavailable (Network Error / connection refused)
    if (error?.code === 'ERR_NETWORK' || !error?.response) {
      return 'The backend server is currently unavailable. Please verify the backend service is running and try again.';
    }

    const status = error.response?.status;
    const serverMsg = error.response?.data?.message || error.response?.data?.error;

    // Authentication / token fails
    if (status === 401 || status === 403) {
      return 'Authentication failed or session expired. Please log in again to search for room availability.';
    }

    // Invalid dates / validation error
    if (status === 400) {
      return serverMsg || 'Invalid dates or guest count provided. Check-out date must be after check-in date.';
    }

    // Availability request fails
    return serverMsg || 'Availability request failed. Please try again later.';
  };

  const handleSearch = async (params: AvailabilitySearchParams) => {
    setLoading(true);
    setApiError(null);
    setSearchParams(params);

    try {
      const rooms = await getAvailableRooms(params);
      setAvailableRooms(rooms || []);
      setHasSearched(true);
    } catch (err: any) {
      setApiError(getErrorMessage(err));
      setAvailableRooms([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = (room: Room) => {
    if (!searchParams) return;

    const nights = calculateNights(searchParams.checkInDate, searchParams.checkOutDate);
    const estimatedTotal = (room.pricePerNight * nights).toFixed(2);

    const query = new URLSearchParams({
      roomId: room.roomId,
      checkInDate: searchParams.checkInDate,
      checkOutDate: searchParams.checkOutDate,
      numberOfGuests: String(searchParams.numberOfGuests),
    }).toString();

    navigate(`/reservations/new?${query}`, {
      state: {
        roomId: room.roomId,
        room,
        checkInDate: searchParams.checkInDate,
        checkOutDate: searchParams.checkOutDate,
        numberOfGuests: searchParams.numberOfGuests,
        numberOfNights: nights,
        estimatedTotal,
      },
    });
  };

  const nights = searchParams
    ? calculateNights(searchParams.checkInDate, searchParams.checkOutDate)
    : 1;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Customer Portal
        </h1>
        <p className="mt-1 text-base text-gray-600">
          Check real-time availability and book your ideal stay.
        </p>
      </div>

      {/* Booking Search Section */}
      <RoomSearchSection
        onSearch={handleSearch}
        loading={loading}
        initialValues={searchParams}
      />

      {/* API Error Display */}
      {apiError && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold">Unable to complete search</p>
              <p className="mt-1">{apiError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-xs">
          <div className="inline-flex items-center gap-3 text-gray-600">
            <svg
              className="h-6 w-6 animate-spin text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-base font-medium">
              Checking room availability...
            </span>
          </div>
        </div>
      ) : hasSearched && !apiError ? (
        availableRooms.length === 0 ? (
          /* Handle No Results */
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-3 text-lg font-semibold text-gray-900">
              No rooms are available for your selected dates.
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your check-in, check-out dates, or number of guests to see other options.
            </p>
          </div>
        ) : (
          /* Display Available Rooms */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Available Rooms ({availableRooms.length})
              </h2>
              {searchParams && (
                <span className="text-sm text-gray-500">
                  {searchParams.checkInDate} to {searchParams.checkOutDate} · {nights}{' '}
                  {nights === 1 ? 'night' : 'nights'} · {searchParams.numberOfGuests}{' '}
                  {searchParams.numberOfGuests === 1 ? 'guest' : 'guests'}
                </span>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableRooms.map((room) => {
                const estimatedTotal = (room.pricePerNight * nights).toFixed(2);

                return (
                  <div
                    key={room.roomId}
                    className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition hover:shadow-md"
                  >
                    {/* Room Image */}
                    {room.images && room.images.length > 0 ? (
                      <img
                        src={room.images[0]}
                        alt={`Room ${room.roomNumber}`}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                        No image available
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      {/* Room Header: Number & Type */}
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">
                          Room {room.roomNumber}
                        </h3>
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          {room.roomType}
                        </span>
                      </div>

                      {/* Floor details */}
                      <p className="text-xs text-gray-500">Floor {room.floor}</p>

                      {/* Pricing Details */}
                      <div className="mt-4 rounded-lg bg-gray-50 p-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">Price per night:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            ${room.pricePerNight}
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">Number of nights:</span>
                          <span className="text-xs font-medium text-gray-700">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between border-t border-gray-200 pt-2">
                          <span className="text-xs font-bold text-gray-900">
                            Estimated room total:
                          </span>
                          <span className="text-base font-bold text-indigo-600">
                            ${estimatedTotal}
                          </span>
                        </div>
                      </div>

                      {/* Reserve Button */}
                      <div className="mt-auto pt-5">
                        <button
                          type="button"
                          onClick={() => handleReserve(room)}
                          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        >
                          Reserve Room
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* Initial Guide State Before Search */
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <p className="text-base">
            Please enter your check-in date, check-out date, and guest count above, then click{' '}
            <strong className="text-gray-700">Search Rooms</strong> to find available accommodations.
          </p>
        </div>
      )}
    </div>
  );
}
