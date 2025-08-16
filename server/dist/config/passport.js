"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePassport = void 0;
const passport_1 = __importDefault(require("passport"));
const logger_1 = require("../utils/logger");
const initializePassport = (app) => {
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    logger_1.logger.info('Passport initialized');
};
exports.initializePassport = initializePassport;
//# sourceMappingURL=passport.js.map