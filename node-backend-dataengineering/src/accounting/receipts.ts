import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import { syncAttachments } from "./attachments";
import logger from "../utils/logger";

interface XeroReceipt {
  ReceiptID: string;
  Date?: string;
  Contact?: Record<string, unknown>;
  User?: Record<string, unknown>;
  LineItems?: unknown[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  Status?: string;
  ReceiptNumber?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroReceiptsResponse {
  Receipts: XeroReceipt[];
}

export async function syncReceipts(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Receipts...");
  const data = await callApi<XeroReceiptsResponse>(tenantId, token, "Receipts");
  const receipts = data.Receipts ?? [];

  for (const r of receipts) {
    const updatedDateUtc = parseXeroDate(r.UpdatedDateUTC);

    try {
      const existing = await prisma.receipt.findUnique({
        where: { receiptId_userId: { receiptId: r.ReceiptID, userId } },
        select: { updatedDateUtc: true },
      });

      const payload = {
        userId,
        xeroUserId,
        date: parseXeroDate(r.Date),
        contact: r.Contact ? JSON.parse(JSON.stringify(r.Contact)) : undefined,
        user: r.User ? JSON.parse(JSON.stringify(r.User)) : undefined,
        lineItems: r.LineItems
          ? JSON.parse(JSON.stringify(r.LineItems))
          : undefined,
        subTotal: r.SubTotal ?? 0,
        totalTax: r.TotalTax ?? 0,
        total: r.Total ?? 0,
        status: r.Status,
        receiptNumber: r.ReceiptNumber,
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.receipt.create({
          data: { receiptId: r.ReceiptID, ...payload },
        });
        logger.info(`Receipt inserted: ${r.ReceiptID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.receipt.update({
          where: { receiptId_userId: { receiptId: r.ReceiptID, userId } },
          data: payload,
        });
        logger.info(`Receipt updated: ${r.ReceiptID}`);
      } else {
        logger.info(`Receipt unchanged: ${r.ReceiptID}`);
      }

      if (r.HasAttachments) {
        await syncAttachments(
          token,
          tenantId,
          xeroUserId,
          "Receipts",
          r.ReceiptID,
        );
      }
    } catch (err) {
      logger.error(
        `Receipts error for ${r.ReceiptID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Receipts sync complete. Total: ${receipts.length}`);
}
