import { Platform } from 'react-native';

// Android emulator → 10.0.2.2, iOS simulator → localhost
const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://localhost:3000/api';

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