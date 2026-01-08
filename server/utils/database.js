"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.isDatabaseConnected = isDatabaseConnected;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("./logger"));
let isConnected = false;
async function connectDatabase() {
    if (isConnected) {
        logger_1.default.info('Database already connected');
        return;
    }
    const maxRetries = 5;
    let retries = 0;
    while (retries < maxRetries) {
        try {
            logger_1.default.info(`Connecting to MongoDB... (attempt ${retries + 1}/${maxRetries})`);
            await mongoose_1.default.connect(config_1.config.mongodbUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            isConnected = true;
            logger_1.default.info('Successfully connected to MongoDB');
            // Handle connection events
            mongoose_1.default.connection.on('error', (err) => {
                logger_1.default.error('MongoDB connection error:', err);
                isConnected = false;
            });
            mongoose_1.default.connection.on('disconnected', () => {
                logger_1.default.warn('MongoDB disconnected');
                isConnected = false;
            });
            mongoose_1.default.connection.on('reconnected', () => {
                logger_1.default.info('MongoDB reconnected');
                isConnected = true;
            });
            return;
        }
        catch (error) {
            retries++;
            logger_1.default.error(`Failed to connect to MongoDB (attempt ${retries}/${maxRetries}):`, error);
            if (retries >= maxRetries) {
                throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
            }
            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retries), 30000);
            logger_1.default.info(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
async function disconnectDatabase() {
    if (!isConnected) {
        return;
    }
    try {
        await mongoose_1.default.disconnect();
        isConnected = false;
        logger_1.default.info('Disconnected from MongoDB');
    }
    catch (error) {
        logger_1.default.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
}
function isDatabaseConnected() {
    return isConnected && mongoose_1.default.connection.readyState === 1;
}
//# sourceMappingURL=database.js.map