<template>
    <!-- Alert Notifications Container -->
    <div class="fixed top-4 right-4 z-50 space-y-4 max-w-sm w-full">
        <TransitionGroup name="notification" tag="div">
            <div v-for="notification in visibleNotifications" :key="notification.id" :class="[
                'notification shadow-lg rounded-lg border-l-4 p-4 bg-white dark:bg-gray-800',
                notificationClasses(notification.type)
            ]">
                <!-- Header -->
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <component :is="getNotificationIcon(notification.type)" :class="[
                            'w-5 h-5',
                            iconClasses(notification.type)
                        ]" />
                    </div>

                    <div class="ml-3 w-0 flex-1">
                        <!-- Title -->
                        <p v-if="notification.title" class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ notification.title }}
                        </p>

                        <!-- Message -->
                        <p :class="[
                            'text-sm',
                            notification.title ? 'mt-1 text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                        ]">
                            {{ notification.message }}
                        </p>

                        <!-- Timestamp -->
                        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {{ formatTime(notification.timestamp) }}
                        </p>

                        <!-- Additional Details -->
                        <div v-if="notification.details" class="mt-2">
                            <details class="cursor-pointer">
                                <summary
                                    class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                                    View Details
                                </summary>
                                <div
                                    class="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                    <pre
                                        class="whitespace-pre-wrap">{{ JSON.stringify(notification.details, null, 2) }}</pre>
                                </div>
                            </details>
                        </div>

                        <!-- Actions -->
                        <div v-if="notification.actions" class="mt-3 flex space-x-2">
                            <button v-for="action in notification.actions" :key="action.label"
                                @click="handleAction(notification.id, action)" :class="[
                                    'text-xs px-2 py-1 rounded font-medium transition-colors',
                                    action.primary
                                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                                ]">
                                {{ action.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Close Button -->
                    <div class="ml-4 flex-shrink-0 flex">
                        <button @click="dismissNotification(notification.id)"
                            class="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <XMarkIcon class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Progress Bar for Auto-dismiss -->
                <div v-if="!notification.persistent && notification.duration"
                    class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div class="bg-current h-1 rounded-full transition-all ease-linear" :style="{
                        width: `${getProgressPercent(notification)}%`,
                        animationDuration: `${notification.duration}ms`
                    }"></div>
                </div>
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    BellIcon
} from '@heroicons/vue/24/outline'

import { useAppStore } from '@stores/app'

const appStore = useAppStore()

// Computed
const visibleNotifications = computed(() => {
    return appStore.notifications.slice(0, 5) // Show max 5 notifications
})

// Methods
const getNotificationIcon = (type) => {
    const icons = {
        success: CheckCircleIcon,
        error: ExclamationCircleIcon,
        warning: ExclamationTriangleIcon,
        info: InformationCircleIcon,
        default: BellIcon
    }
    return icons[type] || icons.default
}

const notificationClasses = (type) => {
    const classes = {
        success: 'border-green-400 bg-green-50 dark:bg-green-900/20',
        error: 'border-red-400 bg-red-50 dark:bg-red-900/20',
        warning: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
        info: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
        default: 'border-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
    return classes[type] || classes.default
}

const iconClasses = (type) => {
    const classes = {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
        default: 'text-gray-400'
    }
    return classes[type] || classes.default
}

const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
}

const getProgressPercent = (notification) => {
    if (!notification.duration || !notification.timestamp) return 0

    const elapsed = Date.now() - new Date(notification.timestamp).getTime()
    const percent = Math.min((elapsed / notification.duration) * 100, 100)
    return 100 - percent
}

const dismissNotification = (id) => {
    appStore.removeNotification(id)
}

const handleAction = (notificationId, action) => {
    // Execute action
    if (action.handler) {
        action.handler()
    }

    // Dismiss notification if specified
    if (action.dismiss !== false) {
        dismissNotification(notificationId)
    }
}
</script>

<style scoped>
/* Notification transition styles */
.notification-enter-active,
.notification-leave-active {
    transition: all 0.4s ease;
}

.notification-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.notification-leave-to {
    opacity: 0;
    transform: translateX(100%);
}

.notification-move {
    transition: transform 0.4s ease;
}

/* Progress bar animation */
@keyframes progress {
    from {
        width: 100%;
    }

    to {
        width: 0%;
    }
}

.progress-bar {
    animation: progress linear;
}
</style>