import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroExpenseClaim {
  ExpenseClaimID: string;
  Status?: string;
  User?: Record<string, unknown>;
  Total?: number;
  AmountDue?: number;
  AmountPaid?: number;
  PaymentDueDate?: string;
  ReportingDate?: string;
  UpdatedDateUTC?: string;
}
interface XeroExpenseClaimsResponse {
  ExpenseClaims: XeroExpenseClaim[];
}

export async function syncExpenseClaims(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Expense Claims...");
  const data = await callApi<XeroExpenseClaimsResponse>(
    tenantId,
    token,
    "ExpenseClaims",
  );
  const claims = data.ExpenseClaims ?? [];

  for (const ec of claims) {
    const updatedDateUtc = parseXeroDate(ec.UpdatedDateUTC);

    try {
      const existing = await prisma.expenseClaim.findUnique({
        where: {
          expenseClaimId_userId: { expenseClaimId: ec.ExpenseClaimID, userId },
        },
        select: { updatedDateUtc: true },
      });

      const payload = {
        userId,
        xeroUserId,
        status: ec.Status,
        user: ec.User ? JSON.parse(JSON.stringify(ec.User)) : undefined,
        total: ec.Total ?? 0,
        amountDue: ec.AmountDue ?? 0,
        amountPaid: ec.AmountPaid ?? 0,
        paymentDueDate: parseXeroDate(ec.PaymentDueDate),
        reportingDate: parseXeroDate(ec.ReportingDate),
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.expenseClaim.create({
          data: { expenseClaimId: ec.ExpenseClaimID, ...payload },
        });
        logger.info(`ExpenseClaim inserted: ${ec.ExpenseClaimID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.expenseClaim.update({
          where: {
            expenseClaimId_userId: {
              expenseClaimId: ec.ExpenseClaimID,
              userId,
            },
          },
          data: payload,
        });
        logger.info(`ExpenseClaim updated: ${ec.ExpenseClaimID}`);
      } else {
        logger.info(`ExpenseClaim unchanged: ${ec.ExpenseClaimID}`);
      }
    } catch (err) {
      logger.error(
        `ExpenseClaims error for ${ec.ExpenseClaimID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Expense Claims sync complete. Total: ${claims.length}`);
}
