<template>
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div class="container mx-auto px-4 py-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Brand and Description -->
                <div class="col-span-1 md:col-span-2">
                    <div class="flex items-center space-x-2 mb-3">
                        <div class="w-6 h-6 bg-gradient-primary rounded flex items-center justify-center">
                            <span class="text-white text-xs">🌱</span>
                        </div>
                        <span class="font-semibold text-gray-900 dark:text-white">
                            Smart Environmental Monitor
                        </span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                        Real-time IoT environmental monitoring system providing comprehensive
                        air quality, temperature, humidity, and environmental control capabilities.
                    </p>
                    <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>IoT Coursework Project</span>
                        <span>•</span>
                        <span>University of Westminster</span>
                        <span>•</span>
                        <span>{{ currentYear }}</span>
                    </div>
                </div>

                <!-- System Status -->
                <div>
                    <h3 class="font-medium text-gray-900 dark:text-white mb-3">System Status</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Connection</span>
                            <div class="flex items-center space-x-1">
                                <div :class="[
                                    'w-2 h-2 rounded-full',
                                    socketStore.isConnected ? 'bg-green-500' : 'bg-red-500'
                                ]"></div>
                                <span :class="[
                                    'text-xs',
                                    socketStore.isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                ]">
                                    {{ socketStore.isConnected ? 'Online' : 'Offline' }}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Sensors</span>
                            <span class="text-xs text-gray-900 dark:text-white">
                                {{ sensorStore.activeSensors }}/6 Active
                            </span>
                        </div>

                        <div class="flex items-center justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Devices</span>
                            <span class="text-xs text-gray-900 dark:text-white">
                                {{ deviceStore.activeDevices }}/5 Active
                            </span>
                        </div>

                        <div class="flex items-center justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Uptime</span>
                            <span class="text-xs text-gray-900 dark:text-white">
                                {{ systemUptime }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Quick Links -->
                <div>
                    <h3 class="font-medium text-gray-900 dark:text-white mb-3">Quick Links</h3>
                    <div class="space-y-2">
                        <RouterLink v-for="link in quickLinks" :key="link.name" :to="{ name: link.name }"
                            class="block text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            {{ link.title }}
                        </RouterLink>

                        <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <button @click="handleExportData"
                                class="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                :disabled="isExporting">
                                {{ isExporting ? 'Exporting...' : 'Export Data' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <!-- Copyright and Legal -->
                    <div
                        class="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6 text-xs text-gray-500 dark:text-gray-400">
                        <span>© {{ currentYear }} Smart Environmental Monitor. Educational Project.</span>
                        <div class="flex space-x-4">
                            <span>Module: 6COSC014C Internet of Things</span>
                            <span>Instructor: S. Primkulova</span>
                        </div>
                    </div>

                    <!-- Technical Info -->
                    <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div class="flex items-center space-x-1">
                            <span>Environment:</span>
                            <span class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {{ appStore.appInfo.environment }}
                            </span>
                        </div>

                        <div class="flex items-center space-x-1">
                            <span>Version:</span>
                            <span class="font-mono">{{ appStore.appInfo.version }}</span>
                        </div>

                        <div v-if="lastUpdate" class="flex items-center space-x-1">
                            <span>Updated:</span>
                            <span class="font-mono">{{ formatLastUpdate }}</span>
                        </div>
                    </div>
                </div>

                <!-- Development Info -->
                <div v-if="appStore.appInfo.environment === 'development'"
                    class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div class="flex items-center space-x-2 text-sm text-yellow-800 dark:text-yellow-200">
                        <ExclamationTriangleIcon class="w-4 h-4" />
                        <span class="font-medium">Development Mode Active</span>
                    </div>
                    <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Running with mock GPIO data. Connect to Raspberry Pi 5 for real sensor readings.
                    </p>
                </div>
            </div>
        </div>
    </footer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

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
const isExporting = ref(false)

// Quick links
const quickLinks = [
    { name: 'Dashboard', title: 'Dashboard' },
    { name: 'Sensors', title: 'Sensor Status' },
    { name: 'Devices', title: 'Device Control' },
    { name: 'History', title: 'Data History' },
    { name: 'Settings', title: 'Settings' },
    { name: 'System', title: 'System Diagnostics' }
]

// Computed
const currentYear = computed(() => new Date().getFullYear())

const systemUptime = computed(() => {
    const uptime = appStore.systemStatus?.system?.uptime
    return uptime ? appStore.formatUptime(uptime) : '--'
})

const lastUpdate = computed(() => {
    return sensorStore.lastUpdate || appStore.lastUpdated
})

const formatLastUpdate = computed(() => {
    if (!lastUpdate.value) return '--'
    return new Date(lastUpdate.value).toLocaleTimeString()
})

// Methods
const handleExportData = async () => {
    isExporting.value = true

    try {
        await appStore.exportData('csv', {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
        })

        appStore.showToast('Data exported successfully', 'success')
    } catch (error) {
        console.error('Export failed:', error)
        appStore.showToast('Failed to export data', 'error')
    } finally {
        isExporting.value = false
    }
}
</script>