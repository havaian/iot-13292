import logger from '../utils/logger.js';
import config from '../utils/config.js';

/**
 * Global Error Handler Middleware
 * Handles all application errors with proper logging and response formatting
 */

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error('Request Error:', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Default error response
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';
    let errorCode = err.code || 'INTERNAL_ERROR';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
        errorCode = 'CAST_ERROR';
    } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        statusCode = 500;
        message = 'Database error';
        errorCode = 'DATABASE_ERROR';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        errorCode = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        errorCode = 'TOKEN_EXPIRED';
    } else if (err.code === 'ENOENT') {
        statusCode = 404;
        message = 'Resource not found';
        errorCode = 'RESOURCE_NOT_FOUND';
    } else if (err.code === 'EACCES') {
        statusCode = 403;
        message = 'Permission denied';
        errorCode = 'PERMISSION_DENIED';
    } else if (err.code === 'EADDRINUSE') {
        statusCode = 500;
        message = 'Port already in use';
        errorCode = 'PORT_IN_USE';
    }

    // GPIO-specific errors
    if (err.message.includes('GPIO') || err.message.includes('pin')) {
        statusCode = 500;
        message = 'Hardware error';
        errorCode = 'GPIO_ERROR';
    }

    // Sensor-specific errors
    if (err.message.includes('sensor') || err.message.includes('reading')) {
        statusCode = 500;
        message = 'Sensor error';
        errorCode = 'SENSOR_ERROR';
    }

    // Actuator-specific errors
    if (err.message.includes('actuator') || err.message.includes('control')) {
        statusCode = 500;
        message = 'Actuator error';
        errorCode = 'ACTUATOR_ERROR';
    }

    // Prepare error response
    const errorResponse = {
        success: false,
        error: {
            code: errorCode,
            message: message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || generateRequestId()
        }
    };

    // Add additional error details in development
    if (config.isDevelopment()) {
        errorResponse.error.stack = err.stack;
        errorResponse.error.details = {
            originalMessage: err.message,
            name: err.name,
            code: err.code,
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            params: req.params,
            query: req.query
        };
    }

    // Add validation errors if present
    if (err.errors) {
        errorResponse.error.validationErrors = err.errors;
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
};

/**
 * Generate unique request ID
 */
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Custom error classes
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'APP_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message, errors = {}) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}

export class GPIOError extends AppError {
    constructor(message, pin = null) {
        super(message, 500, 'GPIO_ERROR');
        this.pin = pin;
    }
}

export class SensorError extends AppError {
    constructor(message, sensor = null) {
        super(message, 500, 'SENSOR_ERROR');
        this.sensor = sensor;
    }
}

export class ActuatorError extends AppError {
    constructor(message, actuator = null) {
        super(message, 500, 'ACTUATOR_ERROR');
        this.actuator = actuator;
    }
}

/**
 * Handle 404 errors for API routes
 */
export const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};

/**
 * Validation error handler
 */
export const validationErrorHandler = (error, req, res, next) => {
    if (error.name === 'ValidationError') {
        const errors = {};

        // Handle Mongoose validation errors
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                errors[key] = error.errors[key].message;
            });
        }

        const validationError = new ValidationError('Validation failed', errors);
        return next(validationError);
    }

    next(error);
};

export default errorHandler;