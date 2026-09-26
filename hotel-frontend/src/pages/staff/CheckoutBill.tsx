import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  checkOutReservation,
  generateFinalBill,
  getBill,
  getReservationById,
} from '../../services/reservationService';
import { createPayment } from '../../services/paymentService';
import type { AdditionalCharge, DiscountType, Invoice } from '../../types/invoice';
import type { Reservation } from '../../types/reservation';
import type { PaymentMethod } from '../../types/payment';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE'];

function formatMoney(value: number | null | undefined): string {
  const amount = value ?? 0;
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

interface DraftCharge {
  description: string;
  amount: string;
}

/**
 * The Generate Final Bill screen.
 *
 * The desk adds charge lines, edits them, and applies a discount here — but it
 * never does the arithmetic. Every change is sent to the backend, which prices
 * the stay from the room's own rate and the reservation's own dates and returns
 * the bill to display. The figure on screen is therefore always the figure the
 * hotel will collect.
 *
 * Checkout is a separate, explicit step so the desk can review the bill (and
 * take a payment against it) before the stay is closed.
 */
export default function CheckoutBill() {
  const { reservationId = '' } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [bill, setBill] = useState<Invoice | null>(null);

  const [charges, setCharges] = useState<DraftCharge[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const priceBill = useCallback(
    async (
      nextCharges: DraftCharge[],
      nextDiscountType: DiscountType,
      nextDiscountValue: string,
      quiet: boolean,
    ) => {
      if (!quiet) setRecalculating(true);
      setError(null);

      try {
        const priced = await generateFinalBill(reservationId, {
          additionalCharges: nextCharges
            .filter((charge) => charge.description.trim() !== '')
            .map<AdditionalCharge>((charge) => ({
              description: charge.description.trim(),
              amount: Number(charge.amount) || 0,
            })),
          discountType: nextDiscountType,
          discountValue: Number(nextDiscountValue) || 0,
        });

        setBill(priced);
        return priced;
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'Could not calculate the bill. Please check the charges and discount.',
        );
        return null;
      } finally {
        if (!quiet) setRecalculating(false);
      }
    },
    [reservationId],
  );

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const [loadedReservation, existingBill] = await Promise.all([
          getReservationById(reservationId),
          getBill(reservationId),
        ]);

        if (ignore) return;

        setReservation(loadedReservation);
        setBill(existingBill);

        if (existingBill) {
          setCharges(
            (existingBill.additionalCharges ?? []).map((charge) => ({
              description: charge.description,
              amount: String(charge.amount),
            })),
          );
          setDiscountType(existingBill.discountType ?? 'NONE');
          setDiscountValue(
            existingBill.discountValue ? String(existingBill.discountValue) : '',
          );
        }
      } catch (err: any) {
        if (!ignore) {
          setError(
            err?.response?.data?.message || 'Could not load this reservation.',
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [reservationId]);

  const handleRecalculate = () =>
    priceBill(charges, discountType, discountValue, false);

  const handleAddCharge = () => {
    setCharges((prev) => [...prev, { description: '', amount: '' }]);
  };

  const handleRemoveCharge = (index: number) => {
    const next = charges.filter((_, i) => i !== index);
    setCharges(next);
    priceBill(next, discountType, discountValue, false);
  };

  const handleChargeChange = (
    index: number,
    field: keyof DraftCharge,
    value: string,
  ) => {
    setCharges((prev) =>
      prev.map((charge, i) => (i === index ? { ...charge, [field]: value } : charge)),
    );
  };

  const handleRecordPayment = async () => {
    if (!bill) return;
    setError(null);
    setNotice(null);
    setRecordingPayment(true);

    try {
      await createPayment({
        invoiceId: bill.invoiceId,
        amount: Number(paymentAmount),
        paymentMethod,
      });

      const refreshed = await getBill(reservationId);
      setBill(refreshed);
      setPaymentAmount('');
      setNotice('Payment recorded.');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Could not record the payment.',
      );
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleFinalise = async () => {
    setError(null);
    setNotice(null);
    setFinalising(true);

    try {
      await checkOutReservation(reservationId);
      navigate('/reservations');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not complete checkout.');
      setFinalising(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error ?? 'Reservation not found.'}
        </div>
        <Link to="/reservations" className="text-sm font-medium text-royal hover:underline">
          ← Back to reservations
        </Link>
      </div>
    );
  }

  const notCheckedIn = reservation.status !== 'CHECKED_IN';
  const remaining = bill ? (bill.remainingAmount ?? 0) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          to={`/staff/reservations/${reservationId}`}
          className="text-sm font-medium text-royal hover:underline"
        >
          ← Back to reservation
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          Checkout — Generate Final Bill
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {reservation.customerName} · Room{' '}
          {bill?.roomNumber ?? reservation.roomId}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {notCheckedIn && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          This reservation is <strong>{reservation.status}</strong>. Only a
          checked-in stay can be billed or checked out.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Inputs ── */}
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Additional charges
              </h2>
              <button
                type="button"
                onClick={handleAddCharge}
                disabled={notCheckedIn}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                + Add charge
              </button>
            </div>

            {charges.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No extra charges. Room charge only.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {charges.map((charge, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <label className="flex-1">
                      <span className="text-xs font-medium text-gray-600">
                        Description
                      </span>
                      <input
                        type="text"
                        value={charge.description}
                        maxLength={120}
                        placeholder="e.g. Extra Bed"
                        onChange={(e) =>
                          handleChargeChange(index, 'description', e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
                      />
                    </label>
                    <label className="w-32">
                      <span className="text-xs font-medium text-gray-600">
                        Amount
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={charge.amount}
                        placeholder="0.00"
                        onChange={(e) =>
                          handleChargeChange(index, 'amount', e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveCharge(index)}
                      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      title="Remove charge"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-gray-900">Discount</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Type</span>
                <select
                  value={discountType}
                  disabled={notCheckedIn}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
                >
                  <option value="NONE">No discount</option>
                  <option value="FIXED">Fixed amount</option>
                  <option value="PERCENTAGE">Percentage</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {discountType === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount'}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  max={discountType === 'PERCENTAGE' ? 100 : undefined}
                  value={discountValue}
                  disabled={notCheckedIn || discountType === 'NONE'}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden disabled:bg-gray-50"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleRecalculate}
              disabled={notCheckedIn || recalculating}
              className="mt-4 rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white transition hover:bg-royal/90 disabled:opacity-50"
            >
              {recalculating ? 'Calculating…' : 'Recalculate bill'}
            </button>
          </section>
        </div>

        {/* ── The bill ── */}
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="border-b border-gray-200 pb-3 text-center text-lg font-bold tracking-widest text-gray-900">
              FINAL BILL
            </h2>

            {!bill ? (
              <p className="mt-4 text-sm text-gray-500">
                No bill yet. Add any charges, then select Recalculate bill.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-y-1 text-gray-600">
                  <span>Room</span>
                  <span className="text-right font-medium text-gray-900">
                    {bill.roomNumber ?? '—'}
                  </span>
                  <span>Check-in</span>
                  <span className="text-right text-gray-900">
                    {formatDate(bill.checkInDate)}
                  </span>
                  <span>Check-out</span>
                  <span className="text-right text-gray-900">
                    {formatDate(bill.checkOutDate)}
                  </span>
                  <span>Nights</span>
                  <span className="text-right text-gray-900">
                    {bill.nights ?? '—'}
                  </span>
                </div>

                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="text-gray-600">Room charge</span>
                  <span className="font-medium text-gray-900">
                    {formatMoney(bill.roomCharge)}
                  </span>
                </div>

                {bill.additionalCharges?.length > 0 && (
                  <div className="space-y-1 border-t border-gray-100 pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Additional charges
                    </div>
                    {bill.additionalCharges.map((charge, index) => (
                      <div key={index} className="flex justify-between pl-2">
                        <span className="truncate pr-2 text-gray-600">
                          {charge.description}
                        </span>
                        <span className="text-gray-900">
                          {formatMoney(charge.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pl-2 font-medium">
                      <span className="text-gray-600">Additional total</span>
                      <span className="text-gray-900">
                        {formatMoney(bill.additionalChargesTotal)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-100 pt-3 font-medium">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    {formatMoney(bill.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Discount
                    {bill.discountType === 'PERCENTAGE' && bill.discountValue
                      ? ` (${bill.discountValue}%)`
                      : ''}
                  </span>
                  <span className="text-gray-900">
                    −{formatMoney(bill.discountAmount)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Tax{bill.taxRate ? ` (${bill.taxRate}%)` : ''}
                  </span>
                  <span className="text-gray-900">
                    {formatMoney(bill.taxAmount)}
                  </span>
                </div>

                <div className="flex justify-between border-y-2 border-gray-900 py-3 text-base font-bold">
                  <span>TOTAL</span>
                  <span>{formatMoney(bill.totalAmount)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Amount paid</span>
                  <span className="text-gray-900">
                    {formatMoney(bill.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-600">Remaining balance</span>
                  <span className={remaining > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {formatMoney(remaining)}
                  </span>
                </div>

                <div className="pt-2 text-xs text-gray-500">
                  Status: <span className="font-semibold">{bill.status}</span>
                </div>
              </div>
            )}
          </section>

          {/* ── Payment ── */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-gray-900">Record payment</h2>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Amount</span>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  max={remaining > 0 ? remaining : undefined}
                  value={paymentAmount}
                  disabled={!bill || remaining <= 0}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={remaining > 0 ? formatMoney(remaining) : 'Nothing owing'}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden disabled:bg-gray-50"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Method</span>
                <select
                  value={paymentMethod}
                  disabled={!bill || remaining <= 0}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden disabled:bg-gray-50"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={
                  recordingPayment ||
                  !bill ||
                  remaining <= 0 ||
                  !(Number(paymentAmount) > 0)
                }
                className="w-full rounded-lg border border-royal bg-white px-4 py-2 text-sm font-semibold text-royal transition hover:bg-royal/5 disabled:opacity-50"
              >
                {recordingPayment ? 'Recording…' : 'Record payment'}
              </button>
            </div>
          </section>

          {/* ── Finalise ── */}
          <button
            type="button"
            onClick={handleFinalise}
            disabled={finalising || notCheckedIn || !bill}
            className="mt-6 w-full rounded-lg bg-royal px-4 py-3 text-sm font-bold text-white transition hover:bg-royal/90 disabled:opacity-50"
          >
            {finalising ? 'Completing checkout…' : 'Finalise checkout'}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">
            The stay closes, the room becomes CLEANING, and housekeeping is
            notified. A balance may still be owing.
          </p>
        </div>
      </div>
    </div>
  );
}
