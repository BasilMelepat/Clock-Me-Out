const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const tokenStore = {
  get: () => localStorage.getItem("cmo_token"),
  set: (t) => localStorage.setItem("cmo_token", t),
  clear: () => localStorage.removeItem("cmo_token"),
};

async function request(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new Error("Can't reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    tokenStore.clear();
    window.dispatchEvent(new Event("cmo-logout"));
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
  patch: (p, body) => request(p, { method: "PATCH", body }),
  del: (p) => request(p, { method: "DELETE" }),
  upload: (p, form) => request(p, { method: "POST", form }),
};
