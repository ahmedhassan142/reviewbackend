// models/Review.ts
import { Schema, model, Document, Types } from 'mongoose';

interface IReview {
  sessionId?: string;
  guestEmail?: string;
  productId: Types.ObjectId;
  userId?: Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  photos?: string[];
  verifiedPurchase: boolean;
  helpfulVotes?: number;
helpfulVoters?: {
     voterId:string , // Format: "user:123" or "session:abc" or "guest:email@ex.com"
    votedAt: Date
}
  ,
  reportCount: number;
  response?: {
    adminId: Types.ObjectId;
    message: string;
    createdAt: Date;
  };
  experience?: {
    fit?: 'runs-small' | 'true-to-size' | 'runs-large';
    afterWash?: 'shrank' | 'no-change' | 'stretched';
    wearFrequency?: 'daily' | 'weekly' | 'monthly';
  };
  createdAt: Date;
  updatedAt: Date;
}

interface IReviewDocument extends IReview, Document {
  // You can add any document methods here if needed
}

const ReviewSchema = new Schema<IReview & Document>({
  sessionId: String,
  guestEmail: String,
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: Schema.Types.ObjectId },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
  photos: { type: [String], default: [] },
  verifiedPurchase: { type: Boolean, default: false },
  helpfulVotes: { type: Number, default: 0 },
  helpfulVoters: {
     voterId: { type: String, }, // Format: "user:123" or "session:abc" or "guest:email@ex.com"
    votedAt: { type: Date, default: Date.now },
  },
  reportCount: { type: Number, default: 0 },
  response: {
    adminId: { type: Schema.Types.ObjectId },
    message: { type: String, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
  },
  experience: {
    fit: { type: String, enum: ['runs-small', 'true-to-size', 'runs-large'] },
    afterWash: { type: String, enum: ['shrank', 'no-change', 'stretched'] },
    wearFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'] }
  }
}, { timestamps: true });

// Indexes
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ helpfulVotes: -1 });

export const Review = model<IReviewDocument>('Review', ReviewSchema);