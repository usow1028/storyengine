import type { QueryResult, QueryResultRow } from "pg";

export type SqlQueryResult<Row extends QueryResultRow = QueryResultRow> = Pick<
  QueryResult<Row>,
  "rows" | "rowCount"
>;

export interface SqlQueryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ): Promise<SqlQueryResult<Row>>;
}

export async function runSql(client: SqlQueryable, sql: string): Promise<void> {
  await client.query(sql);
}

export async function withTransaction<T>(
  client: SqlQueryable,
  callback: () => Promise<T>
): Promise<T> {
  await client.query("BEGIN");
  try {
    const result = await callback();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export function asJson(value: unknown): string {
  return JSON.stringify(value);
}
