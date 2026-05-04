import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import path from 'path';

import { swaggerSpec } from './config/swagger';
import logger from './utils/logger';

// Routes
import authRoutes from './routes/auth.routes';
import companiesRoutes from './routes/companies.routes';
import usersRoutes from './routes/users.routes';
import housesRoutes from './routes/houses.routes';
import risksRoutes from './routes/risks.routes';
import incidentsRoutes from './routes/incidents.routes';
import governanceRoutes from './routes/governance.routes';
import pulseRoutes from './routes/pulse.routes';
import escalationsRoutes from './routes/escalations.routes';
import reportsRoutes from './routes/reports.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationsRoutes from './routes/notifications.routes';
import rolesRoutes from './routes/roles.routes';
import systemRoutes from './routes/system.routes';
import exportsRoutes from './routes/exports.routes';
import weeklyReviewsRoutes from './routes/weeklyReviews.routes';
import adminRoutes from './routes/admin.routes';
import dailyGovernanceRoutes from './routes/dailyGovernance.routes';
import incidentReconstructionRoutes from './routes/incidentReconstruction.routes';
import thresholdEventsRoutes from './routes/thresholdEvents.routes';
import clustersRoutes from './routes/clusters.routes';
import riGovernanceRoutes from './routes/riGovernance.routes';
import directorGovernanceRoutes from './routes/directorGovernance.routes';
import actionsRoutes from './routes/actions.routes';





const app = express();

// ─── Security & Parsing Middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.some(allowed => 
      origin === allowed || origin.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`)
    );

    if (isAllowed) {
      // Return only the exact origin that matched
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HTTP Logging ────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ─── Static Files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }, meta: {} });
});

// ─── Swagger Documentation ───────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'Ordin Core API',
  customCss: `
    .swagger-ui .topbar { background-color: #1e293b; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
  `,
}));

// Expose raw swagger spec
app.get('/swagger.json', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/actions`, actionsRoutes);

app.use(`${API}/companies`, companiesRoutes);
app.use(`${API}/users`, usersRoutes);
app.use(`${API}/houses`, housesRoutes);
app.use(`${API}/risks`, risksRoutes);
app.use(`${API}/incidents`, incidentsRoutes);
app.use(`${API}/governance`, governanceRoutes);
app.use(`${API}/pulses`, pulseRoutes);
app.use(`${API}/escalations`, escalationsRoutes);
app.use(`${API}/reports`, reportsRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/notifications`, notificationsRoutes);
app.use(`${API}/roles`, rolesRoutes);
app.use(`${API}/system`, systemRoutes);
app.use(`${API}/exports`, exportsRoutes);
app.use(`${API}/weekly-reviews`, weeklyReviewsRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/daily-governance`, dailyGovernanceRoutes);
app.use(`${API}/incident-reconstructions`, incidentReconstructionRoutes);
app.use(`${API}/threshold-events`, thresholdEventsRoutes);
app.use(`${API}/clusters`, clustersRoutes);
app.use(`${API}/ri-governance`, riGovernanceRoutes);
app.use(`${API}/director-governance`, directorGovernanceRoutes);


// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, errors: [] });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ success: false, message: 'Internal server error', errors: [] });
});

export default app;
