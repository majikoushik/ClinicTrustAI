import React, { useState, useEffect, useCallback } from 'react';
import ScheduleReportDialog from '../../components/admin/ScheduleReportDialog';
import {
  Container, Grid, Typography, Box, Paper,
  Button, IconButton, MenuItem, Tabs, Tab,
  FormControl, InputLabel, Select, Chip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  List, ListItem, ListItemIcon, ListItemText, Divider,
  LinearProgress, Avatar,
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';
import {
  FileDownload as DownloadIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  PlayArrow as RunIcon,
  SwapHoriz as ReferralIcon,
  CalendarMonth as CalendarIcon,
  Assignment as PriorAuthIcon,
  Storefront as DtxIcon,
  Token as TokenIcon,
  ErrorOutline as ErrorIcon,
  WarningAmber as WarnIcon,
  InfoOutlined as InfoIcon,
  CheckCircle as OkIcon,
  FiberManualRecord as DotIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Mic as MicIcon,
  Psychology as AIIcon,
  NotificationsActive as EngageIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { adminAnalyticsService } from '../../services';
import { post } from '../../utils/apiUtils';
import { formatDate, formatRelativeTime } from '../../utils/dateFormatter';
import { useNavigate } from 'react-router-dom';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n) => (n ?? 0).toLocaleString();
const pct = (n) => `${n ?? 0}%`;

const ALERT_META = {
  prior_auth_overdue: { icon: <ErrorIcon />, color: 'error' },
  referral_stale:     { icon: <WarnIcon />,  color: 'warning' },
  provider_inactive:  { icon: <WarnIcon />,  color: 'warning' },
  high_no_show:       { icon: <WarnIcon />,  color: 'warning' },
  dtx_unused:         { icon: <InfoIcon />,  color: 'info' },
  high_pa_denial:     { icon: <ErrorIcon />, color: 'error' },
};

const FEED_COLORS = {
  referral:   '#1976d2',
  appointment:'#388e3c',
  dtx:        '#7b1fa2',
  prior_auth: '#ed6c02',
  ambient:    '#0288d1',
};

const FUNNEL_COLORS = ['#1976d2', '#0288d1', '#00897b', '#388e3c', '#7b1fa2', '#f57c00'];

// ─── sub-components ──────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend, color = 'primary.main', onClick }) {
  const trendPos = typeof trend === 'number' && trend > 0;
  const trendNeg = typeof trend === 'number' && trend < 0;
  return (
    <Paper
      elevation={1}
      sx={{
        p: 1.5, height: '100%', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-1px)', transition: 'all 0.15s ease' } : {},
      }}
      onClick={onClick}
    >
      {/* Label row + icon badge */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.35, maxWidth: 'calc(100% - 32px)', display: 'block' }}
        >
          {label}
        </Typography>
        <Box sx={{
          bgcolor: color,
          borderRadius: 1.5,
          width: 26, height: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, ml: 0.5, color: 'white',
          '& svg': { fontSize: 15 },
        }}>
          {icon}
        </Box>
      </Box>

      {/* Value — h6 keeps it readable but compact */}
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ lineHeight: 1.15, wordBreak: 'break-word', fontSize: { xs: '1.1rem', md: '1.15rem' } }}
      >
        {value}
      </Typography>

      {sub && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.4, lineHeight: 1.2 }}>
          {sub}
        </Typography>
      )}
      {typeof trend === 'number' && (
        <Box display="flex" alignItems="center" gap={0.3} mt={0.4} flexWrap="wrap">
          {trendPos
            ? <TrendUpIcon sx={{ fontSize: 12, color: 'success.main' }} />
            : trendNeg ? <TrendDownIcon sx={{ fontSize: 12, color: 'error.main' }} /> : null}
          <Typography
            variant="caption"
            color={trendPos ? 'success.main' : trendNeg ? 'error.main' : 'text.secondary'}
            sx={{ fontSize: '0.65rem' }}
          >
            {trendPos ? '+' : ''}{trend}% vs last mo.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

function CareFunnelViz({ stages, loading }) {
  if (loading) return <ModernLoadingIndicator variant="dots" message="Loading care funnel…" />;
  if (!stages || stages.length === 0) return <Typography color="text.secondary">No data available.</Typography>;
  const max = stages[0]?.count || 1;
  return (
    <Box>
      {stages.map((s, i) => (
        <Box key={s.stage} mb={1.5}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <DotIcon sx={{ fontSize: 12, color: s.color || FUNNEL_COLORS[i] }} />
              <Typography variant="body2" fontWeight={500}>{s.stage}</Typography>
              {s.dropoffPct !== null && s.dropoffPct > 0 && (
                <Chip label={`-${s.dropoffPct}%`} size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              )}
            </Box>
            <Typography variant="body2" fontWeight={700}>{fmtNum(s.count)}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={max > 0 ? (s.count / max) * 100 : 0}
            sx={{ height: 10, borderRadius: 5, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { bgcolor: s.color || FUNNEL_COLORS[i], borderRadius: 5 } }}
          />
        </Box>
      ))}
    </Box>
  );
}

function AlertsPanel({ alerts, loading }) {
  const navigate = useNavigate();
  if (loading) return <ModernLoadingIndicator variant="dots" message="Checking alerts…" />;
  if (!alerts || alerts.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" py={3} gap={1}>
        <OkIcon sx={{ fontSize: 40, color: 'success.main' }} />
        <Typography variant="body2" color="success.main" fontWeight={500}>No alerts — platform is healthy</Typography>
      </Box>
    );
  }
  return (
    <List dense disablePadding>
      {alerts.map((a, i) => {
        const meta = ALERT_META[a.type] || { icon: <InfoIcon />, color: 'info' };
        return (
          <React.Fragment key={i}>
            <ListItem
              sx={{ px: 0, cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate(a.link || '/admin')}
            >
              <ListItemIcon sx={{ minWidth: 36, color: `${meta.color}.main` }}>{meta.icon}</ListItemIcon>
              <ListItemText
                primary={a.message}
                primaryTypographyProps={{ variant: 'body2' }}
                secondary={<Chip label={a.severity} size="small" color={meta.color} variant="outlined" sx={{ height: 16, fontSize: 10, mt: 0.3 }} />}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
            {i < alerts.length - 1 && <Divider />}
          </React.Fragment>
        );
      })}
    </List>
  );
}

function ActivityFeedPanel({ feed, loading }) {
  if (loading) return <ModernLoadingIndicator variant="dots" message="Loading activity…" />;
  if (!feed || feed.length === 0) return <Typography color="text.secondary" variant="body2">No recent activity.</Typography>;
  return (
    <List dense disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
      {feed.map((ev, i) => (
        <React.Fragment key={i}>
          <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ minWidth: 30, mt: 0.3 }}>
              <DotIcon sx={{ fontSize: 10, color: FEED_COLORS[ev.type] || 'grey.500', mt: 0.5 }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" fontWeight={500}>{ev.description}</Typography>}
              secondary={
                <Box display="flex" alignItems="center" gap={1} mt={0.2}>
                  <Chip label={ev.type.replace('_', ' ')} size="small" sx={{ height: 16, fontSize: 10, bgcolor: FEED_COLORS[ev.type] + '22', color: FEED_COLORS[ev.type] }} />
                  <Typography variant="caption" color="text.secondary">{formatRelativeTime(ev.timestamp)}</Typography>
                </Box>
              }
            />
          </ListItem>
          {i < feed.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();

  // Always-visible state
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [careFunnel, setCareFunnel] = useState([]);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [activityFeed, setActivityFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Tab-specific state
  const [providerPerformance, setProviderPerformance] = useState([]);
  const [referralConversion, setReferralConversion] = useState([]);
  const [referralMeta, setReferralMeta] = useState({});
  const [tokenEconomy, setTokenEconomy] = useState([]);
  const [tokenMeta, setTokenMeta] = useState({});
  const [aiAnalytics, setAIAnalytics] = useState(null);
  const [platformOverview, setPlatformOverview] = useState(null);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [tokenPeriod, setTokenPeriod] = useState('last6months');
  const [referralPeriod, setReferralPeriod] = useState('last6months');

  // Loading / error per tab
  const [loading, setLoading] = useState({ providers: false, referrals: false, tokens: false, ai: false, overview: false, reports: false });
  const [error, setError] = useState({ providers: null, referrals: null, tokens: null, ai: null, overview: null, reports: null });

  // Schedule dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Analytics job state
  const [jobRunning, setJobRunning] = useState(false);
  const [jobResult, setJobResult] = useState(null);
  const [jobError, setJobError] = useState(null);

  const handleRunAnalyticsJob = useCallback(async () => {
    setJobRunning(true);
    setJobResult(null);
    setJobError(null);
    try {
      const json = await post('/admin/analytics/run-job', {});
      if (json.success) {
        setJobResult(json.data);
      } else {
        setJobError(json.error || 'Job failed');
      }
    } catch (e) {
      setJobError(e.response?.data?.error || e.message);
    } finally {
      setJobRunning(false);
    }
  }, []);

  // ── always-visible fetches ──────────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await adminAnalyticsService.getPlatformHealth();
      if (res?.success) setHealthData(res.data);
    } finally { setHealthLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await adminAnalyticsService.getAlerts();
      if (res?.success) setAlerts(res.data || []);
    } finally { setAlertsLoading(false); }
  }, []);

  const fetchFunnel = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const res = await adminAnalyticsService.getCareFunnel();
      if (res?.success) setCareFunnel(res.data || []);
    } finally { setFunnelLoading(false); }
  }, []);

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await adminAnalyticsService.getActivityFeed(20);
      if (res?.success) setActivityFeed(res.data || []);
    } finally { setFeedLoading(false); }
  }, []);

  // ── tab fetches ─────────────────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    setLoading(p => ({ ...p, providers: true }));
    try {
      const res = await adminAnalyticsService.getProviderPerformance();
      if (res?.success) { setProviderPerformance(res.data); setError(p => ({ ...p, providers: null })); }
      else setError(p => ({ ...p, providers: res?.error || 'Failed' }));
    } catch (e) { setError(p => ({ ...p, providers: e.message })); }
    finally { setLoading(p => ({ ...p, providers: false })); }
  }, []);

  const fetchReferrals = useCallback(async (period) => {
    setLoading(p => ({ ...p, referrals: true }));
    try {
      const res = await adminAnalyticsService.getReferralConversionRates(period || referralPeriod);
      if (res?.success) { setReferralConversion(res.data || []); setReferralMeta(res.meta || {}); setError(p => ({ ...p, referrals: null })); }
      else setError(p => ({ ...p, referrals: res?.error || 'Failed' }));
    } catch (e) { setError(p => ({ ...p, referrals: e.message })); }
    finally { setLoading(p => ({ ...p, referrals: false })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTokens = useCallback(async (period) => {
    setLoading(p => ({ ...p, tokens: true }));
    try {
      const res = await adminAnalyticsService.getTokenEconomyTrends(period || tokenPeriod);
      if (res?.success) { setTokenEconomy(res.data || []); setTokenMeta(res.meta || {}); setError(p => ({ ...p, tokens: null })); }
      else setError(p => ({ ...p, tokens: res?.error || 'Failed' }));
    } catch (e) { setError(p => ({ ...p, tokens: e.message })); }
    finally { setLoading(p => ({ ...p, tokens: false })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAI = useCallback(async () => {
    setLoading(p => ({ ...p, ai: true }));
    try {
      const res = await adminAnalyticsService.getAIAnalytics();
      if (res?.success) { setAIAnalytics(res.data); setError(p => ({ ...p, ai: null })); }
      else setError(p => ({ ...p, ai: res?.error || 'Failed' }));
    } catch (e) { setError(p => ({ ...p, ai: e.message })); }
    finally { setLoading(p => ({ ...p, ai: false })); }
  }, []);

  const fetchOverview = useCallback(async () => {
    setLoading(p => ({ ...p, overview: true }));
    try {
      const res = await adminAnalyticsService.getPlatformOverview();
      if (res?.success) { setPlatformOverview(res.data); setError(p => ({ ...p, overview: null })); }
      else setError(p => ({ ...p, overview: res?.error || 'Failed' }));
    } catch (e) { setError(p => ({ ...p, overview: e.message })); }
    finally { setLoading(p => ({ ...p, overview: false })); }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(p => ({ ...p, reports: true }));
    try {
      const res = await adminAnalyticsService.getScheduledReports();
      if (res?.success) setScheduledReports(res.data || []);
    } finally { setLoading(p => ({ ...p, reports: false })); }
  }, []);

  // ── on mount: always-visible data ──────────────────────────────────────────
  useEffect(() => {
    fetchHealth();
    fetchAlerts();
    fetchFunnel();
    fetchFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── lazy load tab data on first open ───────────────────────────────────────
  useEffect(() => {
    if (activeTab === 0 && providerPerformance.length === 0) fetchProviders();
    if (activeTab === 1 && referralConversion.length === 0) fetchReferrals(referralPeriod);
    if (activeTab === 2 && tokenEconomy.length === 0) fetchTokens(tokenPeriod);
    if (activeTab === 3 && !aiAnalytics) fetchAI();
    if (activeTab === 4 && !platformOverview) fetchOverview();
    if (activeTab === 5 && scheduledReports.length === 0) fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => { fetchReferrals(referralPeriod); }, [referralPeriod, fetchReferrals]);
  useEffect(() => { fetchTokens(tokenPeriod); }, [tokenPeriod, fetchTokens]);

  // ── report dialog handlers ──────────────────────────────────────────────────
  const handleSaveReport = (saved) => {
    setScheduledReports(prev =>
      selectedReport ? prev.map(r => r.id === saved.id ? saved : r) : [...prev, saved]
    );
  };
  const handleDeleteReport = async (id) => {
    if (!window.confirm('Delete this scheduled report?')) return;
    await adminAnalyticsService.deleteScheduledReport(id);
    setScheduledReports(prev => prev.filter(r => r.id !== id));
  };

  // ── global refresh ──────────────────────────────────────────────────────────
  const handleRefreshAll = () => {
    fetchHealth(); fetchAlerts(); fetchFunnel(); fetchFeed();
    if (activeTab === 0) fetchProviders();
    else if (activeTab === 1) fetchReferrals(referralPeriod);
    else if (activeTab === 2) fetchTokens(tokenPeriod);
    else if (activeTab === 3) fetchAI();
    else if (activeTab === 4) fetchOverview();
    else if (activeTab === 5) fetchReports();
  };

  // ── health strip ────────────────────────────────────────────────────────────
  const h = healthData || {};
  const healthCards = [
    { label: 'Active Providers', value: healthLoading ? '…' : `${fmtNum(h.activeProviders?.count)} / ${fmtNum(h.activeProviders?.total)}`, icon: <PeopleIcon fontSize="small" />, color: 'primary.main', sub: 'Active last 30 days', onClick: () => navigate('/admin/users') },
    { label: 'Referrals This Month', value: healthLoading ? '…' : fmtNum(h.referralsThisMonth?.count), icon: <ReferralIcon fontSize="small" />, color: 'info.main', trend: h.referralsThisMonth?.trend, onClick: () => navigate('/admin/referrals') },
    { label: 'Appointments This Week', value: healthLoading ? '…' : `${fmtNum(h.appointmentsThisWeek?.scheduled + h.appointmentsThisWeek?.completed)}`, icon: <CalendarIcon fontSize="small" />, color: 'success.main', sub: `${fmtNum(h.appointmentsThisWeek?.completed)} completed`, onClick: () => navigate('/admin/appointments') },
    { label: 'Prior Auth Pending', value: healthLoading ? '…' : fmtNum(h.priorAuthPending?.count), icon: <PriorAuthIcon fontSize="small" />, color: h.priorAuthPending?.overdueCount > 0 ? 'error.main' : 'warning.main', sub: h.priorAuthPending?.overdueCount > 0 ? `${h.priorAuthPending.overdueCount} overdue` : 'All within SLA', onClick: () => navigate('/admin/prior-auth') },
    { label: 'DTx Active Prescriptions', value: healthLoading ? '…' : fmtNum(h.dtxActivePrescriptions?.count), icon: <DtxIcon fontSize="small" />, color: 'secondary.main', sub: 'Enrolled + Active', onClick: () => navigate('/admin/dtx') },
    { label: 'Tokens in Circulation', value: healthLoading ? '…' : fmtNum(h.tokensInCirculation?.total), icon: <TokenIcon fontSize="small" />, color: 'warning.main', sub: `+${fmtNum(h.tokensInCirculation?.issuedThisMonth)} issued this month`, onClick: () => navigate('/admin/token-management') },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>

      {/* ── Header ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">Admin Dashboard</Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={handleRefreshAll} title="Refresh all"><RefreshIcon /></IconButton>
          <Button
            variant="contained"
            color="success"
            startIcon={<RunIcon />}
            onClick={handleRunAnalyticsJob}
            disabled={jobRunning}
          >
            {jobRunning ? 'Running…' : 'Run Analytics Job'}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => adminAnalyticsService.exportReport('dashboard', 'pdf')}>Export PDF</Button>
          <Button variant="outlined" startIcon={<ScheduleIcon />} onClick={() => { setSelectedReport(null); setScheduleDialogOpen(true); }}>Schedule Report</Button>
        </Box>
      </Box>

      {/* ── Analytics Job Result / Error Banner ── */}
      {jobResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setJobResult(null)}>
          Analytics job completed successfully in {jobResult.durationMs}ms. Updated risk scores for {jobResult.patientsUpdated} patient{jobResult.patientsUpdated !== 1 ? 's' : ''}.
          &nbsp;&nbsp;Patient Engagement: {jobResult.metrics?.patientEngagement?.value ?? '—'}% &nbsp;|&nbsp;
          Treatment Adherence: {jobResult.metrics?.treatmentAdherence?.value ?? '—'}% &nbsp;|&nbsp;
          Missed Follow-ups: {jobResult.metrics?.missedAppointments?.value ?? '—'} &nbsp;|&nbsp;
          High Risk Patients: {jobResult.metrics?.riskDistribution?.high ?? '—'}
        </Alert>
      )}
      {jobError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setJobError(null)}>
          Analytics job failed: {jobError}
        </Alert>
      )}

      {/* ── Platform Health Strip ── */}
      <Grid container spacing={2} mb={3}>
        {healthCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={card.label}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* ── Alerts + Activity Feed ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6">Alerts & Action Items</Typography>
              <Chip
                label={alerts.length === 0 ? 'All clear' : `${alerts.length} issue${alerts.length > 1 ? 's' : ''}`}
                color={alerts.length === 0 ? 'success' : alerts.some(a => a.severity === 'error') ? 'error' : 'warning'}
                size="small"
              />
            </Box>
            <AlertsPanel alerts={alerts} loading={alertsLoading} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6">Recent Activity</Typography>
              <IconButton size="small" onClick={fetchFeed}><RefreshIcon fontSize="small" /></IconButton>
            </Box>
            <ActivityFeedPanel feed={activityFeed} loading={feedLoading} />
          </Paper>
        </Grid>
      </Grid>

      {/* ── Care Delivery Funnel ── */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6">Care Delivery Funnel</Typography>
            <Typography variant="caption" color="text.secondary">End-to-end patient journey from referral creation through digital therapeutic completion</Typography>
          </Box>
          <IconButton size="small" onClick={fetchFunnel}><RefreshIcon fontSize="small" /></IconButton>
        </Box>
        <CareFunnelViz stages={careFunnel} loading={funnelLoading} />
      </Paper>

      {/* ── Tabs ── */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Provider Performance" />
          <Tab label="Referral Conversion" />
          <Tab label="Token Economy" />
          <Tab label="AI Analytics" />
          <Tab label="Platform Overview" />
          <Tab label="Scheduled Reports" />
        </Tabs>

        {/* ── Tab 0: Provider Performance ── */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Provider Performance — Last 30 Days</Typography>
              <IconButton onClick={fetchProviders}><RefreshIcon /></IconButton>
            </Box>
            {loading.providers ? <ModernLoadingIndicator variant="dots" message="Loading…" />
              : error.providers ? <Alert severity="error">{error.providers}</Alert>
              : <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={providerPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <RechartTooltip />
                    <Legend />
                    <Bar dataKey="referrals" fill="#1976d2" name="Referrals Sent" />
                    <Bar dataKey="appointmentsCompleted" fill="#388e3c" name="Appts Completed" />
                    <Bar dataKey="dtxPrescriptions" fill="#7b1fa2" name="DTx Prescribed" />
                  </BarChart>
                </ResponsiveContainer>

                <TableContainer component={Paper} variant="outlined" sx={{ mt: 3, ...tableContainerSx }}>
                  <Table size="small" sx={tableSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell sx={{ width: '24%' }}>Provider</TableCell>
                        <TableCell align="right" sx={{ width: '10%' }}>Referrals</TableCell>
                        <TableCell align="right" sx={{ width: '12%' }}>Accept %</TableCell>
                        <TableCell align="right" sx={{ width: '12%' }}>Appts</TableCell>
                        <TableCell align="right" sx={{ width: '12%' }}>No-Show %</TableCell>
                        <TableCell align="right" sx={{ width: '10%' }}>DTx Rx</TableCell>
                        <TableCell align="right" sx={{ width: '10%' }}>Tokens Earned</TableCell>
                        <TableCell align="right" sx={{ width: '10%' }}>Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {providerPerformance.map((p) => (
                        <TableRow key={p.id} hover sx={tableBodyRowSx}>
                          <TableCell sx={{ width: '24%' }}>
                            <Typography variant="body2" fontWeight={500} noWrap>{p.name}</Typography>
                            <EllipsisCell value={p.specialty} variant="caption" sx={{ color: 'text.secondary' }} />
                          </TableCell>
                          <TableCell align="right" sx={{ width: '10%' }}>{p.referrals}</TableCell>
                          <TableCell align="right" sx={{ width: '12%' }}>
                            <Chip label={pct(Math.round((p.acceptanceRate || 0) * 100))} size="small" sx={compactChipSx}
                              color={(p.acceptanceRate || 0) >= 0.8 ? 'success' : (p.acceptanceRate || 0) >= 0.6 ? 'warning' : 'error'} />
                          </TableCell>
                          <TableCell align="right" sx={{ width: '12%' }}>{p.appointmentsCompleted}/{p.appointmentsTotal}</TableCell>
                          <TableCell align="right" sx={{ width: '12%' }}>
                            <Chip label={pct(p.noShowRate)} size="small" sx={compactChipSx} color={p.noShowRate > 20 ? 'error' : p.noShowRate > 10 ? 'warning' : 'success'} />
                          </TableCell>
                          <TableCell align="right" sx={{ width: '10%' }}>{p.dtxPrescriptions}</TableCell>
                          <TableCell align="right" sx={{ width: '10%' }}>+{p.tokenEarnedThisMonth}</TableCell>
                          <TableCell align="right" sx={{ width: '10%' }}>{fmtNum(p.tokenBalance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            }
          </Box>
        )}

        {/* ── Tab 1: Referral Conversion ── */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Referral Conversion Rates</Typography>
              <Box display="flex" gap={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Period</InputLabel>
                  <Select value={referralPeriod} label="Period" onChange={e => setReferralPeriod(e.target.value)}>
                    <MenuItem value="last3months">Last 3 Months</MenuItem>
                    <MenuItem value="last6months">Last 6 Months</MenuItem>
                    <MenuItem value="lastyear">Last Year</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={() => fetchReferrals(referralPeriod)}><RefreshIcon /></IconButton>
              </Box>
            </Box>
            {loading.referrals ? <ModernLoadingIndicator variant="dots" message="Loading…" />
              : error.referrals ? <Alert severity="error">{error.referrals}</Alert>
              : <>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={referralConversion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <RechartTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="#1976d2" name="Sent" strokeWidth={2} />
                    <Line type="monotone" dataKey="accepted" stroke="#388e3c" name="Accepted" strokeWidth={2} />
                    <Line type="monotone" dataKey="completed" stroke="#f57c00" name="Completed" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>

                <Grid container spacing={2} mt={1}>
                  {[
                    { label: 'Acceptance Rate', value: pct(referralMeta.acceptanceRate), color: 'primary' },
                    { label: 'Completion Rate', value: pct(referralMeta.completionRate), color: 'success' },
                    { label: 'Overall Conversion', value: pct(referralMeta.overallConversion), color: 'warning' },
                    { label: 'Referral → Appt Rate', value: pct(referralMeta.referralToApptRate), color: 'info' },
                  ].map(c => (
                    <Grid item xs={6} md={3} key={c.label}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: `${c.color}.50` || 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                        <Typography variant="h4" color={`${c.color}.main`} fontWeight={700}>{c.value}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {referralMeta.rejectionReasons?.length > 0 && (
                  <Box mt={3}>
                    <Typography variant="subtitle2" gutterBottom>Rejection Reason Breakdown</Typography>
                    <Grid container spacing={1}>
                      {referralMeta.rejectionReasons.map(r => (
                        <Grid item key={r.reason}>
                          <Chip label={`${r.reason} (${r.count})`} variant="outlined" size="small" />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </>
            }
          </Box>
        )}

        {/* ── Tab 2: Token Economy ── */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Token Economy</Typography>
              <Box display="flex" gap={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Period</InputLabel>
                  <Select value={tokenPeriod} label="Period" onChange={e => setTokenPeriod(e.target.value)}>
                    <MenuItem value="last3months">Last 3 Months</MenuItem>
                    <MenuItem value="last6months">Last 6 Months</MenuItem>
                    <MenuItem value="lastyear">Last Year</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={() => fetchTokens(tokenPeriod)}><RefreshIcon /></IconButton>
              </Box>
            </Box>
            {loading.tokens ? <ModernLoadingIndicator variant="dots" message="Loading…" />
              : error.tokens ? <Alert severity="error">{error.tokens}</Alert>
              : <>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={tokenEconomy}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <RechartTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="issued" stroke="#1976d2" name="Issued" strokeWidth={2} />
                    <Line type="monotone" dataKey="redeemed" stroke="#388e3c" name="Redeemed" strokeWidth={2} />
                    <Line type="monotone" dataKey="circulation" stroke="#f57c00" name="Circulation" strokeWidth={2} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>

                <Grid container spacing={2} mt={1}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f0ff' }}>
                      <Typography variant="caption">Total Issued</Typography>
                      <Typography variant="h4" color="primary.main" fontWeight={700}>{fmtNum(tokenMeta.totalIssued)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f0fff7' }}>
                      <Typography variant="caption">Total Redeemed</Typography>
                      <Typography variant="h4" color="success.main" fontWeight={700}>{fmtNum(tokenMeta.totalRedeemed)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff7f0' }}>
                      <Typography variant="caption">Current Circulation</Typography>
                      <Typography variant="h4" color="warning.main" fontWeight={700}>{fmtNum(tokenMeta.currentCirculation)}</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Grid container spacing={2} mt={1}>
                  {/* Leaderboard */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                        <TrophyIcon color="warning" />
                        <Typography variant="subtitle2">Top Token Earners</Typography>
                      </Box>
                      {(tokenMeta.leaderboard || []).map((u) => (
                        <Box key={u.rank} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip label={`#${u.rank}`} size="small" color={u.rank === 1 ? 'warning' : 'default'} />
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{u.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{u.specialty}</Typography>
                            </Box>
                          </Box>
                          <Chip label={`${fmtNum(u.balance)} tokens`} size="small" color="primary" variant="outlined" />
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                  {/* Breakdown */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" mb={1.5}>Earnings by Activity Type</Typography>
                      {Object.entries(tokenMeta.breakdown || {}).map(([key, val]) => (
                        <Box key={key} mb={1}>
                          <Box display="flex" justifyContent="space-between" mb={0.3}>
                            <Typography variant="body2" textTransform="capitalize">{key}</Typography>
                            <Typography variant="body2" fontWeight={600}>{fmtNum(val)}</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={tokenMeta.totalIssued > 0 ? (val / tokenMeta.totalIssued) * 100 : 0}
                            sx={{ height: 6, borderRadius: 3 }}
                            color={key === 'referral' ? 'primary' : key === 'appointment' ? 'success' : key === 'dtx' ? 'secondary' : 'warning'}
                          />
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                </Grid>
              </>
            }
          </Box>
        )}

        {/* ── Tab 3: AI Analytics ── */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">AI Analytics — Usage & Performance</Typography>
              <IconButton onClick={fetchAI}><RefreshIcon /></IconButton>
            </Box>
            {loading.ai ? <ModernLoadingIndicator variant="dots" message="Loading…" />
              : error.ai ? <Alert severity="error">{error.ai}</Alert>
              : aiAnalytics ? <>
                {/* Accuracy cards */}
                <Grid container spacing={2} mb={3}>
                  {[
                    { label: 'Risk Assessment Accuracy', value: pct(Math.round((aiAnalytics.accuracy?.riskAssessment || 0) * 100)), color: 'primary' },
                    { label: 'Summary Generation Accuracy', value: pct(Math.round((aiAnalytics.accuracy?.summaryGeneration || 0) * 100)), color: 'success' },
                    { label: 'Recommendation Accuracy', value: pct(Math.round((aiAnalytics.accuracy?.recommendationEngine || 0) * 100)), color: 'warning' },
                  ].map(c => (
                    <Grid item xs={12} md={4} key={c.label}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: `${c.color}.50` || 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                        <Typography variant="h4" color={`${c.color}.main`} fontWeight={700}>{c.value}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {/* Ambient AI + Referral Matching side by side */}
                <Grid container spacing={2} mb={3}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                        <MicIcon color="info" />
                        <Typography variant="subtitle2">Ambient Clinical Intelligence</Typography>
                      </Box>
                      {[
                        { label: 'Total Sessions', value: fmtNum(aiAnalytics.ambientAI?.total) },
                        { label: 'Approved', value: fmtNum(aiAnalytics.ambientAI?.approved) },
                        { label: 'Rejected', value: fmtNum(aiAnalytics.ambientAI?.rejected) },
                        { label: 'Pending Review', value: fmtNum(aiAnalytics.ambientAI?.pending) },
                        { label: 'Provider Approval Rate', value: pct(aiAnalytics.ambientAI?.approvalRate) },
                      ].map(row => (
                        <Box key={row.label} display="flex" justifyContent="space-between" mb={0.8}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                        <AIIcon color="secondary" />
                        <Typography variant="subtitle2">AI Referral Matching</Typography>
                      </Box>
                      {[
                        { label: 'Total Match Sessions', value: fmtNum(aiAnalytics.referralMatching?.sessions) },
                        { label: 'Provider Selected from AI', value: fmtNum(aiAnalytics.referralMatching?.withSelection) },
                        { label: 'AI Selection Rate', value: pct(aiAnalytics.referralMatching?.selectionRate) },
                        { label: 'Avg Match Score', value: `${aiAnalytics.referralMatching?.avgMatchScore || 0} / 100` },
                        { label: 'Improvement Rate', value: pct(Math.round((aiAnalytics.improvementRate || 0) * 100)) },
                      ].map(row => (
                        <Box key={row.label} display="flex" justifyContent="space-between" mb={0.8}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                </Grid>

                {/* Usage chart */}
                <Typography variant="subtitle2" gutterBottom>Monthly AI Feature Usage</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={aiAnalytics.usage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <RechartTooltip />
                    <Legend />
                    <Bar dataKey="ambientSessions" fill="#0288d1" name="Ambient AI Sessions" />
                    <Bar dataKey="matchSessions" fill="#7b1fa2" name="Referral Match Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </> : <Typography color="text.secondary">No AI analytics data.</Typography>
            }
          </Box>
        )}

        {/* ── Tab 4: Platform Overview ── */}
        {activeTab === 4 && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Platform Overview — This Month</Typography>
              <IconButton onClick={fetchOverview}><RefreshIcon /></IconButton>
            </Box>
            {loading.overview ? <ModernLoadingIndicator variant="dots" message="Loading…" />
              : error.overview ? <Alert severity="error">{error.overview}</Alert>
              : platformOverview ? (
                <Grid container spacing={3}>
                  {/* DTx */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}><DtxIcon sx={{ fontSize: 18 }} /></Avatar>
                        <Typography variant="subtitle1" fontWeight={600}>Digital Therapeutics</Typography>
                      </Box>
                      {[
                        { label: 'Active Programs', value: fmtNum(platformOverview.dtx?.activePrograms) },
                        { label: 'Prescriptions This Month', value: fmtNum(platformOverview.dtx?.prescriptionsThisMonth) },
                        { label: 'Completion Rate', value: pct(platformOverview.dtx?.completionRate) },
                        { label: 'Tokens Awarded via DTx', value: fmtNum(platformOverview.dtx?.tokensAwarded) },
                      ].map(row => (
                        <Box key={row.label} display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                        </Box>
                      ))}
                      <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/admin/dtx')}>View DTx Management →</Button>
                    </Paper>
                  </Grid>

                  {/* Prior Auth */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}><PriorAuthIcon sx={{ fontSize: 18 }} /></Avatar>
                        <Typography variant="subtitle1" fontWeight={600}>Prior Authorizations</Typography>
                      </Box>
                      {[
                        { label: 'Submitted This Month', value: fmtNum(platformOverview.priorAuth?.submitted) },
                        { label: 'Currently Pending', value: fmtNum(platformOverview.priorAuth?.pending) },
                        { label: 'Approved', value: fmtNum(platformOverview.priorAuth?.approved) },
                        { label: 'Denied', value: fmtNum(platformOverview.priorAuth?.denied) },
                        { label: 'Avg Turnaround', value: platformOverview.priorAuth?.avgTurnaroundDays != null ? `${platformOverview.priorAuth.avgTurnaroundDays} days` : 'N/A' },
                      ].map(row => (
                        <Box key={row.label} display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                        </Box>
                      ))}
                      <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/admin/prior-auth')}>View Prior Auth →</Button>
                    </Paper>
                  </Grid>

                  {/* Patient Engagement */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Avatar sx={{ bgcolor: 'info.main', width: 32, height: 32 }}><EngageIcon sx={{ fontSize: 18 }} /></Avatar>
                        <Typography variant="subtitle1" fontWeight={600}>Patient Engagement</Typography>
                      </Box>
                      {[
                        { label: 'Notifications Sent', value: fmtNum(platformOverview.engagement?.sent) },
                        { label: 'Delivery Rate', value: pct(platformOverview.engagement?.deliveryRate) },
                      ].map(row => (
                        <Box key={row.label} display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                        </Box>
                      ))}
                      <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/admin/patient-engagement')}>View Engagement →</Button>
                    </Paper>
                  </Grid>

                  {/* Ambient AI */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}><MicIcon sx={{ fontSize: 18 }} /></Avatar>
                        <Typography variant="subtitle1" fontWeight={600}>Ambient AI Sessions</Typography>
                      </Box>
                      {[
                        { label: 'Sessions This Month', value: fmtNum(platformOverview.ambientAI?.sessionsThisMonth) },
                        { label: 'Approved Notes', value: fmtNum(platformOverview.ambientAI?.approvedThisMonth) },
                        { label: 'Approval Rate', value: pct(platformOverview.ambientAI?.approvalRate) },
                      ].map(row => (
                        <Box key={row.label} display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                        </Box>
                      ))}
                      <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/admin/ambient-sessions')}>View Sessions →</Button>
                    </Paper>
                  </Grid>
                </Grid>
              ) : <Typography color="text.secondary">No overview data.</Typography>
            }
          </Box>
        )}

        {/* ── Tab 5: Scheduled Reports ── */}
        {activeTab === 5 && (
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Scheduled Reports</Typography>
              <Box display="flex" gap={1}>
                <Button variant="contained" size="small" startIcon={<EmailIcon />} onClick={() => { setSelectedReport(null); setScheduleDialogOpen(true); }}>Schedule New</Button>
                <IconButton onClick={fetchReports}><RefreshIcon /></IconButton>
              </Box>
            </Box>
            {loading.reports ? <ModernLoadingIndicator variant="dots" message="Loading…" />
              : scheduledReports.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
                  <Table size="small" sx={tableSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell sx={{ width: '22%' }}>Report Name</TableCell>
                        <TableCell sx={{ width: '13%' }}>Frequency</TableCell>
                        <TableCell sx={{ width: '30%' }}>Recipients</TableCell>
                        <TableCell sx={{ width: '15%' }}>Last Sent</TableCell>
                        <TableCell sx={{ width: '15%' }}>Next Scheduled</TableCell>
                        <TableCell sx={{ width: '5%' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scheduledReports.map(r => (
                        <TableRow key={r.id} hover sx={tableBodyRowSx}>
                          <TableCell sx={{ width: '22%' }}><EllipsisCell value={r.name} /></TableCell>
                          <TableCell sx={{ width: '13%' }}><Chip label={r.frequency} size="small" color={r.frequency === 'weekly' ? 'primary' : 'secondary'} sx={compactChipSx} /></TableCell>
                          <TableCell sx={{ width: '30%' }}><EllipsisCell value={r.recipients?.join(', ')} /></TableCell>
                          <TableCell sx={{ width: '15%' }}>{r.lastSent ? formatDate(r.lastSent) : '—'}</TableCell>
                          <TableCell sx={{ width: '15%' }}>{r.nextScheduled ? formatDate(r.nextScheduled) : '—'}</TableCell>
                          <TableCell sx={{ width: '5%' }}>
                            <IconButton size="small" onClick={() => { setSelectedReport(r); setScheduleDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => handleDeleteReport(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No scheduled reports. Create one to get started.</Typography>
              )
            }
          </Box>
        )}
      </Paper>

      <ScheduleReportDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        report={selectedReport}
        onSave={handleSaveReport}
      />
    </Container>
  );
};

export default AdminDashboard;
