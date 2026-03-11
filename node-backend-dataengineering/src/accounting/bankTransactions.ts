import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import { syncAttachments } from "./attachments";
import logger from "../utils/logger";

interface XeroBankTransaction {
  BankTransactionID: string;
  Type?: string;
  Contact?: { Name?: string };
  BankAccount?: Record<string, unknown>;
  Date?: string;
  Reference?: string;
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  LineItems?: unknown[];
  IsReconciled?: boolean;
  CurrencyCode?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroBankTransactionsResponse {
  BankTransactions: XeroBankTransaction[];
}

export async function syncBankTransactions(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Bank Transactions...");
  const data = await callApi<XeroBankTransactionsResponse>(
    tenantId,
    token,
    "BankTransactions",
  );
  const transactions = data.BankTransactions ?? [];

  for (const t of transactions) {
    const compositeId = t.BankTransactionID + String(userId);
    const updatedDateUtc = parseXeroDate(t.UpdatedDateUTC);

    try {
      const existing = await prisma.bankTransaction.findUnique({
        where: { compositeId },
        select: { updatedDateUtc: true },
      });

      const payload = {
        bankTransactionId: t.BankTransactionID,
        userId,
        xeroUserId,
        type: t.Type,
        contactName: t.Contact?.Name,
        bankAccount: t.BankAccount
          ? JSON.parse(JSON.stringify(t.BankAccount))
          : undefined,
        date: parseXeroDate(t.Date),
        reference: t.Reference,
        subTotal: t.SubTotal ?? 0,
        totalTax: t.TotalTax ?? 0,
        total: t.Total ?? 0,
        lineItems: t.LineItems
          ? JSON.parse(JSON.stringify(t.LineItems))
          : undefined,
        isReconciled: t.IsReconciled ?? false,
        currencyCode: t.CurrencyCode,
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.bankTransaction.create({
          data: { compositeId, ...payload },
        });
        logger.info(`BankTransaction inserted: ${t.BankTransactionID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.bankTransaction.update({
          where: { compositeId },
          data: payload,
        });
        logger.info(`BankTransaction updated: ${t.BankTransactionID}`);
      } else {
        logger.info(`BankTransaction unchanged: ${t.BankTransactionID}`);
      }

      if (t.HasAttachments) {
        await syncAttachments(
          token,
          tenantId,
          xeroUserId,
          "BankTransactions",
          t.BankTransactionID,
        );
      }
    } catch (err) {
      logger.error(
        `BankTransactions error for ${t.BankTransactionID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Bank Transactions sync complete. Total: ${transactions.length}`);
}
