import axios from 'axios'

// Create axios instance with default config
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        // Add request timestamp
        config.headers['X-Request-Time'] = new Date().toISOString()

        // Log request in development
        if (import.meta.env.DEV) {
            console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
        }

        return config
    },
    (error) => {
        console.error('❌ Request Error:', error)
        return Promise.reject(error)
    }
)

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Log response in development
        if (import.meta.env.DEV) {
            console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
        }

        return response
    },
    (error) => {
        console.error('❌ Response Error:', error)

        // Handle specific error cases
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response

            switch (status) {
                case 401:
                    // Unauthorized - clear auth and redirect to login
                    localStorage.removeItem('auth_token')
                    // You could emit an event here to handle login redirect
                    break

                case 403:
                    // Forbidden
                    console.error('Access forbidden')
                    break

                case 404:
                    // Not found
                    console.error('Resource not found')
                    break

                case 429:
                    // Rate limited
                    console.error('Rate limit exceeded')
                    break

                case 500:
                    // Server error
                    console.error('Internal server error')
                    break

                default:
                    console.error(`HTTP Error ${status}:`, data?.message || error.message)
            }

            // Return structured error
            return Promise.reject({
                status,
                message: data?.error?.message || data?.message || error.message,
                code: data?.error?.code || 'HTTP_ERROR',
                originalError: error
            })

        } else if (error.request) {
            // Network error
            console.error('Network error - no response received')
            return Promise.reject({
                status: 0,
                message: 'Network error - please check your connection',
                code: 'NETWORK_ERROR',
                originalError: error
            })

        } else {
            // Something else happened
            console.error('Request setup error:', error.message)
            return Promise.reject({
                status: 0,
                message: error.message,
                code: 'REQUEST_ERROR',
                originalError: error
            })
        }
    }
)

// API methods
export const apiMethods = {
    // System endpoints
    getHealth: () => api.get('/health'),
    getStatus: () => api.get('/status'),
    getConfig: () => api.get('/config'),

    // Sensor endpoints
    getSensors: () => api.get('/sensors'),
    getSensorStatus: () => api.get('/sensors/status'),
    getSensorReadings: (params) => api.get('/sensors/readings', { params }),
    getSensorHistory: (sensor, params) => api.get(`/sensors/${sensor}/history`, { params }),
    testSensor: (sensor) => api.post(`/sensors/${sensor}/test`),
    calibrateSensor: (sensor, data) => api.post(`/sensors/${sensor}/calibrate`, data),

    // Device endpoints
    getDevices: () => api.get('/devices'),
    getDeviceStates: () => api.get('/devices/states'),
    controlDevice: (device, action, params) => api.post(`/devices/${device}/control`, { action, params }),
    testDevice: (device) => api.post(`/devices/${device}/test`),

    // Data endpoints
    getData: (params) => api.get('/data', { params }),
    getDataHistory: (params) => api.get('/data/history', { params }),
    getDataStatistics: () => api.get('/data/statistics'),
    exportData: (params) => api.get('/data/export', { params, responseType: 'blob' }),

    // Alert endpoints
    getAlerts: () => api.get('/alerts'),
    createAlert: (data) => api.post('/alerts', data),
    updateAlert: (id, data) => api.put(`/alerts/${id}`, data),
    deleteAlert: (id) => api.delete(`/alerts/${id}`),

    // Settings endpoints
    getSettings: () => api.get('/settings'),
    updateSettings: (data) => api.put('/settings', data),

    // Development endpoints (only available in dev mode)
    ...(import.meta.env.DEV && {
        testAllSensors: () => api.get('/test/sensors'),
        testAllDevices: () => api.get('/test/actuators'),
        triggerEmergency: () => api.post('/test/emergency')
    })
}

// Utility functions
export const apiUtils = {
    // Check if API is available
    async checkConnection() {
        try {
            await api.get('/health')
            return true
        } catch (error) {
            return false
        }
    },

    // Upload file helper
    async uploadFile(endpoint, file, onProgress) {
        const formData = new FormData()
        formData.append('file', file)

        return api.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    onProgress(percent)
                }
            }
        })
    },

    // Download file helper
    async downloadFile(endpoint, filename, params = {}) {
        try {
            const response = await api.get(endpoint, {
                params,
                responseType: 'blob'
            })

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            return true
        } catch (error) {
            console.error('Download failed:', error)
            return false
        }
    },

    // Retry helper for failed requests
    async retry(apiCall, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await apiCall()
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error
                }

                console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`)
                await new Promise(resolve => setTimeout(resolve, delay))
                delay *= 2 // Exponential backoff
            }
        }
    },

    // Batch requests helper
    async batch(requests) {
        try {
            const responses = await Promise.allSettled(requests)

            return responses.map((response, index) => ({
                index,
                success: response.status === 'fulfilled',
                data: response.status === 'fulfilled' ? response.value : null,
                error: response.status === 'rejected' ? response.reason : null
            }))
        } catch (error) {
            console.error('Batch request failed:', error)
            throw error
        }
    }
}

// Export default api instance
export default api