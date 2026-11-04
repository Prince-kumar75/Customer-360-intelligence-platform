import { NextRequest, NextResponse } from "next/server";
import path from "path";
// @ts-ignore - node:sqlite is native in Node 22+
import { DatabaseSync } from "node:sqlite";

const DB_PATH = path.resolve(process.cwd(), "customer-360-platform", "data", "customer_360_warehouse.db");

// Block destructive statements for safety
const FORBIDDEN_KEYWORDS = [
  "DROP",
  "DELETE",
  "UPDATE",
  "INSERT",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "REPLACE",
  "ATTACH",
  "DETACH",
  "PRAGMA writable_schema",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, limit = 100 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ success: false, error: "SQL query string is required." }, { status: 400 });
    }

    const cleanQuery = query.trim();
    const upperQuery = cleanQuery.toUpperCase();

    // Check forbidden keywords
    for (const keyword of FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(upperQuery) && !upperQuery.startsWith("WITH") && !upperQuery.startsWith("SELECT")) {
        return NextResponse.json(
          { success: false, error: `Execution restricted: '${keyword}' statements are not permitted in read-only analytics mode.` },
          { status: 403 }
        );
      }
    }

    const startTime = performance.now();
    const db = new DatabaseSync(DB_PATH);

    try {
      const stmt = db.prepare(cleanQuery);
      let rows: any[] = stmt.all();

      const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;
      const totalCount = rows.length;

      // Extract column names
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      if (limit && rows.length > limit) {
        rows = rows.slice(0, limit);
      }

      return NextResponse.json({
        success: true,
        columns,
        rows,
        totalCount,
        returnedCount: rows.length,
        executionTimeMs,
      });
    } catch (sqlErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: sqlErr.message || "SQL syntax or execution error.",
          columns: [],
          rows: [],
          totalCount: 0,
        },
        { status: 400 }
      );
    } finally {
      db.close();
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
