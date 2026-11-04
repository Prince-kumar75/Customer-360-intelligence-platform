-- ====================================================================
-- SCRIPT 01: ADVANCED RFM CUSTOMER SEGMENTATION
-- Uses Common Table Expressions (CTEs) & NTILE Window Functions
-- Calculates Recency, Frequency, Monetary values and behavioral labels
-- ====================================================================

WITH base_orders AS (
    SELECT
        customer_id,
        MAX(timestamp) AS last_order_date,
        COUNT(DISTINCT transaction_id) AS order_frequency,
        SUM(net_amount) AS total_monetary_spend,
        ROUND(AVG(net_amount), 2) AS avg_order_value
    FROM transactions
    WHERE is_refunded = 0
    GROUP BY customer_id
),

rfm_metrics AS (
    SELECT
        c.customer_id,
        c.full_name,
        c.email,
        c.region,
        c.loyalty_tier,
        COALESCE(b.order_frequency, 0) AS frequency,
        COALESCE(b.total_monetary_spend, 0.0) AS monetary,
        COALESCE(b.avg_order_value, 0.0) AS aov,
        -- Reference snapshot date: 2026-11-01
        CAST((JULIANDAY('2026-11-01') - JULIANDAY(COALESCE(b.last_order_date, c.signup_date))) AS INT) AS recency_days
    FROM customers c
    LEFT JOIN base_orders b ON c.customer_id = b.customer_id
),

rfm_percentiles AS (
    SELECT
        customer_id,
        full_name,
        email,
        region,
        loyalty_tier,
        recency_days,
        frequency,
        monetary,
        aov,
        -- Recency: 5 is best (lowest days), 1 is worst
        NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score,
        -- Frequency: 5 is highest, 1 is lowest
        NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
        -- Monetary: 5 is highest spend, 1 is lowest spend
        NTILE(5) OVER (ORDER BY monetary ASC) AS m_score
    FROM rfm_metrics
),

rfm_segmented AS (
    SELECT
        customer_id,
        full_name,
        email,
        region,
        loyalty_tier,
        recency_days,
        frequency,
        monetary,
        aov,
        r_score,
        f_score,
        m_score,
        (CAST(r_score AS TEXT) || CAST(f_score AS TEXT) || CAST(m_score AS TEXT)) AS rfm_cell,
        CASE
            WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
            WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN 'Loyal Customers'
            WHEN r_score >= 4 AND f_score >= 2 THEN 'Potential Loyalists'
            WHEN r_score >= 4 AND f_score = 1 THEN 'Recent Customers'
            WHEN r_score = 3 AND f_score >= 2 THEN 'Promising'
            WHEN r_score = 3 AND f_score = 1 THEN 'Customers Needing Attention'
            WHEN r_score = 2 AND f_score >= 3 THEN 'At Risk'
            WHEN r_score = 1 AND f_score >= 4 THEN 'Can''t Lose Them'
            WHEN r_score <= 2 AND f_score <= 2 THEN 'Hibernating / Lost'
            ELSE 'About To Sleep'
        END AS customer_segment
    FROM rfm_percentiles
)

-- Summary of Segment Distribution and Economic Impact
SELECT
    customer_segment,
    COUNT(*) AS total_customers,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rfm_segmented), 2) AS customer_share_pct,
    ROUND(SUM(monetary), 2) AS total_segment_revenue,
    ROUND(AVG(monetary), 2) AS avg_clv_per_customer,
    ROUND(AVG(frequency), 1) AS avg_orders_per_customer,
    ROUND(AVG(recency_days), 0) AS avg_days_since_last_order
FROM rfm_segmented
GROUP BY customer_segment
ORDER BY total_segment_revenue DESC;
