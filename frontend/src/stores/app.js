import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@services/api'

export const useAppStore = defineStore('app', () => {
  // State
  const isLoading = ref(true)
  const error = ref(null)
  const config = ref(null)
  const theme = ref('light')
  const notifications = ref([])
  const systemStatus = ref(null)
  const lastUpdated = ref(null)

  // Computed
  const isDark = computed(() => theme.value === 'dark')
  const hasError = computed(() => error.value !== null)
  const isOnline = computed(() => navigator.onLine)
  
  const appInfo = computed(() => ({
    name: config.value?.app?.name || 'Smart Environmental Monitor',
    version: config.value?.app?.version || '1.0.0',
    environment: import.meta.env.MODE
  }))

  // Actions
  const initialize = async () => {
    try {
      setLoading(true)
      
      // Load application configuration
      await loadConfig()
      
      // Load system status
      await loadSystemStatus()
      
      // Initialize theme from localStorage
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        setTheme(savedTheme)
      } else {
        // Auto-detect theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(prefersDark ? 'dark' : 'light')
      }
      
      // Listen for online/offline events
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
    } catch (err) {
      console.error('App initialization failed:', err)
      setError('Failed to initialize application')
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const response = await api.get('/config')
      config.value = response.data
    } catch (err) {
      console.error('Failed to load config:', err)
      throw err
    }
  }

  const loadSystemStatus = async () => {
    try {
      const response = await api.get('/status')
      systemStatus.value = response.data
      lastUpdated.value = new Date()
    } catch (err) {
      console.error('Failed to load system status:', err)
      // Don't throw here, as this is not critical for app initialization
    }
  }

  const setLoading = (loading) => {
    isLoading.value = loading
  }

  const setError = (errorMessage) => {
    error.value = errorMessage
    if (errorMessage) {
      addNotification({
        type: 'error',
        title: 'Application Error',
        message: errorMessage,
        persistent: true
      })
    }
  }

  const clearError = () => {
    error.value = null
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    
    // Update document class
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  const addNotification = (notification) => {
    const id = Date.now().toString()
    const newNotification = {
      id,
      timestamp: new Date(),
      ...notification
    }
    
    notifications.value.push(newNotification)
    
    // Auto-remove non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }
    
    return id
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = addNotification({
      type,
      message,
      duration,
      toast: true
    })
    
    setTimeout(() => {
      removeNotification(id)
    }, duration)
    
    return id
  }

  const handleOnline = () => {
    showToast('Connection restored', 'success')
    // Refresh data when coming back online
    loadSystemStatus()
  }

  const handleOffline = () => {
    showToast('Connection lost - working offline', 'warning', 5000)
  }

  const refreshSystemStatus = async () => {
    try {
      await loadSystemStatus()
    } catch (err) {
      console.error('Failed to refresh system status:', err)
    }
  }

  const updateSystemStatus = (newStatus) => {
    systemStatus.value = { ...systemStatus.value, ...newStatus }
    lastUpdated.value = new Date()
  }

  // Utility functions
  const formatUptime = (uptimeSeconds) => {
    if (!uptimeSeconds) return 'Unknown'
    
    const days = Math.floor(uptimeSeconds / 86400)
    const hours = Math.floor((uptimeSeconds % 86400) / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const getEnvironmentalStatus = (readings) => {
    if (!readings) return 'unknown'
    
    const { temperature, humidity, airQuality, noiseLevel } = readings
    
    // Simple scoring system (0-100)
    let score = 100
    
    // Temperature scoring (optimal: 20-25°C)
    if (temperature < 15 || temperature > 30) score -= 30
    else if (temperature < 18 || temperature > 28) score -= 15
    else if (temperature < 20 || temperature > 25) score -= 5
    
    // Humidity scoring (optimal: 40-60%)
    if (humidity < 20 || humidity > 80) score -= 25
    else if (humidity < 30 || humidity > 70) score -= 10
    else if (humidity < 40 || humidity > 60) score -= 5
    
    // Air quality scoring (AQI scale)
    if (airQuality > 200) score -= 40
    else if (airQuality > 150) score -= 30
    else if (airQuality > 100) score -= 20
    else if (airQuality > 50) score -= 10
    
    // Noise level scoring (optimal: <50dB)
    if (noiseLevel > 80) score -= 20
    else if (noiseLevel > 70) score -= 15
    else if (noiseLevel > 60) score -= 10
    else if (noiseLevel > 50) score -= 5
    
    // Return status based on score
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 60) return 'moderate'
    if (score >= 40) return 'poor'
    if (score >= 20) return 'unhealthy'
    return 'hazardous'
  }

  const getStatusColor = (status) => {
    const colors = {
      excellent: 'green',
      good: 'emerald',
      moderate: 'yellow',
      poor: 'orange',
      unhealthy: 'red',
      hazardous: 'purple',
      unknown: 'gray',
      offline: 'gray',
      error: 'red'
    }
    return colors[status] || 'gray'
  }

  const exportData = async (format = 'csv', dateRange = null) => {
    try {
      const params = {
        format,
        ...(dateRange && {
          startDate: dateRange.start,
          endDate: dateRange.end
        })
      }
      
      const response = await api.get('/data/export', { params })
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `environmental-data-${new Date().toISOString().split('T')[0]}.${format}`
      link.click()
      window.URL.revokeObjectURL(url)
      
      showToast('Data exported successfully', 'success')
    } catch (err) {
      console.error('Failed to export data:', err)
      showToast('Failed to export data', 'error')
    }
  }

  // Return store
  return {
    // State
    isLoading,
    error,
    config,
    theme,
    notifications,
    systemStatus,
    lastUpdated,
    
    // Computed
    isDark,
    hasError,
    isOnline,
    appInfo,
    
    // Actions
    initialize,
    loadConfig,
    loadSystemStatus,
    setLoading,
    setError,
    clearError,
    setTheme,
    toggleTheme,
    addNotification,
    removeNotification,
    clearNotifications,
    showToast,
    handleOnline,
    handleOffline,
    refreshSystemStatus,
    updateSystemStatus,
    
    // Utilities
    formatUptime,
    getEnvironmentalStatus,
    getStatusColor,
    exportData
  }
})