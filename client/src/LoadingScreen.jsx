// Animated logo shown while the app loads your data. Same look as the app's own startup screen.
export default function LoadingScreen({ message = "Loading your data from the cloud" }) {
  return (
    <main className="clk-boot" role="status" aria-live="polite">
      <div className="clk-load">
        <svg className="clk-logo" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <defs><linearGradient id="clkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: "var(--sky,#4FA8E8)" }}/><stop offset="1" style={{ stopColor: "var(--sky-dark,#2D7FC4)" }}/></linearGradient></defs>
          <rect width="100" height="100" rx="22" fill="url(#clkG)"/>
          <rect x="20" y="22" width="60" height="48" rx="9" fill="#fff"/>
          <rect x="24.5" y="26.5" width="51" height="39" rx="5.5" style={{ fill: "var(--hero-a,#0B2A4A)" }}/>
          <circle cx="50" cy="46" r="15.5" fill="none" stroke="#7CC4FF" strokeWidth="3.4"/>
          <g transform="rotate(-90 50 46)"><circle className="clk-arc" cx="50" cy="46" r="15.5" fill="none" stroke="#FFC93C" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="26 71.4"/></g>
          <g className="clk-hr"><path d="M50 46l7 4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></g>
          <g className="clk-min"><path d="M50 46V35.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></g>
          <circle cx="50" cy="46" r="2" fill="#fff"/>
          <rect x="44" y="70" width="12" height="6" fill="#fff"/>
          <rect x="34" y="76" width="32" height="4.5" rx="2" fill="#fff"/>
          <circle className="clk-led" cx="73" cy="67.8" r="1" fill="#FFC93C"/>
        </svg>
        <div className="clk-word">Clock me Out</div>
        <div className="clk-msg">
          {message}
          <span className="clk-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
    </main>
  );
}
