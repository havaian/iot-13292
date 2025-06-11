import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import { useAppStore } from './app'
import { useSensorStore } from './sensors'
import { useDeviceStore } from './devices'

export const useSocketStore = defineStore('socket', () => {
    // State
    const socket = ref(null)
    const isConnected = ref(false)
    const connectionAttempts = ref(0)
    const lastError = ref(null)
    const clientId = ref(null)
    const connectedClients = ref(0)
    const roundTripTime = ref(null)
    const reconnectInterval = ref(null)

    // Computed
    const connectionStatus = computed(() => {
        if (isConnected.value) return 'connected'
        if (connectionAttempts.value > 0) return 'connecting'
        return 'disconnected'
    })

    const connectionColor = computed(() => {
        switch (connectionStatus.value) {
            case 'connected': return 'green'
            case 'connecting': return 'yellow'
            default: return 'red'
        }
    })

    // Actions
    const connect = () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
            const wsUrl = import.meta.env.VITE_WS_URL || apiUrl

            socket.value = io(wsUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                autoConnect: true
            })

            setupEventHandlers()

        } catch (error) {
            console.error('Failed to create socket connection:', error)
            lastError.value = error.message
        }
    }

    const disconnect = () => {
        if (socket.value) {
            socket.value.disconnect()
            socket.value = null
        }

        if (reconnectInterval.value) {
            clearInterval(reconnectInterval.value)
            reconnectInterval.value = null
        }

        isConnected.value = false
        connectionAttempts.value = 0
        clientId.value = null
    }

    const setupEventHandlers = () => {
        if (!socket.value) return

        // Connection events
        socket.value.on('connect', handleConnect)
        socket.value.on('disconnect', handleDisconnect)
        socket.value.on('connect_error', handleConnectError)
        socket.value.on('reconnect', handleReconnect)
        socket.value.on('reconnect_attempt', handleReconnectAttempt)
        socket.value.on('reconnect_error', handleReconnectError)
        socket.value.on('reconnect_failed', handleReconnectFailed)

        // Application events
        socket.value.on('welcome', handleWelcome)
        socket.value.on('sensor-data', handleSensorData)
        socket.value.on('device-state-changed', handleDeviceStateChanged)
        socket.value.on('device-control-result', handleDeviceControlResult)
        socket.value.on('device-control-error', handleDeviceControlError)
        socket.value.on('system-alert', handleSystemAlert)
        socket.value.on('emergency-alert', handleEmergencyAlert)
        socket.value.on('client-count-update', handleClientCountUpdate)
        socket.value.on('status-update', handleStatusUpdate)
        socket.value.on('error', handleError)
        socket.value.on('pong', handlePong)
    }

    // Event handlers
    const handleConnect = () => {
        console.log('Socket connected')
        isConnected.value = true
        connectionAttempts.value = 0
        lastError.value = null

        const appStore = useAppStore()
        appStore.showToast('Connected to server', 'success')

        // Subscribe to sensor updates
        subscribeToSensors()

        // Start ping/pong for latency measurement
        startPingPong()
    }

    const handleDisconnect = (reason) => {
        console.log('Socket disconnected:', reason)
        isConnected.value = false
        clientId.value = null

        const appStore = useAppStore()
        appStore.showToast('Disconnected from server', 'warning')

        // Start reconnection attempts if not intentional
        if (reason !== 'io client disconnect') {
            startReconnection()
        }
    }

    const handleConnectError = (error) => {
        console.error('Socket connection error:', error)
        lastError.value = error.message
        connectionAttempts.value++

        const appStore = useAppStore()
        appStore.showToast('Connection failed', 'error')
    }

    const handleReconnect = (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts')
        connectionAttempts.value = 0

        const appStore = useAppStore()
        appStore.showToast('Reconnected to server', 'success')
    }

    const handleReconnectAttempt = (attemptNumber) => {
        console.log('Socket reconnection attempt:', attemptNumber)
        connectionAttempts.value = attemptNumber
    }

    const handleReconnectError = (error) => {
        console.error('Socket reconnection error:', error)
        lastError.value = error.message
    }

    const handleReconnectFailed = () => {
        console.error('Socket reconnection failed')
        const appStore = useAppStore()
        appStore.showToast('Failed to reconnect to server', 'error')

        // Start manual reconnection attempts
        startReconnection()
    }

    const handleWelcome = (data) => {
        console.log('Welcome message received:', data)
        clientId.value = data.clientId
        connectedClients.value = data.connectedClients || 1
    }

    const handleSensorData = (data) => {
        const sensorStore = useSensorStore()
        sensorStore.updateLatestReadings(data)
    }

    const handleDeviceStateChanged = (data) => {
        const deviceStore = useDeviceStore()
        deviceStore.updateDeviceState(data.device, data.state)
    }

    const handleDeviceControlResult = (data) => {
        const appStore = useAppStore()
        appStore.showToast(`${data.device} control successful`, 'success')
    }

    const handleDeviceControlError = (data) => {
        const appStore = useAppStore()
        appStore.showToast(`${data.device} control failed: ${data.error}`, 'error')
    }

    const handleSystemAlert = (alert) => {
        const appStore = useAppStore()
        appStore.addNotification({
            type: alert.level || 'warning',
            title: 'System Alert',
            message: alert.message,
            persistent: alert.critical || false
        })
    }

    const handleEmergencyAlert = (alert) => {
        const appStore = useAppStore()
        appStore.addNotification({
            type: 'error',
            title: 'Emergency Alert',
            message: alert.message,
            persistent: true
        })

        // You could trigger additional emergency UI here
        // e.g., modal, sound, browser notification
    }

    const handleClientCountUpdate = (data) => {
        connectedClients.value = data.count
    }

    const handleStatusUpdate = (data) => {
        const appStore = useAppStore()
        appStore.updateSystemStatus(data)
    }

    const handleError = (error) => {
        console.error('Socket error:', error)
        lastError.value = error.message

        const appStore = useAppStore()
        appStore.showToast('Socket error occurred', 'error')
    }

    const handlePong = (data) => {
        const now = Date.now()
        const sent = data.timestamp ? new Date(data.timestamp).getTime() : now
        roundTripTime.value = now - sent
    }

    // Utility functions
    const startReconnection = () => {
        if (reconnectInterval.value) return

        reconnectInterval.value = setInterval(() => {
            if (!isConnected.value && socket.value) {
                console.log('Attempting manual reconnection...')
                socket.value.connect()
            } else if (isConnected.value) {
                clearInterval(reconnectInterval.value)
                reconnectInterval.value = null
            }
        }, 5000)
    }

    const startPingPong = () => {
        if (!socket.value) return

        const pingInterval = setInterval(() => {
            if (isConnected.value && socket.value) {
                socket.value.emit('ping', { timestamp: new Date().toISOString() })
            } else {
                clearInterval(pingInterval)
            }
        }, 30000) // Ping every 30 seconds
    }

    const subscribeToSensors = () => {
        if (socket.value && isConnected.value) {
            socket.value.emit('subscribe-sensors')
        }
    }

    const unsubscribeFromSensors = () => {
        if (socket.value && isConnected.value) {
            socket.value.emit('unsubscribe-sensors')
        }
    }

    const controlDevice = (device, action, params = {}) => {
        return new Promise((resolve, reject) => {
            if (!socket.value || !isConnected.value) {
                reject(new Error('Socket not connected'))
                return
            }

            const timeout = setTimeout(() => {
                reject(new Error('Device control timeout'))
            }, 10000)

            // Listen for result
            const handleResult = (data) => {
                if (data.device === device) {
                    clearTimeout(timeout)
                    socket.value.off('device-control-result', handleResult)
                    socket.value.off('device-control-error', handleError)
                    resolve(data)
                }
            }

            const handleError = (data) => {
                if (data.device === device) {
                    clearTimeout(timeout)
                    socket.value.off('device-control-result', handleResult)
                    socket.value.off('device-control-error', handleError)
                    reject(new Error(data.error))
                }
            }

            socket.value.on('device-control-result', handleResult)
            socket.value.on('device-control-error', handleError)

            // Send control command
            socket.value.emit('control-device', { device, action, params })
        })
    }

    const requestStatus = () => {
        if (socket.value && isConnected.value) {
            socket.value.emit('get-status')
        }
    }

    const getConnectionStats = () => {
        return {
            isConnected: isConnected.value,
            clientId: clientId.value,
            connectedClients: connectedClients.value,
            connectionAttempts: connectionAttempts.value,
            roundTripTime: roundTripTime.value,
            lastError: lastError.value,
            status: connectionStatus.value
        }
    }

    // Return store
    return {
        // State
        socket,
        isConnected,
        connectionAttempts,
        lastError,
        clientId,
        connectedClients,
        roundTripTime,

        // Computed
        connectionStatus,
        connectionColor,

        // Actions
        connect,
        disconnect,
        subscribeToSensors,
        unsubscribeFromSensors,
        controlDevice,
        requestStatus,
        getConnectionStats
    }
})