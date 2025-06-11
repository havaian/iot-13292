<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        <!-- Header Section -->
        <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div class="container mx-auto px-4 py-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                            Environmental Monitor
                        </h1>
                        <p class="text-gray-600 dark:text-gray-400 mt-1">
                            Real-time monitoring of environmental conditions
                        </p>
                    </div>

                    <!-- Connection Status -->
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <div :class="[
                                'w-3 h-3 rounded-full',
                                socketStore.isConnected ? 'bg-green-500 shadow-glow' : 'bg-red-500'
                            ]"></div>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {{ socketStore.isConnected ? 'Connected' : 'Disconnected' }}
                            </span>
                        </div>

                        <div v-if="socketStore.connectedClients > 0" class="text-sm text-gray-500 dark:text-gray-400">
                            {{ socketStore.connectedClients }} client{{ socketStore.connectedClients !== 1 ? 's' : '' }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="container mx-auto px-4 py-8">
            <!-- System Status Overview -->
            <div class="mb-8">
                <div
                    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                            System Status
                        </h2>
                        <StatusBadge :status="overallStatus" :label="overallStatusLabel" />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-900 dark:text-white">
                                {{ appStore.formatUptime(systemUptime) }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">Uptime</div>
                        </div>

                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-900 dark:text-white">
                                {{ activeSensors }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">Active Sensors</div>
                        </div>

                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-900 dark:text-white">
                                {{ activeDevices }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">Active Devices</div>
                        </div>

                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-900 dark:text-white">
                                {{ lastUpdateTime }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">Last Update</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sensor Readings Grid -->
            <div class="mb-8">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Sensor Readings
                </h2>

                <div v-if="sensorStore.isLoading" class="grid grid-responsive gap-6">
                    <div v-for="i in 6" :key="i" class="card">
                        <div class="card-body">
                            <div class="skeleton h-4 w-24 mb-2"></div>
                            <div class="skeleton h-8 w-16 mb-2"></div>
                            <div class="skeleton h-3 w-32"></div>
                        </div>
                    </div>
                </div>

                <div v-else class="grid grid-responsive gap-6">
                    <!-- Temperature Sensor -->
                    <SensorCard title="Temperature" :value="latestReadings?.temperature" unit="°C" icon="🌡️"
                        :status="getTemperatureStatus(latestReadings?.temperature)" :trend="getTrend('temperature')" />

                    <!-- Humidity Sensor -->
                    <SensorCard title="Humidity" :value="latestReadings?.humidity" unit="%" icon="💧"
                        :status="getHumidityStatus(latestReadings?.humidity)" :trend="getTrend('humidity')" />

                    <!-- Air Quality Sensor -->
                    <SensorCard title="Air Quality" :value="latestReadings?.airQuality" unit="AQI" icon="🌬️"
                        :status="getAirQualityStatus(latestReadings?.airQuality)" :trend="getTrend('airQuality')"
                        :description="$filters.aqiDescription(latestReadings?.airQuality)" />

                    <!-- Light Level Sensor -->
                    <SensorCard title="Light Level" :value="latestReadings?.lightLevel" unit="lux" icon="☀️"
                        :status="getLightStatus(latestReadings?.lightLevel)" :trend="getTrend('lightLevel')" />

                    <!-- Noise Level Sensor -->
                    <SensorCard title="Noise Level" :value="latestReadings?.noiseLevel" unit="dB" icon="🔊"
                        :status="getNoiseStatus(latestReadings?.noiseLevel)" :trend="getTrend('noiseLevel')" />

                    <!-- Soil Moisture Sensor -->
                    <SensorCard title="Soil Moisture" :value="latestReadings?.soilMoisture" unit="%" icon="🌱"
                        :status="getSoilMoistureStatus(latestReadings?.soilMoisture)"
                        :trend="getTrend('soilMoisture')" />
                </div>
            </div>

            <!-- Device Controls -->
            <div class="mb-8">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Device Controls
                </h2>

                <div class="grid grid-responsive-sm gap-4">
                    <!-- Fan Control -->
                    <DeviceControl device="fan" title="Cooling Fan" icon="🌀" type="speed" :max="100"
                        :current="deviceStore.states.fan?.speed || 0"
                        :active="deviceStore.states.fan?.isActive || false" @control="handleDeviceControl" />

                    <!-- LED Strip Control -->
                    <DeviceControl device="ledStrip" title="Status LEDs" icon="💡" type="color"
                        :current="deviceStore.states.ledStrip?.currentColor || { r: 0, g: 0, b: 0 }"
                        :active="deviceStore.states.ledStrip?.isActive || false" @control="handleDeviceControl" />

                    <!-- Buzzer Control -->
                    <DeviceControl device="buzzer" title="Alert Buzzer" icon="🔔" type="trigger"
                        :active="deviceStore.states.buzzer?.isActive || false" @control="handleDeviceControl" />

                    <!-- Water Pump Control -->
                    <DeviceControl device="waterPump" title="Water Pump" icon="💦" type="timer" :max="30"
                        :active="deviceStore.states.waterPump?.isActive || false" @control="handleDeviceControl" />

                    <!-- Ventilator Control -->
                    <DeviceControl device="ventilator" title="Ventilator" icon="🌪️" type="speed" :max="100"
                        :current="deviceStore.states.ventilator?.currentSpeed || 0"
                        :active="deviceStore.states.ventilator?.isActive || false" @control="handleDeviceControl" />
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="mb-8">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Quick Actions
                </h2>

                <div
                    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Environmental Preset Actions -->
                        <button @click="setEnvironmentalPreset('excellent')" class="btn btn-success"
                            :disabled="!socketStore.isConnected">
                            Set Optimal Environment
                        </button>

                        <button @click="handleEmergencyAlert" class="btn btn-danger"
                            :disabled="!socketStore.isConnected">
                            Test Emergency Alert
                        </button>

                        <button @click="refreshAllData" class="btn btn-secondary" :disabled="isRefreshing">
                            <LoadingSpinner v-if="isRefreshing" class="w-4 h-4 mr-2" />
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Activity
                </h2>

                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div class="p-6">
                        <div v-if="recentActivity.length === 0"
                            class="text-center text-gray-500 dark:text-gray-400 py-8">
                            No recent activity
                        </div>

                        <div v-else class="space-y-4">
                            <div v-for="activity in recentActivity" :key="activity.id"
                                class="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                                <div :class="[
                                    'w-2 h-2 rounded-full',
                                    activity.type === 'sensor' ? 'bg-blue-500' :
                                        activity.type === 'device' ? 'bg-green-500' :
                                            activity.type === 'alert' ? 'bg-red-500' : 'bg-gray-500'
                                ]"></div>

                                <div class="flex-1">
                                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                                        {{ activity.message }}
                                    </div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400">
                                        {{ $filters.relativeTime(activity.timestamp) }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@stores/app'
import { useSocketStore } from '@stores/socket'
import { useSensorStore } from '@stores/sensors'
import { useDeviceStore } from '@stores/devices'

// Stores
const appStore = useAppStore()
const socketStore = useSocketStore()
const sensorStore = useSensorStore()
const deviceStore = useDeviceStore()

// Reactive data
const isRefreshing = ref(false)
const recentActivity = ref([])
const previousReadings = ref({})

// Computed properties
const latestReadings = computed(() => sensorStore.latestReadings)

const systemUptime = computed(() => {
    return appStore.systemStatus?.system?.uptime || 0
})

const activeSensors = computed(() => {
    return sensorStore.sensorStatus?.configuredSensors || 0
})

const activeDevices = computed(() => {
    return Object.values(deviceStore.states).filter(state => state?.isActive).length
})

const lastUpdateTime = computed(() => {
    if (!latestReadings.value?.timestamp) return '--'
    return new Date(latestReadings.value.timestamp).toLocaleTimeString()
})

const overallStatus = computed(() => {
    if (!latestReadings.value) return 'offline'
    return appStore.getEnvironmentalStatus(latestReadings.value)
})

const overallStatusLabel = computed(() => {
    const statusLabels = {
        excellent: 'Excellent',
        good: 'Good',
        moderate: 'Moderate',
        poor: 'Poor',
        unhealthy: 'Unhealthy',
        hazardous: 'Hazardous',
        offline: 'Offline'
    }
    return statusLabels[overallStatus.value] || 'Unknown'
})

// Methods
const getTemperatureStatus = (temp) => {
    if (!temp) return 'offline'
    if (temp < 15 || temp > 30) return 'poor'
    if (temp < 18 || temp > 28) return 'moderate'
    if (temp >= 20 && temp <= 25) return 'excellent'
    return 'good'
}

const getHumidityStatus = (humidity) => {
    if (!humidity) return 'offline'
    if (humidity < 20 || humidity > 80) return 'poor'
    if (humidity < 30 || humidity > 70) return 'moderate'
    if (humidity >= 40 && humidity <= 60) return 'excellent'
    return 'good'
}

const getAirQualityStatus = (aqi) => {
    if (!aqi) return 'offline'
    if (aqi <= 50) return 'excellent'
    if (aqi <= 100) return 'good'
    if (aqi <= 150) return 'moderate'
    if (aqi <= 200) return 'poor'
    if (aqi <= 300) return 'unhealthy'
    return 'hazardous'
}

const getLightStatus = (light) => {
    if (!light) return 'offline'
    if (light < 50) return 'poor'
    if (light < 200) return 'moderate'
    if (light >= 300 && light <= 800) return 'excellent'
    if (light > 1000) return 'poor'
    return 'good'
}

const getNoiseStatus = (noise) => {
    if (!noise) return 'offline'
    if (noise > 80) return 'poor'
    if (noise > 70) return 'moderate'
    if (noise > 60) return 'good'
    return 'excellent'
}

const getSoilMoistureStatus = (moisture) => {
    if (!moisture) return 'offline'
    if (moisture < 20 || moisture > 90) return 'poor'
    if (moisture < 30 || moisture > 80) return 'moderate'
    if (moisture >= 40 && moisture <= 70) return 'excellent'
    return 'good'
}

const getTrend = (sensorType) => {
    const current = latestReadings.value?.[sensorType]
    const previous = previousReadings.value[sensorType]

    if (!current || !previous) return 'stable'

    const diff = current - previous
    const threshold = current * 0.05 // 5% threshold

    if (Math.abs(diff) < threshold) return 'stable'
    return diff > 0 ? 'up' : 'down'
}

const handleDeviceControl = async (device, action, params) => {
    try {
        await socketStore.controlDevice(device, action, params)

        // Add to recent activity
        addRecentActivity({
            type: 'device',
            message: `${device} ${action}`,
            timestamp: new Date()
        })

        appStore.showToast(`${device} control successful`, 'success')
    } catch (error) {
        console.error('Device control failed:', error)
        appStore.showToast(`${device} control failed: ${error.message}`, 'error')
    }
}

const setEnvironmentalPreset = async (preset) => {
    try {
        // Set LED color based on preset
        await socketStore.controlDevice('ledStrip', 'setColor', {
            r: preset === 'excellent' ? 0 : 255,
            g: preset === 'excellent' ? 255 : 255,
            b: 0,
            brightness: 80
        })

        // Adjust fan speed
        await socketStore.controlDevice('fan', 'setSpeed', {
            speed: preset === 'excellent' ? 30 : 70
        })

        addRecentActivity({
            type: 'system',
            message: `Environmental preset set to ${preset}`,
            timestamp: new Date()
        })

        appStore.showToast(`Environment set to ${preset}`, 'success')
    } catch (error) {
        console.error('Failed to set environmental preset:', error)
        appStore.showToast('Failed to set environmental preset', 'error')
    }
}

const handleEmergencyAlert = async () => {
    try {
        // Trigger emergency sequence
        await Promise.all([
            socketStore.controlDevice('buzzer', 'alert', { pattern: 'urgent', duration: 3000 }),
            socketStore.controlDevice('ledStrip', 'emergency', { color: 'red' }),
            socketStore.controlDevice('fan', 'setSpeed', { speed: 100 })
        ])

        addRecentActivity({
            type: 'alert',
            message: 'Emergency alert test triggered',
            timestamp: new Date()
        })

        appStore.showToast('Emergency alert test completed', 'warning')
    } catch (error) {
        console.error('Emergency alert failed:', error)
        appStore.showToast('Emergency alert test failed', 'error')
    }
}

const refreshAllData = async () => {
    isRefreshing.value = true
    try {
        await Promise.all([
            sensorStore.fetchStatus(),
            deviceStore.fetchStates(),
            appStore.refreshSystemStatus()
        ])

        appStore.showToast('Data refreshed successfully', 'success')
    } catch (error) {
        console.error('Failed to refresh data:', error)
        appStore.showToast('Failed to refresh data', 'error')
    } finally {
        isRefreshing.value = false
    }
}

const addRecentActivity = (activity) => {
    const newActivity = {
        id: Date.now(),
        ...activity
    }

    recentActivity.value.unshift(newActivity)

    // Keep only last 10 activities
    if (recentActivity.value.length > 10) {
        recentActivity.value = recentActivity.value.slice(0, 10)
    }
}

// Watch for sensor data changes to track trends
let trendWatcher = null

onMounted(() => {
    // Store initial readings for trend calculation
    if (latestReadings.value) {
        previousReadings.value = { ...latestReadings.value }
    }

    // Set up trend watching
    trendWatcher = setInterval(() => {
        if (latestReadings.value) {
            // Update previous readings periodically
            previousReadings.value = { ...latestReadings.value }
        }
    }, 30000) // Update every 30 seconds
})

onUnmounted(() => {
    if (trendWatcher) {
        clearInterval(trendWatcher)
    }
})
</script>