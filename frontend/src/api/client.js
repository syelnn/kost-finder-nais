import axios from 'axios';

const TOKEN_KEY = 'kos_finder_token';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('kos-auth-expired'));
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(err, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (axios.isCancel(err) || err?.code === 'ERR_CANCELED') return null;
  return err?.response?.data?.message || err?.message || fallback;
}

export function getFieldErrors(err) {
  return err?.response?.data?.errors || {};
}

export async function downloadFile(url, fallbackFilename) {
  const res = await api.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match ? match[1] : fallbackFilename;
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

export { TOKEN_KEY };
export default api;
