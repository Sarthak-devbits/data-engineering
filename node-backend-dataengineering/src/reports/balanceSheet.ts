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
  Attributes?: Array<{ Id?: string; Value?: string }>;
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

export async function syncBalanceSheet(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Balance Sheet (last 12 months)...");
  const monthEndDates = generateLastNMonthEndDates(12);

  for (const date of monthEndDates) {
    const dateStr = toDateString(date);
    try {
      const data = await callApi<XeroReportResponse>(
        tenantId,
        token,
        `Reports/BalanceSheet?date=${dateStr}`,
      );
      const report = data.Reports?.[0];
      if (!report) continue;

      const updatedDateUtc = parseXeroDate(report.UpdatedDateUTC);
      const rows = report.Rows;
      if (!rows || rows.length === 0) continue;

      // Extract headers and account IDs from header row
      const headerRow = rows[0];
      const headers = (headerRow.Cells ?? []).map((c) => c.Value);

      // Collect all data rows
      for (const section of rows.slice(1)) {
        if (!section.Rows) continue;
        for (const row of section.Rows) {
          const cells = row.Cells ?? [];
          const accountType = cells[0]?.Value ?? "";
          const accountId = cells[0]?.Attributes?.[0]?.Value ?? null;

          for (let i = 1; i < headers.length; i++) {
            const colDate = headers[i];
            const value = cells[i]?.Value;
            if (!value || !colDate) continue;

            try {
              const existing = await prisma.balanceSheet.findFirst({
                where: { accountType, date: colDate, userId },
                select: { updatedDateUtc: true },
              });

              if (!existing) {
                await prisma.balanceSheet.create({
                  data: {
                    accountId,
                    accountType,
                    date: colDate,
                    value,
                    userId,
                    updatedDateUtc,
                  },
                });
                logger.info(
                  `BalanceSheet inserted: ${accountType} / ${colDate}`,
                );
              } else if (
                updatedDateUtc &&
                existing.updatedDateUtc?.toISOString() !==
                  updatedDateUtc.toISOString()
              ) {
                await prisma.balanceSheet.updateMany({
                  where: { accountType, date: colDate, userId },
                  data: { accountId, value, updatedDateUtc },
                });
                logger.info(
                  `BalanceSheet updated: ${accountType} / ${colDate}`,
                );
              }
            } catch (err) {
              logger.error(`BalanceSheet error: ${(err as Error).message}`);
            }
          }
        }
      }
    } catch (err) {
      logger.error(
        `BalanceSheet fetch error for ${dateStr}: ${(err as Error).message}`,
      );
    }
  }
  logger.info("Balance Sheet sync complete.");
}
