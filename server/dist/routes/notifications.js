"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.get('/', (0, errorHandler_1.catchAsync)(async (req, res) => {
    res.status(501).json({ success: false, message: 'Notifications API - Coming soon!' });
}));
exports.default = router;
//# sourceMappingURL=notifications.js.map