import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import {
  parseXeroDate,
  toDateString,
  generateLastNMonthEndDates,
} from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroCell {
  Value: string;
  Attributes?: Array<{ Value?: string }>;
}
interface XeroRow {
  RowType: string;
  Cells?: XeroCell[];
  Rows?: XeroRow[];
}
interface XeroReport {
  UpdatedDateUTC?: string;
  Rows: XeroRow[];
}
interface XeroReportResponse {
  Reports: XeroReport[];
}

export async function syncTrialBalance(
  token: string,
  tenantId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Trial Balance (last 12 months)...");
  const monthEndDates = generateLastNMonthEndDates(12);

  for (const date of monthEndDates) {
    const dateStr = toDateString(date);
    try {
      const data = await callApi<XeroReportResponse>(
        tenantId,
        token,
        "Reports/TrialBalance",
      );
      const report = data.Reports?.[0];
      if (!report) continue;

      const updatedDateUtc = parseXeroDate(report.UpdatedDateUTC);
      const rows = report.Rows;
      if (!rows || rows.length === 0) continue;

      const headers = (rows[0]?.Cells ?? []).map((c) => c.Value);

      for (const section of rows.slice(1)) {
        if (!section.Rows) continue;
        for (const row of section.Rows) {
          if (row.RowType !== "Row") continue;
          const cells = row.Cells ?? [];
          const accountId = cells[0]?.Attributes?.[0]?.Value ?? null;
          const accountName = cells[0]?.Value ?? "";
          const debit = cells[1]?.Value ?? "";
          const credit = cells[2]?.Value ?? "";
          const ytdDebit = cells[3]?.Value ?? "";
          const ytdCredit = cells[4]?.Value ?? "";

          if (!accountId) continue;
          try {
            const existing = await prisma.trialBalance.findFirst({
              where: { accountId, userId },
              select: { updatedDateUtc: true },
            });

            if (!existing) {
              await prisma.trialBalance.create({
                data: {
                  accountId,
                  accountName,
                  debit,
                  credit,
                  ytdDebit,
                  ytdCredit,
                  reportDate: dateStr,
                  userId,
                  updatedDateUtc,
                },
              });
              logger.info(`TrialBalance inserted: ${accountId}`);
            } else if (
              updatedDateUtc &&
              existing.updatedDateUtc?.toISOString() !==
                updatedDateUtc.toISOString()
            ) {
              await prisma.trialBalance.updateMany({
                where: { accountId, userId },
                data: {
                  debit,
                  credit,
                  ytdDebit,
                  ytdCredit,
                  reportDate: dateStr,
                  updatedDateUtc,
                },
              });
              logger.info(`TrialBalance updated: ${accountId}`);
            }
          } catch (err) {
            logger.error(
              `TrialBalance DB error for ${accountId}: ${(err as Error).message}`,
            );
          }
        }
      }
    } catch (err) {
      logger.error(
        `TrialBalance fetch error for ${dateStr}: ${(err as Error).message}`,
      );
    }
  }
  logger.info("Trial Balance sync complete.");
}
