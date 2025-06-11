import GPIOManager from './GPIOManager.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

/**
 * Sensor Manager - Handles all sensor operations
 * Supports both real sensors on Pi and mock data for development
 */
class SensorManager {
    constructor() {
        this.sensors = new Map();
        this.isReading = false;
        this.readingInterval = null;
        this.latestReadings = new Map();

        // Sensor configuration
        this.sensorConfig = {
            dht22: {
                pin: 18,
                type: 'digital',
                name: 'DHT22 Temperature & Humidity',
                units: { temperature: '°C', humidity: '%' }
            },
            mq135: {
                pin: 25,
                type: 'analog',
                name: 'MQ135 Air Quality',
                units: { airQuality: 'ppm' }
            },
            bh1750: {
                pin: 23,
                type: 'i2c',
                address: 0x23,
                name: 'BH1750 Light Sensor',
                units: { lightLevel: 'lux' }
            },
            microphone: {
                pin: 22,
                type: 'analog',
                name: 'Sound Level Sensor',
                units: { noiseLevel: 'dB' }
            },
            soilMoisture: {
                pin: 27,
                type: 'analog',
                name: 'Soil Moisture Sensor',
                units: { soilMoisture: '%' }
            }
        };
    }

    /**
     * Initialize all sensors
     */
    async initialize() {
        try {
            await GPIOManager.initialize();

            // Configure each sensor
            for (const [sensorId, config] of Object.entries(this.sensorConfig)) {
                await this.configureSensor(sensorId, config);
            }

            logger.info('All sensors initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize sensors:', error);
            throw error;
        }
    }

    /**
     * Configure individual sensor
     */
    async configureSensor(sensorId, config) {
        try {
            if (config.type === 'i2c') {
                // I2C sensors need special handling
                await this.configureI2CSensor(sensorId, config);
            } else {
                // Digital and analog sensors
                const pin = GPIOManager.configurePin(config.pin, 'in');
                this.sensors.set(sensorId, { ...config, pin });
            }

            logger.info(`Configured sensor: ${config.name} on pin ${config.pin}`);
        } catch (error) {
            logger.error(`Failed to configure sensor ${sensorId}:`, error);
            throw error;
        }
    }

    /**
     * Configure I2C sensor (like BH1750)
     */
    async configureI2CSensor(sensorId, config) {
        try {
            if (GPIOManager.isRaspberryPi) {
                // Real I2C setup would go here
                const sensor = { ...config, initialized: true };
                this.sensors.set(sensorId, sensor);
            } else {
                // Mock I2C sensor
                const sensor = { ...config, initialized: true, mock: true };
                this.sensors.set(sensorId, sensor);
            }
        } catch (error) {
            logger.error(`Failed to configure I2C sensor ${sensorId}:`, error);
            throw error;
        }
    }

    /**
     * Start continuous sensor reading
     */
    startReading(intervalMs = 5000) {
        if (this.isReading) {
            logger.warn('Sensor reading already started');
            return;
        }

        this.isReading = true;
        this.readingInterval = setInterval(async () => {
            try {
                await this.readAllSensors();
            } catch (error) {
                logger.error('Error during sensor reading:', error);
            }
        }, intervalMs);

        logger.info(`Started continuous sensor reading every ${intervalMs}ms`);
    }

    /**
     * Stop continuous sensor reading
     */
    stopReading() {
        if (this.readingInterval) {
            clearInterval(this.readingInterval);
            this.readingInterval = null;
        }
        this.isReading = false;
        logger.info('Stopped continuous sensor reading');
    }

    /**
     * Read all sensors once
     */
    async readAllSensors() {
        const readings = {};
        const timestamp = new Date().toISOString();

        try {
            // Read DHT22 (Temperature & Humidity)
            const dht22Data = await this.readDHT22();
            readings.temperature = dht22Data.temperature;
            readings.humidity = dht22Data.humidity;

            // Read MQ135 (Air Quality)
            readings.airQuality = await this.readMQ135();

            // Read BH1750 (Light Level)
            readings.lightLevel = await this.readBH1750();

            // Read Microphone (Sound Level)
            readings.noiseLevel = await this.readMicrophone();

            // Read Soil Moisture
            readings.soilMoisture = await this.readSoilMoisture();

            // Add metadata
            readings.timestamp = timestamp;
            readings.deviceId = process.env.DEVICE_ID || 'env-monitor-001';

            // Store latest readings
            this.latestReadings.set('latest', readings);

            logger.debug('Sensor readings completed:', readings);
            return readings;

        } catch (error) {
            logger.error('Error reading sensors:', error);
            throw error;
        }
    }

    /**
     * Read DHT22 Temperature & Humidity sensor
     */
    async readDHT22() {
        try {
            const sensor = this.sensors.get('dht22');
            if (!sensor) throw new Error('DHT22 sensor not configured');

            if (GPIOManager.isRaspberryPi) {
                // Real DHT22 reading logic would go here
                // For now, return mock data
                return {
                    temperature: 20 + Math.random() * 15, // 20-35°C
                    humidity: 40 + Math.random() * 40      // 40-80%
                };
            } else {
                // Mock readings with realistic values
                const baseTemp = GPIOManager.mockValues.get('temperature') || 22;
                const baseHumidity = GPIOManager.mockValues.get('humidity') || 45;

                return {
                    temperature: Math.round((baseTemp + Number.EPSILON) * 100) / 100,
                    humidity: Math.round((baseHumidity + Number.EPSILON) * 100) / 100
                };
            }
        } catch (error) {
            logger.error('Error reading DHT22:', error);
            throw error;
        }
    }

    /**
     * Read MQ135 Air Quality sensor
     */
    async readMQ135() {
        try {
            const sensor = this.sensors.get('mq135');
            if (!sensor) throw new Error('MQ135 sensor not configured');

            if (GPIOManager.isRaspberryPi) {
                // Real MQ135 reading and conversion logic
                const rawValue = GPIOManager.readPin(sensor.pin);
                // Convert to PPM - this would need calibration
                return this.convertMQ135ToPPM(rawValue);
            } else {
                // Mock air quality reading (0-500 AQI scale)
                const baseAQI = GPIOManager.mockValues.get('airQuality') || 85;
                return Math.round(Math.max(0, Math.min(500, baseAQI)));
            }
        } catch (error) {
            logger.error('Error reading MQ135:', error);
            throw error;
        }
    }

    /**
     * Read BH1750 Light Level sensor (I2C)
     */
    async readBH1750() {
        try {
            const sensor = this.sensors.get('bh1750');
            if (!sensor) throw new Error('BH1750 sensor not configured');

            if (GPIOManager.isRaspberryPi) {
                // Real I2C communication would go here
                return 300 + Math.random() * 700; // 300-1000 lux
            } else {
                // Mock light level reading
                const baseLight = GPIOManager.mockValues.get('lightLevel') || 350;
                return Math.round(Math.max(0, baseLight));
            }
        } catch (error) {
            logger.error('Error reading BH1750:', error);
            throw error;
        }
    }

    /**
     * Read Microphone Sound Level
     */
    async readMicrophone() {
        try {
            const sensor = this.sensors.get('microphone');
            if (!sensor) throw new Error('Microphone sensor not configured');

            if (GPIOManager.isRaspberryPi) {
                // Real sound level calculation
                const rawValue = GPIOManager.readPin(sensor.pin);
                return this.convertToDecibels(rawValue);
            } else {
                // Mock sound level reading (20-100 dB)
                const baseNoise = GPIOManager.mockValues.get('noiseLevel') || 35;
                return Math.round(Math.max(20, Math.min(100, baseNoise)));
            }
        } catch (error) {
            logger.error('Error reading microphone:', error);
            throw error;
        }
    }

    /**
     * Read Soil Moisture sensor
     */
    async readSoilMoisture() {
        try {
            const sensor = this.sensors.get('soilMoisture');
            if (!sensor) throw new Error('Soil moisture sensor not configured');

            if (GPIOManager.isRaspberryPi) {
                const rawValue = GPIOManager.readPin(sensor.pin);
                return this.convertSoilMoistureToPercent(rawValue);
            } else {
                // Mock soil moisture reading (0-100%)
                const baseMoisture = GPIOManager.mockValues.get('soilMoisture') || 60;
                return Math.round(Math.max(0, Math.min(100, baseMoisture)));
            }
        } catch (error) {
            logger.error('Error reading soil moisture:', error);
            throw error;
        }
    }

    /**
     * Convert MQ135 raw value to PPM
     */
    convertMQ135ToPPM(rawValue) {
        // MQ135 calibration formula (would need real calibration)
        // This is a simplified conversion for demonstration
        const voltage = (rawValue / 1024.0) * 5.0;
        const resistance = (5.0 - voltage) / voltage * 10000;

        // Simplified PPM calculation (actual formula depends on gas type)
        const ppm = Math.pow(10, ((Math.log10(resistance / 76.63) - 2.602) / -0.468));
        return Math.round(Math.max(0, Math.min(500, ppm)));
    }

    /**
     * Convert raw microphone value to decibels
     */
    convertToDecibels(rawValue) {
        // Convert ADC reading to decibels (simplified calculation)
        const voltage = (rawValue / 1024.0) * 5.0;
        const decibels = 20 * Math.log10(voltage / 0.00631) + 94;
        return Math.round(Math.max(20, Math.min(120, decibels)));
    }

    /**
     * Convert soil moisture raw value to percentage
     */
    convertSoilMoistureToPercent(rawValue) {
        // Soil moisture sensor typically gives higher values for dry soil
        // Convert to percentage where 100% = very wet, 0% = very dry
        const maxDry = 1024;  // Completely dry reading
        const maxWet = 300;   // Completely wet reading

        const percentage = 100 - ((rawValue - maxWet) / (maxDry - maxWet)) * 100;
        return Math.round(Math.max(0, Math.min(100, percentage)));
    }

    /**
     * Get latest sensor readings
     */
    getLatestReadings() {
        return this.latestReadings.get('latest') || null;
    }

    /**
     * Get sensor configuration
     */
    getSensorConfig() {
        return this.sensorConfig;
    }

    /**
     * Get sensor status
     */
    getSensorStatus() {
        const status = {};

        for (const [sensorId, config] of Object.entries(this.sensorConfig)) {
            const sensor = this.sensors.get(sensorId);
            status[sensorId] = {
                name: config.name,
                pin: config.pin,
                type: config.type,
                configured: !!sensor,
                lastReading: this.getLastReadingForSensor(sensorId),
                units: config.units
            };
        }

        return {
            isReading: this.isReading,
            totalSensors: Object.keys(this.sensorConfig).length,
            configuredSensors: this.sensors.size,
            sensors: status,
            environment: GPIOManager.getEnvironmentInfo()
        };
    }

    /**
     * Get last reading for specific sensor
     */
    getLastReadingForSensor(sensorId) {
        const latest = this.latestReadings.get('latest');
        if (!latest) return null;

        // Map sensor IDs to reading keys
        const sensorMapping = {
            dht22: ['temperature', 'humidity'],
            mq135: ['airQuality'],
            bh1750: ['lightLevel'],
            microphone: ['noiseLevel'],
            soilMoisture: ['soilMoisture']
        };

        const keys = sensorMapping[sensorId] || [];
        const reading = {};

        keys.forEach(key => {
            if (latest[key] !== undefined) {
                reading[key] = latest[key];
            }
        });

        return Object.keys(reading).length > 0 ? reading : null;
    }

    /**
     * Test individual sensor
     */
    async testSensor(sensorId) {
        try {
            const sensor = this.sensors.get(sensorId);
            if (!sensor) {
                throw new Error(`Sensor ${sensorId} not configured`);
            }

            let result;
            switch (sensorId) {
                case 'dht22':
                    result = await this.readDHT22();
                    break;
                case 'mq135':
                    result = { airQuality: await this.readMQ135() };
                    break;
                case 'bh1750':
                    result = { lightLevel: await this.readBH1750() };
                    break;
                case 'microphone':
                    result = { noiseLevel: await this.readMicrophone() };
                    break;
                case 'soilMoisture':
                    result = { soilMoisture: await this.readSoilMoisture() };
                    break;
                default:
                    throw new Error(`Unknown sensor: ${sensorId}`);
            }

            logger.info(`Sensor test ${sensorId} successful:`, result);
            return {
                success: true,
                sensorId,
                reading: result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error(`Sensor test ${sensorId} failed:`, error);
            return {
                success: false,
                sensorId,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Calibrate sensor (placeholder for future implementation)
     */
    async calibrateSensor(sensorId, calibrationData) {
        logger.info(`Calibration requested for sensor ${sensorId}`, calibrationData);
        // Future implementation for sensor calibration
        return { success: true, message: 'Calibration feature coming soon' };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            this.stopReading();
            this.sensors.clear();
            this.latestReadings.clear();
            logger.info('Sensor manager cleanup completed');
        } catch (error) {
            logger.error('Error during sensor cleanup:', error);
        }
    }
}

export default new SensorManager();