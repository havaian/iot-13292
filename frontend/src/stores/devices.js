import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiMethods } from '@services/api'

export const useDeviceStore = defineStore('devices', () => {
    // State
    const states = ref({})
    const config = ref({})
    const isLoading = ref(false)
    const lastUpdate = ref(null)
    const error = ref(null)
    const controlHistory = ref([])

    // Computed
    const activeDevices = computed(() => {
        return Object.values(states.value).filter(state => state?.isActive).length
    })

    const deviceList = computed(() => {
        return Object.entries(config.value).map(([id, device]) => ({
            id,
            ...device,
            state: states.value[id] || { isActive: false },
            online: true // TODO: Add real connectivity status
        }))
    })

    const fanSpeed = computed(() => {
        return states.value.fan?.speed || 0
    })

    const ledColor = computed(() => {
        return states.value.ledStrip?.currentColor || { r: 0, g: 0, b: 0 }
    })

    const isAnyDeviceActive = computed(() => {
        return Object.values(states.value).some(state => state?.isActive)
    })

    // Actions
    const fetchStates = async () => {
        try {
            isLoading.value = true
            error.value = null

            const response = await apiMethods.getDeviceStates()
            states.value = response.data
            lastUpdate.value = new Date()

        } catch (err) {
            console.error('Failed to fetch device states:', err)
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    const fetchConfig = async () => {
        try {
            const response = await apiMethods.getDevices()
            config.value = response.data
        } catch (err) {
            console.error('Failed to fetch device config:', err)
            throw err
        }
    }

    const controlDevice = async (device, action, params = {}) => {
        try {
            const response = await apiMethods.controlDevice(device, action, params)

            // Update local state
            if (response.data && response.data.state) {
                updateDeviceState(device, response.data.state)
            }

            // Add to control history
            addControlHistory({
                device,
                action,
                params,
                timestamp: new Date(),
                success: true
            })

            return response.data
        } catch (err) {
            console.error(`Failed to control device ${device}:`, err)

            // Add failed attempt to history
            addControlHistory({
                device,
                action,
                params,
                timestamp: new Date(),
                success: false,
                error: err.message
            })

            throw err
        }
    }

    const testDevice = async (device) => {
        try {
            const response = await apiMethods.testDevice(device)

            addControlHistory({
                device,
                action: 'test',
                params: {},
                timestamp: new Date(),
                success: true
            })

            return response.data
        } catch (err) {
            console.error(`Failed to test device ${device}:`, err)

            addControlHistory({
                device,
                action: 'test',
                params: {},
                timestamp: new Date(),
                success: false,
                error: err.message
            })

            throw err
        }
    }

    const updateDeviceState = (device, newState) => {
        if (!states.value[device]) {
            states.value[device] = {}
        }

        states.value[device] = { ...states.value[device], ...newState }
        lastUpdate.value = new Date()
    }

    const addControlHistory = (entry) => {
        controlHistory.value.unshift({
            id: Date.now(),
            ...entry
        })

        // Keep only last 50 entries
        if (controlHistory.value.length > 50) {
            controlHistory.value = controlHistory.value.slice(0, 50)
        }
    }

    const clearError = () => {
        error.value = null
    }

    const reset = () => {
        states.value = {}
        config.value = {}
        isLoading.value = false
        lastUpdate.value = null
        error.value = null
        controlHistory.value = []
    }

    // Device-specific control methods
    const setFanSpeed = async (speed) => {
        const clampedSpeed = Math.max(0, Math.min(100, speed))
        return await controlDevice('fan', 'setSpeed', { speed: clampedSpeed })
    }

    const toggleFan = async () => {
        const currentSpeed = fanSpeed.value
        const newSpeed = currentSpeed > 0 ? 0 : 50
        return await setFanSpeed(newSpeed)
    }

    const setLEDColor = async (r, g, b, brightness = 100) => {
        const params = {
            r: Math.max(0, Math.min(255, r)),
            g: Math.max(0, Math.min(255, g)),
            b: Math.max(0, Math.min(255, b)),
            brightness: Math.max(0, Math.min(100, brightness))
        }
        return await controlDevice('ledStrip', 'setColor', params)
    }

    const setLEDPreset = async (preset) => {
        const presets = {
            off: { r: 0, g: 0, b: 0 },
            red: { r: 255, g: 0, b: 0 },
            green: { r: 0, g: 255, b: 0 },
            blue: { r: 0, g: 0, b: 255 },
            white: { r: 255, g: 255, b: 255 },
            yellow: { r: 255, g: 255, b: 0 },
            purple: { r: 128, g: 0, b: 128 },
            cyan: { r: 0, g: 255, b: 255 }
        }

        const color = presets[preset]
        if (!color) {
            throw new Error(`Unknown LED preset: ${preset}`)
        }

        return await setLEDColor(color.r, color.g, color.b)
    }

    const triggerBuzzer = async (pattern = 'single', duration = 1000) => {
        return await controlDevice('buzzer', 'trigger', { pattern, duration })
    }

    const startWaterPump = async (duration = 5000) => {
        return await controlDevice('waterPump', 'start', { duration })
    }

    const setVentilatorSpeed = async (speed) => {
        const clampedSpeed = Math.max(0, Math.min(100, speed))
        return await controlDevice('ventilator', 'setSpeed', { speed: clampedSpeed })
    }

    const setEnvironmentalMode = async (mode) => {
        const modes = {
            sleep: {
                fan: { speed: 10 },
                ledStrip: { r: 0, g: 0, b: 50, brightness: 20 },
                ventilator: { speed: 0 }
            },
            normal: {
                fan: { speed: 30 },
                ledStrip: { r: 0, g: 255, b: 0, brightness: 50 },
                ventilator: { speed: 20 }
            },
            active: {
                fan: { speed: 60 },
                ledStrip: { r: 255, g: 255, b: 0, brightness: 80 },
                ventilator: { speed: 40 }
            },
            emergency: {
                fan: { speed: 100 },
                ledStrip: { r: 255, g: 0, b: 0, brightness: 100 },
                ventilator: { speed: 100 },
                buzzer: { pattern: 'urgent', duration: 3000 }
            }
        }

        const modeConfig = modes[mode]
        if (!modeConfig) {
            throw new Error(`Unknown environmental mode: ${mode}`)
        }

        const results = {}

        // Apply settings to each device
        for (const [device, params] of Object.entries(modeConfig)) {
            try {
                let action = 'set'

                if (device === 'fan' || device === 'ventilator') {
                    action = 'setSpeed'
                } else if (device === 'ledStrip') {
                    action = 'setColor'
                } else if (device === 'buzzer') {
                    action = 'trigger'
                }

                results[device] = await controlDevice(device, action, params)
            } catch (err) {
                console.error(`Failed to set ${device} for mode ${mode}:`, err)
                results[device] = { error: err.message }
            }
        }

        addControlHistory({
            device: 'system',
            action: 'setEnvironmentalMode',
            params: { mode },
            timestamp: new Date(),
            success: true,
            results
        })

        return results
    }

    const emergencyStop = async () => {
        const devices = ['fan', 'ventilator', 'waterPump']
        const results = {}

        for (const device of devices) {
            try {
                results[device] = await controlDevice(device, 'stop', {})
            } catch (err) {
                console.error(`Failed to stop ${device}:`, err)
                results[device] = { error: err.message }
            }
        }

        // Turn off LEDs
        try {
            results.ledStrip = await setLEDColor(0, 0, 0)
        } catch (err) {
            console.error('Failed to turn off LEDs:', err)
            results.ledStrip = { error: err.message }
        }

        addControlHistory({
            device: 'system',
            action: 'emergencyStop',
            params: {},
            timestamp: new Date(),
            success: true,
            results
        })

        return results
    }

    // Utility functions
    const getDeviceState = (device) => {
        return states.value[device] || { isActive: false }
    }

    const isDeviceActive = (device) => {
        return states.value[device]?.isActive || false
    }

    const getDeviceConfig = (device) => {
        return config.value[device] || null
    }

    const getControlHistory = (device = null, limit = 10) => {
        let history = controlHistory.value

        if (device) {
            history = history.filter(entry => entry.device === device)
        }

        return history.slice(0, limit)
    }

    const formatDeviceValue = (device, key) => {
        const state = getDeviceState(device)
        const value = state[key]

        if (value === null || value === undefined) return '--'

        switch (key) {
            case 'speed':
            case 'currentSpeed':
                return `${value}%`
            case 'brightness':
                return `${value}%`
            case 'currentColor':
                if (typeof value === 'object') {
                    return `RGB(${value.r}, ${value.g}, ${value.b})`
                }
                return value
            case 'isActive':
                return value ? 'Active' : 'Inactive'
            default:
                return value.toString()
        }
    }

    const getDeviceStatusColor = (device) => {
        const state = getDeviceState(device)

        if (!state.isActive) return 'gray'

        switch (device) {
            case 'fan':
            case 'ventilator':
                const speed = state.speed || state.currentSpeed || 0
                if (speed > 80) return 'red'
                if (speed > 50) return 'yellow'
                if (speed > 0) return 'green'
                return 'gray'

            case 'ledStrip':
                return 'blue'

            case 'buzzer':
                return 'orange'

            case 'waterPump':
                return 'blue'

            default:
                return 'green'
        }
    }

    // Return store
    return {
        // State
        states,
        config,
        isLoading,
        lastUpdate,
        error,
        controlHistory,

        // Computed
        activeDevices,
        deviceList,
        fanSpeed,
        ledColor,
        isAnyDeviceActive,

        // Actions
        fetchStates,
        fetchConfig,
        controlDevice,
        testDevice,
        updateDeviceState,
        addControlHistory,
        clearError,
        reset,

        // Device Controls
        setFanSpeed,
        toggleFan,
        setLEDColor,
        setLEDPreset,
        triggerBuzzer,
        startWaterPump,
        setVentilatorSpeed,
        setEnvironmentalMode,
        emergencyStop,

        // Utilities
        getDeviceState,
        isDeviceActive,
        getDeviceConfig,
        getControlHistory,
        formatDeviceValue,
        getDeviceStatusColor
    }
})