"""
Customer 360 Intelligence Platform - Enterprise ETL & Feature Engineering Pipeline
Computes:
1. Unified Customer 360 Master Record
2. Recency, Frequency, Monetary (RFM) Segmentation
3. Cohort Retention Matrix (Month 0 to 12)
4. Customer Lifetime Value (Historical & Predictive)
5. Omnichannel Touchpoint Aggregations (Web/App & Support)
6. SQLite / DuckDB Database Ingestion for live SQL queries
"""

import os
import sqlite3
import json
import datetime
import numpy as np
import pandas as pd

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DATA_DIR, "customer_360_warehouse.db")
SNAPSHOT_DATE = pd.to_datetime("2026-11-01")

def run_etl():
    print("=" * 60)
    print("CUSTOMER 360 ETL & FEATURE ENGINEERING PIPELINE")
    print("=" * 60)
    
    # 1. Load Data
    print("Loading raw CSV tables...")
    customers_df = pd.read_csv(os.path.join(DATA_DIR, "customers.csv"))
    transactions_df = pd.read_csv(os.path.join(DATA_DIR, "transactions.csv"))
    events_df = pd.read_csv(os.path.join(DATA_DIR, "web_events.csv"))
    tickets_df = pd.read_csv(os.path.join(DATA_DIR, "support_tickets.csv"))
    
    # Parse dates
    customers_df["signup_date"] = pd.to_datetime(customers_df["signup_date"])
    transactions_df["timestamp"] = pd.to_datetime(transactions_df["timestamp"])
    events_df["timestamp"] = pd.to_datetime(events_df["timestamp"])
    tickets_df["created_at"] = pd.to_datetime(tickets_df["created_at"])
    
    # Filter valid sales (non-refunded for monetary calculations)
    valid_tx = transactions_df[transactions_df["is_refunded"] == 0].copy()
    
    # 2. RFM Calculation
    print("Computing Recency, Frequency, Monetary (RFM) metrics...")
    rfm = valid_tx.groupby("customer_id").agg(
        last_order_date=("timestamp", "max"),
        first_order_date=("timestamp", "min"),
        frequency=("transaction_id", "nunique"),
        monetary=("net_amount", "sum"),
        avg_order_value=("net_amount", "mean"),
        total_items_purchased=("quantity", "sum")
    ).reset_index()
    
    rfm["recency_days"] = (SNAPSHOT_DATE - rfm["last_order_date"]).dt.days
    rfm["customer_tenure_days"] = (SNAPSHOT_DATE - rfm["first_order_date"]).dt.days
    
    # Merge with full customers to retain 0-transaction users if any
    rfm_full = customers_df[["customer_id"]].merge(rfm, on="customer_id", how="left")
    rfm_full["frequency"] = rfm_full["frequency"].fillna(0).astype(int)
    rfm_full["monetary"] = rfm_full["monetary"].fillna(0.0).round(2)
    rfm_full["avg_order_value"] = rfm_full["avg_order_value"].fillna(0.0).round(2)
    rfm_full["total_items_purchased"] = rfm_full["total_items_purchased"].fillna(0).astype(int)
    rfm_full["recency_days"] = rfm_full["recency_days"].fillna(999).astype(int)
    
    # Score 1-5 quantiles
    # Recency: lower is better (5 = most recent)
    r_labels = [5, 4, 3, 2, 1]
    rfm_full["r_score"] = pd.qcut(rfm_full["recency_days"].rank(method="first"), q=5, labels=r_labels).astype(int)
    
    # Frequency: higher is better
    f_labels = [1, 2, 3, 4, 5]
    rfm_full["f_score"] = pd.qcut(rfm_full["frequency"].rank(method="first"), q=5, labels=f_labels).astype(int)
    
    # Monetary: higher is better
    m_labels = [1, 2, 3, 4, 5]
    rfm_full["m_score"] = pd.qcut(rfm_full["monetary"].rank(method="first"), q=5, labels=m_labels).astype(int)
    
    rfm_full["rfm_combined"] = rfm_full["r_score"].astype(str) + rfm_full["f_score"].astype(str) + rfm_full["m_score"].astype(str)
    
    def segment_customer(row):
        r, f, m = row["r_score"], row["f_score"], row["m_score"]
        if r >= 4 and f >= 4 and m >= 4:
            return "Champions"
        elif r >= 3 and f >= 3 and m >= 3:
            return "Loyal Customers"
        elif r >= 4 and f >= 2:
            return "Potential Loyalists"
        elif r >= 4 and f == 1:
            return "Recent Customers"
        elif r == 3 and f >= 2:
            return "Promising"
        elif r == 3 and f == 1:
            return "Customers Needing Attention"
        elif r == 2 and f >= 3:
            return "At Risk"
        elif r == 1 and f >= 4:
            return "Can't Lose Them"
        elif r <= 2 and f <= 2:
            return "Hibernating / Lost"
        else:
            return "About To Sleep"
            
    rfm_full["rfm_segment"] = rfm_full.apply(segment_customer, axis=1)
    
    # 3. Support Touchpoint Aggregations
    print("Aggregating support ticket metrics...")
    ticket_metrics = tickets_df.groupby("customer_id").agg(
        support_ticket_count=("ticket_id", "count"),
        avg_resolution_time_hrs=("resolution_time_hours", "mean"),
        avg_csat_score=("csat_score", "mean"),
        avg_sentiment_score=("sentiment_score", "mean")
    ).reset_index()
    ticket_metrics["avg_resolution_time_hrs"] = ticket_metrics["avg_resolution_time_hrs"].round(1)
    ticket_metrics["avg_csat_score"] = ticket_metrics["avg_csat_score"].round(2)
    ticket_metrics["avg_sentiment_score"] = ticket_metrics["avg_sentiment_score"].round(2)
    
    # 4. Web & Digital Touchpoints
    print("Aggregating web/mobile engagement events...")
    event_counts = events_df.groupby(["customer_id", "event_type"]).size().unstack(fill_value=0).reset_index()
    session_counts = events_df.groupby("customer_id")["session_id"].nunique().reset_index().rename(columns={"session_id": "total_sessions"})
    last_event = events_df.groupby("customer_id")["timestamp"].max().reset_index().rename(columns={"timestamp": "last_web_activity"})
    
    web_metrics = session_counts.merge(event_counts, on="customer_id", how="left").merge(last_event, on="customer_id", how="left")
    
    # 5. Build Master Customer 360 Dataset
    print("Synthesizing Unified Customer 360 Master Record...")
    master = customers_df.merge(rfm_full, on="customer_id", how="left")
    master = master.merge(ticket_metrics, on="customer_id", how="left")
    master = master.merge(web_metrics, on="customer_id", how="left")
    
    # Fill NAs
    master["support_ticket_count"] = master["support_ticket_count"].fillna(0).astype(int)
    master["avg_resolution_time_hrs"] = master["avg_resolution_time_hrs"].fillna(0.0)
    master["avg_csat_score"] = master["avg_csat_score"].fillna(4.0) # default baseline neutral/positive
    master["avg_sentiment_score"] = master["avg_sentiment_score"].fillna(0.0)
    master["total_sessions"] = master["total_sessions"].fillna(0).astype(int)
    
    # Churn definition: Recency > 140 days and frequency < 4, or archetype == 'at_risk_churn'
    master["is_churned"] = np.where((master["recency_days"] > 140) | (master["archetype"] == "at_risk_churn"), 1, 0)
    
    # Historical LTV and Projected 12-Month LTV
    margin = 0.42 # 42% gross margin
    churn_rate = master["is_churned"].mean()
    # Projected CLV calculation: (AOV * Freq/Year * Margin) / Churn
    annual_freq = np.clip(master["frequency"] / np.maximum(master["customer_tenure_days"] / 365.0, 0.25), 0.5, 30.0)
    master["projected_12m_clv"] = (master["avg_order_value"] * annual_freq * (1 - master["is_churned"] * 0.75)).round(2)
    master["historical_clv"] = master["monetary"]
    master["clv_to_cac_ratio"] = (master["historical_clv"] / np.maximum(master["cac"], 1.0)).round(2)
    
    # Save Master CSV
    master_path = os.path.join(DATA_DIR, "customer_360_master.csv")
    master.to_csv(master_path, index=False)
    print(f"Master Customer 360 record written to: {master_path}")
    
    # 6. Cohort Retention Matrix
    print("Generating Cohort Retention Analysis Matrix...")
    tx_with_signup = valid_tx.merge(customers_df[["customer_id", "signup_date"]], on="customer_id")
    tx_with_signup["signup_cohort"] = tx_with_signup["signup_date"].dt.to_period("M").astype(str)
    tx_with_signup["tx_period"] = tx_with_signup["timestamp"].dt.to_period("M")
    tx_with_signup["signup_period"] = tx_with_signup["signup_date"].dt.to_period("M")
    
    # Cohort index in months
    tx_with_signup["cohort_month_idx"] = (tx_with_signup["tx_period"].dt.year - tx_with_signup["signup_period"].dt.year) * 12 + \
                                         (tx_with_signup["tx_period"].dt.month - tx_with_signup["signup_period"].dt.month)
                                         
    # Group by cohort and month index
    cohort_grouped = tx_with_signup.groupby(["signup_cohort", "cohort_month_idx"])["customer_id"].nunique().reset_index()
    cohort_sizes = customers_df.copy()
    cohort_sizes["signup_cohort"] = cohort_sizes["signup_date"].dt.to_period("M").astype(str)
    cohort_base_sizes = cohort_sizes.groupby("signup_cohort")["customer_id"].nunique().to_dict()
    
    cohort_grouped["cohort_size"] = cohort_grouped["signup_cohort"].map(cohort_base_sizes)
    cohort_grouped["retention_rate"] = (cohort_grouped["customer_id"] / cohort_grouped["cohort_size"] * 100).round(1)
    
    # Pivot matrix
    cohort_pivot = cohort_grouped.pivot(index="signup_cohort", columns="cohort_month_idx", values="retention_rate").fillna(0.0)
    # Filter recent cohorts
    cohort_pivot = cohort_pivot.loc[cohort_pivot.index >= "2024-06"]
    cohort_matrix_path = os.path.join(DATA_DIR, "cohort_retention_matrix.csv")
    cohort_pivot.to_csv(cohort_matrix_path)
    
    # JSON structure for direct React component consumption
    cohort_json_data = []
    for cohort_name, row in cohort_pivot.iterrows():
        entry = {"cohort": str(cohort_name), "size": int(cohort_base_sizes.get(str(cohort_name), 0))}
        for col in cohort_pivot.columns:
            if col <= 12:
                entry[f"m_{col}"] = float(row[col]) if not np.isnan(row[col]) else 0.0
        cohort_json_data.append(entry)
        
    with open(os.path.join(DATA_DIR, "cohort_retention_data.json"), "w") as f:
        json.dump(cohort_json_data, f, indent=2)
        
    # 7. Overall Executive KPI Summary JSON
    print("Generating Executive KPI Summary Rollup...")
    total_rev = round(float(valid_tx["net_amount"].sum()), 2)
    avg_order_val = round(float(valid_tx["net_amount"].mean()), 2)
    total_customers = len(master)
    active_customers = int((master["recency_days"] <= 90).sum())
    overall_churn_rate = round(float(master["is_churned"].mean() * 100), 2)
    avg_clv = round(float(master["historical_clv"].mean()), 2)
    avg_cac = round(float(master["cac"].mean()), 2)
    avg_csat = round(float(tickets_df["csat_score"].mean()), 2)
    repeat_rate = round(float((master["frequency"] > 1).sum() / total_customers * 100), 2)
    
    # Segment breakdown
    segment_counts = master["rfm_segment"].value_counts().to_dict()
    segment_revenues = master.groupby("rfm_segment")["monetary"].sum().round(2).to_dict()
    
    kpis = {
        "total_revenue": total_rev,
        "total_orders": len(valid_tx),
        "total_customers": total_customers,
        "active_customers_90d": active_customers,
        "avg_order_value": avg_order_val,
        "overall_churn_rate_pct": overall_churn_rate,
        "repeat_purchase_rate_pct": repeat_rate,
        "avg_customer_lifetime_value": avg_clv,
        "avg_customer_acquisition_cost": avg_cac,
        "ltv_to_cac_ratio": round(avg_clv / avg_cac, 2),
        "avg_csat_rating": avg_csat,
        "segments": {
            seg: {
                "customer_count": int(segment_counts.get(seg, 0)),
                "total_spend": float(segment_revenues.get(seg, 0.0)),
                "avg_spend": round(float(segment_revenues.get(seg, 0.0) / max(segment_counts.get(seg, 1), 1)), 2)
            }
            for seg in segment_counts
        }
    }
    
    with open(os.path.join(DATA_DIR, "kpi_summary.json"), "w") as f:
        json.dump(kpis, f, indent=2)
        
    # 8. Load into SQLite Database for interactive SQL query engine
    print(f"Populating SQLite Database Warehouse -> {DB_PATH} ...")
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    
    customers_df.to_sql("customers", conn, if_exists="replace", index=False)
    transactions_df.to_sql("transactions", conn, if_exists="replace", index=False)
    events_df.to_sql("web_events", conn, if_exists="replace", index=False)
    tickets_df.to_sql("support_tickets", conn, if_exists="replace", index=False)
    master.to_sql("customer_360_master", conn, if_exists="replace", index=False)
    
    # Create indexes for high performance querying
    cur = conn.cursor()
    cur.execute("CREATE INDEX IF NOT EXISTS idx_txn_cust ON transactions(customer_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_txn_ts ON transactions(timestamp)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_evt_cust ON web_events(customer_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tck_cust ON support_tickets(customer_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_mstr_cust ON customer_360_master(customer_id)")
    conn.commit()
    conn.close()
    
    print("\nETL Pipeline Execution Complete!")
    print(f" Database Warehouse: {DB_PATH}")
    print(f" KPI Summary:        {os.path.join(DATA_DIR, 'kpi_summary.json')}")
    print("=" * 60)

if __name__ == "__main__":
    run_etl()
