import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';
import onboardingRoutes from './routes/onboarding.routes';
import rolesRoutes from './routes/roles.routes';
import orgRoutes from './routes/org.routes';
import { createErrorMiddleware } from '../shared/middlewares/error.middleware';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://192.168.1.7:8080',
];

const app = express();

// Standard CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }),
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.use('/api/v1/org', orgRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'middle layer server is running' });
});

// Error handling middleware (should be last)
app.use(createErrorMiddleware('MiddleLayer'));

export { app };
