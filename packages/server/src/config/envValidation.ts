import Joi from 'joi'
import logger from '../utils/logger'

// Environment variable schema
const envSchema = Joi.object({
    // Server Configuration
    PORT: Joi.number().default(3000),
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test', 'staging')
        .default('development'),
    
    // Database Configuration
    DATABASE_TYPE: Joi.string()
        .valid('sqlite', 'mysql', 'postgres', 'mariadb')
        .default('sqlite'),
    DATABASE_HOST: Joi.string().when('DATABASE_TYPE', {
        is: Joi.not('sqlite'),
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    DATABASE_PORT: Joi.number().when('DATABASE_TYPE', {
        is: 'postgres',
        then: Joi.default(5432),
        otherwise: Joi.when('DATABASE_TYPE', {
            is: 'mysql',
            then: Joi.default(3306),
            otherwise: Joi.optional()
        })
    }),
    DATABASE_USER: Joi.string().when('DATABASE_TYPE', {
        is: Joi.not('sqlite'),
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    DATABASE_PASSWORD: Joi.string().when('DATABASE_TYPE', {
        is: Joi.not('sqlite'),
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    DATABASE_NAME: Joi.string().when('DATABASE_TYPE', {
        is: Joi.not('sqlite'),
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    DATABASE_PATH: Joi.string().when('DATABASE_TYPE', {
        is: 'sqlite',
        then: Joi.default('./flowise.db'),
        otherwise: Joi.optional()
    }),
    DATABASE_SSL: Joi.boolean().default(false),
    
    // Redis Configuration
    REDIS_URL: Joi.string().uri().optional(),
    REDIS_HOST: Joi.string().when('REDIS_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.default('localhost')
    }),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().optional(),
    REDIS_TLS: Joi.boolean().default(false),
    
    // Authentication
    FLOWISE_USERNAME: Joi.string().min(3).optional(),
    FLOWISE_PASSWORD: Joi.string().min(8).when('FLOWISE_USERNAME', {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    FLOWISE_SECRETKEY_OVERWRITE: Joi.string().min(32).optional(),
    JWT_SECRET: Joi.string().min(32).default(() => {
        logger.warn('JWT_SECRET not set, generating random secret (not recommended for production)')
        return require('crypto').randomBytes(32).toString('hex')
    }),
    
    // API Configuration
    APIKEY_PATH: Joi.string().optional(),
    API_KEY_MASTER_KEY: Joi.string().min(32).when('NODE_ENV', {
        is: 'production',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    
    // Security Configuration
    CORS_ALLOWED_ORIGINS: Joi.string()
        .default('*')
        .custom((value) => {
            if (process.env.NODE_ENV === 'production' && value === '*') {
                logger.warn('CORS_ALLOWED_ORIGINS is set to "*" in production, this is a security risk')
            }
            return value
        }),
    IFRAME_ORIGINS: Joi.string().default('*'),
    RATE_LIMIT_WHITELIST: Joi.string().optional(),
    SESSION_SECRET: Joi.string().min(32).default(() => {
        return require('crypto').randomBytes(32).toString('hex')
    }),
    
    // Storage Configuration
    BLOB_STORAGE_TYPE: Joi.string()
        .valid('local', 's3', 'gcs')
        .default('local'),
    BLOB_STORAGE_PATH: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 'local',
        then: Joi.default('./storage'),
        otherwise: Joi.optional()
    }),
    S3_BUCKET_NAME: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 's3',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    S3_REGION: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 's3',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    AWS_ACCESS_KEY_ID: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 's3',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    AWS_SECRET_ACCESS_KEY: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 's3',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    GCS_BUCKET_NAME: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 'gcs',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    GCS_PROJECT_ID: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 'gcs',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    GCS_KEYFILE_PATH: Joi.string().when('BLOB_STORAGE_TYPE', {
        is: 'gcs',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    
    // Logging Configuration
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'verbose', 'debug')
        .default('info'),
    LOG_PATH: Joi.string().default('./logs'),
    DISABLE_LOGS: Joi.boolean().default(false),
    
    // Queue Configuration
    QUEUE_CONCURRENCY: Joi.number().min(1).max(100).default(10),
    QUEUE_RETRY_ATTEMPTS: Joi.number().min(0).max(10).default(3),
    
    // API Limits
    MAX_UPLOAD_SIZE: Joi.string()
        .pattern(/^\d+[kmg]?b?$/i)
        .default('50mb'),
    MAX_REQUEST_SIZE: Joi.string()
        .pattern(/^\d+[kmg]?b?$/i)
        .default('10mb'),
    
    // Execution Configuration
    EXECUTION_TIMEOUT: Joi.number()
        .min(1000)
        .max(3600000)
        .default(300000), // 5 minutes
    LANGCHAIN_TRACING_V2: Joi.boolean().optional(),
    LANGCHAIN_ENDPOINT: Joi.string().uri().optional(),
    LANGCHAIN_API_KEY: Joi.string().optional(),
    LANGCHAIN_PROJECT: Joi.string().optional(),
    
    // Telemetry
    DISABLE_TELEMETRY: Joi.boolean().default(false),
    
    // Development
    DEBUG: Joi.boolean().default(false),
    
    // Cloud Run specific
    GOOGLE_CLOUD_PROJECT: Joi.string().optional(),
    CLOUD_RUN_SERVICE: Joi.string().optional(),
    K_SERVICE: Joi.string().optional(),
    K_REVISION: Joi.string().optional(),
    
    // Feature Flags
    ENABLE_METRICS: Joi.boolean().default(true),
    ENABLE_CACHING: Joi.boolean().default(true),
    ENABLE_WEBSOCKET: Joi.boolean().default(true),
    
    // External Services
    OPENAI_API_KEY: Joi.string().optional(),
    ANTHROPIC_API_KEY: Joi.string().optional(),
    GOOGLE_API_KEY: Joi.string().optional(),
    MISTRAL_API_KEY: Joi.string().optional(),
    
    // Custom validation for production
    API_VERSION: Joi.string().default('1.0.0')
})
    .unknown(true) // Allow additional env vars
    .custom((obj, helpers) => {
        // Additional cross-field validations
        if (obj.NODE_ENV === 'production') {
            // Production-specific requirements
            if (!obj.DATABASE_SSL && obj.DATABASE_TYPE !== 'sqlite') {
                logger.warn('DATABASE_SSL is disabled in production')
            }
            
            if (!obj.REDIS_TLS && obj.REDIS_URL) {
                logger.warn('REDIS_TLS is disabled in production')
            }
            
            if (obj.LOG_LEVEL === 'debug' || obj.LOG_LEVEL === 'verbose') {
                logger.warn('Verbose logging enabled in production')
            }
            
            if (!obj.API_KEY_MASTER_KEY) {
                return helpers.error('API_KEY_MASTER_KEY is required in production')
            }
        }
        
        return obj
    })

// Validate environment variables
export const validateEnv = () => {
    const { error, value } = envSchema.validate(process.env, {
        abortEarly: false,
        allowUnknown: true
    })
    
    if (error) {
        const errors = error.details.map(detail => `  - ${detail.message}`).join('\n')
        logger.error(`Environment validation failed:\n${errors}`)
        
        if (process.env.NODE_ENV === 'production') {
            // In production, exit if validation fails
            throw new Error(`Environment validation failed:\n${errors}`)
        } else {
            // In development, just warn
            logger.warn('Continuing despite validation errors (development mode)')
        }
    }
    
    // Log validated configuration (without sensitive data)
    const safeConfig = { ...value }
    const sensitiveKeys = [
        'DATABASE_PASSWORD',
        'REDIS_PASSWORD',
        'FLOWISE_PASSWORD',
        'JWT_SECRET',
        'SESSION_SECRET',
        'API_KEY_MASTER_KEY',
        'AWS_SECRET_ACCESS_KEY',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'GOOGLE_API_KEY',
        'MISTRAL_API_KEY',
        'LANGCHAIN_API_KEY',
        'FLOWISE_SECRETKEY_OVERWRITE'
    ]
    
    sensitiveKeys.forEach(key => {
        if (safeConfig[key]) {
            safeConfig[key] = '***REDACTED***'
        }
    })
    
    logger.info('Environment configuration validated successfully')
    logger.debug('Configuration:', safeConfig)
    
    return value
}

// Export validated config
export const config = validateEnv()

// Helper functions for config access
export const getConfig = (key: string, defaultValue?: any) => {
    return config[key] ?? defaultValue
}

export const isProduction = () => config.NODE_ENV === 'production'
export const isDevelopment = () => config.NODE_ENV === 'development'
export const isTest = () => config.NODE_ENV === 'test'