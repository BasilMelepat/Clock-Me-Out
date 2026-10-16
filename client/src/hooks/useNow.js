import { useEffect, useState } from "react";
import { nowSec } from "../lib/time.js";

// Seconds since local midnight, refreshed every second.
export default function useNow() {
  const [now, setNow] = useState(nowSec());
  useEffect(() => {
    const id = setInterval(() => setNow(nowSec()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
