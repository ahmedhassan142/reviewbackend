"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
// models/Review.ts
const mongoose_1 = require("mongoose");
const ReviewSchema = new mongoose_1.Schema({
    sessionId: String,
    guestEmail: String,
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId },
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
        adminId: { type: mongoose_1.Schema.Types.ObjectId },
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
exports.Review = (0, mongoose_1.model)('Review', ReviewSchema);
