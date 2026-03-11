import axios from "axios";
import jwt from "jsonwebtoken";
import logger from "./logger";
import dotenv from "dotenv";
dotenv.config();

export interface XeroAuthContext {
  token: string;
  tenantId: string;
  xeroUserId: string;
}

/**
 * Fetches the Xero tenant ID by calling the /connections endpoint.
 */
export async function getTenantId(token: string): Promise<string> {
  try {
    const response = await axios.get<Array<{ tenantId: string }>>(
      "https://api.xero.com/connections",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      },
    );
    const data = response.data;
    if (Array.isArray(data) && data.length > 0 && data[0].tenantId) {
      return data[0].tenantId;
    }
    throw new Error("No tenantId found in /connections response");
  } catch (err) {
    logger.error(`getTenantId error: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Extracts the xero_userid claim from the JWT access token without verifying the signature.
 */
export function getXeroUserId(token: string): string {
  try {
    const decoded = jwt.decode(token) as Record<string, unknown> | null;
    if (decoded && typeof decoded["xero_userid"] === "string") {
      return decoded["xero_userid"];
    }
    throw new Error("xero_userid not found in JWT token");
  } catch (err) {
    logger.error(`getXeroUserId error: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Builds the full XeroAuthContext from environment variables.
 * Reads XERO_ACCESS_TOKEN, then retrieves tenantId and xeroUserId.
 */
export async function buildAuthContext(): Promise<XeroAuthContext> {
  const token = process.env.XERO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("XERO_ACCESS_TOKEN is not set in .env");
  }

  logger.info("Fetching Xero tenant ID...");
  const tenantId = await getTenantId(token);
  logger.info(`Tenant ID: ${tenantId}`);

  const xeroUserId = getXeroUserId(token);
  logger.info(`Xero User ID: ${xeroUserId}`);

  return { token, tenantId, xeroUserId };
}
