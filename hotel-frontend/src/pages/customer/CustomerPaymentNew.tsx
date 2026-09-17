import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { getInvoiceById } from '../../services/invoiceService';
import { createPayment } from '../../services/paymentService';
import type { Invoice } from '../../types/invoice';
import type { Payment, PaymentMethod, PaymentStatus } from '../../types/payment';

export default function CustomerPaymentNew() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invoiceId = searchParams.get('invoiceId') || '';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(Boolean(invoiceId));
  const [invoiceError, setInvoiceError] = useState<string | null>(
    !invoiceId ? 'No invoice ID provided. Please select an invoice to pay.' : null
  );

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ amount?: string; paymentMethod?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Result state
  const [paymentResult, setPaymentResult] = useState<Payment | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    let ignore = false;

    getInvoiceById(invoiceId)
      .then((inv) => {
        if (!ignore) {
          setInvoice(inv);
          // Set initial amount to remaining balance
          const total = inv.totalAmount ?? 0;
          const paid = inv.paidAmount ?? 0;
          const remaining =
            inv.remainingAmount !== undefined
              ? inv.remainingAmount
              : Math.max(0, total - paid);
          if (remaining > 0) {
            setAmount(remaining.toFixed(2));
          }
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          if (err?.response?.status === 403) {
            setInvoiceError('You are not authorized to view or pay this invoice.');
          } else if (err?.response?.status === 404) {
            setInvoiceError('The requested invoice could not be found.');
          } else {
            setInvoiceError(
              err?.response?.data?.message ||
                'Unable to load invoice details. Please verify the invoice ID.'
            );
          }
        }
      })
      .finally(() => {
        if (!ignore) setLoadingInvoice(false);
      });

    return () => {
      ignore = true;
    };
  }, [invoiceId]);

  const computeRemaining = (): number => {
    if (!invoice) return 0;
    const total = invoice.totalAmount ?? 0;
    const paid = invoice.paidAmount ?? 0;
    return invoice.remainingAmount !== undefined
      ? invoice.remainingAmount
      : Math.max(0, total - paid);
  };

  const computePaid = (): number => {
    if (!invoice) return 0;
    if (invoice.paidAmount !== undefined) return invoice.paidAmount;
    if (invoice.status === 'PAID') return invoice.totalAmount ?? 0;
    return 0;
  };

  const remaining = computeRemaining();
  const paidAmount = computePaid();

  const validate = (): boolean => {
    const errors: { amount?: string; paymentMethod?: string } = {};

    const trimmed = amount.trim();

    // 1. Amount required
    if (!trimmed) {
      errors.amount = 'Payment amount is required.';
    } else if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      // 2. Maximum 2 decimal places check
      errors.amount = 'Amount must be a valid number with at most 2 decimal places (e.g. 150.00).';
    } else {
      const amtNum = parseFloat(trimmed);
      if (isNaN(amtNum) || amtNum <= 0) {
        // 3. Amount > 0
        errors.amount = 'Payment amount must be greater than 0.';
      } else if (remaining > 0 && amtNum > remaining + 0.001) {
        // 4. Amount <= remaining balance
        errors.amount = `Amount cannot exceed the remaining balance of $${remaining.toFixed(2)}.`;
      }
    }

    // 5. Payment method required
    if (!paymentMethod) {
      errors.paymentMethod = 'Please select a payment method.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submission while loading
    if (submitting) return;

    setSubmitError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount.trim());

      // Send only required fields (do not send customer UID, payment status, invoice status, or finance transaction)
      const result = await createPayment({
        invoiceId: invoice!.invoiceId,
        reservationId: invoice!.reservationId,
        amount: parsedAmount,
        paymentMethod,
      });

      // Flow: Payment -> Refresh invoice from backend -> Recalculate displayed balance
      try {
        const refreshedInvoice = await getInvoiceById(invoice!.invoiceId);
        setInvoice(refreshedInvoice);
      } catch {
        // If refresh fails, keep current state
      }

      setPaymentResult(result);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (err?.response?.status === 403) {
        setSubmitError('You are not authorized to make a payment for this invoice.');
      } else if (err?.response?.status === 400) {
        setSubmitError(serverMsg || 'Invalid payment request. Please check the amount and try again.');
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setSubmitError('The server is currently unavailable. Please check your connection and try again.');
      } else {
        setSubmitError(serverMsg || 'Payment failed. Please review your details and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Reset payment form for another payment towards remaining balance
  const handlePayRemaining = () => {
    setPaymentResult(null);
    const newRemaining = computeRemaining();
    if (newRemaining > 0) {
      setAmount(newRemaining.toFixed(2));
    }
  };

  // ── RESULT DISPLAY (Requirement 5: COMPLETED, PENDING, FAILED, REFUNDED) ──
  if (paymentResult) {
    const status = (paymentResult.status || 'COMPLETED') as PaymentStatus;
    const isCompleted = status === 'COMPLETED';
    const isPending = status === 'PENDING';
    const isFailed = status === 'FAILED';
    const isRefunded = status === 'REFUNDED';

    const currentRemaining = computeRemaining();

    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div
          className={`rounded-xl border p-6 shadow-sm sm:p-8 bg-white ${
            isCompleted
              ? 'border-emerald-200'
              : isPending
              ? 'border-amber-200'
              : isRefunded
              ? 'border-purple-200'
              : 'border-red-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-600'
                  : isPending
                  ? 'bg-amber-100 text-amber-600'
                  : isRefunded
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {isCompleted ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : isPending ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : isRefunded ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a4 4 0 014 4v2m0 0l-3-3m3 3l3-3M3 10l3 3m-3-3l3-3" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isCompleted
                  ? 'Payment Completed!'
                  : isPending
                  ? 'Payment Pending'
                  : isRefunded
                  ? 'Payment Refunded'
                  : 'Payment Failed'}
              </h1>
              <p className="text-sm text-gray-600">
                {isCompleted
                  ? 'Your payment has been successfully processed and credited to your invoice.'
                  : isPending
                  ? 'Your payment request is pending review or confirmation.'
                  : isRefunded
                  ? 'This payment has been refunded to the customer.'
                  : 'We were unable to process this payment. Please review and try again.'}
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Payment ID</span>
              <span className="font-mono font-medium text-gray-900 break-all">
                {paymentResult.paymentId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice ID</span>
              <span className="font-mono font-medium text-gray-900 break-all">
                {paymentResult.invoiceId}
              </span>
            </div>
            {paymentResult.reservationId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reservation ID</span>
                <span className="font-mono font-medium text-gray-900 break-all">
                  {paymentResult.reservationId}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-bold text-gray-900">${(paymentResult.amount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method</span>
              <span className="font-medium text-gray-900">{paymentResult.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span
                className={`font-semibold rounded-full px-2.5 py-0.5 text-xs ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : isPending
                    ? 'bg-amber-100 text-amber-800'
                    : isRefunded
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {status}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="text-gray-500">Updated Invoice Status</span>
              <span className="font-semibold text-gray-900">
                {invoice?.status || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated Remaining Balance</span>
              <span
                className={`font-bold ${
                  currentRemaining <= 0 ? 'text-emerald-600' : 'text-amber-700'
                }`}
              >
                ${currentRemaining.toFixed(2)}
                {currentRemaining <= 0 ? ' (Fully Paid)' : ' (Partially Paid)'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {isFailed && (
              <button
                type="button"
                onClick={() => setPaymentResult(null)}
                className="rounded-md bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Try Again
              </button>
            )}

            {isCompleted && currentRemaining > 0 && (
              <button
                type="button"
                onClick={handlePayRemaining}
                className="rounded-md bg-amber-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-amber-700 transition"
              >
                Pay Remaining (${currentRemaining.toFixed(2)})
              </button>
            )}

            <Link
              to={`/customer/invoices/${paymentResult.invoiceId}`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              View Invoice
            </Link>

            <button
              type="button"
              onClick={() => navigate('/customer/payments')}
              className="rounded-md bg-indigo-600 px-5 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Payment History →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loadingInvoice) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        Loading invoice details...
      </div>
    );
  }

  // Invoice load error
  if (invoiceError || !invoice) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {invoiceError || 'Unable to load invoice.'}
        </div>
        <Link
          to="/customer/invoices"
          className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to My Invoices
        </Link>
      </div>
    );
  }

  // Invoice already fully paid
  if (invoice.status === 'PAID' || remaining <= 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-emerald-200 bg-white p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Invoice Already Fully Paid</h2>
        <p className="text-sm text-gray-600">
          Invoice #{invoice.invoiceId} has no outstanding balance.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to={`/customer/invoices/${invoice.invoiceId}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            View Invoice
          </Link>
          <Link
            to="/customer/payments"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            View Payment History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Make a Payment</h1>
          <p className="text-sm text-gray-600">
            Submit a payment towards your confirmed reservation invoice.
          </p>
        </div>
        <Link
          to={`/customer/invoices/${invoice.invoiceId}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Invoice
        </Link>
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {submitError}
        </div>
      )}

      {/* Requirement 1: Comprehensive Invoice Summary Card */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Invoice Summary
          </h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {invoice.status}
          </span>
        </div>

        {/* 9 Required Fields displayed clearly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500 text-xs block">Invoice ID</span>
            <span className="font-mono text-gray-900 text-xs break-all">{invoice.invoiceId}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Reservation ID</span>
            <span className="font-mono text-gray-900 text-xs break-all">{invoice.reservationId || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Room</span>
            <span className="font-semibold text-gray-900">Room {invoice.roomId}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Room Charge</span>
            <span className="font-medium text-gray-900">${(invoice.roomCharge ?? 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Additional Charges</span>
            <span className="font-medium text-gray-900">${(invoice.additionalCharges ?? 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Discount</span>
            <span className="font-medium text-emerald-600">-${(invoice.discount ?? 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Total Amount</span>
            <span className="font-bold text-gray-900">${(invoice.totalAmount ?? 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Already Paid</span>
            <span className="font-medium text-emerald-700">${paidAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Remaining Balance:</span>
          <span className="text-lg font-bold text-red-600">${remaining.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Payment Amount ($) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {remaining > 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount((remaining / 2).toFixed(2));
                      if (formErrors.amount) {
                        setFormErrors((prev) => ({ ...prev, amount: undefined }));
                      }
                    }}
                    className="text-xs font-semibold text-gray-600 hover:text-indigo-600"
                  >
                    Pay 50% (${(remaining / 2).toFixed(2)})
                  </button>
                )}
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setAmount(remaining.toFixed(2));
                    if (formErrors.amount) {
                      setFormErrors((prev) => ({ ...prev, amount: undefined }));
                    }
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Pay Full (${remaining.toFixed(2)})
                </button>
              </div>
            </div>

            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0.01"
                max={remaining}
                disabled={submitting}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (formErrors.amount) {
                    setFormErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
                placeholder={`e.g. ${remaining.toFixed(2)}`}
                className={`block w-full rounded-md border pl-7 pr-12 py-2 text-sm shadow-xs focus:ring-2 focus:outline-hidden ${
                  formErrors.amount
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                } ${submitting ? 'cursor-not-allowed bg-gray-100' : 'bg-white'}`}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-400 text-xs">USD</span>
              </div>
            </div>
            {formErrors.amount && (
              <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Enter the full amount or a partial payment up to ${remaining.toFixed(2)}. Max 2 decimal places.
            </p>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { id: 'CARD', label: 'Credit / Debit Card', icon: '💳' },
                { id: 'ONLINE', label: 'Online Payment', icon: '🌐' },
                { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
                { id: 'CASH', label: 'Cash (Front Desk)', icon: '💵' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center cursor-pointer transition ${
                    paymentMethod === opt.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  } ${submitting ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.id}
                    checked={paymentMethod === opt.id}
                    disabled={submitting}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="sr-only"
                  />
                  <span className="text-lg mb-1">{opt.icon}</span>
                  <span className="text-xs">{opt.label}</span>
                </label>
              ))}
            </div>
            {formErrors.paymentMethod && (
              <p className="mt-1 text-xs text-red-600">{formErrors.paymentMethod}</p>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={submitting}
              className={`flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white shadow-xs transition ${
                submitting
                  ? 'cursor-not-allowed bg-indigo-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden'
              }`}
            >
              {submitting ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
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
                  <span>Processing Payment...</span>
                </>
              ) : (
                <span>Confirm Payment of ${amount ? parseFloat(amount || '0').toFixed(2) : '0.00'}</span>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              Payment record will be recorded in the hotel ledger and linked to your invoice.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
