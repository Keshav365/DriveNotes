"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const auth_2 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const files_1 = __importDefault(require("./routes/files"));
const folders_1 = __importDefault(require("./routes/folders"));
const notes_1 = __importDefault(require("./routes/notes"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const ai_1 = __importDefault(require("./routes/ai"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const socketService_1 = require("./services/socketService");
const passport_1 = require("./config/passport");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
exports.io = io;
const PORT = process.env.PORT || 5001;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
});
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
}));
app.use(limiter);
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined', { stream: { write: message => logger_1.logger.info(message.trim()) } }));
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/drivenotes',
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
    },
}));
(0, passport_1.initializePassport)(app);
app.use('/api/auth', auth_2.default);
app.use('/api/user', auth_1.authenticateToken, user_1.default);
app.use('/api/files', auth_1.authenticateToken, files_1.default);
app.use('/api/folders', auth_1.authenticateToken, folders_1.default);
app.use('/api/notes', auth_1.authenticateToken, notes_1.default);
app.use('/api/calendar', auth_1.authenticateToken, calendar_1.default);
app.use('/api/ai', auth_1.authenticateToken, ai_1.default);
app.use('/api/notifications', auth_1.authenticateToken, notifications_1.default);
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
(0, socketService_1.initializeSocketIO)(io);
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
async function startServer() {
    try {
        await (0, database_1.connectDB)();
        httpServer.listen(PORT, () => {
            logger_1.logger.info(`Server running on port ${PORT}`);
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        logger_1.logger.info('Process terminated');
    });
});
startServer();
//# sourceMappingURL=server.js.map