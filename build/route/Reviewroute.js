"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Reviewservice_1 = require("../model/Reviewservice");
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = require("cloudinary");
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = require('express').Router();
// Cloudinary configuration (same as productRoutes)
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});
// File upload middleware for review photos
router.use((0, express_fileupload_1.default)({
    useTempFiles: false,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per photo
        files: 4 // Maximum 4 photos
    },
    abortOnLimit: true,
    responseOnLimit: 'Maximum 4 photos allowed (5MB each)'
}));
router.post("/product/:productId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const _b = req.body, { productId, userId, sessionId, guestEmail, rating, title, comment, photos = [] } = _b, optionalFields = __rest(_b, ["productId", "userId", "sessionId", "guestEmail", "rating", "title", "comment", "photos"]);
        // Validate required fields
        if (!productId || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Valid product ID is required",
                errorCode: "INVALID_PRODUCT_ID"
            });
        }
        if (!rating || rating < 1 || rating > 5) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Please provide a rating between 1-5 stars",
                errorCode: "INVALID_RATING"
            });
        }
        if (!title || title.trim().length < 10) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Title must be at least 10 characters",
                errorCode: "INVALID_TITLE"
            });
        }
        if (!comment || comment.trim().length < 20) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Comment must be at least 20 characters",
                errorCode: "INVALID_COMMENT"
            });
        }
        // Handle file uploads
        let uploadedPhotos = [...photos];
        if (req.files && req.files.photos) {
            const files = Array.isArray(req.files.photos)
                ? req.files.photos
                : [req.files.photos];
            // Upload each photo to Cloudinary
            const uploadPromises = files.map(file => {
                return new Promise((resolve, reject) => {
                    if (!file.data) {
                        reject(new Error('File buffer is empty'));
                        return;
                    }
                    const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                        folder: 'reviews',
                        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                        transformation: [{ width: 800, quality: 'auto' }]
                    }, (error, result) => {
                        if (error) {
                            reject(error);
                        }
                        else if (!result) {
                            reject(new Error('Cloudinary upload returned no result'));
                        }
                        else {
                            resolve(result);
                        }
                    });
                    uploadStream.end(file.data);
                });
            });
            const results = yield Promise.all(uploadPromises);
            uploadedPhotos = [...uploadedPhotos, ...results.map(r => r.secure_url)];
        }
        // Validate total photos count
        if (uploadedPhotos.length > 4) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Maximum 4 photos allowed in total (existing + new uploads)",
                errorCode: "TOO_MANY_PHOTOS"
            });
        }
        // Check for existing review
        const existingConditions = { productId };
        if (userId) {
            existingConditions.userId = userId;
        }
        else if (sessionId) {
            existingConditions.sessionId = sessionId;
        }
        else if (guestEmail) {
            existingConditions.guestEmail = guestEmail.toLowerCase().trim();
        }
        const existingReview = yield Reviewservice_1.Review.findOne(existingConditions).session(session);
        if (existingReview) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "You've already reviewed this product",
                errorCode: "DUPLICATE_REVIEW",
                existingReviewId: existingReview._id
            });
        }
        // Verify purchase if authenticated user
        let verifiedPurchase = false;
        let verificationNote = "Not verified";
        if (userId) {
            try {
                const { data } = yield axios_1.default.get(`${process.env.ORDER_SERVICE_URL}/verify-purchase`, {
                    params: { userId, productId, strict: true },
                    timeout: 3000,
                    headers: {
                        'Service-Authorization': `Bearer ${process.env.SERVICE_API_KEY}`
                    }
                });
                verifiedPurchase = data.hasPurchased;
                verificationNote = verifiedPurchase ? "✓ Verified Purchase" : "Not verified";
            }
            catch (error) {
                console.error('Purchase verification failed:', error);
                verificationNote = "Verification unavailable";
            }
        }
        // Create review
        const review = new Reviewservice_1.Review(Object.assign(Object.assign(Object.assign({ productId,
            rating, title: title || `My ${rating}-star experience`, comment, photos: uploadedPhotos.slice(0, 4) }, optionalFields), (userId
            ? {
                userId,
                reviewType: 'authenticated',
                verifiedPurchase
            }
            : {
                sessionId,
                guestEmail: (_a = guestEmail === null || guestEmail === void 0 ? void 0 : guestEmail.toLowerCase()) === null || _a === void 0 ? void 0 : _a.trim(),
                reviewType: 'guest',
                verifiedPurchase: false
            })), { metadata: {
                verificationNote,
                transparencyScore: verifiedPurchase ? 100 : 30,
                version: "v3.1"
            }, status: 'pending', helpfulVotes: 0, reportCount: 0 }));
        yield review.save({ session });
        // Update product stats
        try {
            yield axios_1.default.post(` ${process.env.PRODUCT_SERVICE_URL}/api/products/update-rating`, {
                productId,
                rating,
                weight: verifiedPurchase ? 1.2 : 1.0
            }, {
                timeout: 3000,
            });
        }
        catch (error) {
            console.error('Rating update failed:', error);
        }
        yield session.commitTransaction();
        session.endSession();
        res.status(201).json({
            success: true,
            review: Object.assign(Object.assign({}, review.toObject()), { createdAt: review.createdAt.toISOString(), updatedAt: review.updatedAt.toISOString() }),
            transparencyReport: verificationNote
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error('Review creation error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: Object.values(error.errors).map((err) => err.message),
                errorCode: "VALIDATION_ERROR"
            });
        }
        res.status(500).json({
            success: false,
            message: "We couldn't process your review",
            errorCode: "REVIEW_FAILED",
            customerSupport: "reviews@yourdomain.com",
            systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));
// Get reviews with Everlane's sorting
router.get("/product/:productId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Request received for product reviews:', req.params.productId); // Debug log
        const { productId } = req.params;
        // Validate productId format
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            console.log('Invalid productId format:', productId); // Debug log
            return res.status(400).json({
                success: false,
                message: "Invalid product ID format",
                receivedId: productId
            });
        }
        // Convert string ID to MongoDB ObjectId
        const productObjectId = new mongoose_1.default.Types.ObjectId(productId);
        // Basic reviews query (without aggregation for debugging)
        const reviews = yield Reviewservice_1.Review.find({ productId: productObjectId }).limit(10);
        console.log('Found reviews count:', reviews.length); // Debug log
        if (!reviews.length) {
            return res.status(404).json({
                success: false,
                message: "No reviews found for this product"
            });
        }
        // Simple stats calculation (temporary)
        const totalReviews = reviews.length;
        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
        const ratingDistribution = {
            1: reviews.filter(r => r.rating === 1).length,
            2: reviews.filter(r => r.rating === 2).length,
            3: reviews.filter(r => r.rating === 3).length,
            4: reviews.filter(r => r.rating === 4).length,
            5: reviews.filter(r => r.rating === 5).length
        };
        res.json({
            success: true,
            reviews,
            stats: {
                averageRating: parseFloat(averageRating.toFixed(1)),
                totalReviews,
                ratingDistribution
            }
        });
    }
    catch (error) {
        console.error("API Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error occurred",
            error: error.message // Only show in development
        });
    }
}));
// Mark a review as helpful
// POST /api/reviews/:reviewId/helpful
router.patch('/:reviewId/helpful', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    console.log('=== Helpful Vote Request ===');
    console.log('Headers:', req.headers);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    try {
        const { reviewId } = req.params;
        const { userId, sessionId } = req.body;
        // 1. Validate review ID
        if (!mongoose_1.default.Types.ObjectId.isValid(reviewId)) {
            console.warn(`Invalid review ID format: ${reviewId}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid review ID format',
                code: 'INVALID_REVIEW_ID'
            });
        }
        // 2. Validate at least one identifier exists
        if (!userId && !sessionId) {
            console.warn('Missing both userId and sessionId');
            return res.status(400).json({
                success: false,
                message: 'Either userId (authenticated) or sessionId (guest) is required',
                code: 'MISSING_IDENTIFIER'
            });
        }
        // 3. Determine voter ID with priority
        let voterId;
        if (userId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                console.warn(`Invalid user ID format: ${userId}`);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format',
                    code: 'INVALID_USER_ID'
                });
            }
            voterId = `user:${userId}`;
        }
        else {
            if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10) {
                console.warn(`Invalid session ID: ${sessionId}`);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid session ID',
                    code: 'INVALID_SESSION_ID'
                });
            }
            voterId = `session:${sessionId}`;
        }
        console.log(`Processing vote from: ${voterId}`);
        // 4. Check for existing vote
        const existingVote = yield Reviewservice_1.Review.findOne({
            _id: reviewId,
            'voters.voterId': voterId
        }).lean();
        if (existingVote) {
            console.warn(`Duplicate vote attempt from ${voterId}`);
            return res.status(409).json({
                success: false,
                message: 'You have already voted for this review',
                code: 'DUPLICATE_VOTE',
                currentVotes: existingVote.helpfulVotes
            });
        }
        // 5. Update with atomic operations
        const updatedReview = yield Reviewservice_1.Review.findOneAndUpdate({ _id: reviewId }, {
            $inc: { helpfulVotes: 1 },
            $push: {
                voters: {
                    voterId,
                    votedAt: new Date()
                }
            },
        }, { new: true, runValidators: true });
        if (!updatedReview) {
            console.error(`Review not found: ${reviewId}`);
            return res.status(404).json({
                success: false,
                message: 'Review not found',
                code: 'REVIEW_NOT_FOUND'
            });
        }
        console.log(`Successfully updated votes for review ${reviewId}. New count: ${updatedReview.helpfulVotes}`);
        console.log(`Processing time: ${Date.now() - startTime}ms`);
        return res.status(200).json({
            success: true,
            helpfulVotes: updatedReview.helpfulVotes,
            voterId: voterId, // Return for debugging
            code: 'VOTE_REGISTERED'
        });
    }
    catch (error) {
        console.error('Vote processing error:', {
            message: error.message,
            stack: error.stack,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        return res.status(500).json({
            success: false,
            message: 'Internal server error during vote processing',
            code: 'SERVER_ERROR',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
}));
exports.default = router;
