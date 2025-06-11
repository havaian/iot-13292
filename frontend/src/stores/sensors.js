import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiMethods } from '@services/api'

export const useSensorStore = defineStore('sensors', () => {
    // State
    const latestReadings = ref(null)
    const sensorStatus = ref(null)
    const historicalData = ref({})
    const isLoading = ref(false)
    const lastUpdate = ref(null)
    const error = ref(null)

    // Computed
    const activeSensors = computed(() => {
        return sensorStatus.value?.configuredSensors || 0
    })

    const isReading = computed(() => {
        return sensorStatus.value?.isReading || false
    })

    const sensorList = computed(() => {
        if (!sensorStatus.value?.sensors) return []

        return Object.entries(sensorStatus.value.sensors).map(([id, sensor]) => ({
            id,
            ...sensor,
            latestValue: latestReadings.value?.[getReadingKey(id)] || null
        }))
    })

    const environmentalStatus = computed(() => {
        if (!latestReadings.value) return 'offline'

        // Simple environmental status calculation
        const { temperature, humidity, airQuality, noiseLevel } = latestReadings.value

        let score = 100

        // Temperature scoring (optimal: 20-25°C)
        if (temperature < 15 || temperature > 30) score -= 30
        else if (temperature < 18 || temperature > 28) score -= 15
        else if (temperature < 20 || temperature > 25) score -= 5

        // Humidity scoring (optimal: 40-60%)
        if (humidity < 20 || humidity > 80) score -= 25
        else if (humidity < 30 || humidity > 70) score -= 10
        else if (humidity < 40 || humidity > 60) score -= 5

        // Air quality scoring
        if (airQuality > 200) score -= 40
        else if (airQuality > 150) score -= 30
        else if (airQuality > 100) score -= 20
        else if (airQuality > 50) score -= 10

        // Noise level scoring
        if (noiseLevel > 80) score -= 20
        else if (noiseLevel > 70) score -= 15
        else if (noiseLevel > 60) score -= 10
        else if (noiseLevel > 50) score -= 5

        if (score >= 90) return 'excellent'
        if (score >= 80) return 'good'
        if (score >= 60) return 'moderate'
        if (score >= 40) return 'poor'
        if (score >= 20) return 'unhealthy'
        return 'hazardous'
    })

    // Actions
    const fetchStatus = async () => {
        try {
            isLoading.value = true
            error.value = null

            const response = await apiMethods.getSensorStatus()
            sensorStatus.value = response.data
            lastUpdate.value = new Date()

        } catch (err) {
            console.error('Failed to fetch sensor status:', err)
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const fetchReadings = async (params = {}) => {
        try {
            isLoading.value = true
            error.value = null

            const response = await apiMethods.getSensorReadings(params)

            if (response.data) {
                latestReadings.value = response.data
                lastUpdate.value = new Date()
            }

        } catch (err) {
            console.error('Failed to fetch sensor readings:', err)
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const fetchHistory = async (sensor, params = {}) => {
        try {
            const response = await apiMethods.getSensorHistory(sensor, params)

            if (response.data) {
                historicalData.value[sensor] = response.data
            }

            return response.data
        } catch (err) {
            console.error(`Failed to fetch history for ${sensor}:`, err)
            throw err
        }
    }

    const testSensor = async (sensor) => {
        try {
            const response = await apiMethods.testSensor(sensor)
            return response.data
        } catch (err) {
            console.error(`Failed to test sensor ${sensor}:`, err)
            throw err
        }
    }

    const calibrateSensor = async (sensor, calibrationData) => {
        try {
            const response = await apiMethods.calibrateSensor(sensor, calibrationData)

            // Refresh status after calibration
            await fetchStatus()

            return response.data
        } catch (err) {
            console.error(`Failed to calibrate sensor ${sensor}:`, err)
            throw err
        }
    }

    const updateLatestReadings = (newReadings) => {
        latestReadings.value = newReadings
        lastUpdate.value = new Date()
        error.value = null
    }

    const clearError = () => {
        error.value = null
    }

    const reset = () => {
        latestReadings.value = null
        sensorStatus.value = null
        historicalData.value = {}
        isLoading.value = false
        lastUpdate.value = null
        error.value = null
    }

    // Utility functions
    const getReadingKey = (sensorId) => {
        const keyMapping = {
            dht22: ['temperature', 'humidity'],
            mq135: ['airQuality'],
            bh1750: ['lightLevel'],
            microphone: ['noiseLevel'],
            soilMoisture: ['soilMoisture']
        }

        return keyMapping[sensorId] || [sensorId]
    }

    const getSensorValue = (sensorId) => {
        if (!latestReadings.value) return null

        const keys = getReadingKey(sensorId)
        const values = {}

        keys.forEach(key => {
            if (latestReadings.value[key] !== undefined) {
                values[key] = latestReadings.value[key]
            }
        })

        return Object.keys(values).length > 0 ? values : null
    }

    const getSensorStatus = (sensorId) => {
        if (!sensorStatus.value?.sensors) return 'offline'

        const sensor = sensorStatus.value.sensors[sensorId]
        if (!sensor) return 'offline'

        if (!sensor.configured) return 'error'
        if (!sensor.lastReading) return 'offline'

        return 'online'
    }

    const getThresholdStatus = (sensorType, value, thresholds) => {
        if (!value || !thresholds) return 'unknown'

        const { min, max } = thresholds

        if (min !== undefined && value < min) return 'low'
        if (max !== undefined && value > max) return 'high'

        return 'normal'
    }

    const formatSensorValue = (value, unit, precision = 1) => {
        if (value === null || value === undefined) return '--'

        if (typeof value === 'number') {
            return `${value.toFixed(precision)}${unit ? ` ${unit}` : ''}`
        }

        return `${value}${unit ? ` ${unit}` : ''}`
    }

    const calculateTrend = (current, previous, threshold = 0.05) => {
        if (!current || !previous) return 'stable'

        const diff = current - previous
        const changePercent = Math.abs(diff) / current

        if (changePercent < threshold) return 'stable'
        return diff > 0 ? 'increasing' : 'decreasing'
    }

    const getDataForChart = (sensor, timeRange = '24h') => {
        const data = historicalData.value[sensor]
        if (!data) return []

        // Filter data based on time range
        const now = new Date()
        const ranges = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        }

        const rangeMs = ranges[timeRange] || ranges['24h']
        const cutoff = new Date(now - rangeMs)

        return data
            .filter(item => new Date(item.timestamp) >= cutoff)
            .map(item => ({
                timestamp: item.timestamp,
                value: item.value,
                formatted: new Date(item.timestamp).toLocaleTimeString()
            }))
    }

    const exportSensorData = async (sensors = [], format = 'csv', timeRange = '24h') => {
        try {
            const params = {
                sensors: sensors.join(','),
                format,
                timeRange
            }

            const response = await apiMethods.exportData(params)

            // Create download
            const blob = new Blob([response.data], {
                type: format === 'csv' ? 'text/csv' : 'application/json'
            })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `sensor-data-${timeRange}-${new Date().toISOString().split('T')[0]}.${format}`
            link.click()
            window.URL.revokeObjectURL(url)

            return true
        } catch (err) {
            console.error('Failed to export sensor data:', err)
            throw err
        }
    }

    // Return store
    return {
        // State
        latestReadings,
        sensorStatus,
        historicalData,
        isLoading,
        lastUpdate,
        error,

        // Computed
        activeSensors,
        isReading,
        sensorList,
        environmentalStatus,

        // Actions
        fetchStatus,
        fetchReadings,
        fetchHistory,
        testSensor,
        calibrateSensor,
        updateLatestReadings,
        clearError,
        reset,

        // Utilities
        getSensorValue,
        getSensorStatus,
        getThresholdStatus,
        formatSensorValue,
        calculateTrend,
        getDataForChart,
        exportSensorData
    }
})