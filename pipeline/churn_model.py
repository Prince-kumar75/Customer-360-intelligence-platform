"""
Customer 360 Intelligence Platform - Predictive Churn & Risk ML Model
Builds an interpretable Machine Learning pipeline to:
1. Predict customer churn probability (0.0 to 1.0)
2. Classify risk levels (Low, Medium, High, Critical)
3. Extract top predictive drivers of churn (Feature Importance)
4. Prescribe specific AI-driven retention intervention tactics
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score, f1_score
from sklearn.preprocessing import StandardScaler

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
MASTER_CSV = os.path.join(DATA_DIR, "customer_360_master.csv")
OUTPUT_CHURN_CSV = os.path.join(DATA_DIR, "customer_churn_predictions.csv")
OUTPUT_METRICS_JSON = os.path.join(DATA_DIR, "model_performance.json")

def train_and_score():
    print("=" * 60)
    print("CUSTOMER CHURN PREDICTIVE INTELLIGENCE MODEL")
    print("=" * 60)
    
    df = pd.read_csv(MASTER_CSV)
    
    # Feature Selection for tabular ML
    feature_cols = [
        "recency_days",
        "frequency",
        "monetary",
        "avg_order_value",
        "total_items_purchased",
        "support_ticket_count",
        "avg_resolution_time_hrs",
        "avg_csat_score",
        "avg_sentiment_score",
        "total_sessions",
        "cac"
    ]
    
    X = df[feature_cols].copy()
    y = df["is_churned"].copy()
    
    X = X.fillna(X.median())
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    
    print(f"Training set: {X_train.shape[0]} samples | Test set: {X_test.shape[0]} samples")
    
    # Model: Gradient Boosting Classifier
    model = GradientBoostingClassifier(
        n_estimators=120,
        learning_rate=0.08,
        max_depth=4,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluation
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    roc_auc = roc_auc_score(y_test, y_prob)
    f1 = f1_score(y_test, y_pred)
    print(f"Test ROC-AUC Score: {roc_auc:.4f}")
    print(f"Test F1 Score:      {f1:.4f}")
    
    # Feature importances
    importances = model.feature_importances_
    feat_imp = pd.DataFrame({
        "feature": feature_cols,
        "importance": importances
    }).sort_values(by="importance", ascending=False)
    
    print("\nTop Churn Predictors (Feature Importance):")
    for _, row in feat_imp.iterrows():
        print(f"  {row['feature']:<25}: {row['importance'] * 100:.2f}%")
        
    # Generate predictions across ALL customers for 360 profiling
    all_probs = model.predict_proba(X)[:, 1]
    df["churn_probability"] = np.round(all_probs, 4)
    
    def assign_risk_category(prob):
        if prob >= 0.75:
            return "Critical"
        elif prob >= 0.50:
            return "High"
        elif prob >= 0.25:
            return "Medium"
        else:
            return "Low"
            
    df["churn_risk_tier"] = df["churn_probability"].apply(assign_risk_category)
    
    # Prescriptive AI Actions
    def prescribe_action(row):
        prob = row["churn_probability"]
        csat = row["avg_csat_score"]
        recency = row["recency_days"]
        monetary = row["monetary"]
        
        if prob >= 0.75:
            if csat <= 2.5:
                return "Immediate VIP Concierge Outreach + CSAT Apology Credit ($50)"
            elif recency > 120:
                return "Aggressive Win-Back Re-engagement Email with 30% One-Time Incentive"
            else:
                return "Proactive Senior Account Manager Retention Consultation"
        elif prob >= 0.50:
            if monetary > 1000:
                return "Enroll in VIP Tier Fast-Track & Offer Free Priority Shipping"
            else:
                return "Targeted Multi-Channel Push Campaign Featuring New Product Arrivals"
        elif prob >= 0.25:
            return "Quarterly Loyalty Reward Bonus + Product Feedback Survey"
        else:
            return "Cross-Sell / Up-Sell Next Best Product & Invite to Beta Programs"
            
    df["prescribed_retention_action"] = df.apply(prescribe_action, axis=1)
    
    # Output Churn Predictions dataset
    churn_cols = [
        "customer_id", "full_name", "email", "country", "rfm_segment",
        "recency_days", "frequency", "monetary", "avg_csat_score",
        "churn_probability", "churn_risk_tier", "prescribed_retention_action"
    ]
    df[churn_cols].to_csv(OUTPUT_CHURN_CSV, index=False)
    
    # Save Model Performance JSON
    perf = {
        "model_name": "Gradient Boosting Classifier",
        "roc_auc_score": round(float(roc_auc), 4),
        "f1_score": round(float(f1), 4),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "feature_importances": [
            {"feature": row["feature"], "importance_pct": round(float(row["importance"] * 100), 2)}
            for _, row in feat_imp.iterrows()
        ],
        "risk_tier_counts": df["churn_risk_tier"].value_counts().to_dict()
    }
    with open(OUTPUT_METRICS_JSON, "w") as f:
        json.dump(perf, f, indent=2)
        
    print("\nModel Execution & Risk Attribution Complete!")
    print(f" Predictions Saved:   {OUTPUT_CHURN_CSV}")
    print(f" Performance Metrics: {OUTPUT_METRICS_JSON}")
    print("=" * 60)

if __name__ == "__main__":
    train_and_score()
