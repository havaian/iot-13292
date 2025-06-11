import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Application Configuration
 * Centralized configuration management with validation and defaults
 */

class Config {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.validateRequiredEnvVars();
        this.config = this.buildConfig();
    }

    /**
     * Validate required environment variables
     */
    validateRequiredEnvVars() {
        const required = [
            'MONGO_USERNAME',
            'MONGO_PASSWORD',
            'MONGO_DATABASE',
            'JWT_SECRET'
        ];

        const missing = required.filter(envVar => !process.env[envVar]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Build complete configuration object
     */
    buildConfig() {
        return {
            // Application settings
            app: {
                name: 'Smart Environmental Monitor',
                version: '1.0.0',
                env: this.env,
                port: parseInt(process.env.PORT) || 8000,
                host: process.env.HOST || '0.0.0.0'
            },

            // Database configuration
            database: {
                mongodb: {
                    uri: process.env.MONGO_URI || 
                         `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@mongodb:27017/${process.env.MONGO_DATABASE}?authSource=admin`,
                    options: {
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        maxPoolSize: 10,
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                        bufferMaxEntries: 0
                    }
                },
                redis: {
                    uri: process.env.REDIS_URI || `redis://:${process.env.REDIS_PASSWORD}@redis:6379`,
                    options: {
                        retryDelayOnFailover: 100,
                        enableReadyCheck: false,
                        maxRetriesPerRequest: null
                    }
                }
            },

            // Security configuration
            security: {
                jwt: {
                    secret: process.env.JWT_SECRET,
                    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
                    algorithm: 'HS256'
                },
                cors: {
                    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
                    credentials: true,
                    optionsSuccessStatus: 200
                },
                rateLimit: {
                    windowMs: 15 * 60 * 1000, // 15 minutes
                    max: 100, // requests per window
                    standardHeaders: true,
                    legacyHeaders: false
                }
            },

            // GPIO and Hardware configuration
            hardware: {
                isRaspberryPi: process.env.IS_RASPBERRY_PI === 'true',
                sensors: {
                    readInterval: parseInt(process.env.SENSOR_READ_INTERVAL) || 5000,
                    retryAttempts: parseInt(process.env.SENSOR_RETRY_ATTEMPTS) || 3,
                    retryDelay: parseInt(process.env.SENSOR_RETRY_DELAY) || 1000,
                    calibration: {
                        temperature: {
                            offset: parseFloat(process.env.TEMP_OFFSET) || 0,
                            scale: parseFloat(process.env.TEMP_SCALE) || 1
                        },
                        humidity: {
                            offset: parseFloat(process.env.HUMIDITY_OFFSET) || 0,
                            scale: parseFloat(process.env.HUMIDITY_SCALE) || 1
                        }
                    }
                },
                actuators: {
                    pwmFrequency: parseInt(process.env.PWM_FREQUENCY) || 1000,
                    relayActiveHigh: process.env.RELAY_ACTIVE_HIGH !== 'false',
                    safetyTimeout: parseInt(process.env.ACTUATOR_SAFETY_TIMEOUT) || 300000 // 5 minutes
                }
            },

            // Alert thresholds
            alerts: {
                temperature: {
                    min: parseFloat(process.env.ALERT_THRESHOLDS_TEMP_MIN) || 10,
                    max: parseFloat(process.env.ALERT_THRESHOLDS_TEMP_MAX) || 35,
                    unit: '°C'
                },
                humidity: {
                    min: parseFloat(process.env.ALERT_THRESHOLDS_HUMIDITY_MIN) || 20,
                    max: parseFloat(process.env.ALERT_THRESHOLDS_HUMIDITY_MAX) || 80,
                    unit: '%'
                },
                airQuality: {
                    max: parseFloat(process.env.ALERT_THRESHOLDS_AQI_MAX) || 150,
                    unit: 'AQI'
                },
                noise: {
                    max: parseFloat(process.env.ALERT_THRESHOLDS_NOISE_MAX) || 70,
                    unit: 'dB'
                },
                lightLevel: {
                    min: parseFloat(process.env.ALERT_THRESHOLDS_LIGHT_MIN) || 50,
                    max: parseFloat(process.env.ALERT_THRESHOLDS_LIGHT_MAX) || 1000,
                    unit: 'lux'
                },
                soilMoisture: {
                    min: parseFloat(process.env.ALERT_THRESHOLDS_SOIL_MIN) || 30,
                    max: parseFloat(process.env.ALERT_THRESHOLDS_SOIL_MAX) || 80,
                    unit: '%'
                }
            },

            // Data management
            data: {
                retention: {
                    raw: parseInt(process.env.DATA_RETENTION_DAYS) || 30,
                    aggregated: parseInt(process.env.DATA_RETENTION_AGGREGATED_DAYS) || 365
                },
                aggregation: {
                    enabled: process.env.DATA_AGGREGATION_ENABLED !== 'false',
                    intervals: ['1h', '1d', '1w', '1M']
                },
                export: {
                    maxRecords: parseInt(process.env.EXPORT_MAX_RECORDS) || 10000,
                    formats: ['csv', 'json', 'xlsx']
                }
            },

            // Email configuration
            email: {
                enabled: process.env.SMTP_HOST ? true : false,
                smtp: {
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                },
                from: process.env.EMAIL_FROM || 'noreply@env-monitor.local',
                templates: {
                    alert: 'alert-notification',
                    report: 'daily-report',
                    maintenance: 'maintenance-notice'
                }
            },

            // Logging configuration
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: {
                    enabled: process.env.LOG_FILE_ENABLED !== 'false',
                    maxSize: process.env.LOG_MAX_SIZE || '20m',
                    maxFiles: process.env.LOG_MAX_FILES || '14d'
                },
                console: {
                    enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
                    colorize: process.env.LOG_COLORIZE !== 'false'
                }
            },

            // WebSocket configuration
            websocket: {
                enabled: process.env.WEBSOCKET_ENABLED !== 'false',
                port: parseInt(process.env.WEBSOCKET_PORT) || 8001,
                cors: {
                    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
                    methods: ['GET', 'POST']
                },
                heartbeat: {
                    interval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
                    timeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT) || 5000
                }
            },

            // Frontend configuration
            frontend: {
                url: process.env.FRONTEND_URL || 'http://localhost:3000',
                api: {
                    baseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
                    timeout: parseInt(process.env.API_TIMEOUT) || 10000
                }
            },

            // System monitoring
            monitoring: {
                healthCheck: {
                    enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
                    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000
                },
                metrics: {
                    enabled: process.env.METRICS_ENABLED !== 'false',
                    collectInterval: parseInt(process.env.METRICS_COLLECT_INTERVAL) || 30000
                }
            }
        };
    }

    /**
     * Get configuration value by path
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * Check if running in development mode
     */
    isDevelopment() {
        return this.env === 'development';
    }

    /**
     * Check if running in production mode
     */
    isProduction() {
        return this.env === 'production';
    }

    /**
     * Check if running in test mode
     */
    isTest() {
        return this.env === 'test';
    }

    /**
     * Get database URI
     */
    getDatabaseURI() {
        return this.config.database.mongodb.uri;
    }

    /**
     * Get Redis URI
     */
    getRedisURI() {
        return this.config.database.redis.uri;
    }

    /**
     * Get JWT secret
     */
    getJWTSecret() {
        return this.config.security.jwt.secret;
    }

    /**
     * Get alert thresholds for sensor type
     */
    getAlertThresholds(sensorType) {
        return this.config.alerts[sensorType] || null;
    }

    /**
     * Get sensor configuration
     */
    getSensorConfig() {
        return this.config.hardware.sensors;
    }

    /**
     * Get actuator configuration
     */
    getActuatorConfig() {
        return this.config.hardware.actuators;
    }

    /**
     * Validate configuration
     */
    validate() {
        const errors = [];

        // Validate port ranges
        if (this.config.app.port < 1024 || this.config.app.port > 65535) {
            errors.push('Invalid port number');
        }

        // Validate alert thresholds
        Object.entries(this.config.alerts).forEach(([sensor, thresholds]) => {
            if (thresholds.min && thresholds.max && thresholds.min >= thresholds.max) {
                errors.push(`Invalid alert thresholds for ${sensor}: min >= max`);
            }
        });

        // Validate sensor read interval
        if (this.config.hardware.sensors.readInterval < 1000) {
            errors.push('Sensor read interval too low (minimum 1000ms)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get configuration summary for logging
     */
    getSummary() {
        return {
            environment: this.env,
            app: this.config.app,
            isRaspberryPi: this.config.hardware.isRaspberryPi,
            database: {
                mongodb: !!this.config.database.mongodb.uri,
                redis: !!this.config.database.redis.uri
            },
            email: this.config.email.enabled,
            websocket: this.config.websocket.enabled
        };
    }
}

export default new Config();