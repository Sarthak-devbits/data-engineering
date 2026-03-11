import OpenAI from "openai";
import logger from "./logger";
import dotenv from "dotenv";
dotenv.config();

let clientInstance: OpenAI | null = null;

function getClient(): OpenAI {
  if (!clientInstance) {
    const apiType = process.env.OPENAI_API_TYPE || "openai";

    if (apiType === "azure") {
      clientInstance = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: `${process.env.OPENAI_API_BASE}openai/deployments/${process.env.OPENAI_MODEL}`,
        defaultQuery: { "api-version": process.env.OPENAI_API_VERSION },
        defaultHeaders: { "api-key": process.env.OPENAI_API_KEY },
      });
    } else {
      clientInstance = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }
  return clientInstance;
}

/**
 * Uses OpenAI GPT-4o to extract a contact/person name from raw journal history text.
 * This mirrors the Python `openai_nameextractor` function used in journals.py for
 * TRANSFER and EXPCLAIM journal source types where no structured Contact.Name exists.
 */
export async function extractNameFromText(details: string): Promise<string> {
  if (!details) return "";
  try {
    const client = getClient();
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: `Please exclude date and price in the context: context: ${details}`,
        },
      ],
      max_tokens: 100,
      temperature: 0.4,
      top_p: 0.9,
    });
    const result = response.choices[0]?.message?.content || "";
    logger.info(`OpenAI name extraction result: ${result}`);
    return result;
  } catch (err) {
    logger.error(`OpenAI extractNameFromText error: ${(err as Error).message}`);
    return "";
  }
}
