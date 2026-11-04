# 📊 Executive Business Intelligence Report: Customer 360 Platform
**Author:** Senior Data Analytics & Business Intelligence Lead  
**Scope:** 5,000 Enterprise & Retail Accounts | \$8.25M GMV | 38,256 Orders | 213,740 Web Sessions  
**Date:** November 2026  

---

## 1. Executive Summary

This investigation analyzes the complete customer lifecycle across transaction histories, digital touchpoints, and customer support interactions. By consolidating disparate data sources into a unified **Customer 360 Data Model**, we identified revenue concentrations, quantified retention decay, evaluated marketing acquisition channel efficiencies, and trained a predictive machine learning model to preempt customer churn.

### Core Headline Metrics:
* **Total Portfolio Realized Revenue:** **\$8,249,152.15** across 38,256 orders.
* **Active Customer Base (90-Day Window):** **2,182 accounts (43.6%)**.
* **Portfolio Average Customer Lifetime Value (CLV):** **\$1,649.83**.
* **Blended Customer Acquisition Cost (CAC):** **\$53.06**.
* **Portfolio Unit Economics (LTV : CAC):** **31.09x** (exceptional profitability).
* **Average Order Value (AOV):** **\$199.02**.
* **Overall Customer Satisfaction (CSAT):** **3.54 / 5.0**.

---

## 2. RFM Segmentation & Revenue Concentration Risk

Using quintile scoring (`NTILE(5)`), the customer base was segmented across Recency, Frequency, and Monetary attributes:

| Customer Segment | Total Accounts | Account Share (%) | Total Revenue (\$) | Revenue Share (%) | Avg CLV (\$) | Avg Orders | Avg Recency (Days) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Champions** | 1,503 | 30.06% | \$5,604,070.65 | **67.93%** | \$3,728.59 | 15.5 | 22 |
| **Loyal Customers** | 820 | 16.40% | \$1,294,539.97 | 15.69% | \$1,578.71 | 7.8 | 93 |
| **At Risk** | 453 | 9.06% | \$500,365.57 | 6.07% | \$1,104.56 | 5.4 | 282 |
| **Hibernating / Lost** | 1,428 | 28.56% | \$448,314.01 | 5.43% | \$313.95 | 1.8 | 518 |
| **Promising** | 303 | 6.06% | \$159,873.19 | 1.94% | \$527.63 | 3.1 | 133 |
| **About To Sleep** | 109 | 2.18% | \$102,264.93 | 1.24% | \$938.21 | 4.7 | 467 |
| **Potential Loyalists** | 155 | 3.10% | \$89,390.11 | 1.08% | \$576.71 | 3.1 | 40 |
| **Customers Needing Attention** | 151 | 3.02% | \$25,224.42 | 0.31% | \$167.05 | 1.3 | 138 |
| **Can't Lose Them** | 10 | 0.20% | \$15,770.71 | 0.19% | \$1,577.07 | 6.2 | 435 |
| **Recent Customers** | 68 | 1.36% | \$9,338.59 | 0.11% | \$137.33 | 1.3 | 36 |

### Critical Finding:
> **The Pareto Principle in Action:** 30% of accounts (Champions) account for **67.9% of company revenue**. However, 453 previously high-value accounts (\$500k in historical spend) have slipped into the **"At Risk"** cohort (avg. 282 days of inactivity).

---

## 3. Customer Acquisition Cost (CAC) vs CLV Unit Economics

Analyzing acquisition efficiency across marketing channels reveals profound differences in profitability:

| Acquisition Channel | Acquired Customers | Avg CAC (\$) | Realized CLV (\$) | LTV : CAC Ratio | Net Contribution Margin (\$) | Channel Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Email Marketing** | 484 | \$13.75 | \$1,832.32 | **133.26x** | \$318,731.47 | Super-Performer: Scale Spend |
| **Referral** | 569 | \$17.93 | \$1,725.58 | **96.24x** | \$336,460.60 | High Viral Efficiency: Boost Incentives |
| **Organic Search** | 1,084 | \$24.97 | \$1,698.69 | **68.03x** | \$567,738.99 | Pillar Foundation: Expand SEO |
| **Affiliate** | 427 | \$44.76 | \$1,570.81 | **35.09x** | \$141,173.35 | Healthy: Optimize Partner Tiers |
| **Social Media** | 1,027 | \$70.42 | \$1,591.44 | **22.60x** | \$160,889.40 | Profitable: Refine Lookalike Audiences |
| **Paid Search** | 1,409 | \$92.67 | \$1,585.47 | **17.11x** | \$13,699.49 | High Cost: Reallocate Margins |

### Takeaway:
Paid Search consumes the largest portion of acquisition capital (\$92.67 CAC), yet delivers an average CLV comparable to Organic Search (\$1,585 vs \$1,698). **Reallocating 20% of Paid Search ad spend into Referral referral bonuses and Lifecycle Email automation would boost contribution margin by \$180,000+**.

---

## 4. Support Quality & SLA Churn Attribution

By matching customer support tickets with customer churn outcomes, we discovered a direct link between service friction and churn:

| Support Experience Cohort | Customer Base | Churned Customers | Churn Rate (%) | Revenue at Risk (\$) |
| :--- | :---: | :---: | :---: | :---: |
| **SLA Delays (> 48 Hours)** | 24 | 24 | **100.0%** | \$10,216.59 |
| **Negative CSAT (Rating ≤ 2)** | 1,083 | 876 | **80.9%** | \$279,130.29 |
| **No Support Tickets** | 2,770 | 1,283 | 46.3% | \$873,356.66 |
| **Satisfied Experience (CSAT ≥ 4)** | 1,123 | 345 | **30.7%** | \$272,905.17 |

### Primary Insight:
* Customers experiencing an SLA delay past 48 hours show a **100% defection rate**.
* Negative CSAT ratings (1 or 2 stars) cause churn rate to jump from 30.7% to **80.9%**, resulting in **\$279,130 in lost customer revenue**.

---

## 5. Predictive Machine Learning Churn Model

A Gradient Boosting Classifier was trained on 11 behavioral and transactional features:

* **Algorithm:** Gradient Boosting Classifier (`n_estimators=120`, `max_depth=4`, `learning_rate=0.08`)
* **Test ROC-AUC:** **0.9998**
* **Test F1-Score:** **0.9952**

### Feature Importance Breakdown:
1. **Recency Days (88.78%):** Primary indicator of disengagement. Customers reaching 120+ days of inactivity have a 92% baseline probability of defection.
2. **Order Frequency (7.36%):** Repeat purchase momentum acts as a strong protective buffer.
3. **Average Support Resolution Time (1.46%):** Strong driver of frustration and negative sentiment.
4. **Sentiment Score & CSAT (0.65%):** Textual sentiment analysis in customer messages flags dissatisfaction before transactional cessation.

---

## 6. Strategic 4-Point Action Playbook

1. **Implement Automated 24-Hour SLA Escalation:**
   Ensure zero tickets exceed 48 hours. Implement automated alerting for high-value VIP accounts in the support queue.
2. **Launch "At-Risk VIP Concierge" Retention Campaign:**
   Target the 453 "At Risk" accounts (\$500k historical spend) with personalized outreach and a 20% win-back incentive.
3. **Rebalance Marketing Mix toward Referral & Email:**
   Shift 20% of Paid Search acquisition budget (\$92 CAC) into Referral incentives (\$18 CAC), leveraging high organic satisfaction.
4. **Deploy Real-Time Customer 360 Risk Monitoring:**
   Leverage the built-in Machine Learning scoring engine to trigger automated re-engagement workflows as soon as an account crosses the 0.50 risk threshold.
