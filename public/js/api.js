import { csrf } from './fx.js';

async function request(method, url, body) {
  const opts = {
    method,
    headers: { 'accept': 'application/json' },
    credentials: 'same-origin'
  };
  if (body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.headers['x-csrf-token'] = csrf();
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
  return data;
}

export const api = {
  get:    (url)        => request('GET', url),
  post:   (url, body)  => request('POST', url, body ?? {}),
  patch:  (url, body)  => request('PATCH', url, body ?? {}),
  del:    (url)        => request('DELETE', url, {})
};
