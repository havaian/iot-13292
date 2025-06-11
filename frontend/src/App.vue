<template>
  <div id="app" class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <!-- Loading overlay -->
    <Transition name="fade">
      <div v-if="appStore.isLoading" class="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p class="text-gray-600 font-medium">Connecting to Smart Environmental Monitor...</p>
        </div>
      </div>
    </Transition>

    <!-- Connection Status Banner -->
    <Transition name="slide-down">
      <div v-if="!socketStore.isConnected && !appStore.isLoading" 
           class="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium">
        <div class="flex items-center justify-center space-x-2">
          <ExclamationTriangleIcon class="h-4 w-4" />
          <span>Connection lost. Attempting to reconnect...</span>
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      </div>
    </Transition>

    <!-- Alert Notifications -->
    <AlertNotifications />

    <!-- Main Application -->
    <div class="flex flex-col min-h-screen">
      <!-- Header -->
      <AppHeader />
      
      <!-- Main Content -->
      <main class="flex-1">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
      
      <!-- Footer -->
      <AppFooter />
    </div>

    <!-- Emergency Alert Modal -->
    <EmergencyAlert />
    
    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

// Components
import AppHeader from '@components/Layout/AppHeader.vue'
import AppFooter from '@components/Layout/AppFooter.vue'
import AlertNotifications from '@components/Alerts/AlertNotifications.vue'
import EmergencyAlert from '@components/Alerts/EmergencyAlert.vue'
import ToastContainer from '@components/UI/ToastContainer.vue'

// Stores
import { useAppStore } from '@stores/app'
import { useSocketStore } from '@stores/socket'
import { useSensorStore } from '@stores/sensors'
import { useDeviceStore } from '@stores/devices'

const appStore = useAppStore()
const socketStore = useSocketStore()
const sensorStore = useSensorStore()
const deviceStore = useDeviceStore()

onMounted(async () => {
  try {
    // Initialize application
    await appStore.initialize()
    
    // Connect to WebSocket
    socketStore.connect()
    
    // Load initial data
    await Promise.all([
      sensorStore.fetchStatus(),
      deviceStore.fetchStates()
    ])
    
    appStore.setLoading(false)
  } catch (error) {
    console.error('Failed to initialize app:', error)
    appStore.setError('Failed to initialize application')
    appStore.setLoading(false)
  }
})

onUnmounted(() => {
  socketStore.disconnect()
})
</script>

<style>
/* Global styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}

/* Dark mode scrollbar */
.dark ::-webkit-scrollbar-track {
  @apply bg-gray-800;
}

.dark ::-webkit-scrollbar-thumb {
  @apply bg-gray-600;
}

.dark ::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}

/* Glow effects for status indicators */
.status-excellent {
  @apply shadow-glow;
}

.status-danger {
  @apply shadow-glow-red;
}

.status-warning {
  @apply shadow-glow-yellow;
}

/* Pulse animation for real-time indicators */
.pulse-live {
  animation: pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-live {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .7;
  }
}

/* Glass morphism effect */
.glass {
  @apply bg-white/80 backdrop-blur-md border border-white/20;
}

.dark .glass {
  @apply bg-gray-800/80 border-gray-700/20;
}

/* Card hover effects */
.card-hover {
  @apply transition-all duration-300 hover:shadow-xl hover:-translate-y-1;
}

/* Button styles */
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

.btn-secondary {
  @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2;
}

.btn-danger {
  @apply bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2;
}

.btn-success {
  @apply bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2;
}

/* Responsive text */
.text-responsive {
  @apply text-sm md:text-base;
}

.text-responsive-lg {
  @apply text-base md:text-lg lg:text-xl;
}

/* Loading skeleton */
.skeleton {
  @apply animate-pulse bg-gray-200 rounded;
}

.dark .skeleton {
  @apply bg-gray-700;
}
</style>