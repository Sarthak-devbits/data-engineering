import "dotenv/config";
import prisma from "./utils/prismaClient";
import { buildAuthContext } from "./utils/xeroAuth";
import logger from "./utils/logger";

// ── Accounting modules ──────────────────────────────────────────
import { syncAccounts } from "./accounting/accounts";
import { syncContacts } from "./accounting/contacts";
import { syncInvoices } from "./accounting/invoices";
import { syncCreditNotes } from "./accounting/creditNotes";
import { syncPayments } from "./accounting/payments";
import { syncBankTransactions } from "./accounting/bankTransactions";
import { syncExpenseClaims } from "./accounting/expenseClaims";
import { syncEmployees } from "./accounting/employees";
import { syncItems } from "./accounting/items";
import { syncPurchaseOrders } from "./accounting/purchaseOrders";
import { syncReceipts } from "./accounting/receipts";
import { syncQuotes } from "./accounting/quotes";
import { syncBudgets } from "./accounting/budgets";
import { syncJournals } from "./accounting/journals";

// ── Report modules ──────────────────────────────────────────────
import { syncBalanceSheet } from "./reports/balanceSheet";
import { syncProfitAndLoss } from "./reports/profitAndLoss";
import { syncTrialBalance } from "./reports/trialBalance";
import { syncBudgetSummary } from "./reports/budgetSummary";
import { syncAgedPayablesByContact } from "./reports/agedPayablesByContact";
import { syncAgedReceivablesByContact } from "./reports/agedReceivablesByContact";

async function run(): Promise<void> {
  logger.info("╔══════════════════════════════════════════════╗");
  logger.info("║     Xero Data Engineering Sync - START       ║");
  logger.info("╚══════════════════════════════════════════════╝");

  // ── 1. Authenticate ─────────────────────────────────────────
  logger.info("\n[PHASE 1] Authentication...");
  const auth = await buildAuthContext();
  const { token, tenantId, xeroUserId } = auth;

  // Internal userId from env (the app-level user identifier)
  const userId = parseInt(process.env.APP_USER_ID ?? "1", 10);
  logger.info(`Running sync for userId=${userId}, xeroUserId=${xeroUserId}`);

  const startTime = Date.now();

  // ── 2. Core Accounting ──────────────────────────────────────
  logger.info("\n[PHASE 2] Core Accounting Data...");
  await syncAccounts(token, tenantId, xeroUserId, userId);
  await syncContacts(token, tenantId, xeroUserId, userId);
  await syncInvoices(token, tenantId, xeroUserId, userId);
  await syncCreditNotes(token, tenantId, xeroUserId, userId);
  await syncPayments(token, tenantId, xeroUserId, userId);
  await syncBankTransactions(token, tenantId, xeroUserId, userId);
  await syncExpenseClaims(token, tenantId, xeroUserId, userId);
  await syncEmployees(token, tenantId, xeroUserId, userId);
  await syncItems(token, tenantId, xeroUserId, userId);
  await syncPurchaseOrders(token, tenantId, xeroUserId, userId);
  await syncReceipts(token, tenantId, xeroUserId, userId);

  // ── 3. Split Accounts (heavier / paginated) ─────────────────
  logger.info("\n[PHASE 3] Journals, Budgets & Quotes...");
  await syncJournals(token, tenantId, xeroUserId, userId);
  await syncBudgets(token, tenantId, xeroUserId, userId);
  await syncQuotes(token, tenantId, xeroUserId, userId);

  // ── 4. Financial Reports ─────────────────────────────────────
  logger.info("\n[PHASE 4] Financial Reports...");
  await syncBalanceSheet(token, tenantId, xeroUserId, userId);
  await syncProfitAndLoss(token, tenantId, userId);
  await syncTrialBalance(token, tenantId, userId);
  await syncBudgetSummary(token, tenantId, userId);

  // ── 5. Aged Reports (per-contact, most API calls) ────────────
  logger.info("\n[PHASE 5] Aged Payables & Receivables...");
  await syncAgedPayablesByContact(token, tenantId, xeroUserId, userId);
  await syncAgedReceivablesByContact(token, tenantId, xeroUserId, userId);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info("\n╔══════════════════════════════════════════════╗");
  logger.info(`║   Sync COMPLETE in ${elapsed}s`.padEnd(46) + "║");
  logger.info("╚══════════════════════════════════════════════╝");
}

// ── Entry point ─────────────────────────────────────────────────
run()
  .catch((err) => {
    logger.error(`Fatal error: ${(err as Error).message}`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    logger.info("Database connection closed.");
  });
