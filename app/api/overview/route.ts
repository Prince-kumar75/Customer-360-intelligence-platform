import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
// @ts-ignore
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.resolve(process.cwd(), "customer-360-platform", "data");
const DB_PATH = path.join(DATA_DIR, "customer_360_warehouse.db");

export async function GET() {
  try {
    const kpiSummaryPath = path.join(DATA_DIR, "kpi_summary.json");
    const cohortDataPath = path.join(DATA_DIR, "cohort_retention_data.json");
    const modelPerfPath = path.join(DATA_DIR, "model_performance.json");

    let kpis = {};
    let cohorts = [];
    let modelPerf = {};

    if (fs.existsSync(kpiSummaryPath)) {
      kpis = JSON.parse(fs.readFileSync(kpiSummaryPath, "utf-8"));
    }
    if (fs.existsSync(cohortDataPath)) {
      cohorts = JSON.parse(fs.readFileSync(cohortDataPath, "utf-8"));
    }
    if (fs.existsSync(modelPerfPath)) {
      modelPerf = JSON.parse(fs.readFileSync(modelPerfPath, "utf-8"));
    }

    // Fetch sample customer 360 list and segment breakdown from SQLite DB
    let topCustomers: any[] = [];
    let rfmBreakdown: any[] = [];
    let channelBreakdown: any[] = [];
    let categoryBreakdown: any[] = [];
    let monthlyTrends: any[] = [];

    if (fs.existsSync(DB_PATH)) {
      const db = new DatabaseSync(DB_PATH);
      try {
        // Customer 360 top list
        topCustomers = db
          .prepare(
            `SELECT m.customer_id, m.full_name, m.email, m.region, m.country, m.loyalty_tier, 
                    m.rfm_segment, m.recency_days, m.frequency, m.monetary, m.avg_order_value,
                    m.avg_csat_score, m.is_churned,
                    COALESCE(c.churn_probability, 0.5) as churn_probability,
                    COALESCE(c.churn_risk_tier, 'Medium') as churn_risk_tier,
                    COALESCE(c.prescribed_retention_action, 'Monitor account engagement') as prescribed_action
             FROM customer_360_master m
             LEFT JOIN customer_churn_predictions c ON m.customer_id = c.customer_id
             ORDER BY m.monetary DESC
             LIMIT 150`
          )
          .all();

        // RFM breakdown
        rfmBreakdown = db
          .prepare(
            `SELECT rfm_segment, 
                    COUNT(*) as count, 
                    ROUND(SUM(monetary), 2) as total_revenue,
                    ROUND(AVG(monetary), 2) as avg_revenue,
                    ROUND(AVG(frequency), 1) as avg_orders,
                    ROUND(AVG(recency_days), 0) as avg_recency
             FROM customer_360_master
             GROUP BY rfm_segment
             ORDER BY total_revenue DESC`
          )
          .all();

        // Acquisition channel breakdown
        channelBreakdown = db
          .prepare(
            `SELECT acquisition_channel,
                    COUNT(*) as customer_count,
                    ROUND(AVG(cac), 2) as avg_cac,
                    ROUND(SUM(monetary), 2) as total_revenue,
                    ROUND(AVG(monetary), 2) as avg_clv,
                    ROUND(AVG(monetary) / AVG(cac), 2) as ltv_cac_ratio
             FROM customer_360_master
             GROUP BY acquisition_channel
             ORDER BY total_revenue DESC`
          )
          .all();

        // Product category breakdown
        categoryBreakdown = db
          .prepare(
            `SELECT category,
                    COUNT(transaction_id) as total_sales_count,
                    ROUND(SUM(net_amount), 2) as category_revenue,
                    ROUND(AVG(net_amount), 2) as avg_item_price
             FROM transactions
             WHERE is_refunded = 0
             GROUP BY category
             ORDER BY category_revenue DESC`
          )
          .all();

        // Monthly revenue & order trend
        monthlyTrends = db
          .prepare(
            `SELECT SUBSTR(timestamp, 1, 7) as month,
                    ROUND(SUM(net_amount), 2) as monthly_revenue,
                    COUNT(DISTINCT transaction_id) as orders_count,
                    COUNT(DISTINCT customer_id) as active_buyers
             FROM transactions
             WHERE is_refunded = 0 AND timestamp >= '2025-01-01'
             GROUP BY month
             ORDER BY month ASC`
          )
          .all();
      } finally {
        db.close();
      }
    }

    return NextResponse.json({
      success: true,
      kpis,
      cohorts,
      modelPerf,
      topCustomers,
      rfmBreakdown,
      channelBreakdown,
      categoryBreakdown,
      monthlyTrends,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
