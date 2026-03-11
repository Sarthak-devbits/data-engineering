import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import { syncAttachments } from "./attachments";
import logger from "../utils/logger";

interface XeroLineItem {
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
}
interface XeroCreditNote {
  CreditNoteID: string;
  Type?: string;
  CreditNoteNumber?: string;
  Contact?: { Name?: string };
  Status?: string;
  Date?: string;
  FullyPaidOnDate?: string;
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  LineItems?: XeroLineItem[];
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroCreditNotesResponse {
  CreditNotes: XeroCreditNote[];
}

export async function syncCreditNotes(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Credit Notes...");
  let page = 1;
  let totalSynced = 0;

  while (true) {
    const data = await callApi<XeroCreditNotesResponse>(
      tenantId,
      token,
      `CreditNotes?page=${page}`,
    );
    const creditNotes = data.CreditNotes ?? [];
    if (creditNotes.length === 0) break;

    for (const cn of creditNotes) {
      const compositeId = cn.CreditNoteID + String(userId);
      const updatedDateUtc = parseXeroDate(cn.UpdatedDateUTC);
      const firstLine = cn.LineItems?.[0];

      try {
        const existing = await prisma.creditNote.findUnique({
          where: { compositeId },
          select: { updatedDateUtc: true },
        });

        const payload = {
          creditNoteId: cn.CreditNoteID,
          userId,
          xeroUserId,
          type: cn.Type,
          creditNoteNumber: cn.CreditNoteNumber,
          contactName: cn.Contact?.Name,
          status: cn.Status,
          date: parseXeroDate(cn.Date),
          dueDate: parseXeroDate(cn.FullyPaidOnDate),
          subTotal: cn.SubTotal ?? 0,
          totalTax: cn.TotalTax ?? 0,
          total: cn.Total ?? 0,
          lineItems: cn.LineItems ? JSON.stringify(cn.LineItems) : undefined,
          description: firstLine?.Description,
          quantity: firstLine?.Quantity ?? null,
          unitAmount: firstLine?.UnitAmount ?? null,
          updatedDateUtc,
        };

        if (!existing) {
          await prisma.creditNote.create({ data: { compositeId, ...payload } });
          logger.info(`Credit Note inserted: ${cn.CreditNoteID}`);
        } else if (
          updatedDateUtc &&
          existing.updatedDateUtc?.toISOString() !==
            updatedDateUtc.toISOString()
        ) {
          await prisma.creditNote.update({
            where: { compositeId },
            data: payload,
          });
          logger.info(`Credit Note updated: ${cn.CreditNoteID}`);
        } else {
          logger.info(`Credit Note unchanged: ${cn.CreditNoteID}`);
        }

        if (cn.HasAttachments) {
          await syncAttachments(
            token,
            tenantId,
            xeroUserId,
            "CreditNotes",
            cn.CreditNoteID,
          );
        }
      } catch (err) {
        logger.error(
          `CreditNotes error for ${cn.CreditNoteID}: ${(err as Error).message}`,
        );
      }
    }

    totalSynced += creditNotes.length;
    page++;
  }
  logger.info(`Credit Notes sync complete. Total: ${totalSynced}`);
}
