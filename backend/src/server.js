#!/usr/bin/env node

/**
 * Smart Environmental Monitor - Server Entry Point
 * 
 * This is the main entry point for the IoT backend server.
 * It initializes the Express application with all necessary
 * middleware, routes, WebSocket connections, and GPIO hardware.
 */

import App from './app.js';
import logger from './utils/logger.js';
import config from './utils/config.js';

/**
 * Main server initialization function
 */
async function main() {
    try {
        // Log startup banner
        logger.info('🌱 Smart Environmental Monitor Starting...');
        logger.info('═'.repeat(50));

        // Validate configuration
        const validation = config.validate();
        if (!validation.isValid) {
            logger.error('Configuration validation failed:');
            validation.errors.forEach(error => logger.error(`  - ${error}`));
            process.exit(1);
        }

        // Create and start application
        const app = new App();
        await app.start();

        // Log successful startup
        logger.info('═'.repeat(50));
        logger.info('✅ Smart Environmental Monitor Started Successfully');
        logger.info('');
        logger.info('Available endpoints:');
        logger.info(`   Health Check: http://localhost:${config.get('app.port')}/health`);
        logger.info(`   API Base:     http://localhost:${config.get('app.port')}/api`);
        logger.info(`   System Status: http://localhost:${config.get('app.port')}/api/status`);
        logger.info(`   Sensors:      http://localhost:${config.get('app.port')}/api/sensors`);
        logger.info(`   Devices:      http://localhost:${config.get('app.port')}/api/devices`);
        logger.info(`   Data:         http://localhost:${config.get('app.port')}/api/data`);

        if (config.isDevelopment()) {
            logger.info('');
            logger.info('Development endpoints:');
            logger.info(`   Test Sensors:  http://localhost:${config.get('app.port')}/api/test/sensors`);
            logger.info(`   Test Actuators: http://localhost:${config.get('app.port')}/api/test/actuators`);
        }

        logger.info('');
        logger.info('🎯 System ready to monitor environmental conditions!');

    } catch (error) {
        logger.error('❌ Failed to start Smart Environmental Monitor:', error);

        // Log additional error context
        if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${config.get('app.port')} is already in use. Please check if another instance is running.`);
        } else if (error.code === 'EACCES') {
            logger.error('Permission denied. Make sure the user has proper permissions for GPIO access.');
        } else if (error.code === 'ENOENT') {
            logger.error('Required file or directory not found. Check installation and file permissions.');
        }

        process.exit(1);
    }
}

/**
 * Handle startup errors
 */
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception during startup:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection during startup:', { reason, promise });
    process.exit(1);
});

/**
 * Display system information on startup
 */
function logSystemInfo() {
    logger.info('System Information:');
    logger.info(`  Node.js:     ${process.version}`);
    logger.info(`  Platform:    ${process.platform} ${process.arch}`);
    logger.info(`  Environment: ${config.get('app.env')}`);
    logger.info(`  Hardware:    ${config.get('hardware.isRaspberryPi') ? 'Raspberry Pi' : 'Development Machine'}`);
    logger.info(`  Memory:      ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
    logger.info(`  Working Dir: ${process.cwd()}`);
}

// Log system information
logSystemInfo();

// Start the application
main().catch(error => {
    logger.error('Startup failed:', error);
    process.exit(1);
});