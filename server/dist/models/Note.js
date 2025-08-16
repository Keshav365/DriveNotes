"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotePriority = exports.NoteColor = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var NoteColor;
(function (NoteColor) {
    NoteColor["WHITE"] = "#ffffff";
    NoteColor["YELLOW"] = "#fef3c7";
    NoteColor["GREEN"] = "#d1fae5";
    NoteColor["BLUE"] = "#dbeafe";
    NoteColor["PURPLE"] = "#e9d5ff";
    NoteColor["PINK"] = "#fce7f3";
    NoteColor["RED"] = "#fee2e2";
    NoteColor["ORANGE"] = "#fed7aa";
    NoteColor["GRAY"] = "#f3f4f6";
})(NoteColor || (exports.NoteColor = NoteColor = {}));
var NotePriority;
(function (NotePriority) {
    NotePriority["LOW"] = "low";
    NotePriority["MEDIUM"] = "medium";
    NotePriority["HIGH"] = "high";
    NotePriority["URGENT"] = "urgent";
})(NotePriority || (exports.NotePriority = NotePriority = {}));
const noteSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
    },
    content: {
        type: String,
        required: true,
        maxlength: 10000,
    },
    color: {
        type: String,
        enum: Object.values(NoteColor),
        default: NoteColor.WHITE,
    },
    priority: {
        type: String,
        enum: Object.values(NotePriority),
        default: NotePriority.MEDIUM,
    },
    position: {
        type: Number,
        default: 0,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    tags: [{
            type: String,
            trim: true,
            maxlength: 50,
        }],
    archived: {
        type: Boolean,
        default: false,
    },
    pinned: {
        type: Boolean,
        default: false,
    },
    reminder: {
        type: Date,
        sparse: true,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, pinned: -1, position: 1 });
noteSchema.index({ userId: 1, archived: 1 });
noteSchema.index({ userId: 1, reminder: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({
    title: 'text',
    content: 'text',
    tags: 'text'
});
exports.default = mongoose_1.default.model('Note', noteSchema);
//# sourceMappingURL=Note.js.map