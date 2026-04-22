import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

app.use(cors({
  origin: true, // Allow all for dev, or specify frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running with Auth support' });
});

// Error handling middleware (should be last)
app.use(errorMiddleware);

export { app };
