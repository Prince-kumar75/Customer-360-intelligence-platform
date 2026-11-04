-- ====================================================================
-- SCRIPT 05: DIGITAL OMNICHANNEL FUNNEL & CONVERSION DROPOFF
-- Evaluates step-by-step conversion across web & mobile touchpoints
-- ====================================================================

WITH funnel_steps AS (
    SELECT
        device,
        session_id,
        MAX(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS step_1_visit,
        MAX(CASE WHEN event_type = 'product_view' THEN 1 ELSE 0 END) AS step_2_product_view,
        MAX(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS step_3_cart,
        MAX(CASE WHEN event_type = 'checkout_start' THEN 1 ELSE 0 END) AS step_4_checkout,
        MAX(CASE WHEN event_type = 'purchase_complete' THEN 1 ELSE 0 END) AS step_5_purchase
    FROM web_events
    GROUP BY device, session_id
)

SELECT
    device,
    COUNT(DISTINCT session_id) AS total_sessions,
    SUM(step_1_visit) AS visits,
    SUM(step_2_product_view) AS product_views,
    SUM(step_3_cart) AS cart_adds,
    SUM(step_4_checkout) AS checkouts_started,
    SUM(step_5_purchase) AS purchases,
    ROUND(SUM(step_2_product_view) * 100.0 / NULLIF(SUM(step_1_visit), 0), 1) AS visit_to_product_pct,
    ROUND(SUM(step_3_cart) * 100.0 / NULLIF(SUM(step_2_product_view), 0), 1) AS product_to_cart_pct,
    ROUND(SUM(step_4_checkout) * 100.0 / NULLIF(SUM(step_3_cart), 0), 1) AS cart_to_checkout_pct,
    ROUND(SUM(step_5_purchase) * 100.0 / NULLIF(SUM(step_4_checkout), 0), 1) AS checkout_completion_pct,
    ROUND(SUM(step_5_purchase) * 100.0 / NULLIF(COUNT(DISTINCT session_id), 0), 2) AS end_to_end_conversion_rate_pct
FROM funnel_steps
GROUP BY device
ORDER BY total_sessions DESC;
