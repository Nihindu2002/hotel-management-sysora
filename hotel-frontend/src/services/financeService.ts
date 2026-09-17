import api from './api';
import type { FinanceSummary, FinanceTransaction } from '../types/finance';

/**
 * Retrieves the full ledger.
 * Uses: GET /api/finance/transactions
 *
 * The endpoint returns every transaction in one list with no pagination and no
 * combined filtering, so callers filter client-side (see FinanceTransactions).
 */
export const getTransactions = async (): Promise<FinanceTransaction[]> => {
  const response = await api.get<FinanceTransaction[]>('/finance/transactions');
  return response.data;
};

/**
 * Retrieves a single transaction by ID.
 * Uses: GET /api/finance/transactions/{transactionId}
 */
export const getTransactionById = async (
  transactionId: string
): Promise<FinanceTransaction> => {
  const response = await api.get<FinanceTransaction>(
    `/finance/transactions/${transactionId}`
  );
  return response.data;
};

/**
 * Retrieves income/expense totals, optionally scoped to a date range.
 * Uses: GET /api/finance/summary
 *
 * Omitting both bounds summarises all time; the dashboard passes the current
 * month to get the month-to-date figures.
 */
export const getSummary = async (
  startDate?: string,
  endDate?: string
): Promise<FinanceSummary> => {
  const response = await api.get<FinanceSummary>('/finance/summary', {
    params: {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    },
  });
  return response.data;
};

/**
 * Note the absence of create/update/cancel calls. Income and expenses are
 * recorded by the backend as a side effect of completing a payment, receiving
 * stock, or completing a maintenance task with a cost. Posting to /finance from
 * the client would duplicate those records, so the Finance UI only displays them.
 */
