import React, { useState } from 'react';
import type { AvailabilitySearchParams } from '../../types/availability';

interface RoomSearchSectionProps {
  onSearch: (params: AvailabilitySearchParams) => void;
  loading: boolean;
  initialValues?: AvailabilitySearchParams | null;
}

interface ValidationErrors {
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests?: string;
  general?: string;
}

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RoomSearchSection({
  onSearch,
  loading,
  initialValues,
}: RoomSearchSectionProps) {
  const todayStr = getTodayDateString();

  const [checkInDate, setCheckInDate] = useState<string>(
    initialValues?.checkInDate || ''
  );
  const [checkOutDate, setCheckOutDate] = useState<string>(
    initialValues?.checkOutDate || ''
  );
  const [numberOfGuests, setNumberOfGuests] = useState<string>(
    initialValues?.numberOfGuests ? String(initialValues.numberOfGuests) : '1'
  );
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    // 1. Check-in required
    if (!checkInDate.trim()) {
      newErrors.checkInDate = 'Check-in date is required.';
    } else if (checkInDate < todayStr) {
      // 3. Check-in cannot be before today
      newErrors.checkInDate = 'Check-in date cannot be before today.';
    }

    // 2. Check-out required
    if (!checkOutDate.trim()) {
      newErrors.checkOutDate = 'Check-out date is required.';
    } else if (checkInDate && checkOutDate <= checkInDate) {
      // 4. Check-out must be after check-in
      newErrors.checkOutDate = 'Check-out date must be after check-in date.';
    }

    // 5. Guests required
    const guestsNum = parseInt(numberOfGuests, 10);
    if (!numberOfGuests.trim() || isNaN(guestsNum)) {
      newErrors.numberOfGuests = 'Number of guests is required.';
    } else if (guestsNum < 1) {
      // 6. Guests must be at least 1
      newErrors.numberOfGuests = 'Number of guests must be at least 1.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 7. Prevent search while submitting/loading
    if (loading) return;

    if (!validate()) {
      return;
    }

    onSearch({
      checkInDate,
      checkOutDate,
      numberOfGuests: parseInt(numberOfGuests, 10),
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Find & Book Available Rooms</h2>
        <p className="text-sm text-gray-600">
          Select your dates and party size to find currently available rooms.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Check-in Date */}
          <div>
            <label
              htmlFor="checkInDate"
              className="block text-sm font-medium text-gray-700"
            >
              Check-in Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="checkInDate"
              name="checkInDate"
              min={todayStr}
              value={checkInDate}
              disabled={loading}
              onChange={(e) => {
                setCheckInDate(e.target.value);
                if (errors.checkInDate) {
                  setErrors((prev) => ({ ...prev, checkInDate: undefined }));
                }
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-xs focus:ring-2 focus:outline-hidden ${
                errors.checkInDate
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              } ${loading ? 'cursor-not-allowed bg-gray-100' : 'bg-white'}`}
            />
            {errors.checkInDate && (
              <p className="mt-1 text-xs text-red-600">{errors.checkInDate}</p>
            )}
          </div>

          {/* Check-out Date */}
          <div>
            <label
              htmlFor="checkOutDate"
              className="block text-sm font-medium text-gray-700"
            >
              Check-out Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="checkOutDate"
              name="checkOutDate"
              min={checkInDate || todayStr}
              value={checkOutDate}
              disabled={loading}
              onChange={(e) => {
                setCheckOutDate(e.target.value);
                if (errors.checkOutDate) {
                  setErrors((prev) => ({ ...prev, checkOutDate: undefined }));
                }
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-xs focus:ring-2 focus:outline-hidden ${
                errors.checkOutDate
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              } ${loading ? 'cursor-not-allowed bg-gray-100' : 'bg-white'}`}
            />
            {errors.checkOutDate && (
              <p className="mt-1 text-xs text-red-600">{errors.checkOutDate}</p>
            )}
          </div>

          {/* Number of Guests */}
          <div>
            <label
              htmlFor="numberOfGuests"
              className="block text-sm font-medium text-gray-700"
            >
              Number of Guests <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="numberOfGuests"
              name="numberOfGuests"
              min="1"
              step="1"
              value={numberOfGuests}
              disabled={loading}
              onChange={(e) => {
                setNumberOfGuests(e.target.value);
                if (errors.numberOfGuests) {
                  setErrors((prev) => ({ ...prev, numberOfGuests: undefined }));
                }
              }}
              placeholder="e.g. 2"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-xs focus:ring-2 focus:outline-hidden ${
                errors.numberOfGuests
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              } ${loading ? 'cursor-not-allowed bg-gray-100' : 'bg-white'}`}
            />
            {errors.numberOfGuests && (
              <p className="mt-1 text-xs text-red-600">{errors.numberOfGuests}</p>
            )}
          </div>

          {/* Search Rooms button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-xs transition ${
                loading
                  ? 'cursor-not-allowed bg-indigo-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden'
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-white"
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
                  <span>Searching Rooms...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>Search Rooms</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
