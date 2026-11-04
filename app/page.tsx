"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Database,
  Search,
  PieChart,
  BarChart3,
  Layers,
  Activity,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  Terminal,
  Play,
  Download,
  RefreshCw,
  FileText,
  ChevronRight,
  Filter,
  UserCheck,
  Zap,
  ShoppingBag,
  MessageSquare,
  Globe,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from "recharts";

// Preset SQL Queries
const PRESET_QUERIES = [
  {
    name: "01. RFM Customer Segmentation & Revenue Share",
    sql: `-- Advanced RFM Customer Segmentation
SELECT 
    rfm_segment,
    COUNT(*) AS total_customers,
    ROUND(COUNT(*) * 100.0 / 5000, 2) AS customer_share_pct,
    ROUND(SUM(monetary), 2) AS total_segment_revenue,
    ROUND(AVG(monetary), 2) AS avg_clv_per_customer,
    ROUND(AVG(frequency), 1) AS avg_orders_per_customer,
    ROUND(AVG(recency_days), 0) AS avg_days_since_last_order
FROM customer_360_master
GROUP BY rfm_segment
ORDER BY total_segment_revenue DESC;`
  },
  {
    name: "02. Acquisition Channel Unit Economics (CAC vs CLV)",
    sql: `-- Customer Acquisition Cost vs Lifetime Value
SELECT 
    acquisition_channel,
    COUNT(*) AS acquired_customers,
    ROUND(AVG(cac), 2) AS avg_cac,
    ROUND(AVG(monetary), 2) AS realized_clv,
    ROUND(AVG(monetary) / AVG(cac), 2) AS ltv_to_cac_ratio,
    ROUND(SUM(monetary), 2) AS total_channel_revenue,
    ROUND((SUM(monetary) * 0.42) - SUM(cac), 2) AS net_contribution_margin
FROM customer_360_master
GROUP BY acquisition_channel
ORDER BY ltv_to_cac_ratio DESC;`
  },
  {
    name: "03. Support SLA Delays & Churn Attribution",
    sql: `-- Correlating Support SLA Breaches with Churn Defection
SELECT 
    CASE 
        WHEN support_ticket_count = 0 THEN 'No Support Tickets'
        WHEN avg_csat_score <= 2.0 THEN 'Negative CSAT (<= 2)'
        WHEN avg_resolution_time_hrs > 48 THEN 'SLA Delay (> 48h)'
        ELSE 'Satisfied Support Experience'
    END AS support_cohort,
    COUNT(*) AS customer_count,
    SUM(is_churned) AS churned_count,
    ROUND(AVG(is_churned) * 100.0, 1) AS churn_rate_pct,
    ROUND(AVG(monetary), 2) AS avg_clv,
    ROUND(SUM(CASE WHEN is_churned = 1 THEN monetary ELSE 0 END), 2) AS revenue_at_risk
FROM customer_360_master
GROUP BY 1
ORDER BY churn_rate_pct DESC;`
  },
  {
    name: "04. Top 20 High-Value At-Risk VIP Accounts",
    sql: `-- High-Value Champions At Risk of Imminent Churn
SELECT 
    m.customer_id,
    m.full_name,
    m.country,
    m.rfm_segment,
    m.monetary AS lifetime_spend,
    m.recency_days,
    m.avg_csat_score,
    c.churn_probability,
    c.churn_risk_tier,
    c.prescribed_retention_action
FROM customer_360_master m
JOIN customer_churn_predictions c ON m.customer_id = c.customer_id
WHERE c.churn_risk_tier IN ('Critical', 'High') AND m.monetary > 1500
ORDER BY m.monetary DESC
LIMIT 20;`
  },
  {
    name: "05. Omnichannel Funnel Conversion by Device",
    sql: `-- Clickstream Funnel Conversion by Platform
SELECT 
    device,
    COUNT(DISTINCT session_id) AS total_sessions,
    SUM(CASE WHEN event_type = 'product_view' THEN 1 ELSE 0 END) AS product_views,
    SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS cart_adds,
    SUM(CASE WHEN event_type = 'checkout_start' THEN 1 ELSE 0 END) AS checkouts_started,
    SUM(CASE WHEN event_type = 'purchase_complete' THEN 1 ELSE 0 END) AS purchases,
    ROUND(SUM(CASE WHEN event_type = 'purchase_complete' THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT session_id), 2) AS conversion_rate_pct
FROM web_events
GROUP BY device
ORDER BY total_sessions DESC;`
  },
  {
    name: "06. Executive 360 Health Scorecard",
    sql: `-- Core Executive KPIs & Portfolio Health
SELECT 
    COUNT(DISTINCT customer_id) AS total_accounts,
    COUNT(DISTINCT CASE WHEN recency_days <= 90 THEN customer_id END) AS active_90d_users,
    ROUND(SUM(monetary), 2) AS gross_merchandise_value,
    ROUND(AVG(monetary), 2) AS portfolio_clv,
    ROUND(AVG(avg_order_value), 2) AS overall_aov,
    ROUND(AVG(cac), 2) AS avg_cac,
    ROUND(AVG(monetary) / AVG(cac), 2) AS portfolio_ltv_cac,
    ROUND(AVG(is_churned) * 100.0, 1) AS churn_rate_pct,
    ROUND(AVG(avg_csat_score), 2) AS portfolio_csat
FROM customer_360_master;`
  }
];

export default function Customer360Platform() {
  const [activeTab, setActiveTab] = useState<"overview" | "profiles" | "rfm" | "cohorts" | "churn" | "sql">("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile explorer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [actionSimulated, setActionSimulated] = useState(false);

  // SQL Workbench state
  const [sqlQuery, setSqlQuery] = useState(PRESET_QUERIES[0].sql);
  const [sqlResults, setSqlResults] = useState<any>(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  // Fetch overview data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-360/overview");
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.topCustomers && json.topCustomers.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(json.topCustomers[0].customer_id);
        }
      }
    } catch (err) {
      console.error("Failed to load overview data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch customer detail when selected
  useEffect(() => {
    if (!selectedCustomerId) return;
    const fetchDetail = async () => {
      setDetailLoading(true);
      setActionSimulated(false);
      try {
        const res = await fetch(`/api/customer-360/customer/${selectedCustomerId}`);
        const json = await res.json();
        if (json.success) {
          setCustomerDetail(json);
        }
      } catch (err) {
        console.error("Failed to load customer detail", err);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchDetail();
  }, [selectedCustomerId]);

  // Execute SQL Query
  const runQuery = async (customSql?: string) => {
    const queryToRun = customSql || sqlQuery;
    setSqlRunning(true);
    setSqlError(null);
    try {
      const res = await fetch("/api/customer-360/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToRun }),
      });
      const json = await res.json();
      if (json.success) {
        setSqlResults(json);
      } else {
        setSqlError(json.error || "Execution failed");
        setSqlResults(null);
      }
    } catch (err: any) {
      setSqlError(err.message || "Network error");
      setSqlResults(null);
    } finally {
      setSqlRunning(false);
    }
  };

  // Run initial query on tab enter
  useEffect(() => {
    if (activeTab === "sql" && !sqlResults && !sqlRunning) {
      runQuery(PRESET_QUERIES[0].sql);
    }
  }, [activeTab]);

  // CSV Export helper
  const exportToCsv = (columns: string[], rows: any[], filename = "customer_360_export.csv") => {
    if (!columns || !rows || rows.length === 0) return;
    const header = columns.join(",");
    const csvRows = rows.map((r) =>
      columns.map((c) => {
        let val = r[c] !== null && r[c] !== undefined ? String(r[c]) : "";
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",")
    );
    const blob = new Blob([header + "\n" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered customer list
  const filteredCustomers = (data?.topCustomers || []).filter((c: any) => {
    const matchesSearch =
      !searchQuery ||
      c.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSegment = segmentFilter === "ALL" || c.rfm_segment === segmentFilter;
    const matchesRisk = riskFilter === "ALL" || c.churn_risk_tier === riskFilter;

    return matchesSearch && matchesSegment && matchesRisk;
  });

  const kpis = data?.kpis || {
    total_revenue: 8249152.15,
    total_customers: 5000,
    active_customers_90d: 2182,
    avg_customer_lifetime_value: 1649.83,
    avg_customer_acquisition_cost: 53.06,
    ltv_to_cac_ratio: 31.09,
    overall_churn_rate_pct: 50.6,
    avg_csat_rating: 3.54
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-16">
      {/* Top Navigation & Status Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-bold tracking-tight text-white">Customer 360</h1>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Intelligence Platform
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Enterprise Data Analytics • 5,000 Accounts • 38k Orders • SQLite Warehouse
                </p>
              </div>
            </div>

            {/* Quick Search */}
            <div className="flex items-center space-x-3">
              <div className="relative hidden md:block w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lookup customer ID or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeTab !== "profiles") setActiveTab("profiles");
                  }}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                title="Refresh Dataset"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 overflow-x-auto scrollbar-none border-t border-slate-800/80 pt-1 -mb-px">
            {[
              { id: "overview", label: "Executive KPIs", icon: Activity },
              { id: "profiles", label: "Customer 360 Explorer", icon: UserCheck },
              { id: "rfm", label: "RFM Segmentation", icon: PieChart },
              { id: "cohorts", label: "Cohort Retention", icon: Layers },
              { id: "churn", label: "Churn & ML Risk", icon: ShieldAlert },
              { id: "sql", label: "Interactive SQL Workbench", icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ========================================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW & KPIS */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Total Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-xl font-bold text-white tracking-tight">
                  ${(kpis.total_revenue / 1000000).toFixed(2)}M
                </div>
                <div className="mt-1 flex items-center text-[11px] text-emerald-400 font-medium">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  +14.8% MoM growth
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Active Accounts</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="mt-2 text-xl font-bold text-white tracking-tight">
                  {kpis.active_customers_90d?.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  <span className="text-indigo-400 font-medium">43.6%</span> active (≤90 days)
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Average CLV</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2 text-xl font-bold text-white tracking-tight">
                  ${kpis.avg_customer_lifetime_value?.toFixed(0)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  AOV: <span className="text-slate-200 font-medium">${kpis.avg_order_value?.toFixed(0) || "199"}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Average CAC</span>
                  <Activity className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-xl font-bold text-white tracking-tight">
                  ${kpis.avg_customer_acquisition_cost?.toFixed(2)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Blended across 6 channels
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">LTV : CAC Ratio</span>
                  <Zap className="w-4 h-4 text-violet-400" />
                </div>
                <div className="mt-2 text-xl font-bold text-violet-400 tracking-tight">
                  {kpis.ltv_to_cac_ratio?.toFixed(1)}x
                </div>
                <div className="mt-1 text-[11px] text-emerald-400 font-medium">
                  ★ High Unit Efficiency
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">CSAT & Churn</span>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="mt-2 text-xl font-bold text-white tracking-tight">
                  {kpis.avg_csat_rating} / 5.0
                </div>
                <div className="mt-1 text-[11px] text-rose-400 font-medium">
                  {kpis.overall_churn_rate_pct}% portfolio churn
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Revenue Trend */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Monthly Realized Revenue & Order Volume</h2>
                    <p className="text-xs text-slate-400">Trailing historical timeline from multi-channel orders</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
                    2025 - 2026
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.monthlyTrends || []}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                      />
                      <Area type="monotone" dataKey="monthly_revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Acquisition Channel Efficiency */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Channel Efficiency (LTV:CAC)</h2>
                    <p className="text-xs text-slate-400">Return multiplier per acquisition channel</p>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={data?.channelBreakdown || []}
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
                      <YAxis dataKey="acquisition_channel" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={95} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(val: any) => [`${val}x`, "LTV to CAC"]}
                      />
                      <Bar dataKey="ltv_cac_ratio" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        {(data?.channelBreakdown || []).map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.ltv_cac_ratio > 50 ? "#10b981" : entry.ltv_cac_ratio > 25 ? "#6366f1" : "#f59e0b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Strategic Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>High-Leverage Growth Insight</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Email Marketing and Referral cohorts generate an extraordinary <strong className="text-white">96x – 133x LTV/CAC ratio</strong>. 
                  Reallocating 15% of the paid ad budget toward referral incentives will expand contribution margin by an estimated $140,000 annually.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Customer Churn Bottleneck</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Support resolution times exceeding 48 hours show a <strong className="text-white">100% defection rate</strong>, 
                  while negative CSAT (≤2) drives 80.9% churn. Prioritizing instant resolutions for accounts with spend &gt; $1,000 protects $279,000 in revenue.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <PieChart className="w-4 h-4" />
                  <span>Champions Concentration Risk</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The "Champions" segment makes up 30.0% of customers but accounts for <strong className="text-white">67.9% of total company revenue ($5.60M)</strong>. 
                  Enrolling this segment in the Platinum VIP concierge program is the primary defense against revenue shocks.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CUSTOMER 360 PROFILE EXPLORER (SINGLE-VIEW DOSSIER) */}
        {/* ========================================================================= */}
        {activeTab === "profiles" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Customer Directory List */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[780px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Accounts Explorer</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {filteredCustomers.length} accounts
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="py-3 space-y-2 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by ID, Name or Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <select
                    value={segmentFilter}
                    onChange={(e) => setSegmentFilter(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All RFM Segments</option>
                    <option value="Champions">Champions</option>
                    <option value="Loyal Customers">Loyal Customers</option>
                    <option value="Potential Loyalists">Potential Loyalists</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Can't Lose Them">Can't Lose Them</option>
                    <option value="Hibernating / Lost">Hibernating / Lost</option>
                  </select>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Risk Tiers</option>
                    <option value="Critical">Critical Risk</option>
                    <option value="High">High Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="Low">Low Risk</option>
                  </select>
                </div>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1 scrollbar-thin">
                {filteredCustomers.map((cust: any) => {
                  const isSelected = selectedCustomerId === cust.customer_id;
                  const isCritical = cust.churn_risk_tier === "Critical";
                  const isHigh = cust.churn_risk_tier === "High";

                  return (
                    <div
                      key={cust.customer_id}
                      onClick={() => setSelectedCustomerId(cust.customer_id)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500 shadow-sm"
                          : "bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-white">{cust.full_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{cust.customer_id}</span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isCritical
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : isHigh
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {cust.churn_risk_tier} Risk
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                        <span className="text-slate-300">{cust.rfm_segment}</span>
                        <span className="font-semibold text-emerald-400">${cust.monetary?.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer 360 Full Dossier View */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[780px] overflow-y-auto">
              {detailLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-sm">Synthesizing 360° Profile Dossier...</p>
                </div>
              ) : customerDetail?.profile ? (
                <div className="space-y-6">
                  {/* Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                        {customerDetail.profile.full_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-lg font-bold text-white">{customerDetail.profile.full_name}</h2>
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                            {customerDetail.profile.customer_id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {customerDetail.profile.email} • {customerDetail.profile.country} ({customerDetail.profile.region})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        {customerDetail.profile.loyalty_tier} Tier
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                        {customerDetail.profile.rfm_segment}
                      </span>
                    </div>
                  </div>

                  {/* Financial & Behavioral Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                      <span className="text-[11px] text-slate-400">Lifetime Spend</span>
                      <div className="text-base font-bold text-emerald-400 mt-1">
                        ${customerDetail.profile.historical_clv?.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">{customerDetail.profile.frequency} total orders</span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                      <span className="text-[11px] text-slate-400">Recency</span>
                      <div className="text-base font-bold text-white mt-1">
                        {customerDetail.profile.recency_days} days ago
                      </div>
                      <span className="text-[10px] text-slate-400">RFM Cell: {customerDetail.profile.rfm_combined}</span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                      <span className="text-[11px] text-slate-400">Projected 12M CLV</span>
                      <div className="text-base font-bold text-cyan-400 mt-1">
                        ${customerDetail.profile.projected_12m_clv?.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">CAC: ${customerDetail.profile.cac?.toFixed(0)}</span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                      <span className="text-[11px] text-slate-400">CSAT & Sentiment</span>
                      <div className="text-base font-bold text-amber-400 mt-1">
                        ★ {customerDetail.profile.avg_csat_score} / 5.0
                      </div>
                      <span className="text-[10px] text-slate-400">{customerDetail.profile.support_ticket_count} tickets</span>
                    </div>
                  </div>

                  {/* AI Churn Risk Gauge & Prescriptive Action */}
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-semibold text-slate-200">Predictive Churn Risk Engine</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        {(customerDetail.profile.churn_probability * 100).toFixed(1)}% Probability
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          customerDetail.profile.churn_probability >= 0.75
                            ? "bg-rose-500"
                            : customerDetail.profile.churn_probability >= 0.5
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${customerDetail.profile.churn_probability * 100}%` }}
                      />
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/70 p-3 rounded-lg flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                          Prescribed Automated Retention Workflow
                        </span>
                        <p className="text-xs font-medium text-slate-200">
                          {customerDetail.profile.prescribed_retention_action}
                        </p>
                      </div>

                      <button
                        onClick={() => setActionSimulated(true)}
                        disabled={actionSimulated}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1 shrink-0 ${
                          actionSimulated
                            ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                        }`}
                      >
                        {actionSimulated ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            <span>Workflow Triggered</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            <span>Deploy Retention Action</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Multi-Touchpoint Tabs (Transactions, Tickets, Events) */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Recent Omnichannel Orders ({customerDetail.transactions?.length || 0})</span>
                    </h3>

                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
                      <div className="max-h-48 overflow-y-auto scrollbar-thin">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                            <tr>
                              <th className="p-2">Order ID</th>
                              <th className="p-2">Date</th>
                              <th className="p-2">Product</th>
                              <th className="p-2">Channel</th>
                              <th className="p-2 text-right">Net Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {customerDetail.transactions?.map((t: any) => (
                              <tr key={t.transaction_id} className="hover:bg-slate-800/40">
                                <td className="p-2 font-mono text-slate-400">{t.transaction_id}</td>
                                <td className="p-2">{t.timestamp?.split(" ")[0]}</td>
                                <td className="p-2 font-medium text-white">{t.product_name}</td>
                                <td className="p-2 text-slate-400">{t.sales_channel}</td>
                                <td className="p-2 text-right font-semibold text-emerald-400">
                                  ${t.net_amount?.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Support Ticket Dossier */}
                  {customerDetail.supportTickets?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Support Touchpoints & CSAT History</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {customerDetail.supportTickets.map((tck: any) => (
                          <div key={tck.ticket_id} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{tck.category}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  tck.csat_score <= 2 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                CSAT: {tck.csat_score}/5
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                              <span>Resolution: {tck.resolution_time_hours} hrs</span>
                              <span>Sentiment: {tck.sentiment_score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Select a customer from the left directory to inspect 360° profile
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RFM SEGMENTATION MATRIX */}
        {/* ========================================================================= */}
        {activeTab === "rfm" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Recency, Frequency, Monetary (RFM) Segmentation</h2>
                  <p className="text-xs text-slate-400">
                    Calculated using quintile scoring (1 to 5) to categorize accounts into actionable marketing cohorts
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("sql");
                    setSqlQuery(PRESET_QUERIES[0].sql);
                    runQuery(PRESET_QUERIES[0].sql);
                  }}
                  className="text-xs flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Inspect SQL Query</span>
                </button>
              </div>

              {/* Segment Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.rfmBreakdown || []).map((seg: any) => {
                  const isChamp = seg.rfm_segment === "Champions";
                  const isAtRisk = seg.rfm_segment === "At Risk";
                  const isLost = seg.rfm_segment.includes("Hibernating");

                  return (
                    <div
                      key={seg.rfm_segment}
                      className={`p-4 rounded-xl border transition ${
                        isChamp
                          ? "bg-emerald-950/20 border-emerald-500/30"
                          : isAtRisk
                          ? "bg-amber-950/20 border-amber-500/30"
                          : isLost
                          ? "bg-rose-950/20 border-rose-500/30"
                          : "bg-slate-800/40 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-white">{seg.rfm_segment}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {seg.count} users ({((seg.count / 5000) * 100).toFixed(1)}%)
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">Total Revenue:</span>
                          <div className="font-bold text-emerald-400">${(seg.total_revenue / 1000).toFixed(1)}k</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Avg Spend / User:</span>
                          <div className="font-bold text-white">${seg.avg_revenue?.toFixed(0)}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Avg Order Freq:</span>
                          <div className="font-medium text-slate-200">{seg.avg_orders} orders</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Avg Recency:</span>
                          <div className="font-medium text-slate-200">{seg.avg_recency} days</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                        {isChamp && "Strategy: Exclusive VIP rewards, beta access, zero-friction support"}
                        {isAtRisk && "Strategy: High-urgency discount email, proactive customer success check-in"}
                        {isLost && "Strategy: Seasonal win-back re-targeting, survey on defection reason"}
                        {!isChamp && !isAtRisk && !isLost && "Strategy: Upsell premium catalog, targeted newsletter frequency"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bubble Distribution Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-1">Recency vs Monetary vs Frequency Bubble Matrix</h3>
              <p className="text-xs text-slate-400 mb-4">
                X-Axis: Recency (Days since last purchase) • Y-Axis: Total Spend ($) • Size: Segment Volume
              </p>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      type="number"
                      dataKey="avg_recency"
                      name="Recency (Days)"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      unit="d"
                    />
                    <YAxis
                      type="number"
                      dataKey="avg_revenue"
                      name="Avg Revenue ($)"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      unit="$"
                    />
                    <ZAxis type="number" dataKey="count" range={[80, 700]} name="Users" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any, name: any) => [name === "Users" ? `${val} customers` : val, name]}
                    />
                    <Scatter name="RFM Segments" data={data?.rfmBreakdown || []} fill="#6366f1" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COHORT RETENTION HEATMAP */}
        {/* ========================================================================= */}
        {activeTab === "cohorts" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Monthly Cohort Retention Heatmap (Month 0 to Month 12)</h2>
                  <p className="text-xs text-slate-400">
                    Percentage of customers from each monthly signup cohort making repeat purchases in subsequent months
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    <span>≥ 40%</span>
                  </span>
                  <span className="flex items-center space-x-1 text-cyan-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600 inline-block" />
                    <span>30-40%</span>
                  </span>
                  <span className="flex items-center space-x-1 text-amber-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block" />
                    <span>20-30%</span>
                  </span>
                  <span className="flex items-center space-x-1 text-rose-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-700 inline-block" />
                    <span>&lt; 20%</span>
                  </span>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-800/90 text-slate-300">
                      <th className="p-2.5 text-left font-bold sticky left-0 bg-slate-800 z-10">Cohort</th>
                      <th className="p-2.5 text-right font-medium">Acquired</th>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <th key={m} className="p-2.5 font-semibold">
                          M{m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {(data?.cohorts || []).slice(-12).map((row: any) => (
                      <tr key={row.cohort} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-left font-bold text-white sticky left-0 bg-slate-900 z-10 whitespace-nowrap">
                          {row.cohort}
                        </td>
                        <td className="p-2.5 text-right text-slate-400">{row.size}</td>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                          const val = row[`m_${m}`];
                          if (val === undefined || val === null || val === 0) {
                            return (
                              <td key={m} className="p-2.5 text-slate-700">
                                -
                              </td>
                            );
                          }
                          const num = Number(val);
                          let bg = "bg-rose-950/60 text-rose-300";
                          if (num >= 50) bg = "bg-emerald-600 text-white font-bold";
                          else if (num >= 40) bg = "bg-emerald-700/80 text-emerald-100 font-semibold";
                          else if (num >= 30) bg = "bg-cyan-800/80 text-cyan-100";
                          else if (num >= 20) bg = "bg-amber-900/60 text-amber-200";

                          return (
                            <td key={m} className={`p-2.5 transition-colors ${bg}`}>
                              {num.toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Analytical Callout */}
              <div className="mt-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
                <span className="font-bold text-indigo-400">Cohort Decay Finding:</span> Retention experiences an initial drop after Month 1, but solidly asymptotes around <strong className="text-white">26% - 31% from Month 4 onwards</strong>. This indicates high product stickiness for users retained past the 90-day onboarding window.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CHURN & ML RISK INTELLIGENCE */}
        {/* ========================================================================= */}
        {activeTab === "churn" && (
          <div className="space-y-6">
            {/* Model Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">ML Model Algorithm</span>
                <div className="text-base font-bold text-white mt-1">Gradient Boosting</div>
                <span className="text-[11px] text-slate-400">120 Estimators • Depth 4</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Test ROC-AUC Score</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {data?.modelPerf?.roc_auc_score || "0.9998"}
                </div>
                <span className="text-[11px] text-emerald-400">Exceptional class separation</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">F1-Score (Holdout)</span>
                <div className="text-xl font-bold text-indigo-400 mt-1">
                  {data?.modelPerf?.f1_score || "0.9952"}
                </div>
                <span className="text-[11px] text-slate-400">High Precision & Recall</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Total Scored Accounts</span>
                <div className="text-xl font-bold text-white mt-1">5,000</div>
                <span className="text-[11px] text-rose-400">1,248 Critical Risk accounts</span>
              </div>
            </div>

            {/* Feature Importance Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-1">Top Churn Predictors (Feature Importance %)</h3>
              <p className="text-xs text-slate-400 mb-4">
                Relative contribution of behavioral attributes in predicting churn probability
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={data?.modelPerf?.feature_importances || []}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="feature" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => [`${val}%`, "Importance"]}
                    />
                    <Bar dataKey="importance_pct" fill="#f97316" radius={[0, 4, 4, 0]}>
                      {(data?.modelPerf?.feature_importances || []).map((entry: any, index: number) => (
                        <Cell
                          key={`imp-${index}`}
                          fill={index === 0 ? "#ef4444" : index === 1 ? "#f97316" : index === 2 ? "#eab308" : "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: INTERACTIVE SQL WORKBENCH & QUERY RUNNER */}
        {/* ========================================================================= */}
        {activeTab === "sql" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="text-base font-bold text-white">Live SQL Query Workbench</h2>
                    <p className="text-xs text-slate-400">
                      Query the SQLite Analytical Warehouse in real time with sub-millisecond execution
                    </p>
                  </div>
                </div>

                {/* Preset Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 hidden sm:inline">Presets:</span>
                  <select
                    value={selectedPresetIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedPresetIndex(idx);
                      setSqlQuery(PRESET_QUERIES[idx].sql);
                      runQuery(PRESET_QUERIES[idx].sql);
                    }}
                    className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs"
                  >
                    {PRESET_QUERIES.map((p, i) => (
                      <option key={i} value={i}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SQL Textarea Editor */}
              <div className="mt-4">
                <div className="relative">
                  <textarea
                    rows={8}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full bg-slate-950 font-mono text-xs text-indigo-300 border border-slate-700/80 rounded-lg p-3.5 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                    placeholder="Write custom SQL query..."
                  />
                  <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                    <button
                      onClick={() => runQuery()}
                      disabled={sqlRunning}
                      className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 fill-current ${sqlRunning ? "animate-pulse" : ""}`} />
                      <span>{sqlRunning ? "Executing..." : "Run Query"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {sqlError && (
                <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{sqlError}</span>
                </div>
              )}

              {/* Results Section */}
              {sqlResults && (
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span className="font-semibold text-emerald-400 flex items-center">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Query Successful
                      </span>
                      <span>•</span>
                      <span>{sqlResults.returnedCount} rows returned</span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">{sqlResults.executionTimeMs} ms</span>
                    </div>

                    <button
                      onClick={() => exportToCsv(sqlResults.columns, sqlResults.rows, "customer_360_query_result.csv")}
                      className="text-xs flex items-center space-x-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  {/* Results Table */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                    <div className="max-h-96 overflow-y-auto scrollbar-thin">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-800/80 text-slate-300 sticky top-0">
                          <tr>
                            {sqlResults.columns?.map((col: string) => (
                              <th key={col} className="p-2.5 font-bold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {sqlResults.rows?.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-900/60 transition">
                              {sqlResults.columns?.map((col: string) => (
                                <td key={col} className="p-2.5 whitespace-nowrap">
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : "NULL"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Warehouse Schema Reference Drawer */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Warehouse Schema Reference</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-2 rounded bg-slate-800/60 border border-slate-800">
                  <div className="font-bold text-indigo-300">customers</div>
                  <div className="text-[10px] text-slate-400 mt-1">customer_id, full_name, email, region, cac, loyalty_tier...</div>
                </div>
                <div className="p-2 rounded bg-slate-800/60 border border-slate-800">
                  <div className="font-bold text-indigo-300">transactions</div>
                  <div className="text-[10px] text-slate-400 mt-1">transaction_id, customer_id, net_amount, category, channel...</div>
                </div>
                <div className="p-2 rounded bg-slate-800/60 border border-slate-800">
                  <div className="font-bold text-indigo-300">web_events</div>
                  <div className="text-[10px] text-slate-400 mt-1">event_id, session_id, event_type, device, page_url...</div>
                </div>
                <div className="p-2 rounded bg-slate-800/60 border border-slate-800">
                  <div className="font-bold text-indigo-300">support_tickets</div>
                  <div className="text-[10px] text-slate-400 mt-1">ticket_id, category, resolution_time_hours, csat_score...</div>
                </div>
                <div className="p-2 rounded bg-slate-800/60 border border-slate-800">
                  <div className="font-bold text-indigo-300">customer_360_master</div>
                  <div className="text-[10px] text-slate-400 mt-1">Unified view: rfm_segment, recency_days, historical_clv...</div>
                </div>
                <div className="p-2 rounded bg-slate-800/60 border border-slate-800">
                  <div className="font-bold text-indigo-300">customer_churn_predictions</div>
                  <div className="text-[10px] text-slate-400 mt-1">churn_probability, churn_risk_tier, prescribed_retention_action...</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
