const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const API_BASE = BASE;
export const tokenStore = {
  get: () => localStorage.getItem("clk_token"),
  set: (t) => localStorage.setItem("clk_token", t),
  clear: () => localStorage.removeItem("clk_token"),
};

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    const err = new Error("Can't reach the server. Check your connection.");
    err.network = true;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if ((res.status === 401 || res.status === 403) && token) tokenStore.clear();
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong"), { status: res.status });
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
};
