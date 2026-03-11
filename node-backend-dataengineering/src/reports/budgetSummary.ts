import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroCell {
  Value: string;
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

export async function syncBudgetSummary(
  token: string,
  tenantId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Budget Summary...");
  const currentYear = new Date().getFullYear();
  const endpoint = `Reports/BudgetSummary?date=${currentYear}-01-01`;

  try {
    const data = await callApi<XeroReportResponse>(tenantId, token, endpoint);
    const report = data.Reports?.[0];
    if (!report) return;

    const updatedDateUtc = parseXeroDate(report.UpdatedDateUTC);
    const rows = report.Rows;
    if (!rows || rows.length === 0) return;

    const headers = (rows[0]?.Cells ?? []).map((c) => c.Value);

    for (const section of rows.slice(1)) {
      if (!section.Rows) continue;
      for (const row of section.Rows) {
        const cells = row.Cells ?? [];
        const account = cells[0]?.Value ?? "";
        if (!account) continue;

        for (let i = 1; i < headers.length; i++) {
          const date = headers[i];
          const value = cells[i]?.Value;
          if (!value || !date) continue;

          try {
            const existing = await prisma.budgetSummary.findFirst({
              where: { account, date, userId },
              select: { updatedDateUtc: true },
            });

            if (!existing) {
              await prisma.budgetSummary.create({
                data: { account, date, value, userId, updatedDateUtc },
              });
              logger.info(`BudgetSummary inserted: ${account} / ${date}`);
            } else if (
              updatedDateUtc &&
              existing.updatedDateUtc?.toISOString() !==
                updatedDateUtc.toISOString()
            ) {
              await prisma.budgetSummary.updateMany({
                where: { account, date, userId },
                data: { value, updatedDateUtc },
              });
              logger.info(`BudgetSummary updated: ${account} / ${date}`);
            }
          } catch (err) {
            logger.error(`BudgetSummary DB error: ${(err as Error).message}`);
          }
        }
      }
    }
  } catch (err) {
    logger.error(`BudgetSummary fetch error: ${(err as Error).message}`);
  }
  logger.info("Budget Summary sync complete.");
}
