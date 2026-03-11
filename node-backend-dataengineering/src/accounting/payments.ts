import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroPayment {
  PaymentID: string;
  Invoice?: { InvoiceNumber?: string; [key: string]: unknown };
  Account?: Record<string, unknown>;
  Date?: string;
  Amount?: number;
  PaymentType?: string;
  Reference?: string;
  UpdatedDateUTC?: string;
}
interface XeroPaymentsResponse {
  Payments: XeroPayment[];
}

export async function syncPayments(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Payments...");
  const data = await callApi<XeroPaymentsResponse>(tenantId, token, "Payments");
  const payments = data.Payments ?? [];

  for (const p of payments) {
    const compositeId = p.PaymentID + String(userId);
    const updatedDateUtc = parseXeroDate(p.UpdatedDateUTC);

    try {
      const existing = await prisma.payment.findUnique({
        where: { compositeId },
        select: { updatedDateUtc: true },
      });

      const payload = {
        paymentId: p.PaymentID,
        userId,
        xeroUserId,
        invoice: p.Invoice ? JSON.parse(JSON.stringify(p.Invoice)) : undefined,
        invoiceNumber: p.Invoice?.InvoiceNumber,
        account: p.Account ? JSON.parse(JSON.stringify(p.Account)) : undefined,
        date: parseXeroDate(p.Date),
        amount: p.Amount ?? 0,
        paymentType: p.PaymentType,
        reference: p.Reference,
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.payment.create({ data: { compositeId, ...payload } });
        logger.info(`Payment inserted: ${p.PaymentID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.payment.update({ where: { compositeId }, data: payload });
        logger.info(`Payment updated: ${p.PaymentID}`);
      } else {
        logger.info(`Payment unchanged: ${p.PaymentID}`);
      }
    } catch (err) {
      logger.error(
        `Payments error for ${p.PaymentID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Payments sync complete. Total: ${payments.length}`);
}
