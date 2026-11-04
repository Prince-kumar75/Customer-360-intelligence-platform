-- ====================================================================
-- SCRIPT 06: EXECUTIVE 360 KPI SCORECARD & HEALTH MATRIX
-- Enterprise snapshot of core unit economics, churn, and revenue metrics
-- ====================================================================

SELECT
    COUNT(DISTINCT c.customer_id) AS total_customer_base,
    COUNT(DISTINCT CASE WHEN c.recency_days <= 90 THEN c.customer_id END) AS active_customers_90d,
    ROUND(COUNT(DISTINCT CASE WHEN c.recency_days <= 90 THEN c.customer_id END) * 100.0 / COUNT(DISTINCT c.customer_id), 1) AS active_customer_rate_pct,
    ROUND(SUM(c.monetary), 2) AS total_gross_merchandise_value,
    ROUND(AVG(c.monetary), 2) AS avg_historical_clv,
    ROUND(AVG(c.avg_order_value), 2) AS overall_aov,
    ROUND(AVG(c.frequency), 1) AS avg_lifetime_orders,
    ROUND(AVG(c.cac), 2) AS avg_cac,
    ROUND(AVG(c.monetary) / AVG(c.cac), 2) AS aggregate_ltv_cac_ratio,
    ROUND(AVG(c.is_churned) * 100.0, 1) AS portfolio_churn_rate_pct,
    ROUND(AVG(c.avg_csat_score), 2) AS average_customer_csat
FROM customer_360_master c;
