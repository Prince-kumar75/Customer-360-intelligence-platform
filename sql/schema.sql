-- ====================================================================
-- CUSTOMER 360 INTELLIGENCE PLATFORM: DDL & ANALYTICS WAREHOUSE SCHEMA
-- Compatible with PostgreSQL, SQLite, DuckDB, Snowflake & BigQuery
-- ====================================================================

-- 1. DIM_CUSTOMERS: Core Master Customer Profile
CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(32) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    region VARCHAR(60),
    country VARCHAR(60),
    age INT,
    gender VARCHAR(30),
    income_tier VARCHAR(30),
    signup_date DATE,
    acquisition_channel VARCHAR(60),
    preferred_device VARCHAR(40),
    cac DECIMAL(10, 2),
    loyalty_tier VARCHAR(30),
    archetype VARCHAR(40)
);

-- 2. FACT_TRANSACTIONS: Omnichannel Orders & Sales
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(32) PRIMARY KEY,
    customer_id VARCHAR(32) REFERENCES customers(customer_id),
    timestamp TIMESTAMP NOT NULL,
    category VARCHAR(60),
    product_name VARCHAR(120),
    quantity INT,
    unit_price DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    net_amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    sales_channel VARCHAR(50),
    is_refunded INT DEFAULT 0
);

-- 3. FACT_WEB_EVENTS: Clickstream & Digital Touchpoints
CREATE TABLE IF NOT EXISTS web_events (
    event_id VARCHAR(32) PRIMARY KEY,
    customer_id VARCHAR(32) REFERENCES customers(customer_id),
    session_id VARCHAR(40),
    timestamp TIMESTAMP NOT NULL,
    event_type VARCHAR(60),
    page_url VARCHAR(255),
    device VARCHAR(40),
    duration_seconds INT
);

-- 4. FACT_SUPPORT_TICKETS: Customer Service & CSAT Experience
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id VARCHAR(32) PRIMARY KEY,
    customer_id VARCHAR(32) REFERENCES customers(customer_id),
    created_at TIMESTAMP NOT NULL,
    category VARCHAR(60),
    channel VARCHAR(40),
    priority VARCHAR(30),
    resolution_time_hours DECIMAL(6, 1),
    csat_score INT,
    sentiment_score DECIMAL(4, 2),
    status VARCHAR(30)
);

-- 5. ANALYTICAL MASTER VIEW: Unified Customer 360 View
CREATE TABLE IF NOT EXISTS customer_360_master (
    customer_id VARCHAR(32) PRIMARY KEY,
    full_name VARCHAR(120),
    email VARCHAR(150),
    region VARCHAR(60),
    country VARCHAR(60),
    age INT,
    gender VARCHAR(30),
    income_tier VARCHAR(30),
    signup_date DATE,
    acquisition_channel VARCHAR(60),
    preferred_device VARCHAR(40),
    cac DECIMAL(10, 2),
    loyalty_tier VARCHAR(30),
    last_order_date TIMESTAMP,
    frequency INT,
    monetary DECIMAL(12, 2),
    avg_order_value DECIMAL(10, 2),
    recency_days INT,
    r_score INT,
    f_score INT,
    m_score INT,
    rfm_combined VARCHAR(10),
    rfm_segment VARCHAR(50),
    support_ticket_count INT,
    avg_resolution_time_hrs DECIMAL(6, 1),
    avg_csat_score DECIMAL(4, 2),
    avg_sentiment_score DECIMAL(4, 2),
    total_sessions INT,
    is_churned INT,
    historical_clv DECIMAL(12, 2),
    projected_12m_clv DECIMAL(12, 2),
    clv_to_cac_ratio DECIMAL(8, 2)
);

-- Create High-Performance Analytical Indexes
CREATE INDEX IF NOT EXISTS idx_cust_region ON customers(region);
CREATE INDEX IF NOT EXISTS idx_cust_acq ON customers(acquisition_channel);
CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_txn_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_evt_customer ON web_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_tck_customer ON support_tickets(customer_id);
