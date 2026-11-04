-- ====================================================================
-- SCRIPT 02: COHORT RETENTION & REPEAT PURCHASE DYNAMICS
-- Tracks monthly customer cohorts across their lifecycle (Months 0 - 12)
-- Essential for SaaS, subscription & e-commerce retention reporting
-- ====================================================================

WITH customer_cohorts AS (
    SELECT
        customer_id,
        STRFTIME('%Y-%m', signup_date) AS cohort_month
    FROM customers
),

customer_activity AS (
    SELECT DISTINCT
        t.customer_id,
        c.cohort_month,
        STRFTIME('%Y-%m', t.timestamp) AS activity_month,
        -- Calculate index: difference in months between activity and signup
        (CAST(STRFTIME('%Y', t.timestamp) AS INT) - CAST(SUBSTR(c.cohort_month, 1, 4) AS INT)) * 12 +
        (CAST(STRFTIME('%m', t.timestamp) AS INT) - CAST(SUBSTR(c.cohort_month, 6, 2) AS INT)) AS month_number
    FROM transactions t
    JOIN customer_cohorts c ON t.customer_id = c.customer_id
    WHERE t.is_refunded = 0
),

cohort_sizes AS (
    SELECT
        cohort_month,
        COUNT(DISTINCT customer_id) AS cohort_size
    FROM customer_cohorts
    GROUP BY cohort_month
),

cohort_retention AS (
    SELECT
        ca.cohort_month,
        cs.cohort_size,
        ca.month_number,
        COUNT(DISTINCT ca.customer_id) AS active_users,
        ROUND(COUNT(DISTINCT ca.customer_id) * 100.0 / cs.cohort_size, 1) AS retention_rate_pct
    FROM customer_activity ca
    JOIN cohort_sizes cs ON ca.cohort_month = cs.cohort_month
    WHERE ca.month_number BETWEEN 0 AND 12
    GROUP BY ca.cohort_month, cs.cohort_size, ca.month_number
)

SELECT
    cohort_month,
    cohort_size,
    MAX(CASE WHEN month_number = 0 THEN retention_rate_pct END) AS m0_pct,
    MAX(CASE WHEN month_number = 1 THEN retention_rate_pct END) AS m1_pct,
    MAX(CASE WHEN month_number = 2 THEN retention_rate_pct END) AS m2_pct,
    MAX(CASE WHEN month_number = 3 THEN retention_rate_pct END) AS m3_pct,
    MAX(CASE WHEN month_number = 4 THEN retention_rate_pct END) AS m4_pct,
    MAX(CASE WHEN month_number = 5 THEN retention_rate_pct END) AS m5_pct,
    MAX(CASE WHEN month_number = 6 THEN retention_rate_pct END) AS m6_pct,
    MAX(CASE WHEN month_number = 9 THEN retention_rate_pct END) AS m9_pct,
    MAX(CASE WHEN month_number = 12 THEN retention_rate_pct END) AS m12_pct
FROM cohort_retention
WHERE cohort_month >= '2025-01'
GROUP BY cohort_month, cohort_size
ORDER BY cohort_month ASC;
