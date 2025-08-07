"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Reviewroute_1 = __importDefault(require("./route/Reviewroute"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express_1.default.json());
const mongooseUri = process.env.MONGODB_URI || "";
mongoose_1.default.connect(mongooseUri)
    .then(() => console.log("Review service connected to database"))
    .catch((error) => console.error("Failed to connect to database:", error));
app.use('/api/reviews', Reviewroute_1.default);
app.listen(3021, () => console.log(`Review service running on port 3021`));
