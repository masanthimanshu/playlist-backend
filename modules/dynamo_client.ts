import { randomUUID } from "node:crypto";
import { logger } from "#modules/runtime_logs.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const dbClient = new DynamoDBClient({ region: process.env.CURRENT_AWS_REGION });
export const docClient = DynamoDBDocumentClient.from(dbClient);

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
): Promise<WriteDataResult & T & { timestamp: string }> {
  const id = (data.id as string) || randomUUID();
  const timestamp = (data.timestamp as string) || new Date().toISOString();

  const item = { ...data, id, timestamp };

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: item,
  };

  try {
    await docClient.send(new PutCommand(params));
    return item as WriteDataResult & T & { timestamp: string };
  } catch (err: unknown) {
    logger.error("Error writing data to DynamoDB", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Fetches a single item by its ID from the primary DynamoDB table.
 * @param id - Record identifier.
 * @returns Item or null if not found.
 */
export async function getData<T extends Record<string, unknown>>(
  id: string,
): Promise<T | null> {
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: { id },
  };

  try {
    const result = await docClient.send(new GetCommand(params));
    return (result.Item as T) || null;
  } catch (err: unknown) {
    logger.error("Error fetching data from DynamoDB", {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Lists all items in the primary DynamoDB table.
 * @returns Array of items.
 */
export async function listData<T extends Record<string, unknown>>(): Promise<
  T[]
> {
  const params = {
    TableName: process.env.TABLE_NAME,
  };

  try {
    const result = await docClient.send(new ScanCommand(params));
    return (result.Items as T[]) || [];
  } catch (err: unknown) {
    logger.error("Error scanning data from DynamoDB", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Deletes an item by ID from the primary DynamoDB table.
 * @param id - Record identifier.
 */
export async function deleteData(id: string): Promise<boolean> {
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: { id },
  };

  try {
    await docClient.send(new DeleteCommand(params));
    return true;
  } catch (err: unknown) {
    logger.error("Error deleting data from DynamoDB", {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
