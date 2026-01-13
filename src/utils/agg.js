export function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function dateRange(start, end) {
  const out = [];
  let d = new Date(start);
  const e = new Date(end);
  while (d <= e) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// deterministic synthetic daily gas for charting
export function syntheticGasDaily(meterId, dateStr) {
  const str = `${meterId}__${dateStr}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;

  const base = (h % 90) + 10; // 10..99
  const day = Number(dateStr.slice(-2));
  const seasonal = (day % 7) * 2;
  return base + seasonal;
}

export function syntheticGasHourlyFromDaily(dailyVal) {
  const profile = [
    0.6, 0.5, 0.4, 0.4, 0.5, 0.7, 1.0, 1.2, 1.1, 1.0, 0.9, 1.0, 1.1, 1.2, 1.1,
    1.0, 1.1, 1.3, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7,
  ];
  const sum = profile.reduce((a, b) => a + b, 0);
  return profile.map((w) => (dailyVal * w) / sum);
}

export function startOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function endOfWeek(dateStr) {
  const d = new Date(startOfWeek(dateStr));
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function weeksOfMonth(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const weeks = [];
  let cur = startOfWeek(first.toISOString().slice(0, 10));

  while (new Date(cur) <= last) {
    const start = cur;
    const end = endOfWeek(cur);
    weeks.push({ start, end });
    const next = new Date(cur);
    next.setDate(next.getDate() + 7);
    cur = next.toISOString().slice(0, 10);
  }
  return weeks;
}
