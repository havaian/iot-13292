import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'
import './style.css'

// Import routes
import routes from './router/index.js'

// Import global components
import LoadingSpinner from '@components/UI/LoadingSpinner.vue'
import StatusBadge from '@components/UI/StatusBadge.vue'
import SensorCard from '@components/Sensors/SensorCard.vue'
import DeviceControl from '@components/Devices/DeviceControl.vue'

// Create router
const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    }
})

// Create Pinia store
const pinia = createPinia()

// Create Vue app
const app = createApp(App)

// Use plugins
app.use(pinia)
app.use(router)

// Register global components
app.component('LoadingSpinner', LoadingSpinner)
app.component('StatusBadge', StatusBadge)
app.component('SensorCard', SensorCard)
app.component('DeviceControl', DeviceControl)

// Global properties
app.config.globalProperties.$filters = {
    // Number formatting
    decimal: (value, decimals = 2) => {
        if (!value && value !== 0) return '--'
        return Number(value).toFixed(decimals)
    },

    // Date formatting
    date: (value) => {
        if (!value) return '--'
        return new Date(value).toLocaleDateString()
    },

    // Time formatting
    time: (value) => {
        if (!value) return '--'
        return new Date(value).toLocaleTimeString()
    },

    // DateTime formatting
    datetime: (value) => {
        if (!value) return '--'
        return new Date(value).toLocaleString()
    },

    // Relative time (e.g., "2 minutes ago")
    relativeTime: (value) => {
        if (!value) return '--'
        const now = new Date()
        const date = new Date(value)
        const diff = now - date

        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
        return 'Just now'
    },

    // File size formatting
    fileSize: (bytes) => {
        if (!bytes) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    },

    // Percentage formatting
    percent: (value, decimals = 1) => {
        if (!value && value !== 0) return '--'
        return Number(value).toFixed(decimals) + '%'
    },

    // Temperature formatting
    temperature: (value, unit = 'C') => {
        if (!value && value !== 0) return '--'
        return `${Number(value).toFixed(1)}°${unit}`
    },

    // Air quality index description
    aqiDescription: (value) => {
        if (!value && value !== 0) return 'Unknown'
        if (value <= 50) return 'Good'
        if (value <= 100) return 'Moderate'
        if (value <= 150) return 'Unhealthy for Sensitive Groups'
        if (value <= 200) return 'Unhealthy'
        if (value <= 300) return 'Very Unhealthy'
        return 'Hazardous'
    },

    // Status color class
    statusColor: (status) => {
        const colors = {
            excellent: 'text-green-600',
            good: 'text-green-500',
            moderate: 'text-yellow-500',
            poor: 'text-orange-500',
            unhealthy: 'text-red-500',
            hazardous: 'text-purple-500',
            offline: 'text-gray-400',
            error: 'text-red-600'
        }
        return colors[status] || 'text-gray-500'
    }
}

// Error handling
app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err)
    console.error('Component:', instance)
    console.error('Error info:', info)

    // You could integrate with error reporting service here
    // e.g., Sentry, LogRocket, etc.
}

// Performance monitoring (development only)
if (import.meta.env.DEV) {
    app.config.performance = true
}

// Mount the app
app.mount('#app')

// Service worker registration (for PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration)
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError)
            })
    })
}

// Development utilities
if (import.meta.env.DEV) {
    // Make stores available globally for debugging
    window.__VUE_APP__ = app

    // Add development helper functions
    window.dev = {
        router,
        pinia,

        // Quick store access
        get stores() {
            return pinia._s
        },

        // Quick component inspection
        inspect: (component) => {
            console.log('Component:', component)
            console.log('Props:', component.$props)
            console.log('Data:', component.$data)
            console.log('Computed:', component.$computed)
        },

        // Performance measurement
        measure: (name, fn) => {
            const start = performance.now()
            const result = fn()
            const end = performance.now()
            console.log(`${name} took ${end - start} milliseconds`)
            return result
        }
    }

    console.log('🚀 Smart Environmental Monitor - Development Mode')
    console.log('Available dev utilities: window.dev')
}

export default app