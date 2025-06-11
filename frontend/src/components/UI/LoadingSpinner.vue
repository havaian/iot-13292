<template>
    <div :class="spinnerClasses" :style="customStyle">
        <div class="loading-spinner" :class="innerClasses"></div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    size: {
        type: String,
        default: 'md',
        validator: value => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    },
    color: {
        type: String,
        default: 'primary'
    },
    centered: {
        type: Boolean,
        default: false
    },
    overlay: {
        type: Boolean,
        default: false
    }
})

const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
}

const colorClasses = {
    primary: 'border-t-primary-600',
    white: 'border-t-white',
    gray: 'border-t-gray-600',
    red: 'border-t-red-600',
    green: 'border-t-green-600',
    blue: 'border-t-blue-600'
}

const spinnerClasses = computed(() => {
    const classes = []

    if (props.centered) {
        classes.push('flex items-center justify-center')
    }

    if (props.overlay) {
        classes.push('fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center')
    }

    return classes.join(' ')
})

const innerClasses = computed(() => {
    return [
        sizeClasses[props.size],
        colorClasses[props.color] || 'border-t-primary-600'
    ].join(' ')
})

const customStyle = computed(() => {
    if (props.overlay) {
        return {}
    }
    return {}
})
</script>