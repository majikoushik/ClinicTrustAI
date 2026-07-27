import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Card, CardContent, LinearProgress, Divider, CircularProgress,
  IconButton, Tooltip, Tabs, Tab
} from '@mui/material';
import {
  EventAvailable as ApptIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  TrendingDown as NoShowIcon,
  CheckCircle as CompletedIcon,
  People as PatientsIcon,
  Analytics as StatsIcon,
  Schedule as ScheduleIcon,
  Assessment as UtilIcon,
  StarRate as StarIcon,
  WarningAmber as WarnIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { get, put } from '../../utils/apiUtils';
import { formatDateTime, formatScheduledDateTime } from '../../utils/dateFormatter';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_COLORS = {
  new_patient: '#2196F3',
  follow_up: '#4CAF50',
  telehealth: '#9C27B0',
  urgent: '#F44336',
  procedure: '#FF9800'
};

const STATUS_COLORS = {
  scheduled: 'default',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'error',
  no_show: 'warning'
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-Show' }
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'new_patient', label: 'New Patient' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'procedure', label: 'Procedure' }
];

// ============================================================================
// HELPERS
// ============================================================================

// Percentages sum to 100% — with tableLayout: 'fixed' (see tableSx) this
// guarantees the appointments grid always fits its container, no horizontal
// scroll and no column silently clipped off-screen.
const APPT_COLUMN_WIDTHS = {
  patient: '20%', provider: '19%', type: '12%',
  date: '19%', status: '12%', location: '18%', actions: '48px',
};

// Provider Detail Breakdown table (Provider Utilization tab) — 9 columns, no
// actions column, so these percentages sum to a full 100%.
const UTIL_COLUMN_WIDTHS = {
  provider: '20%', totalSlots: '10%', booked: '10%', fillRate: '11%',
  completed: '11%', noShow: '10%', cancelRate: '11%', avgDuration: '10%', tokens: '7%',
};

function typeLabel(type) {
  const found = TYPE_OPTIONS.find(t => t.value === type);
  return found ? found.label : (type || '—');
}

function statusLabel(status) {
  const found = STATUS_OPTIONS.find(s => s.value === status);
  return found ? found.label : (status || '—');
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, value, color, icon }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={`${color}.main`}>
            {value !== undefined && value !== null ? value : '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// APPOINTMENT DETAIL DIALOG
// ============================================================================

function AppointmentDetailDialog({ appointment, open, onClose, onAction }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!appointment) return null;

  const handleAction = async (action) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const id = appointment._id || appointment.appointmentId;
      // Note: intentionally /appointments/:id/... (not /admin/appointments/...) —
      // those are the real endpoints, and both already grant admins bypass of
      // the provider-ownership check (see server/routes/appointments.js).
      // Cancellation has its own dedicated endpoint — /status only accepts
      // confirmed/checked_in/in_progress/completed/no_show, not 'cancelled'.
      if (action === 'cancelled') {
        await put(`/appointments/${id}/cancel`, { cancellationReason: 'Cancelled by admin' });
      } else {
        await put(`/appointments/${id}/status`, { status: action });
      }
      setConfirmAction(null);
      onAction && onAction();
      onClose();
    } catch (err) {
      setActionError(err?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const rescheduleHistory = appointment.rescheduleHistory || [];
  const intakeResponses = appointment.intakeResponses || appointment.intake || null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Appointment Detail</Typography>
          <Chip
            label={statusLabel(appointment.status)}
            color={STATUS_COLORS[appointment.status] || 'default'}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Appointment ID</Typography>
            <Typography variant="body2" fontFamily="monospace">
              {appointment._id || appointment.appointmentId || '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Type</Typography>
            <Box mt={0.5}>
              <Chip
                label={typeLabel(appointment.appointmentType || appointment.type)}
                size="small"
                sx={{
                  backgroundColor: TYPE_COLORS[appointment.appointmentType || appointment.type] || '#757575',
                  color: '#fff'
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Patient</Typography>
            <Typography variant="body2">
              {appointment.patientName || appointment.patient?.name || '—'}
            </Typography>
            {appointment.patientEmail || appointment.patient?.email ? (
              <Typography variant="caption" color="text.secondary">
                {appointment.patientEmail || appointment.patient?.email}
              </Typography>
            ) : null}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Provider</Typography>
            <Typography variant="body2">
              {appointment.providerName || appointment.provider?.name || '—'}
            </Typography>
            {appointment.providerSpecialty || appointment.provider?.specialty ? (
              <Typography variant="caption" color="text.secondary">
                {appointment.providerSpecialty || appointment.provider?.specialty}
              </Typography>
            ) : null}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Date & Time</Typography>
            <Typography variant="body2">{formatScheduledDateTime(appointment.scheduledDate, appointment.startTime)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Location</Typography>
            <Typography variant="body2">
              {appointment.locationType === 'telehealth' || appointment.isVirtual
                ? 'Telehealth'
                : appointment.location || appointment.clinic || 'In-Person'}
            </Typography>
          </Grid>
          {appointment.durationMinutes && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Duration</Typography>
              <Typography variant="body2">{appointment.durationMinutes} min</Typography>
            </Grid>
          )}
          {(appointment.reasonForVisit || appointment.chiefComplaint) && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Reason</Typography>
              <Typography variant="body2">{appointment.reasonForVisit || appointment.chiefComplaint}</Typography>
            </Grid>
          )}
          {appointment.notes && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Notes</Typography>
              <Typography variant="body2">{appointment.notes}</Typography>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Created</Typography>
            <Typography variant="body2">{formatDateTime(appointment.createdAt)}</Typography>
          </Grid>
          {appointment.updatedAt && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Last Updated</Typography>
              <Typography variant="body2">{formatDateTime(appointment.updatedAt)}</Typography>
            </Grid>
          )}
        </Grid>

        {rescheduleHistory.length > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Reschedule History ({rescheduleHistory.length})</Typography>
            {rescheduleHistory.map((entry, idx) => (
              <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(entry.changedAt)} — {entry.reason || 'No reason provided'}
                </Typography>
                {entry.fromDate && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    From: {formatScheduledDateTime(entry.fromDate, entry.fromStartTime)}
                    {' → '}
                    To: {formatScheduledDateTime(entry.toDate, entry.toStartTime)}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}

        {intakeResponses && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Intake Responses</Typography>
            {Object.entries(intakeResponses).map(([key, value]) => (
              <Box key={key} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="body2">{String(value)}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {confirmAction && (
          <Box mt={2}>
            <Alert severity="warning">
              Are you sure you want to mark this appointment as <strong>{statusLabel(confirmAction)}</strong>?
              <Box mt={1} display="flex" gap={1}>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={() => handleAction(confirmAction)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={16} /> : 'Confirm'}
                </Button>
                <Button size="small" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
                  Cancel
                </Button>
              </Box>
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box display="flex" gap={1}>
          {appointment.status !== 'completed' && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<CompletedIcon />}
              onClick={() => setConfirmAction('completed')}
              disabled={actionLoading || !!confirmAction}
            >
              Mark Completed
            </Button>
          )}
          {appointment.status !== 'no_show' && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<NoShowIcon />}
              onClick={() => setConfirmAction('no_show')}
              disabled={actionLoading || !!confirmAction}
            >
              Mark No-Show
            </Button>
          )}
          {appointment.status !== 'cancelled' && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setConfirmAction('cancelled')}
              disabled={actionLoading || !!confirmAction}
            >
              Cancel
            </Button>
          )}
        </Box>
        <Button onClick={onClose} disabled={actionLoading}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminAppointments() {
  const [tab, setTab] = useState(0);

  // appointments state
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // stats state
  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterProvider, setFilterProvider] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedProvider, setAppliedProvider] = useState('');

  // detail dialog
  const [viewAppointment, setViewAppointment] = useState(null);

  // utilization state
  const [utilization, setUtilization] = useState(null);
  const [utilLoading, setUtilLoading] = useState(false);
  const [utilError, setUtilError] = useState(null);
  const [utilDateRange, setUtilDateRange] = useState('30d');

  // --------------------------------------------------------------------------
  // DATA LOADING
  // --------------------------------------------------------------------------

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await get('/admin/appointments/stats');
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setStats(inner);
    } catch (err) {
      console.error('Failed to load appointment stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage
      };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.appointmentType = filterType;
      if (appliedProvider) params.provider = appliedProvider;
      if (appliedSearch) params.search = appliedSearch;

      const res = await get('/admin/appointments', params);
      const payload = res?.data || res || {};
      const inner = payload.data || payload;

      if (Array.isArray(inner)) {
        setAppointments(inner);
        setTotal(payload.total || inner.length);
      } else if (Array.isArray(inner.appointments)) {
        setAppointments(inner.appointments);
        setTotal(inner.total || inner.appointments.length);
      } else {
        setAppointments([]);
        setTotal(0);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterStatus, filterType, appliedProvider, appliedSearch]);

  const loadUtilization = useCallback(async () => {
    setUtilLoading(true);
    setUtilError(null);
    try {
      const res = await get('/admin/appointments/provider-utilization', { range: utilDateRange });
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setUtilization(inner);
    } catch (err) {
      setUtilError(err?.message || 'Failed to load utilization data');
    } finally {
      setUtilLoading(false);
    }
  }, [utilDateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (tab === 2) loadUtilization();
  }, [tab, loadUtilization]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handleSearch = () => {
    setAppliedSearch(searchQuery);
    setAppliedProvider(filterProvider);
    setPage(0);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    loadStats();
    loadAppointments();
    if (tab === 2) loadUtilization();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleActionDone = () => {
    loadStats();
    loadAppointments();
  };

  // --------------------------------------------------------------------------
  // ANALYTICS HELPERS
  // --------------------------------------------------------------------------

  const rawByType = stats.appointmentsByType || {};
  const typeEntries = Array.isArray(rawByType)
    ? rawByType.map(item => [item.type, item.count])
    : Object.entries(rawByType);
  const maxTypeCount = typeEntries.reduce((acc, [, count]) => Math.max(acc, Number(count) || 0), 1);

  const topProviders = stats.topProviders || stats.providerStats || [];

  const recentTrend = stats.recentTrend || null;
  const noShowRate = parseFloat(stats.noShowRate) || 0;

  const noShowColor = noShowRate < 5 ? 'success.main' : noShowRate <= 15 ? 'warning.main' : 'error.main';
  const noShowLabel = noShowRate < 5 ? 'Low — Good standing' : noShowRate <= 15 ? 'Moderate — Monitor closely' : 'High — Action required';

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <ApptIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Appointment Management</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={loading || statsLoading}>
            {loading || statsLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="All Appointments" icon={<ApptIcon />} iconPosition="start" />
          <Tab label="Analytics" icon={<StatsIcon />} iconPosition="start" />
          <Tab label="Provider Utilization" icon={<UtilIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ===== TAB 0: ALL APPOINTMENTS ===== */}
      {tab === 0 && (
        <Box>
          {/* Stats Cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Total Appointments"
                value={statsLoading ? '…' : stats.total}
                color="primary"
                icon={<ApptIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Completed"
                value={statsLoading ? '…' : stats.completed}
                color="success"
                icon={<CompletedIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="No-Show Rate"
                value={statsLoading ? '…' : (stats.noShowRate != null ? stats.noShowRate + '%' : '—')}
                color="error"
                icon={<NoShowIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Upcoming"
                value={statsLoading ? '…' : stats.upcoming}
                color="info"
                icon={<ScheduleIcon />}
              />
            </Grid>
          </Grid>

          {/* Filter Bar */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search (ID, patient, provider)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Status"
                    onChange={handleFilterChange(setFilterStatus)}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Appointment Type</InputLabel>
                  <Select
                    value={filterType}
                    label="Appointment Type"
                    onChange={handleFilterChange(setFilterType)}
                  >
                    {TYPE_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Provider Name"
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={2} md={1}>
                <Button fullWidth variant="contained" onClick={handleSearch} disabled={loading}>
                  Search
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Error */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Table */}
          <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
            <Table size="small" sx={tableSx}>
              <TableHead>
                <TableRow sx={tableHeadRowSx}>
                  <TableCell sx={{ width: APPT_COLUMN_WIDTHS.patient }}>Patient</TableCell>
                  <TableCell sx={{ width: APPT_COLUMN_WIDTHS.provider }}>Provider</TableCell>
                  <TableCell sx={{ width: APPT_COLUMN_WIDTHS.type }}>Type</TableCell>
                  <TableCell sx={{ width: APPT_COLUMN_WIDTHS.date }}>Date & Time</TableCell>
                  <TableCell sx={{ width: APPT_COLUMN_WIDTHS.status }}>Status</TableCell>
                  <TableCell sx={{ width: APPT_COLUMN_WIDTHS.location }}>Location</TableCell>
                  <TableCell sx={{ width: APPT_COLUMN_WIDTHS.actions }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No appointments found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appt, idx) => {
                    const apptId = appt._id || appt.appointmentId || idx;
                    const apptType = appt.appointmentType || appt.type;
                    const isVirtual = apptType === 'telehealth' || appt.locationType === 'telehealth' || appt.isVirtual;
                    return (
                      <TableRow key={apptId} hover sx={tableBodyRowSx}>
                        <TableCell sx={{ width: APPT_COLUMN_WIDTHS.patient }}>
                          <EllipsisCell value={appt.patientName || appt.patient?.name} />
                        </TableCell>
                        <TableCell sx={{ width: APPT_COLUMN_WIDTHS.provider }}>
                          <EllipsisCell value={appt.providerName || appt.provider?.name} />
                        </TableCell>
                        <TableCell sx={{ width: APPT_COLUMN_WIDTHS.type }}>
                          <Chip
                            label={typeLabel(apptType)}
                            size="small"
                            sx={{
                              ...compactChipSx,
                              backgroundColor: TYPE_COLORS[apptType] || '#757575',
                              color: '#fff',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ width: APPT_COLUMN_WIDTHS.date }}>
                          <Typography variant="body2" noWrap>
                            {formatScheduledDateTime(appt.scheduledDate, appt.startTime)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: APPT_COLUMN_WIDTHS.status }}>
                          <Chip
                            label={statusLabel(appt.status)}
                            color={STATUS_COLORS[appt.status] || 'default'}
                            size="small"
                            sx={compactChipSx}
                          />
                        </TableCell>
                        <TableCell sx={{ width: APPT_COLUMN_WIDTHS.location }}>
                          {isVirtual ? (
                            <Chip label="Telehealth" size="small" color="secondary" sx={compactChipSx} />
                          ) : (
                            <EllipsisCell value={appt.location || appt.clinic || 'In-Person'} />
                          )}
                        </TableCell>
                        <TableCell sx={{ width: APPT_COLUMN_WIDTHS.actions }} align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setViewAppointment(appt)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          </TableContainer>
        </Box>
      )}

      {/* ===== TAB 1: ANALYTICS ===== */}
      {tab === 1 && (
        <Box>
          {statsLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Grid container spacing={3}>
            {/* Appointments by Type */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <ApptIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>Appointments by Type</Typography>
                </Box>
                {typeEntries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No data available</Typography>
                ) : (
                  typeEntries.map(([type, count]) => (
                    <Box key={type} mb={1.5}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {typeLabel(type)}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>{count}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(Number(count) / maxTypeCount) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: TYPE_COLORS[type] || 'primary.main'
                          }
                        }}
                      />
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>

            {/* No-Show Risk */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <NoShowIcon color="error" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>No-Show Risk</Typography>
                </Box>
                <Box display="flex" alignItems="baseline" gap={1} mb={1}>
                  <Typography variant="h3" fontWeight={700} color={noShowColor}>
                    {stats.noShowRate != null ? stats.noShowRate + '%' : '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">no-show rate</Typography>
                </Box>
                <Chip
                  label={noShowLabel}
                  size="small"
                  color={noShowRate < 5 ? 'success' : noShowRate <= 15 ? 'warning' : 'error'}
                  sx={{ mb: 2 }}
                />
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Total No-Shows</Typography>
                    <Typography variant="h6" fontWeight={600}>{stats.noShows ?? stats.noShowCount ?? '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Total Appointments</Typography>
                    <Typography variant="h6" fontWeight={600}>{stats.total ?? '—'}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Recent Trend */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <ScheduleIcon color="info" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>Recent Booking Trend</Typography>
                </Box>
                {recentTrend ? (
                  <Box>
                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                          <Typography variant="h4" fontWeight={700} color="primary.main">
                            {recentTrend.last7Days ?? recentTrend.current ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Last 7 Days</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                          <Typography variant="h4" fontWeight={700} color="text.secondary">
                            {recentTrend.prior7Days ?? recentTrend.previous ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Prior 7 Days</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    {(recentTrend.last7Days != null && recentTrend.prior7Days != null) && (
                      <Box>
                        {(() => {
                          const current = Number(recentTrend.last7Days ?? recentTrend.current);
                          const previous = Number(recentTrend.prior7Days ?? recentTrend.previous);
                          if (!previous) return null;
                          const pct = (((current - previous) / previous) * 100).toFixed(1);
                          const up = current >= previous;
                          return (
                            <Typography variant="body2" color={up ? 'success.main' : 'error.main'} fontWeight={600}>
                              {up ? '+' : ''}{pct}% vs prior week
                            </Typography>
                          );
                        })()}
                      </Box>
                    )}
                    {recentTrend.summary && (
                      <Typography variant="body2" color="text.secondary" mt={1}>{recentTrend.summary}</Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No trend data available</Typography>
                )}
              </Paper>
            </Grid>

            {/* Top Providers */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PatientsIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>Top Providers by Appointment Count</Typography>
                </Box>
                {topProviders.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No provider data available</Typography>
                ) : (
                  <TableContainer sx={tableContainerSx}>
                    <Table size="small" sx={tableSx}>
                      <TableHead>
                        <TableRow sx={tableHeadRowSx}>
                          <TableCell sx={{ width: '40%' }}>Provider</TableCell>
                          <TableCell sx={{ width: '20%' }} align="right">Count</TableCell>
                          <TableCell sx={{ width: '20%' }} align="right">Completed</TableCell>
                          <TableCell sx={{ width: '20%' }} align="right">No-Show</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topProviders.map((prov, idx) => (
                          <TableRow key={prov._id || prov.providerId || idx} hover sx={tableBodyRowSx}>
                            <TableCell sx={{ width: '40%' }}>
                              <EllipsisCell value={prov.providerName || prov.name} />
                            </TableCell>
                            <TableCell sx={{ width: '20%' }} align="right">
                              <Typography variant="body2" fontWeight={600}>{prov.count ?? prov.total ?? '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ width: '20%' }} align="right">
                              <Typography variant="body2" color="success.main">{prov.completed ?? '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ width: '20%' }} align="right">
                              <Typography variant="body2" color="error.main">{prov.noShows ?? prov.noShow ?? '—'}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ===== TAB 2: PROVIDER UTILIZATION ===== */}
      {tab === 2 && (
        <Box>
          {/* Controls row */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
            <Typography variant="h6" fontWeight={700}>Provider Utilization Report</Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={utilDateRange}
                label="Date Range"
                onChange={(e) => setUtilDateRange(e.target.value)}
              >
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
                <MenuItem value="ytd">Year to Date</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {utilLoading && <LinearProgress sx={{ mb: 2 }} />}
          {utilError && <Alert severity="error" sx={{ mb: 2 }}>{utilError}</Alert>}

          {utilization && (
            <>
              {/* Summary Cards */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="Active Providers"
                    value={utilization.summary?.totalProviders ?? '—'}
                    color="primary"
                    icon={<PatientsIcon />}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="Avg Fill Rate"
                    value={utilization.summary?.avgFillRate != null ? utilization.summary.avgFillRate + '%' : '—'}
                    color="success"
                    icon={<UtilIcon />}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="Top Performer"
                    value={utilization.summary?.topPerformer ?? '—'}
                    color="info"
                    icon={<StarIcon />}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="Below 60% Fill Rate"
                    value={utilization.summary?.belowThreshold ?? '—'}
                    color="warning"
                    icon={<WarnIcon />}
                  />
                </Grid>
              </Grid>

              {/* Per-Provider Fill Rate Bars */}
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={7}>
                  <Paper variant="outlined" sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <UtilIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={700}>Slot Fill Rate by Provider</Typography>
                    </Box>
                    {(utilization.providers || []).map((prov) => {
                      const fill = prov.fillRate ?? 0;
                      const barColor = fill >= 80 ? 'success' : fill >= 60 ? 'warning' : 'error';
                      return (
                        <Box key={prov.providerId || prov.providerName} mb={2}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{prov.providerName}</Typography>
                              <Typography variant="caption" color="text.secondary">{prov.specialty || 'General'}</Typography>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="body2" fontWeight={700} color={`${barColor}.main`}>
                                {fill}%
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {prov.bookedSlots}/{prov.totalSlots} slots
                              </Typography>
                            </Box>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(fill, 100)}
                            color={barColor}
                            sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover' }}
                          />
                        </Box>
                      );
                    })}
                  </Paper>
                </Grid>

                {/* Peak Hours */}
                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <TimeIcon color="secondary" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={700}>Peak Appointment Hours</Typography>
                    </Box>
                    <TableContainer sx={tableContainerSx}>
                      <Table size="small" sx={tableSx}>
                        <TableHead>
                          <TableRow sx={tableHeadRowSx}>
                            <TableCell sx={{ width: '40%' }}>Time Slot</TableCell>
                            <TableCell sx={{ width: '20%' }} align="right">Appts</TableCell>
                            <TableCell sx={{ width: '40%' }}>Load</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(utilization.peakHours || []).map((slot) => {
                            const maxCount = Math.max(...(utilization.peakHours || []).map(s => s.count), 1);
                            const pct = Math.round((slot.count / maxCount) * 100);
                            return (
                              <TableRow key={slot.hour} hover sx={tableBodyRowSx}>
                                <TableCell sx={{ width: '40%' }}>
                                  <Typography variant="body2">{slot.label}</Typography>
                                </TableCell>
                                <TableCell sx={{ width: '20%' }} align="right">
                                  <Typography variant="body2" fontWeight={600}>{slot.count}</Typography>
                                </TableCell>
                                <TableCell sx={{ width: '40%' }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    color={pct >= 80 ? 'error' : pct >= 50 ? 'warning' : 'primary'}
                                    sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>

              {/* Detailed Provider Table */}
              <Paper variant="outlined">
                <Box display="flex" alignItems="center" gap={1} p={2} pb={1}>
                  <PatientsIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>Provider Detail Breakdown</Typography>
                </Box>
                <Divider />
                <TableContainer sx={tableContainerSx}>
                  <Table size="small" sx={tableSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.provider }}>Provider</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.totalSlots }} align="right">Total Slots</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.booked }} align="right">Booked</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.fillRate }} align="right">Fill Rate</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.completed }} align="right">Completed</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.noShow }} align="right">No-Show</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.cancelRate }} align="right">Cancel Rate</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.avgDuration }} align="right">Avg Duration</TableCell>
                        <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.tokens }} align="right">Tokens Earned</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(utilization.providers || []).map((prov) => {
                        const fill = prov.fillRate ?? 0;
                        const fillColor = fill >= 80 ? 'success.main' : fill >= 60 ? 'warning.main' : 'error.main';
                        return (
                          <TableRow key={prov.providerId || prov.providerName} hover sx={tableBodyRowSx}>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.provider }}>
                              <EllipsisCell value={prov.providerName} />
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{prov.specialty || '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.totalSlots }} align="right">
                              <Typography variant="body2">{prov.totalSlots ?? '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.booked }} align="right">
                              <Typography variant="body2">{prov.bookedSlots ?? '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.fillRate }} align="right">
                              <Chip
                                label={fill + '%'}
                                size="small"
                                color={fill >= 80 ? 'success' : fill >= 60 ? 'warning' : 'error'}
                                sx={{ ...compactChipSx, fontWeight: 700, minWidth: 52 }}
                              />
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.completed }} align="right">
                              <Typography variant="body2" color="success.main" fontWeight={600}>
                                {prov.completed ?? '—'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.noShow }} align="right">
                              <Typography variant="body2" color="error.main">
                                {prov.noShow ?? '—'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.cancelRate }} align="right">
                              <Typography variant="body2" color={prov.cancelRate > 15 ? 'error.main' : 'text.primary'}>
                                {prov.cancelRate != null ? prov.cancelRate + '%' : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.avgDuration }} align="right">
                              <Typography variant="body2">{prov.avgDuration != null ? prov.avgDuration + ' min' : '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ width: UTIL_COLUMN_WIDTHS.tokens }} align="right">
                              <Typography variant="body2" fontWeight={600} color={fillColor}>
                                {prov.tokensEarned != null ? '+' + prov.tokensEarned : '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          {!utilization && !utilLoading && !utilError && (
            <Box textAlign="center" py={6}>
              <UtilIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Select a date range to load the utilization report
              </Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={loadUtilization}>
                Load Report
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        appointment={viewAppointment}
        open={!!viewAppointment}
        onClose={() => setViewAppointment(null)}
        onAction={handleActionDone}
      />
    </Container>
  );
}
