<template>
    <div class="device-control" :class="deviceClasses">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-2">
                <span class="text-xl">{{ icon }}</span>
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ title }}
                </h3>
            </div>

            <div class="flex items-center space-x-2">
                <div :class="[
                    'w-2 h-2 rounded-full',
                    active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                ]"></div>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ active ? 'Active' : 'Inactive' }}
                </span>
            </div>
        </div>

        <!-- Control Interface -->
        <div class="space-y-3">
            <!-- Speed Control -->
            <div v-if="type === 'speed'" class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-sm text-gray-600 dark:text-gray-400">Speed</label>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ current }}%
                    </span>
                </div>

                <input v-model="speedValue" type="range" :min="0" :max="max" class="range-slider w-full"
                    @change="handleSpeedChange" :disabled="!connected" />

                <div class="flex space-x-2">
                    <button @click="setSpeed(0)" class="btn btn-sm btn-secondary flex-1" :disabled="!connected">
                        Stop
                    </button>
                    <button @click="setSpeed(50)" class="btn btn-sm btn-secondary flex-1" :disabled="!connected">
                        Medium
                    </button>
                    <button @click="setSpeed(100)" class="btn btn-sm btn-primary flex-1" :disabled="!connected">
                        Max
                    </button>
                </div>
            </div>

            <!-- Color Control -->
            <div v-else-if="type === 'color'" class="space-y-3">
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="text-xs text-gray-600 dark:text-gray-400">Red</label>
                        <input v-model="colorValue.r" type="range" min="0" max="255" class="range-slider w-full"
                            @change="handleColorChange" :disabled="!connected" />
                    </div>
                    <div>
                        <label class="text-xs text-gray-600 dark:text-gray-400">Green</label>
                        <input v-model="colorValue.g" type="range" min="0" max="255" class="range-slider w-full"
                            @change="handleColorChange" :disabled="!connected" />
                    </div>
                    <div>
                        <label class="text-xs text-gray-600 dark:text-gray-400">Blue</label>
                        <input v-model="colorValue.b" type="range" min="0" max="255" class="range-slider w-full"
                            @change="handleColorChange" :disabled="!connected" />
                    </div>
                </div>

                <!-- Color Preview -->
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600"
                        :style="{ backgroundColor: `rgb(${colorValue.r}, ${colorValue.g}, ${colorValue.b})` }"></div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                        RGB({{ colorValue.r }}, {{ colorValue.g }}, {{ colorValue.b }})
                    </span>
                </div>

                <!-- Preset Colors -->
                <div class="grid grid-cols-4 gap-2">
                    <button v-for="preset in colorPresets" :key="preset.name" @click="setColor(preset.color)"
                        class="btn btn-sm btn-secondary p-2"
                        :style="{ backgroundColor: `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})` }"
                        :title="preset.name" :disabled="!connected">
                    </button>
                </div>
            </div>

            <!-- Timer Control -->
            <div v-else-if="type === 'timer'" class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-sm text-gray-600 dark:text-gray-400">Duration</label>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ timerValue }}s
                    </span>
                </div>

                <input v-model="timerValue" type="range" :min="1" :max="max" class="range-slider w-full"
                    :disabled="!connected" />

                <button @click="handleTimerStart" class="btn btn-primary w-full" :disabled="!connected || active">
                    <LoadingSpinner v-if="active" class="w-4 h-4 mr-2" />
                    {{ active ? 'Running...' : `Start (${timerValue}s)` }}
                </button>
            </div>

            <!-- Trigger Control -->
            <div v-else-if="type === 'trigger'" class="space-y-2">
                <!-- Pattern Selection -->
                <div>
                    <label class="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Pattern</label>
                    <select v-model="triggerPattern" class="form-input w-full" :disabled="!connected">
                        <option value="single">Single Beep</option>
                        <option value="double">Double Beep</option>
                        <option value="triple">Triple Beep</option>
                        <option value="urgent">Urgent Alert</option>
                    </select>
                </div>

                <button @click="handleTrigger" class="btn btn-warning w-full" :disabled="!connected || active">
                    <LoadingSpinner v-if="active" class="w-4 h-4 mr-2" />
                    {{ active ? 'Playing...' : 'Trigger Alert' }}
                </button>
            </div>

            <!-- Simple Toggle -->
            <div v-else class="space-y-2">
                <button @click="handleToggle" :class="[
                    'btn w-full',
                    active ? 'btn-danger' : 'btn-success'
                ]" :disabled="!connected">
                    {{ active ? 'Turn Off' : 'Turn On' }}
                </button>
            </div>
        </div>

        <!-- Status Info -->
        <div v-if="lastAction"
            class="mt-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
            Last action: {{ lastAction }}
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSocketStore } from '@stores/socket'
import LoadingSpinner from '@components/UI/LoadingSpinner.vue'

const props = defineProps({
    device: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: '⚡'
    },
    type: {
        type: String,
        default: 'toggle',
        validator: value => ['speed', 'color', 'timer', 'trigger', 'toggle'].includes(value)
    },
    max: {
        type: Number,
        default: 100
    },
    current: {
        type: [Number, Object],
        default: () => ({ r: 0, g: 0, b: 0 })
    },
    active: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['control'])

const socketStore = useSocketStore()

// Reactive data
const speedValue = ref(0)
const colorValue = ref({ r: 0, g: 0, b: 0 })
const timerValue = ref(5)
const triggerPattern = ref('single')
const lastAction = ref(null)

// Computed
const connected = computed(() => socketStore.isConnected)

const deviceClasses = computed(() => {
    const baseClasses = 'bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all duration-200'

    if (!connected.value) {
        return `${baseClasses} offline`
    } else if (props.active) {
        return `${baseClasses} active`
    } else {
        return `${baseClasses} border-gray-200 dark:border-gray-700 hover:shadow-md`
    }
})

// Color presets
const colorPresets = [
    { name: 'Off', color: { r: 0, g: 0, b: 0 } },
    { name: 'Red', color: { r: 255, g: 0, b: 0 } },
    { name: 'Green', color: { r: 0, g: 255, b: 0 } },
    { name: 'Blue', color: { r: 0, g: 0, b: 255 } },
    { name: 'Yellow', color: { r: 255, g: 255, b: 0 } },
    { name: 'Purple', color: { r: 128, g: 0, b: 128 } },
    { name: 'Cyan', color: { r: 0, g: 255, b: 255 } },
    { name: 'White', color: { r: 255, g: 255, b: 255 } }
]

// Methods
const setSpeed = async (speed) => {
    speedValue.value = speed
    await handleSpeedChange()
}

const handleSpeedChange = async () => {
    try {
        emit('control', props.device, 'setSpeed', { speed: speedValue.value })
        lastAction.value = `Speed set to ${speedValue.value}%`
    } catch (error) {
        console.error('Failed to control speed:', error)
    }
}

const setColor = async (color) => {
    colorValue.value = { ...color }
    await handleColorChange()
}

const handleColorChange = async () => {
    try {
        emit('control', props.device, 'setColor', {
            r: colorValue.value.r,
            g: colorValue.value.g,
            b: colorValue.value.b,
            brightness: 100
        })
        lastAction.value = `Color changed to RGB(${colorValue.value.r}, ${colorValue.value.g}, ${colorValue.value.b})`
    } catch (error) {
        console.error('Failed to control color:', error)
    }
}

const handleTimerStart = async () => {
    try {
        emit('control', props.device, 'start', { duration: timerValue.value * 1000 })
        lastAction.value = `Started for ${timerValue.value}s`
    } catch (error) {
        console.error('Failed to start timer:', error)
    }
}

const handleTrigger = async () => {
    try {
        emit('control', props.device, 'trigger', { pattern: triggerPattern.value, duration: 2000 })
        lastAction.value = `Triggered ${triggerPattern.value} pattern`
    } catch (error) {
        console.error('Failed to trigger device:', error)
    }
}

const handleToggle = async () => {
    try {
        const action = props.active ? 'off' : 'on'
        emit('control', props.device, action, {})
        lastAction.value = `Turned ${action}`
    } catch (error) {
        console.error('Failed to toggle device:', error)
    }
}

// Watch for prop changes to update local values
watch(() => props.current, (newValue) => {
    if (props.type === 'speed' && typeof newValue === 'number') {
        speedValue.value = newValue
    } else if (props.type === 'color' && typeof newValue === 'object') {
        colorValue.value = { ...newValue }
    }
}, { immediate: true })
</script>