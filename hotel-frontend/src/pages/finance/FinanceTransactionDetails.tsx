import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTransactionById } from '../../services/financeService';
import {
  REFERENCE_SOURCE,
  REFERENCE_TRIGGER,
  REFERENCE_TYPE_LABEL,
  STATUS_BADGE,
  TYPE_BADGE,
  categoryLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  referenceLink,
} from './financeMeta';
import type { FinanceTransaction } from '../../types/finance';

export default function FinanceTransactionDetails() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transaction, setTransaction] = useState<FinanceTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTransaction = useCallback(async () => {
    if (!transactionId) return;
    try {
      setError(null);
      setTransaction(await getTransactionById(transactionId));
    } catch (err: any) {
      setError(
        err?.response?.status === 404
          ? 'Finance transaction not found.'
          : err?.response?.data?.message || 'Failed to load the finance transaction.'
      );
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  const copyReference = async () => {
    if (!transaction?.referenceId) return;
    try {
      await navigator.clipboard.writeText(transaction.referenceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; the ID stays visible and selectable.
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading transaction…</span>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Finance transaction not found.'}
        <button
          type="button"
          onClick={() => navigate('/finance/transactions')}
          className="ml-3 font-semibold underline"
        >
          Back to transactions
        </button>
      </div>
    );
  }

  const typeBadge = TYPE_BADGE[transaction.type];
  const statusBadge = STATUS_BADGE[transaction.status];
  const isCancelled = transaction.status === 'CANCELLED';
  const link = referenceLink(transaction.referenceType, transaction.referenceId, user?.role);

  const details = [
    { label: 'Transaction ID', value: transaction.transactionId, mono: true },
    { label: 'Type', value: typeBadge.label },
    { label: 'Category', value: categoryLabel(transaction.category) },
    { label: 'Amount', value: formatCurrency(transaction.amount) },
    { label: 'Transaction Date', value: formatDate(transaction.transactionDate) },
    { label: 'Status', value: statusBadge.label },
    { label: 'Performed By', value: transaction.performedBy || '—', mono: true },
    { label: 'Created', value: formatDateTime(transaction.createdAt) },
    { label: 'Last Updated', value: formatDateTime(transaction.updatedAt) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/finance" className="hover:text-gray-700">
            Finance
          </Link>
          <span>/</span>
          <Link to="/finance/transactions" className="hover:text-gray-700">
            Transactions
          </Link>
          <span>/</span>
          <span className="font-mono text-gray-900">
            {transaction.transactionId.slice(0, 8)}…
          </span>
        </div>

        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {transaction.description}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeBadge.cls}`}
          >
            {typeBadge.label}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.cls}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
            {statusBadge.label}
          </span>
          <span className="inline-block rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            {categoryLabel(transaction.category)}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isCancelled && (
        <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          This transaction was cancelled, so its amount is excluded from all
          income, expense, and net totals.
        </div>
      )}

      {/* Amount */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {typeBadge.label} amount
        </p>
        <p
          className={`mt-1 text-3xl font-bold ${
            isCancelled ? 'text-gray-400 line-through' : typeBadge.tone
          }`}
        >
          {typeBadge.sign} {formatCurrency(transaction.amount)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Recorded on {formatDate(transaction.transactionDate)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transaction information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Transaction Information
          </h2>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {details.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {row.label}
                </dt>
                <dd
                  className={`mt-1 break-words text-sm text-gray-900 ${
                    row.mono ? 'font-mono text-xs' : ''
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Source record */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-gray-900">Source Record</h2>
          <p className="mb-4 text-xs text-gray-500">
            Where this entry came from
          </p>

          {transaction.referenceType ? (
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reference Type
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {REFERENCE_TYPE_LABEL[transaction.referenceType]}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Module
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {REFERENCE_SOURCE[transaction.referenceType]}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reference ID
                </dt>
                <dd className="mt-1 flex items-start gap-2">
                  {transaction.referenceId ? (
                    <>
                      <span className="min-w-0 break-all font-mono text-xs text-gray-900">
                        {transaction.referenceId}
                      </span>
                      <button
                        type="button"
                        onClick={copyReference}
                        className="shrink-0 rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </dd>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-gray-600">
                  {REFERENCE_TRIGGER[transaction.referenceType]}
                </p>
              </div>

              {link ? (
                <Link
                  to={link.path}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  {link.label} →
                </Link>
              ) : (
                <p className="text-xs text-gray-400">
                  Your role can view the ledger entry but not the linked module.
                </p>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-400">
              No source record is linked to this transaction.
            </p>
          )}
        </div>
      </div>

      {/* Read-only notice */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-900">
        Finance entries are generated by the payment, inventory, and maintenance
        modules and cannot be created or edited here, so the ledger always matches
        the records that produced it.
      </div>
    </div>
  );
}
