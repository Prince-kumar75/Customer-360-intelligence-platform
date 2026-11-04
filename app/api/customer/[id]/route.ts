import { NextRequest, NextResponse } from "next/server";
import path from "path";
// @ts-ignore
import { DatabaseSync } from "node:sqlite";

const DB_PATH = path.resolve(process.cwd(), "customer-360-platform", "data", "customer_360_warehouse.db");

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer ID is required" }, { status: 400 });
    }

    const db = new DatabaseSync(DB_PATH);
    try {
      // 1. Master Profile
      const profileStmt = db.prepare(
        `SELECT m.*, 
                COALESCE(c.churn_probability, 0.45) as churn_probability,
                COALESCE(c.churn_risk_tier, 'Medium') as churn_risk_tier,
                COALESCE(c.prescribed_retention_action, 'Monitor account engagement') as prescribed_retention_action
         FROM customer_360_master m
         LEFT JOIN customer_churn_predictions c ON m.customer_id = c.customer_id
         WHERE m.customer_id = ?`
      );
      const profile = profileStmt.get(customerId);

      if (!profile) {
        return NextResponse.json({ success: false, error: `Customer ${customerId} not found` }, { status: 404 });
      }

      // 2. Transactions
      const txStmt = db.prepare(
        `SELECT transaction_id, timestamp, category, product_name, quantity, unit_price, discount_amount, net_amount, payment_method, sales_channel, is_refunded
         FROM transactions
         WHERE customer_id = ?
         ORDER BY timestamp DESC
         LIMIT 30`
      );
      const transactions = txStmt.all(customerId);

      // 3. Support Tickets
      const tckStmt = db.prepare(
        `SELECT ticket_id, created_at, category, channel, priority, resolution_time_hours, csat_score, sentiment_score, status
         FROM support_tickets
         WHERE customer_id = ?
         ORDER BY created_at DESC`
      );
      const supportTickets = tckStmt.all(customerId);

      // 4. Web Events
      const evtStmt = db.prepare(
        `SELECT event_id, session_id, timestamp, event_type, page_url, device, duration_seconds
         FROM web_events
         WHERE customer_id = ?
         ORDER BY timestamp DESC
         LIMIT 40`
      );
      const webEvents = evtStmt.all(customerId);

      return NextResponse.json({
        success: true,
        profile,
        transactions,
        supportTickets,
        webEvents,
      });
    } finally {
      db.close();
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
