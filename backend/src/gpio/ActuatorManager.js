import GPIOManager from './GPIOManager.js';
import logger from '../utils/logger.js';

/**
 * Actuator Manager - Controls all output devices
 * Supports both real actuators on Pi and mock actions for development
 */
class ActuatorManager {
    constructor() {
        this.actuators = new Map();
        this.actuatorStates = new Map();

        // Actuator configuration
        this.actuatorConfig = {
            fan: {
                pin: 17,
                type: 'relay',
                name: 'Cooling Fan',
                description: 'Controls air circulation fan via relay',
                maxSpeed: 100,
                currentSpeed: 0
            },
            ledStrip: {
                pin: 26,
                type: 'pwm',
                name: 'RGB LED Strip',
                description: 'Environmental status indicator lights',
                channels: { red: 20, green: 21, blue: 26 },
                currentColor: { r: 0, g: 0, b: 0 }
            },
            buzzer: {
                pin: 19,
                type: 'digital',
                name: 'Alert Buzzer',
                description: 'Audio alerts for critical conditions',
                isActive: false
            },
            waterPump: {
                pin: 16,
                type: 'relay',
                name: 'Water Pump',
                description: 'Automatic plant watering system',
                isActive: false
            },
            ventilator: {
                pin: 12,
                type: 'pwm',
                name: 'Ventilation Fan',
                description: 'Variable speed ventilation control',
                currentSpeed: 0
            }
        };
    }

    /**
     * Initialize all actuators
     */
    async initialize() {
        try {
            await GPIOManager.initialize();

            // Configure each actuator
            for (const [actuatorId, config] of Object.entries(this.actuatorConfig)) {
                await this.configureActuator(actuatorId, config);
            }

            // Initialize all actuators to OFF state
            await this.resetAllActuators();

            logger.info('All actuators initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize actuators:', error);
            throw error;
        }
    }

    /**
     * Configure individual actuator
     */
    async configureActuator(actuatorId, config) {
        try {
            if (config.type === 'pwm') {
                // PWM actuators (LED strip, variable fans)
                await this.configurePWMActuator(actuatorId, config);
            } else {
                // Digital and relay actuators
                const pin = GPIOManager.configurePin(config.pin, 'out');
                this.actuators.set(actuatorId, { ...config, pin });
            }

            // Initialize state
            this.actuatorStates.set(actuatorId, this.getDefaultState(config));

            logger.info(`Configured actuator: ${config.name} on pin ${config.pin}`);
        } catch (error) {
            logger.error(`Failed to configure actuator ${actuatorId}:`, error);
            throw error;
        }
    }

    /**
     * Configure PWM actuator (LED strips, variable speed fans)
     */
    async configurePWMActuator(actuatorId, config) {
        try {
            if (config.channels) {
                // Multi-channel PWM (RGB LED)
                const channels = {};
                for (const [color, pin] of Object.entries(config.channels)) {
                    channels[color] = GPIOManager.configurePin(pin, 'out');
                }
                this.actuators.set(actuatorId, { ...config, channels });
            } else {
                // Single channel PWM
                const pin = GPIOManager.configurePin(config.pin, 'out');
                this.actuators.set(actuatorId, { ...config, pin });
            }
        } catch (error) {
            logger.error(`Failed to configure PWM actuator ${actuatorId}:`, error);
            throw error;
        }
    }

    /**
     * Get default state for actuator type
     */
    getDefaultState(config) {
        switch (config.type) {
            case 'relay':
            case 'digital':
                return { isActive: false, value: 0 };
            case 'pwm':
                if (config.channels) {
                    return { currentColor: { r: 0, g: 0, b: 0 }, brightness: 0 };
                } else {
                    return { currentSpeed: 0, value: 0 };
                }
            default:
                return { value: 0 };
        }
    }

    /**
     * Control cooling fan
     */
    async controlFan(speed = 0, duration = null) {
        try {
            const actuator = this.actuators.get('fan');
            if (!actuator) throw new Error('Fan actuator not configured');

            // Clamp speed to 0-100
            speed = Math.max(0, Math.min(100, speed));

            // Convert percentage to digital on/off for relay
            const relayState = speed > 0 ? 1 : 0;

            GPIOManager.writePin(actuator.pin, relayState);

            // Update state
            const state = { isActive: relayState === 1, speed, value: relayState };
            this.actuatorStates.set('fan', state);

            logger.info(`Fan ${relayState ? 'ON' : 'OFF'} at ${speed}% speed`);

            // Auto-off timer if duration specified
            if (duration && relayState === 1) {
                setTimeout(() => {
                    this.controlFan(0);
                }, duration * 1000);
            }

            return { success: true, actuator: 'fan', state };

        } catch (error) {
            logger.error('Error controlling fan:', error);
            throw error;
        }
    }

    /**
     * Control RGB LED strip
     */
    async controlLEDStrip(r = 0, g = 0, b = 0, brightness = 100) {
        try {
            const actuator = this.actuators.get('ledStrip');
            if (!actuator) throw new Error('LED strip actuator not configured');

            // Clamp values
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            brightness = Math.max(0, Math.min(100, brightness));

            // Apply brightness
            const finalR = Math.round((r * brightness) / 100);
            const finalG = Math.round((g * brightness) / 100);
            const finalB = Math.round((b * brightness) / 100);

            if (GPIOManager.isRaspberryPi) {
                // Real PWM control would go here
                // For now, just digital on/off based on values
                GPIOManager.writePin(actuator.channels.red, finalR > 0 ? 1 : 0);
                GPIOManager.writePin(actuator.channels.green, finalG > 0 ? 1 : 0);
                GPIOManager.writePin(actuator.channels.blue, finalB > 0 ? 1 : 0);
            }

            const state = {
                currentColor: { r: finalR, g: finalG, b: finalB },
                brightness,
                isActive: finalR > 0 || finalG > 0 || finalB > 0
            };
            this.actuatorStates.set('ledStrip', state);

            logger.info(`LED Strip: RGB(${finalR}, ${finalG}, ${finalB}) at ${brightness}% brightness`);

            return { success: true, actuator: 'ledStrip', state };

        } catch (error) {
            logger.error('Error controlling LED strip:', error);
            throw error;
        }
    }

    /**
     * Control alert buzzer
     */
    async controlBuzzer(pattern = 'single', duration = 1000) {
        try {
            const actuator = this.actuators.get('buzzer');
            if (!actuator) throw new Error('Buzzer actuator not configured');

            const patterns = {
                single: [{ on: 500, off: 0 }],
                double: [{ on: 200, off: 200 }, { on: 200, off: 0 }],
                triple: [{ on: 150, off: 150 }, { on: 150, off: 150 }, { on: 150, off: 0 }],
                continuous: [{ on: duration, off: 0 }],
                urgent: [{ on: 100, off: 100 }] // Repeating pattern
            };

            const sequence = patterns[pattern] || patterns.single;

            // Update state
            const state = { isActive: true, pattern, duration };
            this.actuatorStates.set('buzzer', state);

            logger.info(`Buzzer activated: ${pattern} pattern for ${duration}ms`);

            // Execute buzzer pattern
            await this.executeBuzzerPattern(actuator, sequence, pattern === 'urgent' ? duration : null);

            // Mark as inactive after completion
            this.actuatorStates.set('buzzer', { isActive: false, pattern, duration: 0 });

            return { success: true, actuator: 'buzzer', state };

        } catch (error) {
            logger.error('Error controlling buzzer:', error);
            throw error;
        }
    }

    /**
     * Execute buzzer beep pattern
     */
    async executeBuzzerPattern(actuator, sequence, totalDuration = null) {
        return new Promise((resolve) => {
            let sequenceIndex = 0;
            let startTime = Date.now();

            const executeStep = () => {
                if (totalDuration && (Date.now() - startTime) >= totalDuration) {
                    GPIOManager.writePin(actuator.pin, 0);
                    resolve();
                    return;
                }

                const step = sequence[sequenceIndex % sequence.length];

                // Turn on
                GPIOManager.writePin(actuator.pin, 1);

                setTimeout(() => {
                    // Turn off
                    GPIOManager.writePin(actuator.pin, 0);

                    if (step.off > 0) {
                        setTimeout(() => {
                            sequenceIndex++;
                            if (sequenceIndex < sequence.length || totalDuration) {
                                executeStep();
                            } else {
                                resolve();
                            }
                        }, step.off);
                    } else {
                        resolve();
                    }
                }, step.on);
            };

            executeStep();
        });
    }

    /**
     * Control water pump
     */
    async controlWaterPump(duration = 5000) {
        try {
            const actuator = this.actuators.get('waterPump');
            if (!actuator) throw new Error('Water pump actuator not configured');

            // Turn on pump
            GPIOManager.writePin(actuator.pin, 1);

            const state = { isActive: true, duration, startTime: Date.now() };
            this.actuatorStates.set('waterPump', state);

            logger.info(`Water pump ON for ${duration}ms`);

            // Auto-off timer
            setTimeout(() => {
                GPIOManager.writePin(actuator.pin, 0);
                this.actuatorStates.set('waterPump', { isActive: false, duration: 0 });
                logger.info('Water pump OFF (auto-timer)');
            }, duration);

            return { success: true, actuator: 'waterPump', state };

        } catch (error) {
            logger.error('Error controlling water pump:', error);
            throw error;
        }
    }

    /**
     * Control ventilation fan with variable speed
     */
    async controlVentilator(speed = 0) {
        try {
            const actuator = this.actuators.get('ventilator');
            if (!actuator) throw new Error('Ventilator actuator not configured');

            speed = Math.max(0, Math.min(100, speed));

            // For PWM control (simplified to digital for now)
            const digitalValue = speed > 0 ? 1 : 0;
            GPIOManager.writePin(actuator.pin, digitalValue);

            const state = { currentSpeed: speed, value: digitalValue, isActive: speed > 0 };
            this.actuatorStates.set('ventilator', state);

            logger.info(`Ventilator ${speed > 0 ? 'ON' : 'OFF'} at ${speed}% speed`);

            return { success: true, actuator: 'ventilator', state };

        } catch (error) {
            logger.error('Error controlling ventilator:', error);
            throw error;
        }
    }

    /**
     * Set environmental status via LED colors
     */
    async setEnvironmentalStatus(status) {
        const statusColors = {
            excellent: { r: 0, g: 255, b: 0 },      // Green
            good: { r: 128, g: 255, b: 0 },         // Light Green
            moderate: { r: 255, g: 255, b: 0 },     // Yellow
            poor: { r: 255, g: 128, b: 0 },         // Orange
            unhealthy: { r: 255, g: 0, b: 0 },      // Red
            hazardous: { r: 128, g: 0, b: 128 }     // Purple
        };

        const color = statusColors[status] || statusColors.moderate;
        return await this.controlLEDStrip(color.r, color.g, color.b, 80);
    }

    /**
     * Emergency alert sequence
     */
    async emergencyAlert(type = 'general') {
        try {
            logger.warn(`Emergency alert triggered: ${type}`);

            // Flash red LEDs
            await this.controlLEDStrip(255, 0, 0, 100);

            // Sound urgent buzzer
            await this.controlBuzzer('urgent', 3000);

            // Turn on all ventilation
            await this.controlFan(100);
            await this.controlVentilator(100);

            // Reset LEDs after alert
            setTimeout(async () => {
                await this.setEnvironmentalStatus('moderate');
            }, 5000);

            return { success: true, alertType: type, timestamp: new Date().toISOString() };

        } catch (error) {
            logger.error('Error executing emergency alert:', error);
            throw error;
        }
    }

    /**
     * Reset all actuators to OFF state
     */
    async resetAllActuators() {
        try {
            for (const [actuatorId, config] of Object.entries(this.actuatorConfig)) {
                const actuator = this.actuators.get(actuatorId);
                if (actuator) {
                    if (config.type === 'pwm' && config.channels) {
                        // RGB LED reset
                        Object.values(config.channels).forEach(pin => {
                            GPIOManager.writePin(pin, 0);
                        });
                    } else {
                        // Regular digital/relay reset
                        GPIOManager.writePin(config.pin, 0);
                    }

                    this.actuatorStates.set(actuatorId, this.getDefaultState(config));
                }
            }

            logger.info('All actuators reset to OFF state');
            return true;
        } catch (error) {
            logger.error('Error resetting actuators:', error);
            throw error;
        }
    }

    /**
     * Get current actuator states
     */
    getActuatorStates() {
        const states = {};
        for (const [actuatorId, state] of this.actuatorStates.entries()) {
            const config = this.actuatorConfig[actuatorId];
            states[actuatorId] = {
                name: config?.name || actuatorId,
                type: config?.type || 'unknown',
                pin: config?.pin,
                ...state
            };
        }
        return states;
    }

    /**
     * Get actuator configuration
     */
    getActuatorConfig() {
        return this.actuatorConfig;
    }

    /**
     * Test individual actuator
     */
    async testActuator(actuatorId, testParams = {}) {
        try {
            let result;

            switch (actuatorId) {
                case 'fan':
                    result = await this.controlFan(testParams.speed || 100, testParams.duration || 2);
                    break;
                case 'ledStrip':
                    result = await this.controlLEDStrip(255, 255, 255, 100);
                    setTimeout(() => this.controlLEDStrip(0, 0, 0), 3000);
                    break;
                case 'buzzer':
                    result = await this.controlBuzzer('double', 1000);
                    break;
                case 'waterPump':
                    result = await this.controlWaterPump(testParams.duration || 2000);
                    break;
                case 'ventilator':
                    result = await this.controlVentilator(testParams.speed || 100);
                    setTimeout(() => this.controlVentilator(0), 3000);
                    break;
                default:
                    throw new Error(`Unknown actuator: ${actuatorId}`);
            }

            logger.info(`Actuator test ${actuatorId} successful`);
            return { success: true, actuatorId, result, timestamp: new Date().toISOString() };

        } catch (error) {
            logger.error(`Actuator test ${actuatorId} failed:`, error);
            return { success: false, actuatorId, error: error.message, timestamp: new Date().toISOString() };
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            this.resetAllActuators();
            this.actuators.clear();
            this.actuatorStates.clear();
            logger.info('Actuator manager cleanup completed');
        } catch (error) {
            logger.error('Error during actuator cleanup:', error);
        }
    }
}

export default new ActuatorManager();