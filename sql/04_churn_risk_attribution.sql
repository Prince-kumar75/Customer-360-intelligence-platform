-- ====================================================================
-- SCRIPT 04: CHURN RISK ATTRIBUTION & CSAT IMPACT ANALYSIS
-- Correlates support resolution bottlenecks, low CSAT, and inactivity
-- with customer defection / churn
-- ====================================================================

WITH customer_support_summary AS (
    SELECT
        customer_id,
        COUNT(ticket_id) AS ticket_count,
        ROUND(AVG(resolution_time_hours), 1) AS avg_resolution_hours,
        ROUND(AVG(csat_score), 2) AS avg_csat,
        ROUND(AVG(sentiment_score), 2) AS avg_sentiment,
        SUM(CASE WHEN csat_score <= 2 THEN 1 ELSE 0 END) AS negative_csat_tickets,
        SUM(CASE WHEN resolution_time_hours > 48 THEN 1 ELSE 0 END) AS delayed_resolution_tickets
    FROM support_tickets
    GROUP BY customer_id
),

support_joined AS (
    SELECT
        m.customer_id,
        m.full_name,
        m.rfm_segment,
        m.is_churned,
        m.recency_days,
        m.historical_clv,
        COALESCE(s.ticket_count, 0) AS ticket_count,
        COALESCE(s.avg_resolution_hours, 0) AS avg_resolution_hours,
        COALESCE(s.avg_csat, 4.0) AS avg_csat,
        COALESCE(s.negative_csat_tickets, 0) AS negative_csat_tickets,
        COALESCE(s.delayed_resolution_tickets, 0) AS delayed_resolution_tickets
    FROM customer_360_master m
    LEFT JOIN customer_support_summary s ON m.customer_id = s.customer_id
)

-- Churn Rate breakdown across support service tiers
SELECT
    CASE
        WHEN ticket_count = 0 THEN 'No Support Tickets'
        WHEN negative_csat_tickets > 0 THEN 'Had Negative CSAT (<= 2)'
        WHEN delayed_resolution_tickets > 0 THEN 'Had SLA Delays (> 48h)'
        ELSE 'Satisfied Support Experience'
    END AS customer_support_cohort,
    COUNT(*) AS customer_count,
    SUM(is_churned) AS churned_count,
    ROUND(SUM(is_churned) * 100.0 / COUNT(*), 1) AS churn_rate_pct,
    ROUND(AVG(historical_clv), 2) AS avg_historical_revenue,
    ROUND(SUM(CASE WHEN is_churned = 1 THEN historical_clv ELSE 0 END), 2) AS realized_revenue_at_risk
FROM support_joined
GROUP BY 1
ORDER BY churn_rate_pct DESC;
