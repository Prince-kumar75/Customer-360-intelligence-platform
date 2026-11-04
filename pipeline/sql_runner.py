"""
Customer 360 Intelligence Platform - SQL Query Runner & Validator
Executes queries against customer_360_warehouse.db and outputs tabular results or JSON.
"""

import os
import sys
import sqlite3
import json
import pandas as pd

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "customer_360_warehouse.db"))
SQL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sql"))

def execute_query(query_sql, limit=50):
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql_query(query_sql, conn)
        if limit and len(df) > limit:
            df = df.head(limit)
        return {
            "success": True,
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
            "total_rows": len(df)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "columns": [],
            "rows": [],
            "total_rows": 0
        }
    finally:
        conn.close()

def run_sql_file(file_name):
    filepath = os.path.join(SQL_DIR, file_name)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    with open(filepath, "r") as f:
        sql = f.read()
    print(f"\n--- Running: {file_name} ---")
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(sql, conn)
    print(df.to_string(index=False))
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_sql_file(sys.argv[1])
    else:
        for f in sorted(os.listdir(SQL_DIR)):
            if f.endswith(".sql") and f != "schema.sql":
                run_sql_file(f)
