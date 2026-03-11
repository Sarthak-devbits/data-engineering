import axios, { AxiosError } from "axios";
import pRetry, { AbortError } from "p-retry";
import logger from "./logger";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL =
  process.env.XERO_BASE_URL || "https://api.xero.com/api.xro/2.0/";

class RateLimitError extends Error {
  retryAfter: number;
  constructor(message: string, retryAfter: number) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

/**
 * Generic Xero API caller with:
 * - Bearer token + xero-tenant-id header injection
 * - Exponential back-off retry (up to 10 attempts, min 2s, max 40s)
 * - HTTP 429 rate-limit detection with Retry-After header
 */
export async function callApi<T = Record<string, unknown>>(
  tenantId: string,
  token: string,
  endpoint: string,
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const run = async (): Promise<T> => {
    try {
      const response = await axios.get<T>(url, {
        headers: {
          "xero-tenant-id": tenantId,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      });
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 429) {
        const retryAfter = parseInt(
          (axiosErr.response.headers["retry-after"] as string) || "10",
          10,
        );
        logger.warn(
          `Rate limited. Retrying after ${retryAfter}s for: ${endpoint}`,
        );
        // Wait for the retry-after period before throwing so pRetry can pick it up
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        throw new RateLimitError(
          `Rate limit exceeded for ${endpoint}`,
          retryAfter,
        );
      }

      if (
        axiosErr.response?.status &&
        axiosErr.response.status >= 400 &&
        axiosErr.response.status < 500
      ) {
        // 4xx errors (except 429) are not retryable
        logger.error(
          `Non-retryable error ${axiosErr.response.status} for ${endpoint}: ${axiosErr.message}`,
        );
        throw new AbortError(axiosErr.message);
      }

      logger.error(`API error for ${endpoint}: ${axiosErr.message}`);
      throw err; // retryable (5xx, network errors, timeouts)
    }
  };

  return pRetry(run, {
    retries: 9, // 9 retries = 10 total attempts
    minTimeout: 2_000,
    maxTimeout: 40_000,
    factor: 2,
    onFailedAttempt: (error) => {
      logger.info(
        `Attempt ${error.attemptNumber} failed for ${endpoint}. ${error.retriesLeft} retries left. Error: ${error.message}`,
      );
    },
  });
}
