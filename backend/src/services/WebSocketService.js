import logger from '../utils/logger.js';
import config from '../utils/config.js';
import SensorManager from '../gpio/SensorManager.js';
import ActuatorManager from '../gpio/ActuatorManager.js';

/**
 * WebSocket Service
 * Handles real-time communication between server and clients
 */
class WebSocketService {
    constructor() {
        this.io = null;
        this.broadcastInterval = null;
        this.connectedClients = new Map();
        this.broadcastStats = {
            totalMessages: 0,
            lastBroadcast: null,
            averageClients: 0
        };
    }

    /**
     * Initialize WebSocket service
     */
    initialize(io) {
        this.io = io;
        this.setupEventHandlers();
        logger.info('WebSocket service initialized');
    }

    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);

            socket.on('disconnect', (reason) => {
                this.handleDisconnection(socket, reason);
            });

            socket.on('error', (error) => {
                logger.ws.error(socket.id, error);
            });
        });
    }

    /**
     * Handle new client connection
     */
    handleConnection(socket) {
        const clientInfo = {
            id: socket.id,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            connectedAt: new Date(),
            subscriptions: new Set()
        };

        this.connectedClients.set(socket.id, clientInfo);

        logger.ws.connect(socket.id, clientInfo.ip);

        // Send welcome message with current system status
        socket.emit('welcome', {
            message: 'Connected to Smart Environmental Monitor',
            clientId: socket.id,
            serverTime: new Date().toISOString(),
            connectedClients: this.connectedClients.size
        });

        // Send initial sensor data
        this.sendInitialData(socket);

        // Setup client-specific event handlers
        this.setupClientHandlers(socket);
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(socket, reason) {
        this.connectedClients.delete(socket.id);
        logger.ws.disconnect(socket.id, reason);

        // Broadcast updated client count
        this.broadcastClientCount();
    }

    /**
     * Setup client-specific event handlers
     */
    setupClientHandlers(socket) {
        // Sensor subscription
        socket.on('subscribe-sensors', (sensors) => {
            const clientInfo = this.connectedClients.get(socket.id);
            if (clientInfo) {
                if (Array.isArray(sensors)) {
                    sensors.forEach(sensor => clientInfo.subscriptions.add(sensor));
                } else {
                    // Subscribe to all sensors
                    ['temperature', 'humidity', 'airQuality', 'lightLevel', 'noiseLevel', 'soilMoisture']
                        .forEach(sensor => clientInfo.subscriptions.add(sensor));
                }
                socket.join('sensor-updates');
                logger.ws.message(socket.id, 'subscribe-sensors');
            }
        });

        // Sensor unsubscription
        socket.on('unsubscribe-sensors', (sensors) => {
            const clientInfo = this.connectedClients.get(socket.id);
            if (clientInfo) {
                if (Array.isArray(sensors)) {
                    sensors.forEach(sensor => clientInfo.subscriptions.delete(sensor));
                } else {
                    clientInfo.subscriptions.clear();
                }

                if (clientInfo.subscriptions.size === 0) {
                    socket.leave('sensor-updates');
                }
                logger.ws.message(socket.id, 'unsubscribe-sensors');
            }
        });

        // Device control
        socket.on('control-device', async (data) => {
            try {
                logger.ws.message(socket.id, 'control-device');
                const result = await this.handleDeviceControl(data);

                socket.emit('device-control-result', {
                    success: true,
                    device: data.device,
                    action: data.action,
                    result: result.state,
                    timestamp: new Date().toISOString()
                });

                // Broadcast device state change to all clients
                this.broadcastDeviceStateChange(data.device, result.state);

            } catch (error) {
                logger.ws.error(socket.id, error);
                socket.emit('device-control-error', {
                    success: false,
                    device: data.device,
                    action: data.action,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Request current status
        socket.on('get-status', async () => {
            try {
                const status = await this.getCurrentStatus();
                socket.emit('status-update', status);
            } catch (error) {
                logger.ws.error(socket.id, error);
                socket.emit('error', { message: 'Failed to get status' });
            }
        });

        // Ping/Pong for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
    }

    /**
     * Send initial data to newly connected client
     */
    async sendInitialData(socket) {
        try {
            // Get latest sensor readings
            const sensorData = SensorManager.getLatestReadings();
            if (sensorData) {
                socket.emit('sensor-data', sensorData);
            }

            // Get current device states
            const deviceStates = ActuatorManager.getActuatorStates();
            socket.emit('device-states', deviceStates);

            // Get sensor status
            const sensorStatus = SensorManager.getSensorStatus();
            socket.emit('sensor-status', sensorStatus);

        } catch (error) {
            logger.error('Failed to send initial data:', error);
        }
    }

    /**
     * Start broadcasting sensor data
     */
    startBroadcasting() {
        const interval = config.get('hardware.sensors.readInterval') || 5000;

        this.broadcastInterval = setInterval(() => {
            this.broadcastSensorData();
        }, interval);

        logger.info(`Started WebSocket broadcasting every ${interval}ms`);
    }

    /**
     * Stop broadcasting sensor data
     */
    stopBroadcasting() {
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
            logger.info('Stopped WebSocket broadcasting');
        }
    }

    /**
     * Broadcast sensor data to all subscribed clients
     */
    broadcastSensorData() {
        try {
            const sensorData = SensorManager.getLatestReadings();
            if (sensorData && this.io) {
                // Broadcast to all clients subscribed to sensor updates
                this.io.to('sensor-updates').emit('sensor-data', sensorData);

                // Update broadcast statistics
                this.updateBroadcastStats();

                logger.ws.broadcast('sensor-data', this.io.engine.clientsCount);
            }
        } catch (error) {
            logger.error('Failed to broadcast sensor data:', error);
        }
    }

    /**
     * Broadcast device state change
     */
    broadcastDeviceStateChange(device, state) {
        if (this.io) {
            this.io.emit('device-state-changed', {
                device,
                state,
                timestamp: new Date().toISOString()
            });

            logger.ws.broadcast('device-state-changed', this.io.engine.clientsCount);
        }
    }

    /**
     * Broadcast system alert
     */
    broadcastAlert(alert) {
        if (this.io) {
            this.io.emit('system-alert', {
                ...alert,
                timestamp: new Date().toISOString()
            });

            logger.ws.broadcast('system-alert', this.io.engine.clientsCount);
        }
    }

    /**
     * Broadcast client count update
     */
    broadcastClientCount() {
        if (this.io) {
            this.io.emit('client-count-update', {
                count: this.connectedClients.size,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Handle device control request
     */
    async handleDeviceControl(data) {
        const { device, action, params = {} } = data;

        switch (device) {
            case 'fan':
                return await ActuatorManager.controlFan(params.speed, params.duration);
            case 'ledStrip':
                return await ActuatorManager.controlLEDStrip(params.r, params.g, params.b, params.brightness);
            case 'buzzer':
                return await ActuatorManager.controlBuzzer(params.pattern, params.duration);
            case 'waterPump':
                return await ActuatorManager.controlWaterPump(params.duration);
            case 'ventilator':
                return await ActuatorManager.controlVentilator(params.speed);
            case 'environmentalStatus':
                return await ActuatorManager.setEnvironmentalStatus(params.status);
            default:
                throw new Error(`Unknown device: ${device}`);
        }
    }

    /**
     * Get current system status
     */
    async getCurrentStatus() {
        return {
            sensors: SensorManager.getSensorStatus(),
            actuators: ActuatorManager.getActuatorStates(),
            latestReadings: SensorManager.getLatestReadings(),
            connectedClients: this.connectedClients.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Update broadcast statistics
     */
    updateBroadcastStats() {
        this.broadcastStats.totalMessages++;
        this.broadcastStats.lastBroadcast = new Date();
        this.broadcastStats.averageClients = this.io.engine.clientsCount;
    }

    /**
     * Get WebSocket statistics
     */
    getStatistics() {
        return {
            connectedClients: this.connectedClients.size,
            clientDetails: Array.from(this.connectedClients.values()).map(client => ({
                id: client.id,
                ip: client.ip,
                connectedAt: client.connectedAt,
                subscriptions: Array.from(client.subscriptions),
                duration: Date.now() - client.connectedAt.getTime()
            })),
            broadcastStats: this.broadcastStats,
            isActive: !!this.broadcastInterval
        };
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId, event, data) {
        if (this.io) {
            this.io.to(clientId).emit(event, data);
            logger.ws.message(clientId, event);
        }
    }

    /**
     * Send message to all clients
     */
    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
            logger.ws.broadcast(event, this.io.engine.clientsCount);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopBroadcasting();
        this.connectedClients.clear();

        if (this.io) {
            this.io.close();
        }

        logger.info('WebSocket service cleanup completed');
    }
}

export default new WebSocketService();