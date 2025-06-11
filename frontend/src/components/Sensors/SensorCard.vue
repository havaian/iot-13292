<template>
    <div class="card sensor-card" :class="statusClasses">
        <div class="card-body">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <span class="text-xl">{{ icon }}</span>
                    <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ title }}
                    </h3>
                </div>

                <StatusBadge :status="status" size="sm" />
            </div>

            <!-- Value Display -->
            <div class="mb-3">
                <div class="flex items-baseline space-x-1">
                    <span class="sensor-value text-gray-900 dark:text-white">
                        {{ formattedValue }}
                    </span>
                    <span class="sensor-unit">{{ unit }}</span>
                </div>

                <!-- Description -->
                <div v-if="description" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ description }}
                </div>
            </div>

            <!-- Trend and Last Update -->
            <div class="flex items-center justify-between text-xs">
                <div v-if="trend" class="sensor-trend" :class="trend">
                    <component :is="trendIcon" class="w-3 h-3 mr-1" />
                    <span class="capitalize">{{ trend }}</span>
                </div>

                <div class="text-gray-500 dark:text-gray-400">
                    {{ lastUpdateText }}
                </div>
            </div>
        </div>

        <!-- Status Indicator Border -->
        <div class="absolute bottom-0 left-0 right-0 h-1" :class="statusBorderColor"></div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import {
    ArrowUpIcon,
    ArrowDownIcon,
    MinusIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    value: {
        type: [Number, String],
        default: null
    },
    unit: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: '📊'
    },
    status: {
        type: String,
        default: 'offline',
        validator: value => ['excellent', 'good', 'moderate', 'poor', 'unhealthy', 'hazardous', 'offline'].includes(value)
    },
    trend: {
        type: String,
        default: 'stable',
        validator: value => ['up', 'down', 'stable'].includes(value)
    },
    description: {
        type: String,
        default: null
    },
    lastUpdate: {
        type: [Date, String],
        default: null
    },
    precision: {
        type: Number,
        default: 1
    }
})

const formattedValue = computed(() => {
    if (props.value === null || props.value === undefined) {
        return '--'
    }

    if (typeof props.value === 'number') {
        return props.value.toFixed(props.precision)
    }

    return props.value
})

const statusClasses = computed(() => {
    const baseClasses = 'transition-all duration-200 hover:shadow-md'
    const statusClass = `env-${props.status}`

    return `${baseClasses} ${statusClass}`
})

const statusBorderColor = computed(() => {
    const colors = {
        excellent: 'bg-green-500',
        good: 'bg-emerald-500',
        moderate: 'bg-yellow-500',
        poor: 'bg-orange-500',
        unhealthy: 'bg-red-500',
        hazardous: 'bg-purple-500',
        offline: 'bg-gray-400'
    }

    return colors[props.status] || 'bg-gray-400'
})

const trendIcon = computed(() => {
    const icons = {
        up: ArrowUpIcon,
        down: ArrowDownIcon,
        stable: MinusIcon
    }

    return icons[props.trend] || MinusIcon
})

const lastUpdateText = computed(() => {
    if (!props.lastUpdate) {
        return 'No data'
    }

    const date = new Date(props.lastUpdate)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) { // Less than 1 minute
        return 'Just now'
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000)
        return `${minutes}m ago`
    } else {
        return date.toLocaleTimeString()
    }
})
</script>

<style scoped>
.sensor-card {
    position: relative;
    overflow: hidden;
}

.sensor-card:hover {
    transform: translateY(-2px);
}

.sensor-trend.up {
    @apply text-green-600 dark:text-green-400;
}

.sensor-trend.down {
    @apply text-red-600 dark:text-red-400;
}

.sensor-trend.stable {
    @apply text-gray-600 dark:text-gray-400;
}
</style>