export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = 'Permintaan gagal. Coba lagi.'
    try {
      const data = await response.json()
      if (typeof data?.detail === 'string') {
        message = data.detail
      } else if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
        message = data.detail[0].msg
      }
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getWithToken: <T>(path: string, token: string) =>
    request<T>(path, {
      headers: { 'X-Receptionist-Token': token },
    }),
  postWithToken: <T>(path: string, token: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'X-Receptionist-Token': token },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<T>(path, { method: 'POST', body })
  },
}
