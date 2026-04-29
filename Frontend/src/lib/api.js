const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function buildHeaders(token, headers = {}) {
  const resolvedHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  if (token) {
    resolvedHeaders.Authorization = `Bearer ${token}`;
  }

  return resolvedHeaders;
}

export async function apiRequest(path, options = {}) {
  const { token, body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: buildHeaders(token, headers),
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      data?.msg || data?.error || data?.message || "Something went wrong while talking to the server.";
    throw new Error(message);
  }

  return data;
}
