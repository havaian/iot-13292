<template>
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div class="container mx-auto px-4">
            <div class="flex items-center justify-between h-16">
                <!-- Logo and Brand -->
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <span class="text-white font-bold text-sm">🌱</span>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                                {{ appStore.appInfo.name }}
                            </h1>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                v{{ appStore.appInfo.version }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <nav class="hidden md:flex items-center space-x-6">
                    <RouterLink v-for="route in navigation" :key="route.name" :to="{ name: route.name }"
                        class="nav-link" :class="{ 'nav-link-active': $route.name === route.name }">
                        <component :is="route.icon" class="w-4 h-4 mr-2" />
                        {{ route.title }}
                    </RouterLink>
                </nav>

                <!-- Actions -->
                <div class="flex items-center space-x-4">
                    <!-- Connection Status -->
                    <div class="flex items-center space-x-2">
                        <div :class="[
                            'w-2 h-2 rounded-full',
                            socketStore.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        ]"></div>
                        <span class="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                            {{ socketStore.isConnected ? 'Connected' : 'Disconnected' }}
                        </span>
                    </div>

                    <!-- Notifications -->
                    <button @click="toggleNotifications"
                        class="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        :class="{ 'text-red-500': hasUnreadNotifications }">
                        <BellIcon class="w-5 h-5" />
                        <span v-if="unreadNotificationCount > 0"
                            class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {{ unreadNotificationCount > 9 ? '9+' : unreadNotificationCount }}
                        </span>
                    </button>

                    <!-- Theme Toggle -->
                    <button @click="appStore.toggleTheme"
                        class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        :title="appStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'">
                        <SunIcon v-if="appStore.isDark" class="w-5 h-5" />
                        <MoonIcon v-else class="w-5 h-5" />
                    </button>

                    <!-- Settings Menu -->
                    <div class="relative">
                        <button @click="toggleSettingsMenu"
                            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <Cog6ToothIcon class="w-5 h-5" />
                        </button>

                        <!-- Settings Dropdown -->
                        <Transition name="dropdown">
                            <div v-if="showSettingsMenu"
                                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                                @click.away="showSettingsMenu = false">
                                <RouterLink to="/settings"
                                    class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    @click="showSettingsMenu = false">
                                    <AdjustmentsHorizontalIcon class="w-4 h-4 mr-2" />
                                    Settings
                                </RouterLink>

                                <RouterLink to="/system"
                                    class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    @click="showSettingsMenu = false">
                                    <CircuitBoardIcon class="w-4 h-4 mr-2" />
                                    System Status
                                </RouterLink>

                                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                                <button @click="handleRefresh"
                                    class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    :disabled="isRefreshing">
                                    <ArrowPathIcon :class="['w-4 h-4 mr-2', { 'animate-spin': isRefreshing }]" />
                                    Refresh Data
                                </button>
                            </div>
                        </Transition>
                    </div>

                    <!-- Mobile Menu Button -->
                    <button @click="toggleMobileMenu"
                        class="md:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Bars3Icon v-if="!showMobileMenu" class="w-5 h-5" />
                        <XMarkIcon v-else class="w-5 h-5" />
                    </button>
                </div>
            </div>

            <!-- Mobile Navigation -->
            <Transition name="mobile-menu">
                <div v-if="showMobileMenu" class="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
                    <nav class="space-y-2">
                        <RouterLink v-for="route in navigation" :key="route.name" :to="{ name: route.name }"
                            class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            :class="{ 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300': $route.name === route.name }"
                            @click="showMobileMenu = false">
                            <component :is="route.icon" class="w-4 h-4 mr-3" />
                            {{ route.title }}
                        </RouterLink>
                    </nav>
                </div>
            </Transition>
        </div>
    </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
    BellIcon,
    SunIcon,
    MoonIcon,
    Cog6ToothIcon,
    AdjustmentsHorizontalIcon,
    CircuitBoardIcon,
    ArrowPathIcon,
    Bars3Icon,
    XMarkIcon,
    HomeIcon,
    CpuChipIcon,
    ChartBarIcon,
    WrenchScrewdriverIcon
} from '@heroicons/vue/24/outline'

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
const showSettingsMenu = ref(false)
const showMobileMenu = ref(false)
const showNotifications = ref(false)
const isRefreshing = ref(false)

// Navigation items
const navigation = [
    { name: 'Dashboard', title: 'Dashboard', icon: HomeIcon },
    { name: 'Sensors', title: 'Sensors', icon: CpuChipIcon },
    { name: 'Devices', title: 'Devices', icon: Cog6ToothIcon },
    { name: 'History', title: 'History', icon: ChartBarIcon },
    { name: 'Alerts', title: 'Alerts', icon: BellIcon },
    ...(import.meta.env.DEV ? [{ name: 'Development', title: 'Dev Tools', icon: WrenchScrewdriverIcon }] : [])
]

// Computed
const unreadNotificationCount = computed(() => {
    return appStore.notifications.filter(n => !n.read).length
})

const hasUnreadNotifications = computed(() => {
    return unreadNotificationCount.value > 0
})

// Methods
const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value
    showSettingsMenu.value = false
    showMobileMenu.value = false
}

const toggleSettingsMenu = () => {
    showSettingsMenu.value = !showSettingsMenu.value
    showNotifications.value = false
    showMobileMenu.value = false
}

const toggleMobileMenu = () => {
    showMobileMenu.value = !showMobileMenu.value
    showSettingsMenu.value = false
    showNotifications.value = false
}

const handleRefresh = async () => {
    isRefreshing.value = true
    showSettingsMenu.value = false

    try {
        await Promise.all([
            sensorStore.fetchStatus(),
            sensorStore.fetchReadings(),
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

// Close dropdowns when clicking outside
const handleClickOutside = (event) => {
    if (!event.target.closest('.relative')) {
        showSettingsMenu.value = false
        showNotifications.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.nav-link {
    @apply flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg;
}

.nav-link-active {
    @apply text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20;
}

/* Transition styles */
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
    transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>