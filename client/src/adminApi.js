import { API_BASE } from "./api.js";

// The admin session lives in sessionStorage, so it ends when the tab closes (and after 8 hours at most).
export const adminToken = {
  get: () => sessionStorage.getItem("clk_admin"),
  set: (t) => sessionStorage.setItem("clk_admin", t),
  clear: () => sessionStorage.removeItem("clk_admin"),
};

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = adminToken.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API_BASE}/admin${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("Can't reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    adminToken.clear();
    window.dispatchEvent(new Event("admin-logout"));
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export const adminApi = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  patch: (p, body) => request(p, { method: "PATCH", body }),
  del: (p) => request(p, { method: "DELETE" }),
};
