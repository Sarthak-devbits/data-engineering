import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate, toDateString } from "../utils/dateUtils";
import logger from "../utils/logger";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL =
  process.env.XERO_BASE_URL || "https://api.xero.com/api.xro/2.0/";

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
  ReportTitles?: string[];
  Id?: string;
  Rows: XeroRow[];
}
interface XeroReportResponse {
  Reports: XeroReport[];
  Id?: string;
}

/** Generate full month ranges going back 12 months from today */
function generateMonthRanges(): Array<{ fromDate: string; toDate: string }> {
  const ranges: Array<{ fromDate: string; toDate: string }> = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const year = today.getFullYear();
    const month = today.getMonth() - i;
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0);
    ranges.push({
      fromDate: toDateString(from),
      toDate: toDateString(to),
    });
  }
  return ranges;
}

export async function syncProfitAndLoss(
  token: string,
  tenantId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Profit & Loss (last 12 months)...");
  const ranges = generateMonthRanges();

  for (const { fromDate, toDate } of ranges) {
    const endpoint = `Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`;
    try {
      const data = await callApi<XeroReportResponse>(tenantId, token, endpoint);
      const report = data.Reports?.[0];
      if (!report) continue;

      const updatedDateUtc = parseXeroDate(report.UpdatedDateUTC);
      const reportId = data.Id ?? "";
      const reportTitle = report.ReportTitles?.[0] ?? "";
      const organisation = report.ReportTitles?.[1] ?? "";
      const reportDates = report.ReportTitles?.[2] ?? `${fromDate} - ${toDate}`;

      const rows = report.Rows;
      if (!rows) continue;
      const headers = (rows[0]?.Cells ?? []).map((c) => c.Value);

      for (const section of rows.slice(1)) {
        if (!section.Rows) continue;
        for (const row of section.Rows) {
          const cells = row.Cells ?? [];
          const type = cells[0]?.Value ?? "";
          const value = cells[1]?.Value ?? "";
          const accountId = cells[0]?.Attributes?.[0]?.Value ?? null;
          if (!type) continue;

          try {
            const existing = await prisma.profitAndLoss.findFirst({
              where: { type, reportDates, userId },
              select: { updatedDateUtc: true },
            });

            if (!existing) {
              await prisma.profitAndLoss.create({
                data: {
                  type,
                  value,
                  accountId,
                  reportId,
                  reportTitle,
                  organisation,
                  reportDates,
                  userId,
                  updatedDateUtc,
                },
              });
            } else if (
              updatedDateUtc &&
              existing.updatedDateUtc?.toISOString() !==
                updatedDateUtc.toISOString()
            ) {
              await prisma.profitAndLoss.updateMany({
                where: { type, reportDates, userId },
                data: { value, accountId, updatedDateUtc },
              });
            }
          } catch (err) {
            logger.error(`ProfitAndLoss DB error: ${(err as Error).message}`);
          }
        }
      }
    } catch (err) {
      logger.error(
        `ProfitAndLoss fetch error for ${fromDate}-${toDate}: ${(err as Error).message}`,
      );
    }
  }
  logger.info("Profit & Loss sync complete.");
}
