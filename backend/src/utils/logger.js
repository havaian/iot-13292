import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Winston Logger Configuration
 * Provides structured logging with file rotation and console output
 */

// Define log levels and colors
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;

        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta, null, 2)}`;
        }

        return msg;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Define transports
const transports = [
    // Console transport
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
    }),

    // Combined logs (all levels)
    new DailyRotateFile({
        filename: path.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'debug',
        format: fileFormat,
        handleExceptions: true,
        handleRejections: true
    }),

    // Error logs only
    new DailyRotateFile({
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: fileFormat,
        handleExceptions: true,
        handleRejections: true
    }),

    // HTTP access logs
    new DailyRotateFile({
        filename: path.join(logsDir, 'access-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        level: 'http',
        format: fileFormat
    })
];

// Create logger instance
const logger = winston.createLogger({
    levels: logLevels,
    transports,
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test'
});

// Add GPIO-specific logging methods
logger.gpio = {
    read: (pin, value) => logger.debug(`GPIO Read: Pin ${pin} = ${value}`),
    write: (pin, value) => logger.debug(`GPIO Write: Pin ${pin} = ${value}`),
    error: (pin, error) => logger.error(`GPIO Error: Pin ${pin}`, { error: error.message }),
    config: (pin, direction) => logger.info(`GPIO Config: Pin ${pin} configured as ${direction}`)
};

// Add sensor-specific logging methods
logger.sensor = {
    reading: (sensor, data) => logger.debug(`Sensor Reading: ${sensor}`, data),
    error: (sensor, error) => logger.error(`Sensor Error: ${sensor}`, { error: error.message }),
    calibration: (sensor, params) => logger.info(`Sensor Calibration: ${sensor}`, params)
};

// Add actuator-specific logging methods
logger.actuator = {
    control: (actuator, action, params) => logger.info(`Actuator Control: ${actuator} ${action}`, params),
    error: (actuator, error) => logger.error(`Actuator Error: ${actuator}`, { error: error.message }),
    state: (actuator, state) => logger.debug(`Actuator State: ${actuator}`, state)
};

// Add system monitoring methods
logger.system = {
    startup: () => logger.info('🚀 Smart Environmental Monitor System Starting'),
    shutdown: () => logger.info('🛑 Smart Environmental Monitor System Shutting Down'),
    health: (status) => logger.info('System Health Check', status),
    performance: (metrics) => logger.debug('Performance Metrics', metrics),
    memory: (usage) => logger.debug('Memory Usage', usage)
};

// Add API logging methods
logger.api = {
    request: (method, url, ip, userAgent) => {
        logger.http(`${method} ${url}`, {
            ip,
            userAgent: userAgent?.substring(0, 100) // Truncate long user agents
        });
    },
    response: (method, url, statusCode, responseTime) => {
        logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms`);
    },
    error: (method, url, statusCode, error) => {
        logger.error(`API Error: ${method} ${url} ${statusCode}`, { error: error.message });
    },
    auth: (action, user, ip) => {
        logger.info(`Auth: ${action}`, { user, ip });
    }
};

// Add WebSocket logging methods
logger.ws = {
    connect: (clientId, ip) => logger.info(`WebSocket Connected: ${clientId}`, { ip }),
    disconnect: (clientId, reason) => logger.info(`WebSocket Disconnected: ${clientId}`, { reason }),
    message: (clientId, type) => logger.debug(`WebSocket Message: ${clientId} sent ${type}`),
    error: (clientId, error) => logger.error(`WebSocket Error: ${clientId}`, { error: error.message }),
    broadcast: (type, clientCount) => logger.debug(`WebSocket Broadcast: ${type} to ${clientCount} clients`)
};

// Add database logging methods
logger.db = {
    connect: (database) => logger.info(`Database Connected: ${database}`),
    disconnect: (database) => logger.info(`Database Disconnected: ${database}`),
    query: (operation, collection, duration) => {
        logger.debug(`DB Query: ${operation} on ${collection} (${duration}ms)`);
    },
    error: (operation, error) => logger.error(`Database Error: ${operation}`, { error: error.message }),
    migration: (version) => logger.info(`Database Migration: ${version}`)
};

// Add environment-specific configuration
if (process.env.NODE_ENV === 'development') {
    logger.level = 'debug';
    logger.info('Logger configured for development environment');
} else if (process.env.NODE_ENV === 'production') {
    logger.level = process.env.LOG_LEVEL || 'info';
    logger.info('Logger configured for production environment');
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
});

// Graceful shutdown logging
process.on('SIGTERM', () => {
    logger.system.shutdown();
    logger.end();
});

process.on('SIGINT', () => {
    logger.system.shutdown();
    logger.end();
});

export default logger;