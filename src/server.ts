import express from 'express';
import reviewRoute from './route/Reviewroute';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { Request, Response } from 'express';

dotenv.config();

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL ,
    credentials: true,
}));
app.use(express.json());

const mongooseUri = process.env.MONGODB_URI || "";
mongoose.connect(mongooseUri)
    .then(() => console.log("Review service connected to database"))
    .catch((error) => console.error("Failed to connect to database:", error));



app.use('/api/reviews', reviewRoute);


app.listen(3021, () => console.log(`Review service running on port 3021`));