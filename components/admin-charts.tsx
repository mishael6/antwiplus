import { formatPrice } from "@/lib/currency";

export type DailyMetric = { date: string; label: string; value: number; count: number };

function chartPoints(values: number[], width: number, height: number, inset: { left: number; right: number; top: number; bottom: number }) {
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const max = Math.max(1, ...values);
  const axisMax = Math.max(10000, Math.ceil(max / 10000) * 10000);
  const points = values.map((value, index) => ({
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
      {points.map((point, index) => <circle key={data[index].date} cx={point.x} cy={point.y} r={data[index].value > 0 ? 3.3 : 2} className={data[index].value > 0 ? "chart-point has-value" : "chart-point"}><title>{data[index].label}: {formatPrice(data[index].value)}</title></circle>)}
      {dateIndexes.map((index) => <text key={index} x={points[index].x} y={height - 9} textAnchor={index === 0 ? "start" : index === 29 ? "end" : "middle"} className="chart-axis-label">{data[index].label}</text>)}
    </svg></div>
    {!hasValues && <p className="chart-empty-note">No orders were placed during this period.</p>}
  </section>;
}

export function OrderVolumeChart({ data }: { data: DailyMetric[] }) {
  const width = 420;
  const height = 280;
  const inset = { left: 31, right: 12, top: 14, bottom: 39 };
  const max = Math.max(1, ...data.map((day) => day.count));
  const axisMax = Math.max(4, Math.ceil(max / 4) * 4);
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const band = plotWidth / data.length;
  const barWidth = Math.max(2, band * .56);
  const ticks = [0, 1, 2, 3, 4].map((step) => ({ y: inset.top + plotHeight - plotHeight * step / 4, value: axisMax * step / 4 }));
  const dateIndexes = [0, 7, 14, 21, 29];
  const hasOrders = data.some((day) => day.count > 0);
  return <section className="admin-chart-card admin-chart-volume" aria-labelledby="volume-chart-title">
    <div className="admin-chart-heading"><div><p className="admin-kicker">LAST 30 DAYS</p><h2 id="volume-chart-title">Orders per day</h2></div><span className="chart-legend"><i className="volume-legend-dot" /> Orders</span></div>
    <p className="admin-chart-subtitle">Daily orders placed in your store.</p>
    <div className="admin-chart-wrap"><svg className="admin-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily order count over the last 30 days.">
      {ticks.map((tick, index) => <g key={index}><line x1={inset.left} x2={width - inset.right} y1={tick.y} y2={tick.y} className="chart-gridline"/><text x={inset.left - 9} y={tick.y + 3} textAnchor="end" className="chart-axis-label">{Math.round(tick.value)}</text></g>)}
      {data.map((day, index) => { const barHeight = day.count / axisMax * plotHeight; const x = inset.left + index * band + (band - barWidth) / 2; const y = inset.top + plotHeight - barHeight; return <rect key={day.date} x={x} y={y} width={barWidth} height={Math.max(0, barHeight)} rx="2" className={day.count ? "chart-volume-bar has-value" : "chart-volume-bar"}><title>{day.label}: {day.count} {day.count === 1 ? "order" : "orders"}</title></rect>; })}
      {dateIndexes.map((index) => { const x = inset.left + index * band + band / 2; return <text key={index} x={x} y={height - 9} textAnchor={index === 0 ? "start" : index === 29 ? "end" : "middle"} className="chart-axis-label">{data[index].label}</text>; })}
    </svg></div>
    {!hasOrders && <p className="chart-empty-note">Your first order will show up here.</p>}
  </section>;
}
