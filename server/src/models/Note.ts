import mongoose, { Document, Schema } from 'mongoose';

// Note color enum
export enum NoteColor {
  WHITE = '#ffffff',
  YELLOW = '#fef3c7',
  GREEN = '#d1fae5',
  BLUE = '#dbeafe',
  PURPLE = '#e9d5ff',
  PINK = '#fce7f3',
  RED = '#fee2e2',
  ORANGE = '#fed7aa',
  GRAY = '#f3f4f6'
}

// Note priority enum
export enum NotePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
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

const noteSchema = new Schema<INote>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000, // 10KB limit for note content
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
    type: Schema.Types.ObjectId,
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
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes for performance
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, pinned: -1, position: 1 });
noteSchema.index({ userId: 1, archived: 1 });
noteSchema.index({ userId: 1, reminder: 1 });
noteSchema.index({ tags: 1 });

// Compound text index for search functionality
noteSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text'
});

export default mongoose.model<INote>('Note', noteSchema);
