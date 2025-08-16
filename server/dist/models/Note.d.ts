import mongoose, { Document } from 'mongoose';
export declare enum NoteColor {
    WHITE = "#ffffff",
    YELLOW = "#fef3c7",
    GREEN = "#d1fae5",
    BLUE = "#dbeafe",
    PURPLE = "#e9d5ff",
    PINK = "#fce7f3",
    RED = "#fee2e2",
    ORANGE = "#fed7aa",
    GRAY = "#f3f4f6"
}
export declare enum NotePriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export interface INote extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    content: string;
    color: NoteColor;
    priority: NotePriority;
    position: number;
    userId: mongoose.Types.ObjectId;
    tags: string[];
    archived: boolean;
    pinned: boolean;
    reminder?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INote, {}, {}, {}, mongoose.Document<unknown, {}, INote, {}, {}> & INote & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Note.d.ts.map