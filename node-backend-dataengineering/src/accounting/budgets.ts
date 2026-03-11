import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroBudget {
  BudgetID: string;
  Type?: string;
  Description?: string;
  UpdatedDateUTC?: string;
  BudgetLines?: unknown[];
  Tracking?: unknown[];
}
interface XeroBudgetsResponse {
  Budgets: XeroBudget[];
}

export async function syncBudgets(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Budgets...");
  const data = await callApi<XeroBudgetsResponse>(tenantId, token, "Budgets");
  const budgets = data.Budgets ?? [];

  for (const b of budgets) {
    const compositeId = b.BudgetID + String(userId);
    const updatedDateUtc = parseXeroDate(b.UpdatedDateUTC);

    try {
      const existing = await prisma.budget.findUnique({
        where: { compositeId },
        select: { updatedDateUtc: true },
      });

      const payload = {
        budgetId: b.BudgetID,
        userId,
        xeroUserId,
        budgetType: b.Type,
        description: b.Description,
        budgetLines: b.BudgetLines
          ? JSON.parse(JSON.stringify(b.BudgetLines))
          : undefined,
        tracking: b.Tracking
          ? JSON.parse(JSON.stringify(b.Tracking))
          : undefined,
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.budget.create({ data: { compositeId, ...payload } });
        logger.info(`Budget inserted: ${b.BudgetID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.budget.update({ where: { compositeId }, data: payload });
        logger.info(`Budget updated: ${b.BudgetID}`);
      } else {
        logger.info(`Budget unchanged: ${b.BudgetID}`);
      }
    } catch (err) {
      logger.error(
        `Budgets error for ${b.BudgetID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Budgets sync complete. Total: ${budgets.length}`);
}
