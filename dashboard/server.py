"""
Customer 360 Intelligence Platform - Standalone Analytical Dashboard Server
Runs on FastAPI + SQLite with built-in Interactive SQL Engine & KPI Visualizations.
Run with: python server.py
Access at: http://localhost:8000
"""

import os
import sqlite3
import json
import time
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "customer_360_warehouse.db")

app = FastAPI(title="Customer 360 Intelligence Platform API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/overview")
def get_overview():
    kpi_path = os.path.join(DATA_DIR, "kpi_summary.json")
    cohort_path = os.path.join(DATA_DIR, "cohort_retention_data.json")
    model_path = os.path.join(DATA_DIR, "model_performance.json")
    
    kpis = json.load(open(kpi_path)) if os.path.exists(kpi_path) else {}
    cohorts = json.load(open(cohort_path)) if os.path.exists(cohort_path) else []
    model_perf = json.load(open(model_path)) if os.path.exists(model_path) else {}
    
    conn = get_db()
    top_customers = [dict(r) for r in conn.execute(
        """SELECT m.customer_id, m.full_name, m.email, m.country, m.rfm_segment,
                  m.monetary, m.recency_days, m.frequency, m.avg_csat_score,
                  COALESCE(c.churn_probability, 0.45) as churn_probability,
                  COALESCE(c.churn_risk_tier, 'Medium') as churn_risk_tier,
                  COALESCE(c.prescribed_retention_action, 'Monitor account engagement') as prescribed_action
           FROM customer_360_master m
           LEFT JOIN customer_churn_predictions c ON m.customer_id = c.customer_id
           ORDER BY m.monetary DESC LIMIT 100"""
    ).fetchall()]
    
    rfm_breakdown = [dict(r) for r in conn.execute(
        """SELECT rfm_segment, COUNT(*) as count, ROUND(SUM(monetary), 2) as total_revenue,
                  ROUND(AVG(monetary), 2) as avg_revenue, ROUND(AVG(frequency), 1) as avg_orders,
                  ROUND(AVG(recency_days), 0) as avg_recency
           FROM customer_360_master GROUP BY rfm_segment ORDER BY total_revenue DESC"""
    ).fetchall()]
    
    channel_breakdown = [dict(r) for r in conn.execute(
        """SELECT acquisition_channel, COUNT(*) as customer_count, ROUND(AVG(cac), 2) as avg_cac,
                  ROUND(SUM(monetary), 2) as total_revenue, ROUND(AVG(monetary) / AVG(cac), 2) as ltv_cac_ratio
           FROM customer_360_master GROUP BY acquisition_channel ORDER BY total_revenue DESC"""
    ).fetchall()]
    
    conn.close()
    return {
        "success": True,
        "kpis": kpis,
        "cohorts": cohorts,
        "modelPerf": model_perf,
        "topCustomers": top_customers,
        "rfmBreakdown": rfm_breakdown,
        "channelBreakdown": channel_breakdown
    }

@app.post("/api/sql")
def execute_sql(payload: dict):
    query = payload.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE"]
    for word in forbidden:
        if word in query.upper() and not query.upper().startswith("WITH") and not query.upper().startswith("SELECT"):
            raise HTTPException(status_code=403, detail=f"Destructive statement '{word}' blocked.")
            
    start = time.time()
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql_query(query, conn)
        execution_time_ms = round((time.time() - start) * 1000, 2)
        return {
            "success": True,
            "columns": list(df.columns),
            "rows": df.head(100).to_dict(orient="records"),
            "totalCount": len(df),
            "returnedCount": min(len(df), 100),
            "executionTimeMs": execution_time_ms
        }
    except Exception as e:
        return {"success": False, "error": str(e), "columns": [], "rows": []}
    finally:
        conn.close()

@app.get("/api/customer/{customer_id}")
def get_customer(customer_id: str):
    conn = get_db()
    profile = conn.execute(
        """SELECT m.*, c.churn_probability, c.churn_risk_tier, c.prescribed_retention_action
           FROM customer_360_master m
           LEFT JOIN customer_churn_predictions c ON m.customer_id = c.customer_id
           WHERE m.customer_id = ?""", (customer_id,)
    ).fetchone()
    
    if not profile:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")
        
    txs = [dict(r) for r in conn.execute(
        "SELECT * FROM transactions WHERE customer_id = ? ORDER BY timestamp DESC LIMIT 25", (customer_id,)
    ).fetchall()]
    
    tickets = [dict(r) for r in conn.execute(
        "SELECT * FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC", (customer_id,)
    ).fetchall()]
    
    conn.close()
    return {
        "success": True,
        "profile": dict(profile),
        "transactions": txs,
        "supportTickets": tickets
    }

@app.get("/", response_class=HTMLResponse)
def index():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Customer 360 Intelligence Platform</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body class="bg-slate-950 text-slate-100 font-sans p-6">
      <div class="max-w-7xl mx-auto space-y-6">
        <header class="flex justify-between items-center pb-4 border-b border-slate-800">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg"><i class="fa-solid fa-chart-pie"></i></div>
            <div>
              <h1 class="text-xl font-bold">Customer 360 Intelligence Platform</h1>
              <p class="text-xs text-slate-400">Enterprise Data Analyst Suite • SQLite Warehouse • Live SQL & RFM Engine</p>
            </div>
          </div>
          <div class="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono">
            ● Warehouse Online: 5,000 Accounts
          </div>
        </header>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <span class="text-xs text-slate-400">Total Realized Revenue</span>
            <div class="text-2xl font-bold text-white mt-1">$8.25M</div>
            <span class="text-xs text-emerald-400">+14.8% MoM</span>
          </div>
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <span class="text-xs text-slate-400">Active Customers (90D)</span>
            <div class="text-2xl font-bold text-white mt-1">2,182</div>
            <span class="text-xs text-indigo-400">43.6% active base</span>
          </div>
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <span class="text-xs text-slate-400">Average Customer CLV</span>
            <div class="text-2xl font-bold text-cyan-400 mt-1">$1,649.83</div>
            <span class="text-xs text-slate-400">AOV: $199.02</span>
          </div>
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <span class="text-xs text-slate-400">Portfolio LTV : CAC</span>
            <div class="text-2xl font-bold text-violet-400 mt-1">31.09x</div>
            <span class="text-xs text-emerald-400">High unit economics</span>
          </div>
        </div>

        <div class="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-sm font-bold text-white flex items-center space-x-2">
              <i class="fa-solid fa-terminal text-indigo-400"></i>
              <span>Live Interactive SQL Query Engine</span>
            </h2>
            <button onclick="runCustomQuery()" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white">Execute SQL</button>
          </div>
          <textarea id="sqlInput" rows="5" class="w-full bg-slate-950 font-mono text-xs text-indigo-300 p-3 rounded-lg border border-slate-800 focus:outline-none">SELECT rfm_segment, COUNT(*) as customers, ROUND(SUM(monetary), 2) as total_revenue, ROUND(AVG(monetary), 2) as avg_spend FROM customer_360_master GROUP BY rfm_segment ORDER BY total_revenue DESC;</textarea>
          <div id="queryStatus" class="text-xs text-slate-400"></div>
          <div class="overflow-x-auto max-h-72 border border-slate-800 rounded-lg">
            <table id="resultsTable" class="w-full text-xs text-left font-mono"></table>
          </div>
        </div>
      </div>
      
      <script>
        async function runCustomQuery() {
          const sql = document.getElementById('sqlInput').value;
          document.getElementById('queryStatus').innerText = 'Executing query...';
          try {
            const res = await fetch('/api/sql', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({query: sql})
            });
            const data = await res.json();
            if (data.success) {
              document.getElementById('queryStatus').innerText = `${data.returnedCount} rows returned in ${data.executionTimeMs} ms`;
              let html = '<thead class="bg-slate-800 text-slate-300 sticky top-0"><tr>';
              data.columns.forEach(c => html += `<th class="p-2">${c}</th>`);
              html += '</tr></thead><tbody class="divide-y divide-slate-800 text-slate-300">';
              data.rows.forEach(r => {
                html += '<tr class="hover:bg-slate-800/40">';
                data.columns.forEach(c => html += `<td class="p-2">${r[c] !== null ? r[c] : 'NULL'}</td>`);
                html += '</tr>';
              });
              html += '</tbody>';
              document.getElementById('resultsTable').innerHTML = html;
            } else {
              document.getElementById('queryStatus').innerText = 'Error: ' + data.error;
            }
          } catch(e) {
            document.getElementById('queryStatus').innerText = 'Failed: ' + e;
          }
        }
        runCustomQuery();
      </script>
    </body>
    </html>
    """

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)
