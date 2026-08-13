// Next N calendar days as {iso: "YYYY-MM-DD", label: "Thu, Aug 14"} — used
// for the booking date picker instead of a full calendar widget/native date
// picker dependency, since patients are only ever picking a near-term date.
export function nextDays(count = 14, fromDate = new Date()) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    days.push({ iso, label, isToday: i === 0 });
  }
  return days;
}
