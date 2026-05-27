const BASE = '/api/v1'

// Универсальный fetch-обёртка
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Ошибка сервера' }))
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// Авторизация
export const authApi = {
  login: (login: string, password: string) =>
    request<{ success: boolean; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<{ success: boolean; user: any }>('/auth/me'),
}

// Средства измерения
export const instrumentApi = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any>('/instruments' + qs)
  },
  getById: (id: number) => request<any>(`/instruments/${id}`),
  create: (data: any) => request<any>('/instruments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/instruments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addVerification: (id: number, data: any) =>
    request<any>(`/instruments/${id}/verification`, { method: 'POST', body: JSON.stringify(data) }),
  getVerifications: (id: number) => request<any>(`/instruments/${id}/verification`),
  addRepair: (id: number, data: any) =>
    request<any>(`/instruments/${id}/repair`, { method: 'POST', body: JSON.stringify(data) }),
  getRepairs: (id: number) => request<any>(`/instruments/${id}/repairs`),
}

// Импорт
export const importApi = {
  upload: (file: File, mapping?: any, headerRow?: number) => {
    const fd = new FormData()
    fd.append('file', file)
    if (mapping) fd.append('mapping', JSON.stringify(mapping))
    if (headerRow !== undefined) fd.append('headerRow', String(headerRow))
    return fetch(BASE + '/import/upload', { method: 'POST', body: fd, credentials: 'include' }).then(r => r.json())
  },
  updateMapping: (id: string, mapping: Record<string, string>, headerRow?: number) =>
    request<any>(`/import/${id}/mapping`, { method: 'POST', body: JSON.stringify({ mapping, headerRow }) }),
  preview: (id: string) => request<any>(`/import/${id}/preview`),
  commit: (id: string, resolutions?: any) =>
    request<any>(`/import/${id}/commit`, { method: 'POST', body: JSON.stringify({ resolutions }) }),
}

// Бэкапы
export const backupApi = {
  create: (type?: string) => request<any>('/backups/create', { method: 'POST', body: JSON.stringify({ type }) }),
  getAll: () => request<any>('/backups'),
  download: (id: string) => `${BASE}/backups/${id}`,
  restore: (filename: string) => request<any>('/backups/restore', { method: 'POST', body: JSON.stringify({ filename }) }),
}

// Уведомления
export const notificationApi = {
  getAll: () => request<any>('/notifications'),
  markRead: (id: number) => request<any>(`/notifications/${id}/read`, { method: 'POST' }),
}

// Пользователи
export const userApi = {
  getAll: () => request<any>('/users'),
  create: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => request<any>(`/users/${id}`, { method: 'DELETE' }),
}

// Справочники
export const referenceApi = {
  getTypes: () => request<any>('/references/types'),
  createType: (data: any) => request<any>('/references/types', { method: 'POST', body: JSON.stringify(data) }),
  createSubtype: (data: any) => request<any>('/references/subtypes', { method: 'POST', body: JSON.stringify(data) }),
  getOrganizations: () => request<any>('/references/organizations'),
  createOrganization: (data: any) => request<any>('/references/organizations', { method: 'POST', body: JSON.stringify(data) }),
  deleteType: (id: number) => request<any>(`/references/types/${id}`, { method: 'DELETE' }),
  deleteOrganization: (id: number) => request<any>(`/references/organizations/${id}`, { method: 'DELETE' }),
}

// Процедуры списания
export const writeoffApi = {
  create: (data: any) => request<any>('/writeoff-procedures', { method: 'POST', body: JSON.stringify(data) }),
  getAll: () => request<any>('/writeoff-procedures'),
  getById: (id: number) => request<any>(`/writeoff-procedures/${id}`),
  getByInstrumentId: (instrumentId: number) => request<any>(`/writeoff-procedures/instrument/${instrumentId}`),
  sendToApproval: (id: number) => request<any>(`/writeoff-procedures/${id}/send-to-approval`, { method: 'POST' }),
  uploadScan: (id: number, file: File, procedureNumber?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (procedureNumber) {
      fd.append('filename', `Акт списания ${procedureNumber}.pdf`)
    }
    return fetch(BASE + `/documents`, { method: 'POST', body: fd, credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Ошибка загрузки документа')
        return r.json()
      })
      .then(doc => {
        const documentId = doc.data?.id ?? doc.id
        if (!documentId) throw new Error('Документ не создан')
        return request<any>(`/writeoff-procedures/${id}/upload-scan`, { method: 'POST', body: JSON.stringify({ documentId }) })
      })
  },
  cancel: (id: number) => request<any>(`/writeoff-procedures/${id}/cancel`, { method: 'POST' }),
  remove: (id: number) => request<any>(`/writeoff-procedures/${id}`, { method: 'DELETE' }),
}

// Шаблоны актов
export const templateApi = {
  getAll: () => request<any>('/templates'),
  download: (filename: string) => `${BASE}/templates/${encodeURIComponent(filename)}`,
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(BASE + '/templates', { method: 'POST', body: fd, credentials: 'include' }).then(r => r.json())
  },
  update: (filename: string, content: string) =>
    request<any>(`/templates/${encodeURIComponent(filename)}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  remove: (filename: string) =>
    request<any>(`/templates/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  getContent: (filename: string) =>
    fetch(`${BASE}/templates/${encodeURIComponent(filename)}/content`, { credentials: 'include' }).then(r => r.text()),
}

// Генерация акта
export const generateActUrl = (procedureId: number) => `${BASE}/writeoff-procedures/${procedureId}/generate-act`

// Документы (привязанные к СИ)
export const documentApi = {
  upload: (instrumentId: number, file: File, docType: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('instrumentId', String(instrumentId))
    fd.append('type', docType)
    return fetch(BASE + '/documents', { method: 'POST', body: fd, credentials: 'include' }).then(r => r.json())
  },
  downloadUrl: (id: number) => `${BASE}/documents/${id}`,
  remove: (id: number) => request<any>(`/documents/${id}`, { method: 'DELETE' }),
}

// Настройки
export const settingsApi = {
  getWriteoffTemplate: () => request<any>('/settings/writeoff-template'),
  setWriteoffTemplate: (template: string) =>
    request<any>('/settings/writeoff-template', { method: 'PUT', body: JSON.stringify({ template }) }),
}

// AuditLog
export const auditApi = {
  getByEntity: (entity: string, entityId: number) => request<any>(`/audit/${entity}/${entityId}`),
}
