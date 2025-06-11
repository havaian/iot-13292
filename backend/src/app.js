import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import config from './utils/config.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import authMiddleware from './middleware/auth.js';
import validationMiddleware from './middleware/validation.js';

// Import routes
import sensorRoutes from './routes/sensors.js';
import deviceRoutes from './routes/devices.js';
import dataRoutes from './routes/data.js';

// Import services
import WebSocketService from './services/WebSocketService.js';
import DataService from './services/DataService.js';

// Import GPIO managers
import SensorManager from './gpio/SensorManager.js';
import ActuatorManager from './gpio/ActuatorManager.js';

/**
 * Express Application Setup
 * Main application configuration with middleware, routes, and WebSocket
 */

class App {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new Server(this.server, {
            cors: config.get('websocket.cors'),
            transports: ['websocket', 'polling']
        });

        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeWebSocket();
        this.initializeErrorHandling();
        this.initializeGracefulShutdown();
    }

    /**
     * Initialize Express middleware
     */
    initializeMiddleware() {
        // Security middleware
        this.app.use(helmet({
            crossOriginEmbedderPolicy: false,
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"]
                }
            }
        }));

        // CORS configuration
        this.app.use(cors(config.get('security.cors')));

        // Rate limiting
        const limiter = rateLimit(config.get('security.rateLimit'));
        this.app.use('/api/', limiter);

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use(morgan('combined', {
            stream: {
                write: (message) => logger.api.request('HTTP', message.trim())
            }
        }));

        // Custom request timing middleware
        this.app.use((req, res, next) => {
            req.startTime = Date.now();

            // Override res.end to log response
            const originalEnd = res.end;
            res.end = function (...args) {
                const responseTime = Date.now() - req.startTime;
                logger.api.response(req.method, req.originalUrl, res.statusCode, responseTime);
                originalEnd.apply(this, args);
            };

            next();
        });

        // Health check endpoint (before auth)
        this.app.get('/health', this.healthCheck.bind(this));
        this.app.get('/api/health', this.healthCheck.bind(this));
    }

    /**
     * Initialize API routes
     */
    initializeRoutes() {
        // API base path
        const apiRouter = express.Router();

        // Public routes (no auth required)
        apiRouter.get('/status', this.getSystemStatus.bind(this));
        apiRouter.get('/config', this.getPublicConfig.bind(this));

        // Protected routes (auth required for production)
        if (config.isProduction()) {
            apiRouter.use(authMiddleware);
        }

        // Mount route modules
        apiRouter.use('/sensors', sensorRoutes);
        apiRouter.use('/devices', deviceRoutes);
        apiRouter.use('/data', dataRoutes);

        // Development routes
        if (config.isDevelopment()) {
            apiRouter.get('/test/sensors', this.testAllSensors.bind(this));
            apiRouter.get('/test/actuators', this.testAllActuators.bind(this));
            apiRouter.post('/test/emergency', this.testEmergencyAlert.bind(this));
        }

        // Mount API router
        this.app.use('/api', apiRouter);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: config.get('app.name'),
                version: config.get('app.version'),
                environment: config.get('app.env'),
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                endpoints: {
                    health: '/health',
                    api: '/api',
                    status: '/api/status',
                    sensors: '/api/sensors',
                    devices: '/api/devices',
                    data: '/api/data'
                }
            });
        });

        // 404 handler for API routes
        this.app.use('/api/*', (req, res) => {
            res.status(404).json({
                error: 'API endpoint not found',
                method: req.method,
                path: req.originalUrl,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Initialize WebSocket connections
     */
    initializeWebSocket() {
        WebSocketService.initialize(this.io);

        this.io.on('connection', (socket) => {
            logger.ws.connect(socket.id, socket.handshake.address);

            // Handle client events
            socket.on('subscribe-sensors', () => {
                socket.join('sensor-updates');
                logger.ws.message(socket.id, 'subscribe-sensors');
            });

            socket.on('unsubscribe-sensors', () => {
                socket.leave('sensor-updates');
                logger.ws.message(socket.id, 'unsubscribe-sensors');
            });

            socket.on('control-device', async (data) => {
                try {
                    logger.ws.message(socket.id, 'control-device');
                    const result = await this.handleDeviceControl(data);
                    socket.emit('device-control-result', result);

                    // Broadcast device state change to all clients
                    this.io.emit('device-state-changed', {
                        device: data.device,
                        state: result.state,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    logger.ws.error(socket.id, error);
                    socket.emit('device-control-error', {
                        error: error.message,
                        device: data.device
                    });
                }
            });

            socket.on('disconnect', (reason) => {
                logger.ws.disconnect(socket.id, reason);
            });

            // Send initial data
            socket.emit('welcome', {
                message: 'Connected to Smart Environmental Monitor',
                timestamp: new Date().toISOString(),
                clientId: socket.id
            });
        });

        logger.info('WebSocket server initialized');
    }

    /**
     * Initialize error handling
     */
    initializeErrorHandling() {
        // 404 handler for all other routes
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Route not found',
                method: req.method,
                path: req.originalUrl,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use(errorHandler);
    }

    /**
     * Health check endpoint
     */
    async healthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: config.get('app.env'),
                version: config.get('app.version'),
                services: {
                    sensors: SensorManager.isReading,
                    actuators: true,
                    websocket: true,
                    database: await DataService.checkConnection()
                },
                system: {
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    platform: process.platform,
                    nodeVersion: process.version
                }
            };

            // Check if any critical services are down
            const criticalServices = ['database'];
            const failedServices = criticalServices.filter(service => !health.services[service]);

            if (failedServices.length > 0) {
                health.status = 'unhealthy';
                health.failedServices = failedServices;
                return res.status(503).json(health);
            }

            res.json(health);
        } catch (error) {
            logger.error('Health check failed:', error);
            res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get system status
     */
    async getSystemStatus(req, res) {
        try {
            const status = {
                system: {
                    name: config.get('app.name'),
                    version: config.get('app.version'),
                    environment: config.get('app.env'),
                    uptime: process.uptime(),
                    isRaspberryPi: config.get('hardware.isRaspberryPi')
                },
                sensors: SensorManager.getSensorStatus(),
                actuators: ActuatorManager.getActuatorStates(),
                data: await DataService.getStatistics(),
                connections: {
                    websocket: this.io.engine.clientsCount,
                    database: await DataService.checkConnection()
                },
                timestamp: new Date().toISOString()
            };

            res.json(status);
        } catch (error) {
            logger.error('Failed to get system status:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get public configuration
     */
    getPublicConfig(req, res) {
        const publicConfig = {
            app: {
                name: config.get('app.name'),
                version: config.get('app.version')
            },
            sensors: config.getSensorConfig(),
            alerts: config.get('alerts'),
            websocket: {
                enabled: config.get('websocket.enabled')
            },
            features: {
                email: config.get('email.enabled'),
                dataExport: true,
                realTimeMonitoring: true
            }
        };

        res.json(publicConfig);
    }

    /**
     * Test all sensors (development only)
     */
    async testAllSensors(req, res) {
        try {
            const results = {};
            const sensors = ['dht22', 'mq135', 'bh1750', 'microphone', 'soilMoisture'];

            for (const sensor of sensors) {
                results[sensor] = await SensorManager.testSensor(sensor);
            }

            res.json({
                success: true,
                results,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Sensor testing failed:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Test all actuators (development only)
     */
    async testAllActuators(req, res) {
        try {
            const results = {};
            const actuators = ['fan', 'ledStrip', 'buzzer', 'waterPump', 'ventilator'];

            for (const actuator of actuators) {
                results[actuator] = await ActuatorManager.testActuator(actuator, { duration: 2 });
                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            res.json({
                success: true,
                results,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Actuator testing failed:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Test emergency alert (development only)
     */
    async testEmergencyAlert(req, res) {
        try {
            const result = await ActuatorManager.emergencyAlert('test');

            // Broadcast alert to all WebSocket clients
            this.io.emit('emergency-alert', {
                type: 'test',
                message: 'Test emergency alert triggered',
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Emergency alert test failed:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Handle device control via WebSocket
     */
    async handleDeviceControl(data) {
        const { device, action, params = {} } = data;

        logger.info(`Device control request: ${device} - ${action}`, params);

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
            default:
                throw new Error(`Unknown device: ${device}`);
        }
    }

    /**
     * Initialize graceful shutdown
     */
    initializeGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            logger.system.shutdown();
            logger.info(`Received ${signal}, shutting down gracefully...`);

            try {
                // Stop accepting new connections
                this.server.close(() => {
                    logger.info('HTTP server closed');
                });

                // Close WebSocket connections
                this.io.close(() => {
                    logger.info('WebSocket server closed');
                });

                // Cleanup GPIO
                SensorManager.cleanup();
                ActuatorManager.cleanup();

                // Close database connections
                await DataService.disconnect();

                logger.info('Graceful shutdown completed');
                process.exit(0);

            } catch (error) {
                logger.error('Error during graceful shutdown:', error);
                process.exit(1);
            }
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection:', { reason, promise });
            gracefulShutdown('UNHANDLED_REJECTION');
        });
    }

    /**
     * Start the application
     */
    async start() {
        try {
            // Initialize hardware
            await SensorManager.initialize();
            await ActuatorManager.initialize();

            // Initialize data service
            await DataService.initialize();

            // Start sensor readings
            SensorManager.startReading(config.get('hardware.sensors.readInterval'));

            // Setup WebSocket data broadcasting
            WebSocketService.startBroadcasting();

            // Start server
            const port = config.get('app.port');
            const host = config.get('app.host');

            this.server.listen(port, host, () => {
                logger.system.startup();
                logger.info(`🚀 Server running on http://${host}:${port}`);
                logger.info(`📊 Environment: ${config.get('app.env')}`);
                logger.info(`🔧 Hardware: ${config.get('hardware.isRaspberryPi') ? 'Raspberry Pi' : 'Development'}`);
                logger.info(`📡 WebSocket: ${config.get('websocket.enabled') ? 'Enabled' : 'Disabled'}`);

                // Log configuration summary
                logger.info('Configuration Summary:', config.getSummary());
            });

        } catch (error) {
            logger.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    /**
     * Get Express app instance
     */
    getApp() {
        return this.app;
    }

    /**
     * Get HTTP server instance
     */
    getServer() {
        return this.server;
    }

    /**
     * Get Socket.IO instance
     */
    getIO() {
        return this.io;
    }
}

export default App;