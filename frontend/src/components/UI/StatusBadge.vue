<template>
    <span :class="badgeClasses">
        <component v-if="showIcon" :is="statusIcon" :class="iconClasses" />
        {{ displayLabel }}
    </span>
</template>

<script setup>
import { computed } from 'vue'
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    MinusCircleIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
    status: {
        type: String,
        required: true,
        validator: value => ['excellent', 'good', 'moderate', 'poor', 'unhealthy', 'hazardous', 'offline', 'error'].includes(value)
    },
    label: {
        type: String,
        default: null
    },
    size: {
        type: String,
        default: 'md',
        validator: value => ['sm', 'md', 'lg'].includes(value)
    },
    showIcon: {
        type: Boolean,
        default: true
    }
})

const statusConfig = {
    excellent: {
        label: 'Excellent',
        color: 'green',
        icon: CheckCircleIcon
    },
    good: {
        label: 'Good',
        color: 'emerald',
        icon: CheckCircleIcon
    },
    moderate: {
        label: 'Moderate',
        color: 'yellow',
        icon: ExclamationTriangleIcon
    },
    poor: {
        label: 'Poor',
        color: 'orange',
        icon: ExclamationTriangleIcon
    },
    unhealthy: {
        label: 'Unhealthy',
        color: 'red',
        icon: XCircleIcon
    },
    hazardous: {
        label: 'Hazardous',
        color: 'purple',
        icon: XCircleIcon
    },
    offline: {
        label: 'Offline',
        color: 'gray',
        icon: MinusCircleIcon
    },
    error: {
        label: 'Error',
        color: 'red',
        icon: XCircleIcon
    }
}

const displayLabel = computed(() => {
    return props.label || statusConfig[props.status]?.label || props.status
})

const statusIcon = computed(() => {
    return statusConfig[props.status]?.icon || MinusCircleIcon
})

const badgeClasses = computed(() => {
    const config = statusConfig[props.status]
    const color = config?.color || 'gray'

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm'
    }

    const colorClasses = {
        green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
        emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800',
        orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800',
        red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
        purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800',
        gray: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-800'
    }

    return [
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[props.size],
        colorClasses[color]
    ].join(' ')
})

const iconClasses = computed(() => {
    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    }

    return [
        sizeClasses[props.size],
        props.label || statusConfig[props.status]?.label ? 'mr-1' : ''
    ].join(' ')
})
</script>