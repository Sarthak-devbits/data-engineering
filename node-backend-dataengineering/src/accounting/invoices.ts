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
interface XeroInvoice {
  InvoiceID: string;
  Type?: string;
  Contact?: { Name?: string };
  InvoiceNumber?: string;
  Reference?: string;
  Status?: string;
  Date?: string;
  DueDate?: string;
  FullyPaidOnDate?: string;
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  AmountDue?: number;
  AmountPaid?: number;
  LineItems?: XeroLineItem[];
  CurrencyCode?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroInvoicesResponse {
  Invoices: XeroInvoice[];
}

export async function syncInvoices(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Invoices...");
  let page = 1;
  let totalSynced = 0;

  while (true) {
    const data = await callApi<XeroInvoicesResponse>(
      tenantId,
      token,
      `Invoices?page=${page}`,
    );
    const invoices = data.Invoices ?? [];
    if (invoices.length === 0) break;

    for (const inv of invoices) {
      const compositeId = inv.InvoiceID + String(userId);
      const updatedDateUtc = parseXeroDate(inv.UpdatedDateUTC);
      const firstLine = inv.LineItems?.[0];

      try {
        const existing = await prisma.invoice.findUnique({
          where: { compositeId },
          select: { updatedDateUtc: true },
        });

        const payload = {
          invoiceId: inv.InvoiceID,
          userId,
          xeroUserId,
          type: inv.Type,
          contactName: inv.Contact?.Name,
          invoiceNumber: inv.InvoiceNumber,
          reference: inv.Reference,
          status: inv.Status,
          date: parseXeroDate(inv.Date),
          dueDate: parseXeroDate(inv.DueDate),
          fullyPaidOnDate: parseXeroDate(inv.FullyPaidOnDate),
          subTotal: inv.SubTotal ?? 0,
          totalTax: inv.TotalTax ?? 0,
          total: inv.Total ?? 0,
          amountDue: inv.AmountDue ?? 0,
          amountPaid: inv.AmountPaid ?? 0,
          description: firstLine?.Description,
          quantity: firstLine?.Quantity ?? null,
          unitAmount: firstLine?.UnitAmount ?? null,
          currencyCode: inv.CurrencyCode,
          updatedDateUtc,
        };

        if (!existing) {
          await prisma.invoice.create({ data: { compositeId, ...payload } });
          logger.info(`Invoice inserted: ${inv.InvoiceID}`);
        } else if (
          updatedDateUtc &&
          existing.updatedDateUtc?.toISOString() !==
            updatedDateUtc.toISOString()
        ) {
          await prisma.invoice.update({
            where: { compositeId },
            data: payload,
          });
          logger.info(`Invoice updated: ${inv.InvoiceID}`);
        } else {
          logger.info(`Invoice unchanged: ${inv.InvoiceID}`);
        }

        if (inv.HasAttachments) {
          await syncAttachments(
            token,
            tenantId,
            xeroUserId,
            "Invoices",
            inv.InvoiceID,
          );
        }
      } catch (err) {
        logger.error(
          `Invoices error for ${inv.InvoiceID}: ${(err as Error).message}`,
        );
      }
    }

    totalSynced += invoices.length;
    page++;
  }
  logger.info(`Invoices sync complete. Total: ${totalSynced}`);
}
