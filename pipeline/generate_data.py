"""
Customer 360 Intelligence Platform - Synthetic Enterprise Data Generator
Generates realistic multi-table relational customer data for:
- Customers (Demographics, Acquisition, Loyalty)
- Transactions (Omnichannel Sales, Line Items, Discounts, Refunds)
- Web & App Events (Clickstream, Funnel touchpoints, Sessions)
- Support Tickets (Resolution Time, CSAT, Sentiment)
"""

import os
import random
import json
import datetime
import numpy as np
import pandas as pd

# Set deterministic seed for reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Configurations
NUM_CUSTOMERS = 5000
START_DATE = datetime.datetime(2024, 1, 1)
END_DATE = datetime.datetime(2026, 10, 31)
TOTAL_DAYS = (END_DATE - START_DATE).days

REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]
COUNTRIES = {
    "North America": ["United States", "Canada"],
    "Europe": ["United Kingdom", "Germany", "France", "Netherlands", "Spain"],
    "Asia Pacific": ["India", "Singapore", "Japan", "Australia"],
    "Latin America": ["Brazil", "Mexico", "Colombia"],
    "Middle East": ["UAE", "Saudi Arabia"]
}

ACQUISITION_CHANNELS = ["Paid Search", "Organic Search", "Social Media", "Referral", "Email Marketing", "Affiliate"]
DEVICES = ["Desktop", "iOS App", "Android App", "Mobile Web"]
INCOME_TIERS = ["Low", "Medium", "High", "Affluent"]
LOYALTY_TIERS = ["Bronze", "Silver", "Gold", "Platinum"]

PRODUCT_CATEGORIES = {
    "Electronics": ["Pro Wireless Headphones", "Ultra 4K Monitor", "Smart Fitness Tracker", "Mechanical Keyboard", "USB-C Hub Pro"],
    "Apparel": ["Merino Wool Sweater", "Performance Running Shoes", "Waterproof Jacket", "Organic Cotton Tee", "Ergonomic Backpack"],
    "Home & Living": ["Ceramic Coffee Maker", "Air Purifier Ion", "Memory Foam Pillow", "Smart LED Lamp", "Stainless Cookware Set"],
    "Health & Beauty": ["Hydrating Face Serum", "Sonic Electric Toothbrush", "Organic Protein Powder", "Aromatherapy Diffuser", "Vitamin Complex"],
    "Work & Office": ["Ergonomic Desk Chair", "Aluminum Laptop Stand", "Noise Canceling Headset", "Leather Desk Pad", "Dual Monitor Arm"]
}

CATEGORY_PRICE_RANGES = {
    "Electronics": (80.0, 450.0),
    "Apparel": (35.0, 180.0),
    "Home & Living": (40.0, 260.0),
    "Health & Beauty": (25.0, 120.0),
    "Work & Office": (50.0, 380.0)
}

PAYMENT_METHODS = ["Credit Card", "Debit Card", "PayPal", "Apple Pay", "Buy-Now-Pay-Later"]

TICKET_CATEGORIES = ["Billing & Invoices", "Shipping & Delivery", "Technical Issue", "Return & Refund", "Product Quality", "Account Security"]
TICKET_CHANNELS = ["In-App Chat", "Email", "Phone", "Help Center Form"]
TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"]

FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Sam", "Chris", "Pat", "Robin", "Casey", "Jamie",
    "Elena", "Mateo", "Priya", "Aarav", "Liam", "Emma", "Noah", "Olivia", "Lucas", "Sophia",
    "David", "Sarah", "Chen", "Mei", "Hiroshi", "Yuki", "Carlos", "Isabella", "Fatima", "Tariq",
    "Vikram", "Ananya", "Oliver", "Charlotte", "Gabriel", "Camila", "Lars", "Astrid", "Kwame", "Zainab"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Patel", "Sharma", "Verma", "Rao", "Nakamura", "Tanaka", "Watanabe", "Muller", "Schmidt", "Schneider",
    "Dubois", "Martin", "Bernard", "Silva", "Santos", "Oliveira", "Al-Mansoor", "Khan", "Al-Fassi", "Hansen"
]


def generate_customers():
    print(f"Generating {NUM_CUSTOMERS} customer profiles...")
    customers = []
    
    for i in range(1, NUM_CUSTOMERS + 1):
        customer_id = f"CUST-{i:05d}"
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}"
        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(10, 999)}@example.com"
        
        region = random.choices(REGIONS, weights=[0.40, 0.25, 0.20, 0.10, 0.05])[0]
        country = random.choice(COUNTRIES[region])
        age = int(np.clip(np.random.normal(38, 12), 19, 72))
        gender = random.choices(["Female", "Male", "Non-Binary", "Prefer Not to Say"], weights=[0.49, 0.47, 0.03, 0.01])[0]
        
        # Acquisition details
        signup_offset_days = random.randint(0, TOTAL_DAYS - 30)
        signup_date = START_DATE + datetime.timedelta(days=signup_offset_days)
        acquisition_channel = random.choices(
            ACQUISITION_CHANNELS, weights=[0.28, 0.22, 0.20, 0.12, 0.10, 0.08]
        )[0]
        
        income_tier = random.choices(INCOME_TIERS, weights=[0.20, 0.45, 0.25, 0.10])[0]
        preferred_device = random.choices(DEVICES, weights=[0.35, 0.35, 0.20, 0.10])[0]
        
        # CAC calculation based on acquisition channel
        cac_map = {
            "Paid Search": random.uniform(65, 120),
            "Social Media": random.uniform(45, 95),
            "Affiliate": random.uniform(30, 60),
            "Referral": random.uniform(10, 25),
            "Organic Search": random.uniform(15, 35),
            "Email Marketing": random.uniform(8, 20)
        }
        cac = round(cac_map[acquisition_channel], 2)
        
        # Initial Loyalty Tier (will be updated or set based on behavioral archetype)
        loyalty_tier = random.choices(LOYALTY_TIERS, weights=[0.55, 0.25, 0.14, 0.06])[0]
        
        # Persona archetype: 0: Churned/Inactive, 1: Casual/Low-freq, 2: Regular/Loyal, 3: High-Value VIP
        archetype_p = [0.25, 0.35, 0.28, 0.12]
        archetype = random.choices(["at_risk_churn", "casual", "active_regular", "vip_champion"], weights=archetype_p)[0]

        customers.append({
            "customer_id": customer_id,
            "full_name": full_name,
            "email": email,
            "region": region,
            "country": country,
            "age": age,
            "gender": gender,
            "income_tier": income_tier,
            "signup_date": signup_date.strftime("%Y-%m-%d"),
            "acquisition_channel": acquisition_channel,
            "preferred_device": preferred_device,
            "cac": cac,
            "loyalty_tier": loyalty_tier,
            "archetype": archetype
        })
        
    df = pd.DataFrame(customers)
    return df


def generate_transactions_and_events(customers_df):
    print("Generating omni-channel transactions and digital engagement events...")
    transactions = []
    events = []
    
    tx_counter = 1
    event_counter = 1
    
    for _, cust in customers_df.iterrows():
        cust_id = cust["customer_id"]
        archetype = cust["archetype"]
        signup_dt = datetime.datetime.strptime(cust["signup_date"], "%Y-%m-%d")
        
        # Determine number of transactions and activity span based on archetype
        if archetype == "at_risk_churn":
            num_tx = random.choices([1, 2, 3], weights=[0.6, 0.3, 0.1])[0]
            max_active_days = min(90, (END_DATE - signup_dt).days)
        elif archetype == "casual":
            num_tx = random.randint(2, 6)
            max_active_days = max(30, int((END_DATE - signup_dt).days * 0.7))
        elif archetype == "active_regular":
            num_tx = random.randint(6, 16)
            max_active_days = (END_DATE - signup_dt).days
        else: # vip_champion
            num_tx = random.randint(14, 32)
            max_active_days = (END_DATE - signup_dt).days
            
        max_active_days = max(max_active_days, 1)
        
        # Generate transactions
        order_dates = []
        for _ in range(num_tx):
            days_after_signup = random.randint(0, max_active_days)
            tx_date = signup_dt + datetime.timedelta(days=days_after_signup)
            if tx_date > END_DATE:
                continue
            order_dates.append(tx_date)
            
        order_dates.sort()
        
        for tx_dt in order_dates:
            cat = random.choice(list(PRODUCT_CATEGORIES.keys()))
            product = random.choice(PRODUCT_CATEGORIES[cat])
            price_low, price_high = CATEGORY_PRICE_RANGES[cat]
            
            # VIPs buy more or higher priced
            multiplier = 1.35 if archetype == "vip_champion" else (0.85 if archetype == "at_risk_churn" else 1.0)
            unit_price = round(random.uniform(price_low, price_high) * multiplier, 2)
            quantity = random.choices([1, 2, 3, 4], weights=[0.75, 0.18, 0.05, 0.02])[0]
            
            discount_rate = random.choices([0.0, 0.10, 0.15, 0.20, 0.30], weights=[0.55, 0.20, 0.12, 0.08, 0.05])[0]
            gross_amount = unit_price * quantity
            discount_amount = round(gross_amount * discount_rate, 2)
            net_amount = round(gross_amount - discount_amount, 2)
            
            payment = random.choice(PAYMENT_METHODS)
            is_refunded = 1 if random.random() < 0.035 else 0
            channel = random.choices(["Web Store", "Mobile App", "In-Store POS"], weights=[0.50, 0.40, 0.10])[0]
            
            transactions.append({
                "transaction_id": f"TXN-{tx_counter:07d}",
                "customer_id": cust_id,
                "timestamp": tx_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "category": cat,
                "product_name": product,
                "quantity": quantity,
                "unit_price": unit_price,
                "discount_amount": discount_amount,
                "net_amount": net_amount,
                "payment_method": payment,
                "sales_channel": channel,
                "is_refunded": is_refunded
            })
            tx_counter += 1
            
            # Create corresponding session and web events leading to purchase
            session_id = f"SESS-{random.randint(1000000, 9999999)}"
            session_device = cust["preferred_device"]
            
            # Funnel steps: page_view -> search -> product_view -> add_to_cart -> checkout -> purchase
            events.append({
                "event_id": f"EVT-{event_counter:08d}",
                "customer_id": cust_id,
                "session_id": session_id,
                "timestamp": (tx_dt - datetime.timedelta(minutes=random.randint(20, 45))).strftime("%Y-%m-%d %H:%M:%S"),
                "event_type": "page_view",
                "page_url": "/home",
                "device": session_device,
                "duration_seconds": random.randint(15, 90)
            })
            event_counter += 1
            
            events.append({
                "event_id": f"EVT-{event_counter:08d}",
                "customer_id": cust_id,
                "session_id": session_id,
                "timestamp": (tx_dt - datetime.timedelta(minutes=random.randint(15, 20))).strftime("%Y-%m-%d %H:%M:%S"),
                "event_type": "product_view",
                "page_url": f"/product/{product.lower().replace(' ', '-')}",
                "device": session_device,
                "duration_seconds": random.randint(30, 180)
            })
            event_counter += 1
            
            events.append({
                "event_id": f"EVT-{event_counter:08d}",
                "customer_id": cust_id,
                "session_id": session_id,
                "timestamp": (tx_dt - datetime.timedelta(minutes=random.randint(8, 14))).strftime("%Y-%m-%d %H:%M:%S"),
                "event_type": "add_to_cart",
                "page_url": "/cart",
                "device": session_device,
                "duration_seconds": random.randint(10, 60)
            })
            event_counter += 1
            
            events.append({
                "event_id": f"EVT-{event_counter:08d}",
                "customer_id": cust_id,
                "session_id": session_id,
                "timestamp": (tx_dt - datetime.timedelta(minutes=random.randint(2, 7))).strftime("%Y-%m-%d %H:%M:%S"),
                "event_type": "checkout_start",
                "page_url": "/checkout",
                "device": session_device,
                "duration_seconds": random.randint(45, 240)
            })
            event_counter += 1
            
            events.append({
                "event_id": f"EVT-{event_counter:08d}",
                "customer_id": cust_id,
                "session_id": session_id,
                "timestamp": tx_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "event_type": "purchase_complete",
                "page_url": "/order-confirmed",
                "device": session_device,
                "duration_seconds": random.randint(10, 40)
            })
            event_counter += 1
            
        # Add non-purchasing browse sessions (funnel drop-offs)
        num_browse_sessions = random.randint(2, 8) if archetype in ["active_regular", "vip_champion"] else random.randint(1, 3)
        for _ in range(num_browse_sessions):
            browse_date = signup_dt + datetime.timedelta(days=random.randint(0, max_active_days))
            if browse_date > END_DATE:
                continue
            sess_id = f"SESS-{random.randint(1000000, 9999999)}"
            events.append({
                "event_id": f"EVT-{event_counter:08d}",
                "customer_id": cust_id,
                "session_id": sess_id,
                "timestamp": browse_date.strftime("%Y-%m-%d %H:%M:%S"),
                "event_type": "page_view",
                "page_url": "/categories",
                "device": cust["preferred_device"],
                "duration_seconds": random.randint(20, 150)
            })
            event_counter += 1
            if random.random() < 0.4:
                events.append({
                    "event_id": f"EVT-{event_counter:08d}",
                    "customer_id": cust_id,
                    "session_id": sess_id,
                    "timestamp": (browse_date + datetime.timedelta(minutes=2)).strftime("%Y-%m-%d %H:%M:%S"),
                    "event_type": "abandoned_cart",
                    "page_url": "/cart",
                    "device": cust["preferred_device"],
                    "duration_seconds": random.randint(15, 60)
                })
                event_counter += 1
                
    tx_df = pd.DataFrame(transactions)
    ev_df = pd.DataFrame(events)
    return tx_df, ev_df


def generate_support_tickets(customers_df):
    print("Generating customer support tickets and sentiment records...")
    tickets = []
    ticket_counter = 1
    
    for _, cust in customers_df.iterrows():
        cust_id = cust["customer_id"]
        archetype = cust["archetype"]
        signup_dt = datetime.datetime.strptime(cust["signup_date"], "%Y-%m-%d")
        
        # Churned customers experience significantly more issues & negative experiences
        if archetype == "at_risk_churn":
            ticket_prob = 0.70
            num_tickets = random.choices([1, 2, 3, 4], weights=[0.4, 0.3, 0.2, 0.1])[0]
        elif archetype == "casual":
            ticket_prob = 0.30
            num_tickets = random.choices([1, 2], weights=[0.75, 0.25])[0]
        elif archetype == "active_regular":
            ticket_prob = 0.40
            num_tickets = random.choices([1, 2, 3], weights=[0.6, 0.3, 0.1])[0]
        else: # vip_champion
            ticket_prob = 0.45
            num_tickets = random.choices([1, 2], weights=[0.8, 0.2])[0]
            
        if random.random() > ticket_prob:
            continue
            
        for _ in range(num_tickets):
            days_offset = random.randint(10, (END_DATE - signup_dt).days if (END_DATE - signup_dt).days > 10 else 11)
            t_date = signup_dt + datetime.timedelta(days=days_offset)
            if t_date > END_DATE:
                continue
                
            category = random.choice(TICKET_CATEGORIES)
            channel = random.choice(TICKET_CHANNELS)
            priority = random.choice(TICKET_PRIORITIES)
            
            # Resolution time (hours)
            if archetype == "at_risk_churn":
                resolution_hours = round(np.random.gamma(shape=5, scale=8), 1) # Longer delays (30-60+ hrs)
                csat = random.choices([1, 2, 3, 4], weights=[0.50, 0.30, 0.15, 0.05])[0]
                sentiment = round(random.uniform(-0.95, -0.15), 2)
            elif archetype == "vip_champion":
                resolution_hours = round(np.random.gamma(shape=2, scale=3), 1) # VIP expedited resolution
                csat = random.choices([4, 5], weights=[0.25, 0.75])[0]
                sentiment = round(random.uniform(0.35, 0.95), 2)
            else:
                resolution_hours = round(np.random.gamma(shape=3, scale=5), 1)
                csat = random.choices([1, 2, 3, 4, 5], weights=[0.08, 0.12, 0.25, 0.35, 0.20])[0]
                sentiment = round((csat - 3) / 2.0 + random.uniform(-0.15, 0.15), 2)
                sentiment = float(np.clip(sentiment, -1.0, 1.0))
                
            status = "Resolved" if (END_DATE - t_date).days > 3 else random.choice(["Resolved", "In Progress", "Pending Customer"])
            
            tickets.append({
                "ticket_id": f"TCK-{ticket_counter:06d}",
                "customer_id": cust_id,
                "created_at": t_date.strftime("%Y-%m-%d %H:%M:%S"),
                "category": category,
                "channel": channel,
                "priority": priority,
                "resolution_time_hours": resolution_hours,
                "csat_score": csat,
                "sentiment_score": sentiment,
                "status": status
            })
            ticket_counter += 1
            
    df = pd.DataFrame(tickets)
    return df


def main():
    print("=" * 60)
    print("CUSTOMER 360 INTELLIGENCE PLATFORM: DATA SYNTHESIZER")
    print("=" * 60)
    
    customers_df = generate_customers()
    transactions_df, events_df = generate_transactions_and_events(customers_df)
    tickets_df = generate_support_tickets(customers_df)
    
    # Save raw CSVs
    customers_path = os.path.join(OUTPUT_DIR, "customers.csv")
    transactions_path = os.path.join(OUTPUT_DIR, "transactions.csv")
    events_path = os.path.join(OUTPUT_DIR, "web_events.csv")
    tickets_path = os.path.join(OUTPUT_DIR, "support_tickets.csv")
    
    customers_df.to_csv(customers_path, index=False)
    transactions_df.to_csv(transactions_path, index=False)
    events_df.to_csv(events_path, index=False)
    tickets_df.to_csv(tickets_path, index=False)
    
    print("\nDataset Generation Complete!")
    print(f" Customers:     {len(customers_df):,} records -> {customers_path}")
    print(f" Transactions:  {len(transactions_df):,} records -> {transactions_path}")
    print(f" Web Events:    {len(events_df):,} records -> {events_path}")
    print(f" Tickets:       {len(tickets_df):,} records -> {tickets_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
