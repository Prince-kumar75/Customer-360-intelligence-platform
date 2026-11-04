-- ====================================================================
-- SCRIPT 03: CLV & CAC ACQUISITION CHANNEL EFFICIENCY
-- Evaluates Customer Acquisition Cost vs Lifetime Value & Payback Speed
-- Key for CMO, VP Growth & Finance Business Reviews
-- ====================================================================

WITH channel_performance AS (
    SELECT
        c.acquisition_channel,
        COUNT(DISTINCT c.customer_id) AS total_acquired_customers,
        ROUND(AVG(c.cac), 2) AS avg_cac,
        ROUND(SUM(c.cac), 2) AS total_acquisition_spend,
        ROUND(SUM(t.net_amount), 2) AS total_realized_revenue,
        ROUND(AVG(t.net_amount), 2) AS avg_revenue_per_order,
        COUNT(DISTINCT t.transaction_id) AS total_orders,
        COUNT(DISTINCT CASE WHEN t.transaction_id IS NOT NULL THEN c.customer_id END) AS converting_customers
    FROM customers c
    LEFT JOIN transactions t ON c.customer_id = t.customer_id AND t.is_refunded = 0
    GROUP BY c.acquisition_channel
),

channel_metrics AS (
    SELECT
        acquisition_channel,
        total_acquired_customers,
        avg_cac,
        total_acquisition_spend,
        total_realized_revenue,
        total_orders,
        ROUND(total_realized_revenue / total_acquired_customers, 2) AS realized_clv,
        ROUND((total_realized_revenue / total_acquired_customers) / avg_cac, 2) AS ltv_to_cac_ratio,
        ROUND(total_orders * 1.0 / total_acquired_customers, 2) AS avg_orders_per_customer,
        ROUND(converting_customers * 100.0 / total_acquired_customers, 1) AS conversion_rate_pct,
        ROUND((total_realized_revenue * 0.42) - total_acquisition_spend, 2) AS net_contribution_margin
    FROM channel_performance
)

SELECT
    acquisition_channel,
    total_acquired_customers,
    avg_cac,
    realized_clv,
    ltv_to_cac_ratio,
    avg_orders_per_customer,
    conversion_rate_pct,
    net_contribution_margin,
    CASE
        WHEN ltv_to_cac_ratio >= 4.0 THEN 'High Efficiency (Scale Budget)'
        WHEN ltv_to_cac_ratio >= 3.0 THEN 'Healthy Performance'
        WHEN ltv_to_cac_ratio >= 2.0 THEN 'Moderate (Optimize Funnel)'
        ELSE 'Underperforming / Unprofitable'
    END AS channel_action_recommendation
FROM channel_metrics
ORDER BY ltv_to_cac_ratio DESC;
