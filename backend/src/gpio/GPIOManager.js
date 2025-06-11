import { createRequire } from 'module';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

const require = createRequire(import.meta.url);

/**
 * GPIO Manager - Abstracts GPIO operations for Pi vs Development
 * Automatically detects environment and provides mock or real GPIO
 */
class GPIOManager {
    constructor() {
        this.isRaspberryPi = this.detectRaspberryPi();
        this.pins = new Map();
        this.mockValues = new Map();
        this.initialized = false;

        logger.info(`GPIO Manager initialized for ${this.isRaspberryPi ? 'Raspberry Pi' : 'Development'} environment`);
    }

    /**
     * Detect if running on Raspberry Pi
     */
    detectRaspberryPi() {
        // Check environment variable first
        if (process.env.IS_RASPBERRY_PI === 'true') return true;
        if (process.env.IS_RASPBERRY_PI === 'false') return false;

        try {
            // Check for Pi-specific files
            const fs = require('fs');
            if (fs.existsSync('/proc/device-tree/model')) {
                const model = fs.readFileSync('/proc/device-tree/model', 'utf8');
                return model.includes('Raspberry Pi');
            }

            // Check for GPIO memory device
            return fs.existsSync('/dev/gpiomem');
        } catch (error) {
            logger.warn('Could not detect Raspberry Pi, defaulting to development mode');
            return false;
        }
    }

    /**
     * Initialize GPIO system
     */
    async initialize() {
        if (this.initialized) return;

        try {
            if (this.isRaspberryPi) {
                await this.initializeRealGPIO();
            } else {
                await this.initializeMockGPIO();
            }
            this.initialized = true;
            logger.info('GPIO Manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize GPIO Manager:', error);
            throw error;
        }
    }

    /**
     * Initialize real GPIO for Raspberry Pi
     */
    async initializeRealGPIO() {
        try {
            // Import GPIO libraries for Pi
            this.Gpio = require('onoff').Gpio;
            this.i2c = require('i2c-bus');

            logger.info('Real GPIO libraries loaded successfully');
        } catch (error) {
            logger.error('Failed to load GPIO libraries:', error);
            throw new Error('GPIO libraries not available - ensure running on Raspberry Pi with proper packages');
        }
    }

    /**
     * Initialize mock GPIO for development
     */
    async initializeMockGPIO() {
        // Initialize mock sensor values with realistic data
        this.mockValues.set('temperature', 22.5);
        this.mockValues.set('humidity', 45.0);
        this.mockValues.set('airQuality', 85);
        this.mockValues.set('lightLevel', 350);
        this.mockValues.set('noiseLevel', 35);
        this.mockValues.set('soilMoisture', 60);

        // Start mock data simulation
        this.startMockSimulation();

        logger.info('Mock GPIO initialized with simulated sensor data');
    }

    /**
     * Configure a pin for input/output
     */
    configurePin(pinNumber, direction, options = {}) {
        try {
            if (this.isRaspberryPi) {
                const pin = new this.Gpio(pinNumber, direction, options);
                this.pins.set(pinNumber, pin);
                logger.debug(`Configured real GPIO pin ${pinNumber} as ${direction}`);
                return pin;
            } else {
                // Mock pin configuration
                const mockPin = {
                    pinNumber,
                    direction,
                    value: direction === 'out' ? 0 : Math.random(),
                    read: () => this.mockReadPin(pinNumber),
                    write: (value) => this.mockWritePin(pinNumber, value),
                    writeSync: (value) => this.mockWritePin(pinNumber, value),
                    readSync: () => this.mockReadPin(pinNumber)
                };
                this.pins.set(pinNumber, mockPin);
                logger.debug(`Configured mock GPIO pin ${pinNumber} as ${direction}`);
                return mockPin;
            }
        } catch (error) {
            logger.error(`Failed to configure pin ${pinNumber}:`, error);
            throw error;
        }
    }

    /**
     * Read from a pin
     */
    readPin(pinNumber) {
        const pin = this.pins.get(pinNumber);
        if (!pin) {
            throw new Error(`Pin ${pinNumber} not configured`);
        }

        if (this.isRaspberryPi) {
            return pin.readSync();
        } else {
            return this.mockReadPin(pinNumber);
        }
    }

    /**
     * Write to a pin
     */
    writePin(pinNumber, value) {
        const pin = this.pins.get(pinNumber);
        if (!pin) {
            throw new Error(`Pin ${pinNumber} not configured`);
        }

        if (this.isRaspberryPi) {
            pin.writeSync(value);
        } else {
            this.mockWritePin(pinNumber, value);
        }

        logger.debug(`Pin ${pinNumber} set to ${value}`);
    }

    /**
     * Mock pin reading with realistic sensor simulation
     */
    mockReadPin(pinNumber) {
        // Pin mapping for different sensors
        const pinMapping = {
            18: 'temperature',    // DHT22 data pin
            24: 'humidity',       // DHT22 data pin  
            25: 'airQuality',     // MQ135 analog
            23: 'lightLevel',     // BH1750 I2C
            22: 'noiseLevel',     // Microphone analog
            27: 'soilMoisture'    // Soil sensor analog
        };

        const sensorType = pinMapping[pinNumber];
        if (sensorType && this.mockValues.has(sensorType)) {
            return this.mockValues.get(sensorType);
        }

        // Default random value for unmapped pins
        return Math.random();
    }

    /**
     * Mock pin writing
     */
    mockWritePin(pinNumber, value) {
        const pin = this.pins.get(pinNumber);
        if (pin) {
            pin.value = value;
        }

        // Log actuator actions
        const actuatorMapping = {
            17: 'Fan Control',
            26: 'LED Strip',
            19: 'Buzzer'
        };

        const actuatorName = actuatorMapping[pinNumber] || `Pin ${pinNumber}`;
        logger.info(`Mock Actuator: ${actuatorName} set to ${value ? 'ON' : 'OFF'}`);
    }

    /**
     * Start mock sensor data simulation
     */
    startMockSimulation() {
        setInterval(() => {
            // Simulate realistic sensor variations
            const temp = this.mockValues.get('temperature');
            this.mockValues.set('temperature', temp + (Math.random() - 0.5) * 2);

            const humidity = this.mockValues.get('humidity');
            this.mockValues.set('humidity', Math.max(0, Math.min(100, humidity + (Math.random() - 0.5) * 5)));

            const aqi = this.mockValues.get('airQuality');
            this.mockValues.set('airQuality', Math.max(0, Math.min(500, aqi + (Math.random() - 0.5) * 10)));

            const light = this.mockValues.get('lightLevel');
            this.mockValues.set('lightLevel', Math.max(0, light + (Math.random() - 0.5) * 50));

            const noise = this.mockValues.get('noiseLevel');
            this.mockValues.set('noiseLevel', Math.max(0, Math.min(120, noise + (Math.random() - 0.5) * 5)));

            const soil = this.mockValues.get('soilMoisture');
            this.mockValues.set('soilMoisture', Math.max(0, Math.min(100, soil + (Math.random() - 0.5) * 3)));

        }, 2000); // Update every 2 seconds
    }

    /**
     * Cleanup GPIO resources
     */
    cleanup() {
        try {
            if (this.isRaspberryPi) {
                this.pins.forEach((pin, pinNumber) => {
                    if (pin && typeof pin.unexport === 'function') {
                        pin.unexport();
                    }
                });
            }
            this.pins.clear();
            logger.info('GPIO cleanup completed');
        } catch (error) {
            logger.error('Error during GPIO cleanup:', error);
        }
    }

    /**
     * Get current environment info
     */
    getEnvironmentInfo() {
        return {
            isRaspberryPi: this.isRaspberryPi,
            initialized: this.initialized,
            configuredPins: Array.from(this.pins.keys()),
            mockValues: this.isRaspberryPi ? null : Object.fromEntries(this.mockValues)
        };
    }
}

export default new GPIOManager();