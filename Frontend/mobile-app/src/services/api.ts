// Physical device IP — update if your PC's WiFi IP changes
// Found via ipconfig → Wi-Fi 2 → IPv4 Address
const BASE_URL = 'http://192.168.120.219:3000/api';

const handleResponse = async (res: Response) => {
  const json = await res.json();
  if (!res.ok) {
    // Throw the backend error message so screens can show it
    throw { response: { data: json } };
  }
  return json;
};

export const api = {
  get: async (url: string) => {
    const res = await fetch(BASE_URL + url, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  post: async (url: string, body?: any) => {
    const res = await fetch(BASE_URL + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  patch: async (url: string, body?: any) => {
    const res = await fetch(BASE_URL + url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  delete: async (url: string) => {
    const res = await fetch(BASE_URL + url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },
};