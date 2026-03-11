import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import { syncAttachments } from "./attachments";
import logger from "../utils/logger";

interface XeroPhone {
  PhoneType?: string;
  PhoneAreaCode?: string;
  PhoneNumber?: string;
  PhoneCountryCode?: string;
}
interface XeroAddress {
  AddressType?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  City?: string;
  Region?: string;
  PostalCode?: string;
  Country?: string;
}
interface XeroContact {
  ContactID: string;
  Name?: string;
  EmailAddress?: string;
  CompanyNumber?: string;
  IsSupplier?: boolean;
  IsCustomer?: boolean;
  TaxNumber?: string;
  AccountNumber?: string;
  Addresses?: XeroAddress[];
  Phones?: XeroPhone[];
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroContactsResponse {
  Contacts: XeroContact[];
}

export async function syncContacts(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Contacts...");
  const data = await callApi<XeroContactsResponse>(tenantId, token, "Contacts");
  const contacts = data.Contacts ?? [];

  for (const c of contacts) {
    const updatedDateUtc = parseXeroDate(c.UpdatedDateUTC);

    const addressStr = (c.Addresses ?? [])
      .map((a) =>
        `${a.AddressType ?? ""}: ${a.AddressLine1 ?? ""} ${a.AddressLine2 ?? ""} ${a.City ?? ""} ${a.Region ?? ""} ${a.PostalCode ?? ""} ${a.Country ?? ""}`.trim(),
      )
      .join("; ");

    const phoneStr = (c.Phones ?? [])
      .map((p) =>
        `${p.PhoneType ?? ""}: (${p.PhoneAreaCode ?? ""}) ${p.PhoneNumber ?? ""} ${p.PhoneCountryCode ?? ""}`.trim(),
      )
      .join("; ");

    try {
      const existing = await prisma.contact.findUnique({
        where: { contactId_userId: { contactId: c.ContactID, userId } },
        select: { updatedDateUtc: true },
      });

      if (!existing) {
        await prisma.contact.create({
          data: {
            contactId: c.ContactID,
            userId,
            xeroUserId,
            name: c.Name ?? "",
            emailAddress: c.EmailAddress,
            companyNumber: c.CompanyNumber,
            isSupplier: c.IsSupplier ?? false,
            isCustomer: c.IsCustomer ?? false,
            address: addressStr || null,
            phone: phoneStr || null,
            taxNumber: c.TaxNumber,
            accountNumber: c.AccountNumber,
            updatedDateUtc,
          },
        });
        logger.info(`Contact inserted: ${c.ContactID} (${c.Name})`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.contact.update({
          where: { contactId_userId: { contactId: c.ContactID, userId } },
          data: {
            name: c.Name ?? "",
            emailAddress: c.EmailAddress,
            companyNumber: c.CompanyNumber,
            isSupplier: c.IsSupplier ?? false,
            isCustomer: c.IsCustomer ?? false,
            address: addressStr || null,
            phone: phoneStr || null,
            taxNumber: c.TaxNumber,
            accountNumber: c.AccountNumber,
            updatedDateUtc,
          },
        });
        logger.info(`Contact updated: ${c.ContactID}`);
      } else {
        logger.info(`Contact unchanged: ${c.ContactID}`);
      }

      if (c.HasAttachments) {
        await syncAttachments(
          token,
          tenantId,
          xeroUserId,
          "Contacts",
          c.ContactID,
        );
      }
    } catch (err) {
      logger.error(
        `Contacts error for ${c.ContactID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Contacts sync complete. Total: ${contacts.length}`);
}
