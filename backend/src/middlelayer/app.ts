import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';
import onboardingRoutes from './routes/onboarding.routes';
import { createErrorMiddleware } from '../shared/middlewares/error.middleware';

const app = express();

app.use(cors({
  origin: true, // Allow all for dev, or specify frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request Logger
app.use((req, res, next) => {
  console.log(`[MiddleLayer] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'middle layer server is running with Auth support' });
});

// Error handling middleware (should be last)
app.use(createErrorMiddleware('MiddleLayer'));

export { app };
