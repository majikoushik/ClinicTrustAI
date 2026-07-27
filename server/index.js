const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const logger = require('./utils/logger');
const { runExpirePriorAuths, runUrgencyEscalation } = require('./jobs/expirePriorAuths');
const { runTokenMaintenance } = require('./jobs/tokenMaintenance');

// Fail fast if required secrets are missing
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_RESET_SECRET'];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  logger.error('FATAL: Missing required environment variables', {
    missing: missingEnvVars.join(', '),
    hint: 'Copy .env.example to .env and populate all values before starting the server.',
  });
  process.exit(1);
}

const { protect, authorize } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const referralRoutes = require('./routes/referrals');
const analyticsRoutes = require('./routes/analytics');
const tokenRoutes = require('./routes/tokens');
const blockchainRoutes = require('./routes/blockchain');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');
const adminReferralRoutes = require('./routes/admin/referrals');
const adminAIManagementRoutes = require('./routes/admin/aiManagement');
const graphqlRoutes = require('./routes/graphql');
const fhirRoutes = require('./routes/fhir');
const priorAuthRoutes = require('./routes/priorAuth');
const adminPriorAuthRoutes = require('./routes/adminPriorAuth');
const syntheticRouter = require('./routes/syntheticRouter');
const patientEngagementRoutes = require('./routes/patientEngagement');
const adminPatientEngagementRoutes = require('./routes/admin/patientEngagement');
const ambientSessionRoutes = require('./routes/ambientSessions');
const adminAmbientSessionRoutes = require('./routes/admin/ambientSessions');
const referralMatchingRoutes = require('./routes/referralMatching');
const appointmentRoutes = require('./routes/appointments');
const scheduleRoutes = require('./routes/schedules');
const adminAppointmentRoutes = require('./routes/admin/appointments');
const adminAnalyticsRoutes = require('./routes/admin/analytics');
const dtxRoutes = require('./routes/dtx');
const adminDtxRoutes = require('./routes/adminDtx');
const messageRoutes = require('./routes/messages');
const contactRoutes = require('./routes/contact');
const npiRoutes = require('./routes/npi');
const onboardingRoutes = require('./routes/onboarding');
const adminKycRoutes = require('./routes/admin/kyc');
const adminTokenMgmtRoutes = require('./routes/admin/tokens');
const adminBlockchainRoutes = require('./routes/admin/blockchain');
const adminMatchingConfigRoutes = require('./routes/admin/matchingConfig');
const adminPatientsRoutes = require('./routes/admin/patients');
const adminAnalyticsJobRoutes = require('./routes/admin/analyticsJob');
const adminAIConfigRoutes = require('./routes/admin/aiConfig');
const predictiveAlertRoutes = require('./routes/predictiveAlerts');
const referralOutcomeRoutes = require('./routes/referralOutcomes');
const adminMessagingRoutes = require('./routes/admin/messaging');
const adminEscalationsRoutes = require('./routes/admin/escalations');
const aiRoutes = require('./routes/ai');
const providerRoutes = require('./routes/providers');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & common middleware ──────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

const isDev = process.env.NODE_ENV !== 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalised = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalised)) return callback(null, true);
      if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(normalised)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Stream Morgan HTTP request logs into Winston so they land in app.log
const morganStream = { write: (msg) => logger.http(msg.trim()) };
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// ── Centralised error handler (must be defined before startServer so the
//    reference is valid when Express registers it later) ─────────────────────
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  logger.error('Unhandled request error', {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    statusCode: status,
    error: err.message,
    stack: err.stack,
    errorType: err.name,
    code: err.code,
  });
  if (res.headersSent) return next(err);
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message,
  });
};

// ── Maintenance-mode middleware ───────────────────────────────────────────────
// Caches the setting for 60 s so it doesn't hit Mongo on every request.
let _maintenanceCache = { mode: false, message: '', ts: 0 };

async function loadMaintenanceSetting() {
  if (Date.now() - _maintenanceCache.ts < 60000) return _maintenanceCache;
  try {
    const AdminSetting = require('./models/Admin');
    const s = await AdminSetting.findOne({ key: 'maintenance' }).lean();
    if (s && s.value) {
      _maintenanceCache = { mode: !!s.value.maintenanceMode, message: s.value.maintenanceMessage || '', ts: Date.now() };
    } else {
      _maintenanceCache.ts = Date.now();
    }
  } catch { _maintenanceCache.ts = Date.now(); }
  return _maintenanceCache;
}

// Export so admin settings save can bust the cache
function bustMaintenanceCache() { _maintenanceCache.ts = 0; }

const maintenanceMiddleware = async (req, res, next) => {
  // Always allow admin paths and public auth
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) return next();
  try {
    const { mode, message } = await loadMaintenanceSetting();
    if (mode) {
      return res.status(503).json({
        success: false,
        maintenance: true,
        error: message || 'The platform is under scheduled maintenance. Please try again later.',
      });
    }
  } catch { /* fail open */ }
  next();
};

// ── Static files ─────────────────────────────────────────────────────────────
function mountStaticFiles() {
  // Serve uploaded files (avatars, KYC docs) in all environments
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'ok',
      service: 'ClinicTrust AI API',
      timestamp: new Date().toISOString(),
    });
  });

  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '../client/build');
    const clientIndexPath = path.join(clientBuildPath, 'index.html');

    if (!fs.existsSync(clientIndexPath)) {
      app.get('/', (req, res) => {
        res.json({
          success: true,
          status: 'ok',
          service: 'ClinicTrust AI API',
          message: 'Backend is running. Frontend is deployed separately.',
          timestamp: new Date().toISOString(),
        });
      });
      return;
    }

    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(clientIndexPath));
    });
  }
}

// ── Mount real (live DB) routes ──────────────────────────────────────────────
function mountLiveRoutes() {
  app.use(maintenanceMiddleware);

  // Public auth endpoints — rate-limited
  app.use('/api/auth', authLimiter, authRoutes);

  // Admin auth must come before the protected /api/admin block so the public
  // login endpoint is reachable without a token.
  app.use('/api/admin/auth', authLimiter, adminAuthRoutes);

  // User-facing routes (each route file applies protect internally)
  app.use('/api/patients', patientRoutes);
  app.use('/api/referrals', referralRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/tokens', tokenRoutes);
  app.use('/api/blockchain', blockchainRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Protected admin routes — specific sub-paths BEFORE the generic /api/admin
  // so Express doesn't need to fall through adminRoutes for each sub-router.
  app.use('/api/admin/referrals', [protect, authorize('admin', 'superadmin'), adminReferralRoutes]);
  app.use('/api/admin/ai-management', [protect, authorize('admin', 'superadmin'), adminAIManagementRoutes]);
  app.use('/api/admin/prior-auth', [protect, authorize('admin', 'superadmin'), adminPriorAuthRoutes]);
  app.use('/api/admin/patient-engagement', [protect, authorize('admin', 'superadmin'), adminPatientEngagementRoutes]);
  app.use('/api/admin/ambient-sessions', [protect, authorize('admin', 'superadmin'), adminAmbientSessionRoutes]);
  app.use('/api/admin/appointments', [protect, authorize('admin', 'superadmin'), adminAppointmentRoutes]);
  app.use('/api/admin/analytics', [protect, authorize('admin', 'superadmin'), adminAnalyticsRoutes]);
  app.use('/api/admin/dtx', adminDtxRoutes);
  app.use('/api/admin', [protect, authorize('admin', 'superadmin'), adminRoutes]);
  app.use('/api/referral-matching', protect, referralMatchingRoutes);
  app.use('/api/appointments', protect, appointmentRoutes);
  app.use('/api/schedules', protect, scheduleRoutes);
  app.use('/api/patient-engagement', protect, patientEngagementRoutes);
  app.use('/api/ambient-sessions', protect, ambientSessionRoutes);
  app.use('/api/dtx', dtxRoutes);

  // Provider listing — used by Create Referral screen
  app.use('/api/providers', providerRoutes);

  // NPI lookup (public)
  app.use('/api/npi', npiRoutes);

  // Provider onboarding
  app.use('/api/users', protect, userRoutes);
  app.use('/api/onboarding', protect, onboardingRoutes);

  // Admin token management (must be before generic /api/admin catch-all)
  app.use('/api/admin/tokens', [protect, authorize('admin', 'superadmin')], adminTokenMgmtRoutes);

  // Admin blockchain ledger + multi-sig operations
  app.use('/api/admin/blockchain', [protect, authorize('admin', 'superadmin')], adminBlockchainRoutes);

  // Admin KYC management
  app.use('/api/admin/kyc', [protect, authorize('admin', 'superadmin')], adminKycRoutes);
  app.use('/api/admin/matching-config', [protect, authorize('admin', 'superadmin')], adminMatchingConfigRoutes);
  app.use('/api/admin/patients', [protect, authorize('admin', 'superadmin')], adminPatientsRoutes);
  app.use('/api/admin/analytics', [protect, authorize('admin', 'superadmin')], adminAnalyticsJobRoutes);

  // Admin messaging — broadcast messages + targeted alerts
  app.use('/api/admin/messages', [protect, authorize('admin', 'superadmin')], adminMessagingRoutes);

  // Admin escalation workflows
  app.use('/api/admin/escalations', [protect, authorize('admin', 'superadmin')], adminEscalationsRoutes);

  // AI Configuration (persisted thresholds)
  app.use('/api/admin/ai-config', [protect, authorize('admin', 'superadmin')], adminAIConfigRoutes);

  // Provider-facing predictive alerts
  app.use('/api/predictive-alerts', predictiveAlertRoutes);

  // Referral outcome tracking
  app.use('/api/referral-outcomes', protect, referralOutcomeRoutes);

  // AI assistant (clinical insight, referral summary, risk analysis)
  app.use('/api/ai', aiRoutes);

  // Contact form — POST is public, GET is admin-only
  app.use('/api/contact', contactRoutes);

  // Provider-to-provider secure messaging (tied to referral threads)
  app.use('/api/messages', protect, messageRoutes);

  // FHIR R4 API — ONC 21st Century Cures Act / CMS-0057-F compliant
  app.use('/api/fhir', fhirRoutes);

  // Prior Authorization (provider-facing)
  app.use('/api/prior-auth', priorAuthRoutes);

  // GraphQL
  app.use('/graphql', graphqlRoutes);
}

// ── Mount synthetic (in-memory) routes ──────────────────────────────────────
function mountSyntheticRoutes() {
  // Rate-limit the auth paths even in synthetic mode
  app.use('/api/auth', authLimiter);
  app.use('/api/admin/auth', authLimiter);

  // Single router covers every /api/* path
  app.use('/api', syntheticRouter);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function startServer() {
  let dbConnected = false;

  try {
    // Give MongoDB 8 seconds to connect; fall back to synthetic data if it
    // times out (e.g. no network, wrong URI, Atlas paused).
    await Promise.race([
      mongoose.connect(process.env.MONGO_URI),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 8 s')), 8000)
      ),
    ]);
    dbConnected = true;
    logger.info('MongoDB connected — running in live database mode');
  } catch (err) {
    logger.warn('MongoDB unavailable — starting in SYNTHETIC DATA mode', {
      error: err.message,
      stack: err.stack,
      hint: 'Demo password for all accounts: Demo1234!',
    });
  }

  if (dbConnected) {
    mountLiveRoutes();

    // Seed default ConversionRule, TokenCatalog, and TokenEarnPolicy if collections are empty
    const { seedDefaults } = require('./utils/seedDefaults');
    seedDefaults().catch(err => logger.warn('seedDefaults failed (non-fatal)', { error: err.message }));

    // Seed genesis block if the chain is empty
    ensureGenesisBlock().catch(err => logger.warn('Genesis block seed failed (non-fatal)', { error: err.message }));

    // Start on-chain Transfer event listener (no-op when Polygon not configured)
    const { startEventListener } = require('./blockchain/events');
    startEventListener().catch(err => logger.warn('Blockchain event listener failed to start (non-fatal)', { error: err.message }));

    // Token maintenance: stake release + expiry (every 6 hours)
    scheduleTokenMaintenance();

    // Schedule nightly PA expiry job at 00:05 server time
    scheduleNightlyJob();
    // Schedule 30-minute urgency escalation check
    scheduleEscalationCheck();

    // Predictive alert generation — run 1 minute after boot, then every 4 hours
    const { generateAlertsForAllProviders } = require('./services/predictiveAlertService');
    setTimeout(() => generateAlertsForAllProviders().catch(e => logger.warn('Alert gen failed', {e: e.message})), 60000);
    setInterval(() => generateAlertsForAllProviders().catch(e => logger.warn('Alert gen failed', {e: e.message})), 4 * 3600000);

    // Feedback loop — run daily at startup + every 24h
    const { runFeedbackLoop } = require('./services/feedbackLoopService');
    setTimeout(() => runFeedbackLoop().catch(() => {}), 120000);
    setInterval(() => runFeedbackLoop().catch(() => {}), 24 * 3600000);
  } else {
    mountSyntheticRoutes();
  }

  mountStaticFiles();
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () =>
    logger.info(`Server running on port ${PORT} [${dbConnected ? 'LIVE DB' : 'SYNTHETIC DATA'}]`)
  );
}

// ── Nightly PA expiry cron (runs only in live-DB mode) ───────────────────────
function scheduleNightlyJob() {
  function msUntilNextRun() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 5, 0, 0); // 00:05 today
    if (next <= now) next.setDate(next.getDate() + 1); // already past → tomorrow
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNextRun();
    logger.info(`[expirePriorAuths] Next run in ${Math.round(delay / 60000)} minutes`);
    setTimeout(async () => {
      const result = await runExpirePriorAuths();
      logger.info('[expirePriorAuths] Job complete', result);
      scheduleNext(); // reschedule for the next day
    }, delay);
  }

  scheduleNext();
}

// ── 30-minute urgency escalation (runs only in live-DB mode) ─────────────────
function scheduleEscalationCheck() {
  const INTERVAL_MS = 30 * 60 * 1000;
  logger.info('[escalation] Starting 30-minute urgency escalation interval');
  // Run once shortly after startup to catch anything that breached while the server was down
  setTimeout(async () => {
    const result = await runUrgencyEscalation();
    logger.info('[escalation] Startup check complete', result);
  }, 10000);
  // Then repeat every 30 minutes
  setInterval(async () => {
    const result = await runUrgencyEscalation();
    logger.info('[escalation] Interval check complete', result);
  }, INTERVAL_MS);
}

// ── Token maintenance scheduler (stake release + expiry, every 6 h) ──────────
function scheduleTokenMaintenance() {
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
  logger.info('[tokenMaintenance] Scheduled every 6 hours');
  // Run once 30 s after boot to catch anything that matured while server was down
  setTimeout(async () => {
    const result = await runTokenMaintenance();
    logger.info('[tokenMaintenance] Startup run complete', result);
  }, 30_000);
  setInterval(async () => {
    const result = await runTokenMaintenance();
    logger.info('[tokenMaintenance] Interval run complete', result);
  }, INTERVAL_MS);
}

// ── Genesis block (seeds the chain if it has never been written) ──────────────
async function ensureGenesisBlock() {
  const BlockchainTransaction = require('./models/BlockchainTransaction');
  const existing = await BlockchainTransaction.countDocuments();
  if (existing > 0) return; // chain already has records

  const crypto = require('crypto');
  const genesisData = {
    type: 'genesis',
    message: 'ClinicTrust AI — genesis block',
    version: '2.0',
    network: process.env.POLYGON_NETWORK || 'ledger',
    createdAt: new Date().toISOString(),
  };
  const previousHash = 'genesis';
  const blockNumber  = 0;
  const hashInput    = JSON.stringify({ ...genesisData, previousHash, blockNumber });
  const hash         = crypto.createHash('sha256').update(hashInput).digest('hex');
  const transactionId = `genesis_${crypto.randomBytes(8).toString('hex')}`;
  await BlockchainTransaction.create({
    transactionId,
    type: 'genesis',
    data: genesisData,
    hash,
    previousHash,
    blockNumber,
    timestamp: new Date(),
  });
  logger.info('Blockchain genesis block created', { transactionId, hash });
}

startServer();

module.exports = app;
