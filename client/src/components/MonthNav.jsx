import { monthLabel, shiftMonth } from "../lib/time.js";

export default function MonthNav({ month, setMonth }) {
  return (
    <div className="monthnav">
      <button className="icon" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
      <strong>{monthLabel(month)}</strong>
      <button className="icon" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
    </div>
  );
}
