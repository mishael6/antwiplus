import { formatPrice } from "@/lib/currency";

export type DailyMetric = { date: string; label: string; value: number; count: number };

function chartPoints(values: number[], width: number, height: number, inset: { left: number; right: number; top: number; bottom: number }) {
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const safeValues = values.map((value) => Number.isFinite(value) ? Math.max(0, value) : 0);
  const max = Math.max(1, ...safeValues);
  const axisMax = Math.max(10000, Math.ceil(max / 10000) * 10000);
  const points = safeValues.map((value, index) => ({
    x: inset.left + (values.length <= 1 ? 0 : index * plotWidth / (values.length - 1)),
    y: inset.top + plotHeight - (value / axisMax) * plotHeight,
  }));
  return { points, plotWidth, plotHeight, axisMax };
}

export function OrderValueChart({ data }: { data: DailyMetric[] }) {
  const width = 760;
  const height = 280;
  const inset = { left: 61, right: 12, top: 14, bottom: 39 };
  const { points, plotWidth, plotHeight, axisMax } = chartPoints(data.map((day) => day.value), width, height, inset);
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(inset.left + plotWidth).toFixed(1)},${(inset.top + plotHeight).toFixed(1)} L${inset.left},${(inset.top + plotHeight).toFixed(1)} Z`;
  const labels = [0, 1, 2, 3].map((step) => ({ y: inset.top + plotHeight - plotHeight * step / 3, value: axisMax * step / 3 }));
  const dateIndexes = [0, 7, 14, 21, 29];
  const hasValues = data.some((day) => day.value > 0);
  return <section className="admin-chart-card admin-chart-revenue" aria-labelledby="value-chart-title">
    <div className="admin-chart-heading"><div><p className="admin-kicker">LAST 30 DAYS</p><h2 id="value-chart-title">Placed order value</h2></div><span className="chart-legend"><i /> Order value</span></div>
    <p className="admin-chart-subtitle">Excludes cancelled and refunded orders; pending COD orders are included.</p>
    <div className="admin-chart-wrap"><svg className="admin-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily placed order value over the last 30 days, shown in Ghana cedis.">
      <defs><linearGradient id="order-value-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#839678" stopOpacity=".26"/><stop offset="100%" stopColor="#839678" stopOpacity=".015"/></linearGradient></defs>
      {labels.map((tick, index) => <g key={index}><line x1={inset.left} x2={width - inset.right} y1={tick.y} y2={tick.y} className="chart-gridline"/><text x={inset.left - 10} y={tick.y + 3} textAnchor="end" className="chart-axis-label">{formatPrice(Math.round(tick.value))}</text></g>)}
      {hasValues && <path d={area} fill="url(#order-value-fill)"/>}
      <path d={line} fill="none" className="chart-revenue-line"/>
      {points.map((point, index) => { const day = data[index]; if (!day) return null; const value = Number.isFinite(day.value) ? Math.max(0, day.value) : 0; return <circle key={day.date || index} cx={point.x} cy={point.y} r={value > 0 ? 3.3 : 2} className={value > 0 ? "chart-point has-value" : "chart-point"} aria-label={`${day.label}: ${formatPrice(value)}`} />; })}
      {dateIndexes.filter((index) => points[index] && data[index]).map((index) => <text key={index} x={points[index].x} y={height - 9} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} className="chart-axis-label">{data[index].label}</text>)}
    </svg></div>
    {!hasValues && <p className="chart-empty-note">No orders were placed during this period.</p>}
  </section>;
}

export function OrderVolumeChart({ data }: { data: DailyMetric[] }) {
  const width = 420;
  const height = 280;
  const inset = { left: 31, right: 12, top: 14, bottom: 39 };
  const safeData = data.map((day) => ({ ...day, count: Number.isFinite(day.count) ? Math.max(0, day.count) : 0 }));
  const max = Math.max(1, ...safeData.map((day) => day.count));
  const axisMax = Math.max(4, Math.ceil(max / 4) * 4);
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const band = plotWidth / Math.max(1, safeData.length);
  const barWidth = Math.max(2, band * .56);
  const ticks = [0, 1, 2, 3, 4].map((step) => ({ y: inset.top + plotHeight - plotHeight * step / 4, value: axisMax * step / 4 }));
  const dateIndexes = [0, 7, 14, 21, 29];
  const hasOrders = safeData.some((day) => day.count > 0);
  return <section className="admin-chart-card admin-chart-volume" aria-labelledby="volume-chart-title">
    <div className="admin-chart-heading"><div><p className="admin-kicker">LAST 30 DAYS</p><h2 id="volume-chart-title">Orders per day</h2></div><span className="chart-legend"><i className="volume-legend-dot" /> Orders</span></div>
    <p className="admin-chart-subtitle">Daily orders placed in your store.</p>
    <div className="admin-chart-wrap"><svg className="admin-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily order count over the last 30 days.">
      {ticks.map((tick, index) => <g key={index}><line x1={inset.left} x2={width - inset.right} y1={tick.y} y2={tick.y} className="chart-gridline"/><text x={inset.left - 9} y={tick.y + 3} textAnchor="end" className="chart-axis-label">{Math.round(tick.value)}</text></g>)}
      {safeData.map((day, index) => { const barHeight = day.count / axisMax * plotHeight; const x = inset.left + index * band + (band - barWidth) / 2; const y = inset.top + plotHeight - barHeight; return <rect key={day.date || index} x={x} y={y} width={barWidth} height={Math.max(0, barHeight)} rx="2" className={day.count ? "chart-volume-bar has-value" : "chart-volume-bar"} aria-label={`${day.label}: ${day.count} ${day.count === 1 ? "order" : "orders"}`} />; })}
      {dateIndexes.filter((index) => safeData[index]).map((index) => { const x = inset.left + index * band + band / 2; return <text key={index} x={x} y={height - 9} textAnchor={index === 0 ? "start" : index === safeData.length - 1 ? "end" : "middle"} className="chart-axis-label">{safeData[index].label}</text>; })}
    </svg></div>
    {!hasOrders && <p className="chart-empty-note">Your first order will show up here.</p>}
  </section>;
}

export function MonthlySalesChart({ data }: { data: DailyMetric[] }) {
  const width = 760, height = 300, left = 55, right = 14, top = 18, bottom = 42;
  const max = Math.max(1, ...data.map((item) => item.value));
  const axis = Math.max(10000, Math.ceil(max / 10000) * 10000);
  const plotW = width - left - right, plotH = height - top - bottom;
  const points = data.map((item, index) => ({ x: left + (data.length < 2 ? 0 : index * plotW / (data.length - 1)), y: top + plotH - item.value / axis * plotH }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${left + plotW},${top + plotH} L${left},${top + plotH} Z`;
  const ticks = [0, 1, 2, 3, 4].map((step) => ({ y: top + plotH - plotH * step / 4, value: axis * step / 4 }));
  const showDots = data.length <= 12;
  return <section className="admin-chart-card overview-sales-chart" aria-labelledby="monthly-sales-title"><div className="admin-chart-heading"><div><p className="admin-kicker">SALES PERFORMANCE</p><h2 id="monthly-sales-title">Sales overview</h2></div><span className="chart-legend"><i /> Total sales</span></div><p className="admin-chart-subtitle">Monthly order value across the last 12 months.</p><div className="admin-chart-wrap"><svg className="admin-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly sales trend for the last 12 months in Ghana cedis."><defs><linearGradient id="monthly-sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#235b93" stopOpacity=".17"/><stop offset="100%" stopColor="#235b93" stopOpacity="0"/></linearGradient></defs>{ticks.map((tick, index) => <g key={index}><line x1={left} x2={width - right} y1={tick.y} y2={tick.y} className="chart-gridline"/><text x={left - 8} y={tick.y + 3} textAnchor="end" className="chart-axis-label">{tick.value ? `${(tick.value / 100000).toFixed(tick.value >= 100000 ? 0 : 1)}k` : "0"}</text></g>)}{data.some((item) => item.value > 0) && <path d={area} fill="url(#monthly-sales-fill)"/>}<path d={line} fill="none" className="chart-revenue-line"/>{showDots && points.map((point, index) => <circle key={data[index]?.date ?? index} cx={point.x} cy={point.y} r="3.5" className="chart-point has-value"/>)}{data.map((item, index) => <text key={item.date} x={points[index]?.x ?? 0} y={height - 12} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} className="chart-axis-label">{item.label}</text>)}</svg></div>{!data.some((item) => item.value > 0) && <p className="chart-empty-note">Sales will appear here as orders come in.</p>}</section>;
}

export type StatusMetric = { label: string; count: number; color: string };
export function OrderStatusDonut({ data }: { data: StatusMetric[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 47, circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = data.map((item) => { const length = total ? item.count / total * circumference : 0; const segment = { ...item, length, offset }; offset += length; return segment; });
  return <section className="admin-chart-card overview-donut-card" aria-labelledby="order-status-title"><div className="admin-chart-heading"><div><p className="admin-kicker">ORDER BREAKDOWN</p><h2 id="order-status-title">Order status</h2></div><span className="overview-period">30 DAYS</span></div><p className="admin-chart-subtitle">How recent orders are progressing.</p><div className="overview-donut-layout"><div className="overview-donut"><svg viewBox="0 0 120 120" role="img" aria-label={`${total} orders across four fulfillment statuses`}><circle cx="60" cy="60" r={radius} fill="none" stroke="#eef2f6" strokeWidth="12"/>{segments.map((segment) => segment.length > 0 && <circle key={segment.label} cx="60" cy="60" r={radius} fill="none" stroke={segment.color} strokeWidth="12" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset} transform="rotate(-90 60 60)"/>)}<text x="60" y="56" textAnchor="middle" className="overview-donut-total">{total}</text><text x="60" y="71" textAnchor="middle" className="overview-donut-caption">ORDERS</text></svg></div><div className="overview-donut-legend">{data.map((item) => <div key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><b>{item.count}</b></div>)}</div></div>{!total && <p className="chart-empty-note">No orders in this period.</p>}</section>;
}

export type CategoryMetric = { label: string; value: number; quantity: number };
export function CategorySalesChart({ data }: { data: CategoryMetric[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <section className="admin-chart-card overview-category-chart" aria-labelledby="category-sales-title"><div className="admin-chart-heading"><div><p className="admin-kicker">PRODUCT PERFORMANCE</p><h2 id="category-sales-title">Sales by category</h2></div></div><p className="admin-chart-subtitle">Order value by product category · last 30 days.</p>{data.length ? <div className="overview-category-bars">{data.map((item, index) => <div className="overview-category-row" key={item.label}><div className="overview-category-meta"><span>{item.label}</span><b>{formatPrice(item.value)}</b></div><div className="overview-category-track"><i className={index === 0 ? "highlight" : ""} style={{ height: `${Math.max(2, item.value / max * 100)}%` }}/></div><small>{item.quantity} {item.quantity === 1 ? "item" : "items"} sold</small></div>)}</div> : <p className="chart-empty-note">Category sales will appear after orders are placed.</p>}</section>;
}

export type RevenueTrendMetric = DailyMetric & { firstValue: number; repeatValue: number };
export function RevenueOverviewChart({ data }: { data: RevenueTrendMetric[] }) {
  const width = 760, height = 300, left = 55, right = 14, top = 18, bottom = 42;
  const max = Math.max(1, ...data.flatMap((item) => [item.firstValue, item.repeatValue]));
  const axis = Math.max(10000, Math.ceil(max / 10000) * 10000);
  const plotW = width - left - right, plotH = height - top - bottom;
  const pointsFor = (key: "firstValue" | "repeatValue") => data.map((item, index) => ({ x: left + (data.length < 2 ? 0 : index * plotW / (data.length - 1)), y: top + plotH - item[key] / axis * plotH }));
  const first = pointsFor("firstValue"), repeat = pointsFor("repeatValue");
  const pathFor = (points: { x: number; y: number }[]) => points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2, 3, 4].map((step) => ({ y: top + plotH - plotH * step / 4, value: axis * step / 4 }));
  return <section className="admin-chart-card overview-sales-chart" aria-labelledby="revenue-overview-title"><div className="admin-chart-heading"><div><p className="admin-kicker">STORE PERFORMANCE</p><h2 id="revenue-overview-title">Revenue overview</h2></div><span className="overview-period">MONTHLY⌄</span></div><div className="overview-revenue-legend"><span><i className="returning"/>Returning customer orders</span><span><i className="first-time"/>First orders</span></div><p className="admin-chart-subtitle">Order value by purchase history · last 6 months.</p><div className="admin-chart-wrap"><svg className="admin-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly order value split between first and returning customer orders.">{ticks.map((tick, index) => <g key={index}><line x1={left} x2={width - right} y1={tick.y} y2={tick.y} className="chart-gridline"/><text x={left - 8} y={tick.y + 3} textAnchor="end" className="chart-axis-label">{tick.value ? `GH₵${(tick.value / 100000).toFixed(1)}k` : "GH₵0"}</text></g>)}<path d={pathFor(first)} fill="none" className="overview-line-first"/><path d={pathFor(repeat)} fill="none" className="overview-line-repeat"/>{data.map((item, index) => <text key={item.date} x={first[index]?.x ?? 0} y={height - 12} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} className="chart-axis-label">{item.label}</text>)}</svg></div></section>;
}

export function SixMonthSalesChart({ data }: { data: DailyMetric[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <section className="overview-six-month-card"><div className="overview-six-month-head"><h3>Order value</h3><span>LAST 6 MONTHS⌄</span></div><div className="overview-six-month-metrics"><div><small>Average order</small><b>{formatPrice(data.reduce((sum, item) => sum + item.value, 0) / Math.max(1, data.reduce((sum, item) => sum + item.count, 0)))}</b></div><div><small>Sales total</small><b>{formatPrice(data.reduce((sum, item) => sum + item.value, 0))}</b></div></div><div className="overview-six-month-bars" role="img" aria-label="Order value by month for the last six months">{data.map((item, index) => <div className="overview-six-month-column" key={item.date}><div className="overview-six-month-bar-track"><i className={index === data.length - 1 ? "current" : ""} style={{ height: `${Math.max(item.value ? 4 : 0, item.value / max * 100)}%` }}/></div><span>{item.label}</span></div>)}</div></section>;
}
