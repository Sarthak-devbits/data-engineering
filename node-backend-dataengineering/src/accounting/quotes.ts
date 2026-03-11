import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroQuote {
  QuoteID: string;
  QuoteNumber?: string;
  Contact?: { Name?: string };
  Status?: string;
  Date?: string;
  ExpiryDate?: string;
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  UpdatedDateUTC?: string;
  [key: string]: unknown;
}
interface XeroQuotesResponse {
  Quotes: XeroQuote[];
}

export async function syncQuotes(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Quotes...");
  const data = await callApi<XeroQuotesResponse>(tenantId, token, "Quotes");
  const quotes = data.Quotes ?? [];

  for (const q of quotes) {
    const updatedDateUtc = parseXeroDate(q.UpdatedDateUTC);

    try {
      const existing = await prisma.quote.findUnique({
        where: { quoteId_userId: { quoteId: q.QuoteID, userId } },
        select: { updatedDateUtc: true },
      });

      const payload = {
        userId,
        xeroUserId,
        quoteNumber: q.QuoteNumber,
        contactName: q.Contact?.Name,
        status: q.Status,
        date: parseXeroDate(q.Date),
        expiryDate: parseXeroDate(q.ExpiryDate),
        subTotal: q.SubTotal ?? null,
        totalTax: q.TotalTax ?? null,
        total: q.Total ?? null,
        quoteData: JSON.parse(JSON.stringify(q)),
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.quote.create({ data: { quoteId: q.QuoteID, ...payload } });
        logger.info(`Quote inserted: ${q.QuoteID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.quote.update({
          where: { quoteId_userId: { quoteId: q.QuoteID, userId } },
          data: payload,
        });
        logger.info(`Quote updated: ${q.QuoteID}`);
      } else {
        logger.info(`Quote unchanged: ${q.QuoteID}`);
      }
    } catch (err) {
      logger.error(`Quotes error for ${q.QuoteID}: ${(err as Error).message}`);
    }
  }
  logger.info(`Quotes sync complete. Total: ${quotes.length}`);
}
