import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import { syncAttachments } from "./attachments";
import logger from "../utils/logger";

interface XeroAccount {
  AccountID: string;
  Code?: string;
  Name?: string;
  Description?: string;
  Class?: string;
  Type?: string;
  TaxType?: string;
  EnablePaymentsToAccount?: boolean;
  ShowInExpenseClaims?: boolean;
  Status?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroAccountsResponse {
  Accounts: XeroAccount[];
}

export async function syncAccounts(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Accounts...");
  const data = await callApi<XeroAccountsResponse>(tenantId, token, "Accounts");
  const accounts = data.Accounts ?? [];

  for (const acc of accounts) {
    const updatedDateUtc = parseXeroDate(acc.UpdatedDateUTC);
    try {
      const existing = await prisma.account.findUnique({
        where: { accountId_userId: { accountId: acc.AccountID, userId } },
        select: { updatedDateUtc: true },
      });

      if (!existing) {
        await prisma.account.create({
          data: {
            accountId: acc.AccountID,
            userId,
            xeroUserId,
            code: acc.Code,
            name: acc.Name ?? "",
            description: acc.Description,
            accountClass: acc.Class,
            accountType: acc.Type,
            taxType: acc.TaxType,
            enablePaymentsToAccount: acc.EnablePaymentsToAccount ?? false,
            showInExpenseClaims: acc.ShowInExpenseClaims ?? false,
            status: acc.Status,
            updatedDateUtc,
          },
        });
        logger.info(`Account inserted: ${acc.AccountID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.account.update({
          where: { accountId_userId: { accountId: acc.AccountID, userId } },
          data: {
            code: acc.Code,
            name: acc.Name ?? "",
            description: acc.Description,
            accountClass: acc.Class,
            accountType: acc.Type,
            taxType: acc.TaxType,
            enablePaymentsToAccount: acc.EnablePaymentsToAccount ?? false,
            showInExpenseClaims: acc.ShowInExpenseClaims ?? false,
            status: acc.Status,
            updatedDateUtc,
          },
        });
        logger.info(`Account updated: ${acc.AccountID}`);
      } else {
        logger.info(`Account unchanged: ${acc.AccountID}`);
      }

      if (acc.HasAttachments) {
        await syncAttachments(
          token,
          tenantId,
          xeroUserId,
          "Accounts",
          acc.AccountID,
        );
      }
    } catch (err) {
      logger.error(
        `Accounts error for ${acc.AccountID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Accounts sync complete. Total: ${accounts.length}`);
}
