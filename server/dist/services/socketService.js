"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketIO = void 0;
const logger_1 = require("../utils/logger");
const initializeSocketIO = (io) => {
    io.on('connection', (socket) => {
        logger_1.logger.info(`User connected: ${socket.id}`);
        socket.on('disconnect', () => {
            logger_1.logger.info(`User disconnected: ${socket.id}`);
        });
    });
};
exports.initializeSocketIO = initializeSocketIO;
//# sourceMappingURL=socketService.js.map