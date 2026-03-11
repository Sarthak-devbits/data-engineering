import { PrismaClient } from "@prisma/client";
import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import { extractNameFromText } from "../utils/openaiClient";
import logger from "../utils/logger";

// Transaction client type - cast needed due to driver adapter affecting inferred type
type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// ─── Xero Types ──────────────────────────────────────────────────
interface XeroJournalLine {
  JournalLineID: string;
  AccountID?: string;
  AccountCode?: string;
  AccountType?: string;
  AccountName?: string;
  Description?: string;
  NetAmount?: number;
  GrossAmount?: number;
  TaxAmount?: number;
  TaxType?: string;
  TaxName?: string;
}
interface XeroJournal {
  JournalID: string;
  JournalNumber: number;
  JournalDate?: string;
  CreatedDateUTC?: string;
  Reference?: string;
  SourceID?: string;
  SourceType?: string;
  JournalLines?: XeroJournalLine[];
}
interface XeroJournalsResponse {
  Journals: XeroJournal[];
}
interface XeroHistoryRecord {
  Details?: string;
}
interface XeroHistoryResponse {
  HistoryRecords: XeroHistoryRecord[];
}

// ─── Source type → FK table mapping ──────────────────────────────
type SourceFKs = {
  bankTransactionCompositeId?: string;
  paymentCompositeId?: string;
  creditNoteCompositeId?: string;
  invoiceCompositeId?: string;
  expenseClaimId?: string;
};

async function resolveContactName(
  token: string,
  tenantId: string,
  sourceType: string,
  sourceId: string,
  userId: number,
): Promise<{ contactName: string; fks: SourceFKs }> {
  const fks: SourceFKs = {};

  try {
    if (["ACCPAY", "ACCREC"].includes(sourceType)) {
      const data = await callApi<{
        Invoices: Array<{ Contact?: { Name?: string } }>;
      }>(tenantId, token, `Invoice/${sourceId}`);
      fks.invoiceCompositeId = sourceId + String(userId);
      return { contactName: data.Invoices?.[0]?.Contact?.Name ?? "", fks };
    }

    if (["ACCPAYCREDIT", "ACCRECCREDIT"].includes(sourceType)) {
      const data = await callApi<{
        CreditNotes: Array<{ Contact?: { Name?: string } }>;
      }>(tenantId, token, `CreditNotes/${sourceId}`);
      fks.creditNoteCompositeId = sourceId + String(userId);
      return { contactName: data.CreditNotes?.[0]?.Contact?.Name ?? "", fks };
    }

    if (["CASHPAID", "CASHREC"].includes(sourceType)) {
      const data = await callApi<{
        BankTransactions: Array<{ Contact?: { Name?: string } }>;
      }>(tenantId, token, `BankTransactions/${sourceId}`);
      fks.bankTransactionCompositeId = sourceId + String(userId);
      return {
        contactName: data.BankTransactions?.[0]?.Contact?.Name ?? "",
        fks,
      };
    }

    if (["ACCPAYPAYMENT", "ACCRECPAYMENT"].includes(sourceType)) {
      const data = await callApi<{
        Payments: Array<{ Invoice?: { Contact?: { Name?: string } } }>;
      }>(tenantId, token, `Payments/${sourceId}`);
      fks.paymentCompositeId = sourceId + String(userId);
      return {
        contactName: data.Payments?.[0]?.Invoice?.Contact?.Name ?? "",
        fks,
      };
    }

    if (sourceType === "TRANSFER") {
      const data = await callApi<XeroHistoryResponse>(
        tenantId,
        token,
        `Banktransactions/${sourceId}/history`,
      );
      fks.bankTransactionCompositeId = sourceId + String(userId);
      const details = data.HistoryRecords?.[0]?.Details ?? "";
      const name = await extractNameFromText(details);
      return { contactName: name, fks };
    }

    if (sourceType === "EXPCLAIM") {
      const data = await callApi<XeroHistoryResponse>(
        tenantId,
        token,
        `ExpenseClaims/${sourceId}/History`,
      );
      fks.expenseClaimId = sourceId;
      const details = data.HistoryRecords?.[0]?.Details ?? "";
      const name = await extractNameFromText(details);
      return { contactName: name, fks };
    }
  } catch (err) {
    logger.warn(
      `resolveContactName failed for ${sourceType}/${sourceId}: ${(err as Error).message}`,
    );
  }

  return { contactName: "", fks };
}

// ─── Main sync function ───────────────────────────────────────────
export async function syncJournals(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Journals...");
  let offsetValue = 1;
  let totalSynced = 0;

  while (true) {
    const data = await callApi<XeroJournalsResponse>(
      tenantId,
      token,
      `Journals?offset=${offsetValue}`,
    );
    const journals = data.Journals ?? [];
    if (journals.length === 0) break;

    // Next offset = last journal number
    offsetValue = journals[journals.length - 1].JournalNumber;

    for (const journal of journals) {
      const journalDate = parseXeroDate(journal.JournalDate);
      const createdDateUtc = parseXeroDate(journal.CreatedDateUTC);

      try {
        // Check if journal already exists (unique: journalId + userId + journalNumber + journalDate)
        const existing = await prisma.journal.findFirst({
          where: {
            journalId: journal.JournalID,
            userId,
            journalNumber: journal.JournalNumber,
            journalDate,
          },
          select: { id: true },
        });

        if (existing) {
          logger.info(`Journal already exists: ${journal.JournalID}`);
          continue;
        }

        // Resolve contact name from source document
        let contactName = "";
        let fks: SourceFKs = {};
        if (journal.SourceID && journal.SourceType) {
          const resolved = await resolveContactName(
            token,
            tenantId,
            journal.SourceType,
            journal.SourceID,
            userId,
          );
          contactName = resolved.contactName;
          fks = resolved.fks;
        }

        // Insert journal + lines in a transaction
        await prisma.$transaction(async (tx) => {
          const client = tx as unknown as TxClient;
          const createdJournal = await client.journal.create({
            data: {
              journalId: journal.JournalID,
              userId,
              xeroUserId,
              journalNumber: journal.JournalNumber,
              journalDate,
              createdDateUtc,
              reference: journal.Reference,
              sourceId: journal.SourceID,
              sourceType: journal.SourceType,
              contactName,
              bankTransactionCompositeId: fks.bankTransactionCompositeId,
              paymentCompositeId: fks.paymentCompositeId,
              creditNoteCompositeId: fks.creditNoteCompositeId,
              invoiceCompositeId: fks.invoiceCompositeId,
              expenseClaimId: fks.expenseClaimId,
            },
          });

          const lineItems = journal.JournalLines ?? [];
          for (const line of lineItems) {
            await client.journalLine.create({
              data: {
                journalLineId: line.JournalLineID,
                journalId: createdJournal.id,
                accountId: line.AccountID,
                accountCode: line.AccountCode,
                accountType: line.AccountType,
                accountName: line.AccountName,
                description: line.Description,
                netAmount: line.NetAmount ?? 0,
                grossAmount: line.GrossAmount ?? 0,
                taxAmount: line.TaxAmount ?? 0,
                taxType: line.TaxType,
                taxName: line.TaxName,
              },
            });
          }
        });

        logger.info(
          `Journal inserted: ${journal.JournalID} with ${journal.JournalLines?.length ?? 0} lines`,
        );
        totalSynced++;
      } catch (err) {
        logger.error(
          `Journals error for ${journal.JournalID}: ${(err as Error).message}`,
        );
      }
    }
  }

  logger.info(`Journals sync complete. Total inserted: ${totalSynced}`);
}
