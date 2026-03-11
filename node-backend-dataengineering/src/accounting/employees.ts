import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import logger from "../utils/logger";

interface XeroEmployee {
  EmployeeID: string;
  Status?: string;
  FirstName?: string;
  LastName?: string;
}
interface XeroEmployeesResponse {
  Employees: XeroEmployee[];
}

export async function syncEmployees(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Employees...");
  const data = await callApi<XeroEmployeesResponse>(
    tenantId,
    token,
    "Employee",
  );
  const employees = data.Employees ?? [];

  for (const emp of employees) {
    try {
      const existing = await prisma.employee.findUnique({
        where: { employeeId_userId: { employeeId: emp.EmployeeID, userId } },
        select: { employeeId: true },
      });

      if (!existing) {
        await prisma.employee.create({
          data: {
            employeeId: emp.EmployeeID,
            userId,
            xeroUserId,
            status: emp.Status,
            firstName: emp.FirstName,
            lastName: emp.LastName,
          },
        });
        logger.info(
          `Employee inserted: ${emp.EmployeeID} (${emp.FirstName} ${emp.LastName})`,
        );
      } else {
        logger.info(`Employee already exists: ${emp.EmployeeID}`);
      }
    } catch (err) {
      logger.error(
        `Employees error for ${emp.EmployeeID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Employees sync complete. Total: ${employees.length}`);
}
