# 🌐 Customer 360 Intelligence Platform
> **Enterprise Data Analyst & Business Intelligence Portfolio Project**  
> An end-to-end analytical data platform delivering omni-channel customer intelligence, RFM segmentation, cohort retention matrices, predictive ML churn modeling, and an interactive SQL query workbench with web analytics dashboards.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg)](https://nextjs.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite%2FDuckDB-003B57.svg)](https://sqlite.org)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn%20%2F%20GradientBoosting-F7931E.svg)](https://scikit-learn.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC.svg)](https://tailwindcss.com)

---

## 📌 Project Overview

In enterprise e-commerce and SaaS ecosystems, customer data is fragmented across transactional databases, web clickstream events, and customer support desks. This project synthesizes a **Customer 360 Data Model** that consolidates all customer touchpoints to answer vital business questions:

* **Who are our highest-value customers, and what is our revenue concentration?** (RFM Segmentation)
* **How durable is our customer retention across signup cohorts?** (Cohort Retention Matrices)
* **Which marketing acquisition channels produce the highest ROI and payback speed?** (CAC vs CLV Analysis)
* **What operational bottlenecks drive customer churn?** (Support SLA & CSAT Attribution)
* **Can we predict and preempt churn before it happens?** (Machine Learning Churn Prediction)
* **Can business stakeholders query the warehouse in real time?** (Interactive SQL Query Workbench)

---

## 🏗️ Repository Architecture

```
customer-360-platform/
├── data/                                 # Analytical Datasets & Database Warehouse
│   ├── customers.csv                    # 5,000 multi-attribute customer profiles
│   ├── transactions.csv                 # 38,256 multi-category omnichannel orders
│   ├── web_events.csv                   # 213,740 clickstream & funnel sessions
│   ├── support_tickets.csv              # 3,531 customer service tickets & CSAT
│   ├── customer_360_master.csv          # Unified 360 analytical master view
│   ├── customer_churn_predictions.csv   # ML churn risk scores & prescriptive actions
│   ├── cohort_retention_matrix.csv      # M0-M12 cohort retention grid
│   ├── kpi_summary.json                 # Executive KPI summary metrics
│   ├── model_performance.json           # ML ROC-AUC, F1, & feature importances
│   └── customer_360_warehouse.db        # SQLite analytical relational database
│
├── pipeline/                             # ETL, Feature Engineering & ML Pipelines
│   ├── generate_data.py                 # High-fidelity synthetic dataset generator
│   ├── etl_pipeline.py                  # RFM calculation, cohort retention & warehouse ingestion
│   ├── churn_model.py                   # Gradient Boosting churn classifier & risk tiering
│   ├── sql_runner.py                    # CLI SQL query executor with table formatting
│   └── make_notebook.py                 # Automated Jupyter notebook compiler
│
├── sql/                                 # Production SQL Analytics Suite
│   ├── schema.sql                       # DDL schema definitions and indexes
│   ├── 01_rfm_segmentation.sql          # NTILE(5) RFM customer segmentation
│   ├── 02_cohort_retention_analysis.sql # Monthly cohort retention (M0 to M12)
│   ├── 03_clv_and_cac_efficiency.sql    # CAC vs CLV acquisition channel economics
│   ├── 04_churn_risk_attribution.sql    # Support ticket SLA delays & CSAT churn impact
│   ├── 05_omnichannel_funnel_dropoff.sql# Digital event funnel conversion by platform
│   └── 06_executive_kpi_scorecard.sql   # Portfolio unit economics & health matrix
│
├── notebooks/                           # Exploratory Data Analysis & Visualizations
│   └── Customer_360_EDA_and_Modeling.ipynb # End-to-end Jupyter Notebook with visuals
│
├── dashboard/                           # Standalone Analytical Dashboard Server
│   ├── server.py                        # FastAPI backend + real-time SQLite SQL engine
│   └── package.json                     # Standalone dashboard npm configuration
│
└── docs/                                # Business & Strategy Documentation
    └── EXECUTIVE_BUSINESS_REPORT.md     # Boardroom-ready business presentation report
```

---

## ⚡ Quick Start & Execution

### 1. Run Data Generation & ETL Pipeline
```powershell
# 1. Generate multi-relational dataset (5,000 accounts, 38k orders, 213k events)
python customer-360-platform/pipeline/generate_data.py

# 2. Execute ETL pipeline & populate SQLite Warehouse
python customer-360-platform/pipeline/etl_pipeline.py

# 3. Train Gradient Boosting Churn Model & compute risk tiers
python customer-360-platform/pipeline/churn_model.py
```

### 2. Execute SQL Queries from Command Line
```powershell
# Run any analytical SQL script against the database:
python customer-360-platform/pipeline/sql_runner.py 01_rfm_segmentation.sql
python customer-360-platform/pipeline/sql_runner.py 02_cohort_retention_analysis.sql
python customer-360-platform/pipeline/sql_runner.py 03_clv_and_cac_efficiency.sql
```

### 3. Launch Interactive Modern Dashboard

#### Option A: Run Next.js Web Dashboard (Recommended)
```powershell
# Run the development server
pnpm run dev
# Open in browser:
http://localhost:3000/customer-360
```

#### Option B: Run Standalone Python FastAPI Server
```powershell
python customer-360-platform/dashboard/server.py
# Open in browser:
http://localhost:8000
```

---

## 📊 Core Analytical Modules

### 1. Executive KPI Command Center
* **GMV & Revenue Tracking:** $8.25M realized revenue with MoM trend breakdowns.
* **Unit Economics (LTV:CAC):** Blended 31.09x ratio with channel-level payback tracking.
* **Customer Retention:** 43.6% active 90-day retention with cohort decay monitoring.

### 2. Customer 360 Profile Explorer (Single-Customer View)
* Instant search across 5,000 customer accounts by ID, name, or email.
* Full 360° dossier: Loyalty tier, RFM cell, Historical CLV, Projected 12-Month CLV, and Churn Risk Gauge.
* Multi-touchpoint timeline: Line-item order history, customer support tickets, and web clickstream sessions.
* **Prescriptive AI Actions:** One-click deployment of automated retention workflows (e.g., VIP concierge outreach, apology credits, win-back incentives).

### 3. RFM Segmentation Matrix
* Quintile scoring across Recency, Frequency, and Monetary attributes.
* Segments: **Champions**, **Loyal Customers**, **Potential Loyalists**, **At Risk**, **Can't Lose Them**, **About to Sleep**, **Hibernating / Lost**.
* **Key Finding:** Champions account for **67.9% of company revenue ($5.60M)**.

### 4. Monthly Cohort Retention Heatmap
* Month 0 to Month 12 retention grid with conditional color formatting.
* Highlights retention inflection points: initial drop after Month 1, stabilizing at 26%-31% from Month 4 onwards.

### 5. Predictive Churn & ML Risk Intelligence
* **Algorithm:** Gradient Boosting Classifier with **0.9998 ROC-AUC** and **0.9952 F1-score**.
* **Top Predictors:** Recency Days (88.8%), Order Frequency (7.4%), Support SLA Resolution Delays (1.5%), Sentiment Score (0.6%).
* **SLA Bottleneck Finding:** Support resolution delays exceeding 48 hours show a **100% defection rate**.

### 6. Interactive Live SQL Query Workbench
* Real-time query execution directly on the SQLite analytical warehouse.
* 6 pre-loaded SQL presets with syntax highlighting.
* Instant formatted results table with sorting, execution timer, and **one-click CSV export**.
* Warehouse schema explorer for instant column referencing.

---

## 📈 Key Business Recommendations

1. **VIP Champions Defense:** Enroll the top 30% of accounts (Champions) in an automated VIP tier with priority customer support to insulate against revenue disruption.
2. **24-Hour Support SLA Escalation:** Eliminate support resolution delays exceeding 48 hours, which currently result in an 80%-100% churn probability.
3. **Marketing Budget Reallocation:** Reallocate 20% of high-cost Paid Search ad spend ($92.67 CAC) into Referral ($17.93 CAC) and Lifecycle Email ($13.75 CAC) campaigns.

---

## 📝 License
MIT License. Built for enterprise data analytics, portfolio presentations, and business intelligence demonstrations.
