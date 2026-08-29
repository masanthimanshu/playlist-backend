import { randomUUID } from "node:crypto";
import { logger } from "#modules/runtime_logs.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const dbClient = new DynamoDBClient({ region: process.env.CURRENT_AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

export interface WriteDataResult {
  id: string;
}

/**
 * Inserts a record into the primary DynamoDB table.
 * @param data - Object payload to persist.
 * @returns Resulting unique item identifier.
 */
export async function writeData<T extends Record<string, unknown>>(
  data: T,
): Promise<WriteDataResult> {
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: { id, ...data, timestamp },
    ConditionExpression: "attribute_not_exists(id)",
  };

  try {
    await docClient.send(new PutCommand(params));
    return { id };
  } catch (err: unknown) {
    logger.error("Error writing data to DynamoDB", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
