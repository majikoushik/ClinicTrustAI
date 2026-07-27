import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Grid, Card, CardContent, LinearProgress,
  Divider, Stack, Checkbox, Collapse, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as DenyIcon,
  AutoAwesome as AIIcon,
  Gavel as GavelIcon,
  Assessment as StatsIcon,
  HourglassEmpty as PendingIcon,
  Warning as WarningIcon,
  FlashOn as AutoIcon,
  AccessTime as SLAIcon,
  BarChart as AnalyticsIcon,
  FormatQuote as GuidelinesIcon,
  History as HistoryIcon,
  PriorityHigh as PriorityIcon,
  Chat as NotesIcon,
  Send as SendIcon,
  DoneAll as BulkIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ModernLoadingIndicator } from '../../components/common';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import {
  adminGetPriorAuths,
  adminReviewPriorAuth,
  adminReviewAppeal,
  adminTriggerAI,
  adminAddPANote,
  adminBulkReview,
  adminGetPAHistory,
  getAdminPAAnalytics
} from '../../services/priorAuthService';

const STATUS_COLOR = {
  Pending: 'warning',
  'Under Review': 'info',
  Approved: 'success',
  Denied: 'error',
  Appealing: 'secondary',
  Expired: 'default'
};

const PIE_COLORS = ['#ff9800', '#2196f3', '#4caf50', '#f44336', '#9c27b0', '#9e9e9e'];

const CARC_CODES = [
  { code: '4',   label: 'Not covered by this payer' },
  { code: '50',  label: 'Not deemed medically necessary' },
  { code: '96',  label: 'Non-covered charge' },
  { code: '167', label: 'Diagnosis codes not covered' },
  { code: '197', label: 'Precertification/authorization absent' },
  { code: '252', label: 'Attachment/documentation required' },
];

const APPROVAL_DURATIONS = [
  { value: 30,  label: '30 days (Acute/Episodic)' },
  { value: 60,  label: '60 days' },
  { value: 90,  label: '90 days (Standard)' },
  { value: 180, label: '180 days (Extended)' },
  { value: 365, label: '365 days (Chronic Condition)' },
];

function StatCard({ label, count, color, icon, highlight }) {
  return (
    <Card variant="outlined" sx={highlight ? { borderColor: 'error.main', borderWidth: 2 } : {}}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ color: color + '.main' }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={color + '.main'}>{count}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function SLABadge({ pa }) {
  if (pa.status !== 'Appealing' || !pa.appealDeadlineDate) return null;
  const now = new Date();
  const deadline = new Date(pa.appealDeadlineDate);
  const daysLeft = Math.ceil((deadline - now) / 86400000);
  if (daysLeft > 3) return null;
  return (
    <Chip
      icon={<SLAIcon />}
      label={daysLeft < 0 ? 'SLA Overdue' : `${daysLeft}d left`}
      size="small"
      color={daysLeft < 0 ? 'error' : 'warning'}
      sx={{ ml: 0.5 }}
    />
  );
}

const PA_ACTION_META = {
  PA_SUBMITTED:       { label: 'Submitted',             color: 'primary' },
  PA_AI_ANALYZED:     { label: 'AI Analysis Complete',  color: 'info' },
  PA_AUTO_APPROVED:   { label: 'Auto-Approved by AI',   color: 'success' },
  PA_APPROVED:        { label: 'Approved',               color: 'success' },
  PA_DENIED:          { label: 'Denied',                 color: 'error' },
  PA_APPEALED:        { label: 'Appeal Submitted',       color: 'warning' },
  PA_APPEAL_APPROVED: { label: 'Appeal Approved',        color: 'success' },
  PA_APPEAL_DENIED:   { label: 'Appeal Denied',          color: 'error' },
  PA_EXPIRED:         { label: 'Expired',                color: 'default' },
  PA_ESCALATED:       { label: 'Escalated to Admin',     color: 'error' },
  PA_SLA_BREACH:      { label: 'SLA Breach Detected',    color: 'error' },
};

function PATimeline({ history, loading }) {
  if (loading) return <LinearProgress sx={{ mt: 1 }} />;
  if (!history || history.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No audit history found.</Typography>;
  }
  return (
    <Box sx={{ mt: 1 }}>
      {history.map((entry, i) => {
        const meta = PA_ACTION_META[entry.action] || { label: entry.action, color: 'default' };
        const isLast = i === history.length - 1;
        return (
          <Box key={i} sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: `${meta.color}.main`, flexShrink: 0 }} />
              {!isLast && <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', my: 0.25, minHeight: 16 }} />}
            </Box>
            <Box sx={{ pb: isLast ? 0 : 2 }}>
              <Chip label={meta.label} size="small" color={meta.color} variant="outlined" sx={{ mb: 0.25 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                {formatDateTime(entry.timestamp)} · {entry.userEmail || entry.userRole || 'System'}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function PriorityBadge({ score }) {
  if (!score) return null;
  const isHigh     = score >= 150;
  const isMedHigh  = score >= 100;
  const isMed      = score >= 70;
  const color = isHigh ? 'error' : isMedHigh ? 'warning' : isMed ? 'warning' : 'default';
  const label = isHigh ? `P1 · ${score}` : isMedHigh ? `P2 · ${score}` : `P3 · ${score}`;
  return (
    <Chip
      icon={isHigh || isMedHigh ? <PriorityIcon /> : undefined}
      label={label}
      size="small"
      color={color}
      variant={isHigh ? 'filled' : 'outlined'}
      sx={{ mt: 0.5, height: 18, fontSize: 10 }}
    />
  );
}

export default function AdminPriorAuth() {
  const [pas, setPas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(15);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPA, setSelectedPA] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [denialReasonCode, setDenialReasonCode] = useState('');
  const [approvalDurationDays, setApprovalDurationDays] = useState(90);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paHistory, setPaHistory] = useState([]);
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDecision, setBulkDecision] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkDenialCode, setBulkDenialCode] = useState('');
  const [bulkDurationDays, setBulkDurationDays] = useState(90);
  const [bulkLoading, setBulkLoading] = useState(false);
  // Notes thread
  const [adminNote, setAdminNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  // Row action menu (kebab) — keeps the grid to one action column instead of
  // a row of icon buttons, mirroring AdminProviders.js
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuPA, setActionMenuPA] = useState(null);
  const openActionMenu = (event, pa) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuPA(pa);
  };
  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuPA(null);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetPriorAuths({ status: filterStatus, search: searchQuery });
      setPas(res.data?.priorAuths || []);
      setStats(res.data?.stats || {});
    } catch {
      setError('Failed to load prior authorizations.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => { load(); }, [load]);

  const displayed = pas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleReview = async () => {
    if (!selectedPA || !reviewDecision) return;
    try {
      setReviewLoading(true);
      const isAppeal = selectedPA.status === 'Appealing';
      if (isAppeal) {
        await adminReviewAppeal(selectedPA._id, reviewDecision, reviewNotes);
      } else {
        await adminReviewPriorAuth(selectedPA._id, reviewDecision, reviewNotes, {
          denialReasonCode: reviewDecision === 'Denied' ? denialReasonCode : undefined,
          approvalDurationDays: reviewDecision === 'Approved' ? approvalDurationDays : undefined,
        });
      }
      setReviewOpen(false);
      setReviewDecision('');
      setReviewNotes('');
      setDenialReasonCode('');
      setApprovalDurationDays(90);
      setSelectedPA(null);
      load();
    } catch {
      setError('Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAIAnalysis = async (pa) => {
    try {
      setAiLoading(true);
      const res = await adminTriggerAI(pa._id);
      setSelectedPA(prev => prev?._id === pa._id ? { ...prev, ...res.data.pa } : prev);
      load();
    } catch {
      setError('AI analysis failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const actionable = displayed.filter(pa => ['Pending', 'Under Review'].includes(pa.status)).map(pa => pa._id);
    setSelectedIds(prev => {
      if (actionable.every(id => prev.has(id))) return new Set(); // deselect all
      return new Set(actionable);
    });
  };

  const handleBulkReview = async () => {
    if (!bulkDecision || selectedIds.size === 0) return;
    try {
      setBulkLoading(true);
      const res = await adminBulkReview(
        [...selectedIds],
        bulkDecision,
        bulkNotes,
        {
          denialReasonCode:   bulkDecision === 'Denied'   ? bulkDenialCode   : undefined,
          approvalDurationDays: bulkDecision === 'Approved' ? bulkDurationDays : undefined,
        }
      );
      setBulkOpen(false);
      setBulkDecision('');
      setBulkNotes('');
      setBulkDenialCode('');
      setBulkDurationDays(90);
      setSelectedIds(new Set());
      setError(null);
      load();
      // Show success briefly
      setError(`✓ Bulk ${bulkDecision.toLowerCase()}: ${res.data?.processed} PA(s) processed.`);
      setTimeout(() => setError(null), 4000);
    } catch {
      setError('Bulk review failed. Some PAs may have already been reviewed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleAddAdminNote = async () => {
    if (!selectedPA || !adminNote.trim()) return;
    try {
      setNoteLoading(true);
      const res = await adminAddPANote(selectedPA._id, adminNote.trim());
      setSelectedPA(prev => prev ? { ...prev, notes: res.data } : prev);
      setAdminNote('');
    } catch {
      setError('Failed to add note.');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleViewHistory = async (pa) => {
    setHistoryOpen(true);
    setPaHistory([]);
    try {
      setHistoryLoading(true);
      const res = await adminGetPAHistory(pa._id);
      setPaHistory(res.data || []);
    } catch {
      setError('Failed to load audit history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenAnalytics = async () => {
    try {
      const res = await getAdminPAAnalytics();
      setAnalyticsData(res.data);
      setAnalyticsOpen(true);
    } catch {
      setError('Failed to load analytics.');
    }
  };

  const pieData = Object.entries(stats)
    .filter(([k]) => ['Pending', 'Under Review', 'Approved', 'Denied', 'Appealing', 'Expired'].includes(k))
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0);

  const overdueAppeals = stats.overdueAppeals || 0;

  // Shared row-action menu — one instance, opened against whichever row's
  // kebab button was clicked (see openActionMenu/closeActionMenu above).
  const renderActionMenu = () => {
    const pa = actionMenuPA;
    if (!pa) return null;
    const runAction = (fn) => { closeActionMenu(); fn(); };
    return (
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => runAction(() => { setSelectedPA(pa); setDetailOpen(true); })}>
          <ListItemIcon><VisibilityIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        {['Pending', 'Under Review', 'Appealing'].includes(pa.status) && (
          <MenuItem onClick={() => runAction(() => { setSelectedPA(pa); setReviewDecision(''); setReviewNotes(''); setDenialReasonCode(''); setApprovalDurationDays(90); setReviewOpen(true); })}>
            <ListItemIcon><ApproveIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Review / Decide</ListItemText>
          </MenuItem>
        )}
        {!pa.aiRecommendation && (
          <MenuItem disabled={aiLoading} onClick={() => runAction(() => handleAIAnalysis(pa))}>
            <ListItemIcon><AIIcon fontSize="small" color="info" /></ListItemIcon>
            <ListItemText>Run AI Analysis</ListItemText>
          </MenuItem>
        )}
      </Menu>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Prior Authorization Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Analytics">
            <IconButton onClick={handleOpenAnalytics}><AnalyticsIcon /></IconButton>
          </Tooltip>
          <Tooltip title="View Statistics">
            <IconButton onClick={() => setStatsOpen(true)}><StatsIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {overdueAppeals > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<SLAIcon />}>
          <strong>{overdueAppeals} appeal(s) past SLA deadline</strong> — please review immediately
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Pending', key: 'Pending', color: 'warning', icon: <PendingIcon /> },
          { label: 'Under Review', key: 'Under Review', color: 'info', icon: <AIIcon /> },
          { label: 'Approved', key: 'Approved', color: 'success', icon: <ApproveIcon /> },
          { label: 'Denied', key: 'Denied', color: 'error', icon: <DenyIcon /> },
          { label: 'Appealing', key: 'Appealing', color: 'secondary', icon: <GavelIcon />, highlight: overdueAppeals > 0 },
          { label: 'Expired', key: 'Expired', color: 'default', icon: <WarningIcon /> }
        ].map(({ label, key, color, icon, highlight }) => (
          <Grid item xs={6} sm={4} md={2} key={key}>
            <StatCard label={label} count={stats[key] || 0} color={color} icon={icon} highlight={highlight} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search patient, service, provider..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 0.5 }} /> }}
            sx={{ minWidth: 280 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Under Review">Under Review</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Denied">Denied</MenuItem>
              <MenuItem value="Appealing">Appealing</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && <Alert severity={error.startsWith('✓') ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Bulk Actions Toolbar */}
      <Collapse in={selectedIds.size > 0}>
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'rgba(25,118,210,0.06)', border: '1px solid', borderColor: 'rgba(25,118,210,0.25)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <BulkIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" color="primary.main">
                {selectedIds.size} PA{selectedIds.size !== 1 ? 's' : ''} selected
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => { setBulkDecision('Approved'); setBulkOpen(true); }}
            >
              Bulk Approve
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={() => { setBulkDecision('Denied'); setBulkOpen(true); }}
            >
              Bulk Deny
            </Button>
            <Button size="small" variant="outlined" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <ModernLoadingIndicator message="Loading prior authorizations..." />
        </Box>
      ) : (
        <Paper>
          <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
            <Table size="small" sx={tableSx}>
              <TableHead>
                <TableRow sx={tableHeadRowSx}>
                  <TableCell padding="checkbox" sx={{ width: '48px' }}>
                    <Tooltip title="Select all reviewable on this page">
                      <Checkbox
                        size="small"
                        indeterminate={selectedIds.size > 0 && !displayed.filter(p => ['Pending','Under Review'].includes(p.status)).every(p => selectedIds.has(p._id))}
                        checked={displayed.filter(p => ['Pending','Under Review'].includes(p.status)).length > 0 && displayed.filter(p => ['Pending','Under Review'].includes(p.status)).every(p => selectedIds.has(p._id))}
                        onChange={toggleSelectAll}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ width: '14%' }}>Patient</TableCell>
                  <TableCell sx={{ width: '13%' }}>Service</TableCell>
                  <TableCell sx={{ width: '15%' }}>Provider</TableCell>
                  <TableCell sx={{ width: '11%' }}>Urgency</TableCell>
                  <TableCell sx={{ width: '13%' }}>Status</TableCell>
                  <TableCell sx={{ width: '10%' }}>AI Rec.</TableCell>
                  <TableCell sx={{ width: '10%' }}>AI Conf.</TableCell>
                  <TableCell sx={{ width: '9%' }}>Submitted</TableCell>
                  <TableCell sx={{ width: '48px' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No prior authorizations found
                    </TableCell>
                  </TableRow>
                ) : displayed.map((pa) => (
                  <TableRow key={pa._id} hover selected={selectedIds.has(pa._id)} sx={tableBodyRowSx}>
                    <TableCell padding="checkbox" sx={{ width: '48px' }}>
                      {['Pending', 'Under Review'].includes(pa.status) && (
                        <Checkbox size="small" checked={selectedIds.has(pa._id)} onChange={() => toggleSelectId(pa._id)} />
                      )}
                    </TableCell>
                    <TableCell sx={{ width: '14%' }}><EllipsisCell value={pa.patientName} /></TableCell>
                    <TableCell sx={{ width: '13%' }}><EllipsisCell value={pa.serviceType} /></TableCell>
                    <TableCell sx={{ width: '15%' }}>
                      <EllipsisCell value={pa.requestingProviderName} />
                    </TableCell>
                    <TableCell sx={{ width: '11%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Chip label={pa.urgency} size="small" sx={compactChipSx}
                        color={pa.urgency === 'Emergent' ? 'error' : pa.urgency === 'Urgent' ? 'warning' : 'default'} />
                      <PriorityBadge score={pa.priorityScore} />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: '13%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label={pa.status} size="small" color={STATUS_COLOR[pa.status] || 'default'} sx={compactChipSx} />
                        {pa.autoApproved && (
                          <Tooltip title="Auto-approved by AI">
                            <AutoIcon fontSize="small" color="success" />
                          </Tooltip>
                        )}
                        <SLABadge pa={pa} />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: '10%' }}>
                      {pa.aiRecommendation ? (
                        <Chip label={pa.aiRecommendation} size="small" variant="outlined" sx={compactChipSx}
                          color={pa.aiRecommendation === 'Approve' ? 'success' : pa.aiRecommendation === 'Deny' ? 'error' : 'warning'} />
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell sx={{ width: '10%' }}>
                      {pa.aiConfidenceScore != null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pa.aiConfidenceScore}
                            sx={{ width: 50, height: 6, borderRadius: 3 }}
                            color={pa.aiConfidenceScore >= 75 ? 'success' : pa.aiConfidenceScore >= 50 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption">{pa.aiConfidenceScore}%</Typography>
                        </Box>
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell sx={{ width: '9%' }}>{formatDate(pa.createdAt)}</TableCell>
                    <TableCell sx={{ width: '48px' }} align="center">
                      <IconButton size="small" onClick={(e) => openActionMenu(e, pa)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pas.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, p) => setPage(p)}
            rowsPerPageOptions={[15]}
          />
          {renderActionMenu()}
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Prior Authorization Details</DialogTitle>
        <DialogContent dividers>
          {selectedPA && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Patient</Typography><Typography>{selectedPA.patientName} (ID: {selectedPA.patientId})</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Requesting Provider</Typography><Typography>{selectedPA.requestingProviderName}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Service</Typography><Typography>{selectedPA.serviceType} {selectedPA.serviceCode ? `(CPT: ${selectedPA.serviceCode})` : ''}</Typography></Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Chip label={selectedPA.status} color={STATUS_COLOR[selectedPA.status] || 'default'} size="small" />
                  {selectedPA.autoApproved && <Chip icon={<AutoIcon />} label="Auto-approved" size="small" color="success" variant="outlined" />}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Urgency</Typography><Chip label={selectedPA.urgency} size="small" color={selectedPA.urgency === 'Emergent' ? 'error' : selectedPA.urgency === 'Urgent' ? 'warning' : 'default'} /></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Insurance</Typography><Typography>{selectedPA.insurancePlan || 'Not specified'} {selectedPA.memberId ? `(Member: ${selectedPA.memberId})` : ''}</Typography></Grid>
              {selectedPA.approvedDate && (
                <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Approved</Typography><Typography>{formatDate(selectedPA.approvedDate)} → Expires {formatDate(selectedPA.expiryDate)} ({selectedPA.approvalDurationDays || 90}d)</Typography></Grid>
              )}
              {selectedPA.denialReasonCode && (
                <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Denial Reason (CARC)</Typography><Chip label={`${selectedPA.denialReasonCode} — ${selectedPA.denialReasonDescription}`} size="small" color="error" variant="outlined" /></Grid>
              )}
              {selectedPA.diagnosisCodes?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Diagnosis Codes</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {selectedPA.diagnosisCodes.map((d, i) => <Chip key={i} label={`${d.code}: ${d.description}`} size="small" variant="outlined" />)}
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Clinical Notes</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{selectedPA.clinicalNotes}</Typography>
                </Paper>
              </Grid>
              {selectedPA.aiRecommendation && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(25,118,210,0.04)', borderColor: 'primary.light' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AIIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" color="primary.main">AI Analysis</Typography>
                      <Chip label={selectedPA.aiRecommendation} size="small"
                        color={selectedPA.aiRecommendation === 'Approve' ? 'success' : selectedPA.aiRecommendation === 'Deny' ? 'error' : 'warning'} />
                      {selectedPA.aiConfidenceScore != null && (
                        <Typography variant="caption" color="text.secondary">Confidence: <strong>{selectedPA.aiConfidenceScore}%</strong></Typography>
                      )}
                      {selectedPA.aiAnalyzedAt && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>Analyzed: {formatDateTime(selectedPA.aiAnalyzedAt)}</Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>{selectedPA.aiReasoning}</Typography>
                    {selectedPA.aiKeyFactors?.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Key Factors:</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                          {selectedPA.aiKeyFactors.map((f, i) => <Chip key={i} label={f} size="small" variant="outlined" />)}
                        </Stack>
                      </Box>
                    )}
                    {selectedPA.aiGuidelinesCited?.length > 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <GuidelinesIcon fontSize="small" color="action" />
                          <Typography variant="caption" fontWeight={600} color="text.secondary">Guidelines Cited:</Typography>
                        </Box>
                        {selectedPA.aiGuidelinesCited.map((g, i) => (
                          <Typography key={i} variant="caption" display="block" color="text.secondary" sx={{ ml: 1.5 }}>• {g}</Typography>
                        ))}
                      </Box>
                    )}
                    {selectedPA.aiSuggestedAction && (
                      <Alert severity="info" sx={{ mt: 1 }} icon={false}>
                        <Typography variant="caption"><strong>Suggested Action:</strong> {selectedPA.aiSuggestedAction}</Typography>
                      </Alert>
                    )}
                  </Paper>
                </Grid>
              )}
              {selectedPA.reviewerNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Reviewer Notes</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5 }}><Typography variant="body2">{selectedPA.reviewerNotes}</Typography></Paper>
                </Grid>
              )}
              {selectedPA.appealNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: 'warning.main' }}>Appeal Notes (#{selectedPA.appealCount})</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, borderColor: 'warning.main' }}>
                    <Typography variant="body2">{selectedPA.appealNotes}</Typography>
                    {selectedPA.appealDeadlineDate && (
                      <Typography variant="caption" color={new Date(selectedPA.appealDeadlineDate) < new Date() ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.5 }}>
                        Review deadline: {formatDateTime(selectedPA.appealDeadlineDate)}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              )}

              {/* Notes Thread */}
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <NotesIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Clinical Notes Thread {selectedPA.notes?.length > 0 ? `(${selectedPA.notes.length})` : ''}
                  </Typography>
                </Box>
                {selectedPA.notes?.length > 0 ? (
                  <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    {selectedPA.notes.map((note, i) => {
                      const isAdmin = ['admin', 'superadmin'].includes(note.authorRole);
                      return (
                        <Box key={i} sx={{ mb: i < selectedPA.notes.length - 1 ? 1.5 : 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                            <Box sx={{
                              maxWidth: '85%',
                              bgcolor: isAdmin ? 'rgba(76,175,80,0.06)' : 'rgba(25,118,210,0.06)',
                              border: '1px solid',
                              borderColor: isAdmin ? 'rgba(76,175,80,0.4)' : 'rgba(25,118,210,0.3)',
                              borderRadius: 1.5,
                              px: 1.5, py: 0.75,
                            }}>
                              <Typography variant="caption" fontWeight={600} color={isAdmin ? 'success.main' : 'primary.main'} display="block">
                                {note.authorEmail || note.authorRole} {isAdmin ? '(Admin)' : '(Provider)'}
                              </Typography>
                              <Typography variant="body2">{note.message}</Typography>
                              <Typography variant="caption" color="text.secondary">{formatDateTime(note.createdAt)}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>No notes yet.</Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add a clinical note for the provider..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && adminNote.trim()) { e.preventDefault(); handleAddAdminNote(); } }}
                    multiline
                    maxRows={3}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!adminNote.trim() || noteLoading}
                    onClick={handleAddAdminNote}
                    sx={{ minWidth: 40, px: 1 }}
                  >
                    <SendIcon fontSize="small" />
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<HistoryIcon />} onClick={() => selectedPA && handleViewHistory(selectedPA)} sx={{ mr: 'auto' }}>
            Audit Trail
          </Button>
          {selectedPA && ['Pending', 'Under Review', 'Appealing'].includes(selectedPA.status) && (
            <Button variant="contained" color="primary" onClick={() => { setDetailOpen(false); setReviewDecision(''); setReviewNotes(''); setDenialReasonCode(''); setApprovalDurationDays(90); setReviewOpen(true); }}>
              Review & Decide
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Audit Trail / History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon fontSize="small" />
          Audit Trail — {selectedPA?.patientName}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {selectedPA?.serviceType} · Submitted {selectedPA ? formatDate(selectedPA.createdAt) : ''}
          </Typography>
          <PATimeline history={paHistory} loading={historyLoading} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Review Dialog */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BulkIcon />
          Bulk {bulkDecision} — {selectedIds.size} PA{selectedIds.size !== 1 ? 's' : ''}
        </DialogTitle>
        <DialogContent>
          <Alert severity={bulkDecision === 'Approved' ? 'success' : 'error'} sx={{ mb: 2 }}>
            You are about to <strong>{bulkDecision?.toLowerCase()}</strong> <strong>{selectedIds.size}</strong> prior authorization(s). This action will notify each patient.
          </Alert>
          {bulkDecision === 'Approved' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Approval Duration</InputLabel>
              <Select value={bulkDurationDays} label="Approval Duration" onChange={(e) => setBulkDurationDays(e.target.value)}>
                {APPROVAL_DURATIONS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          {bulkDecision === 'Denied' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Denial Reason Code (CARC)</InputLabel>
              <Select value={bulkDenialCode} label="Denial Reason Code (CARC)" onChange={(e) => setBulkDenialCode(e.target.value)}>
                <MenuItem value=""><em>Select a code (optional)</em></MenuItem>
                {CARC_CODES.map(c => <MenuItem key={c.code} value={c.code}>CARC {c.code} — {c.label}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <TextField
            fullWidth multiline rows={3}
            label="Reviewer Notes (applied to all selected)"
            value={bulkNotes}
            onChange={(e) => setBulkNotes(e.target.value)}
            placeholder="Provide justification for this bulk decision..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={bulkDecision === 'Approved' ? 'success' : 'error'}
            disabled={bulkLoading}
            onClick={handleBulkReview}
          >
            {bulkLoading ? 'Processing...' : `Confirm Bulk ${bulkDecision}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedPA?.status === 'Appealing' ? 'Review Appeal' : 'Review Prior Authorization'}
        </DialogTitle>
        <DialogContent>
          {selectedPA && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Patient: <strong>{selectedPA.patientName}</strong> | Service: <strong>{selectedPA.serviceType}</strong>
                {selectedPA.urgency === 'Emergent' && <Chip label="EMERGENT" size="small" color="error" sx={{ ml: 1 }} />}
              </Typography>
              {selectedPA.aiRecommendation && (
                <Alert
                  severity={selectedPA.aiRecommendation === 'Approve' ? 'success' : selectedPA.aiRecommendation === 'Deny' ? 'error' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  <strong>AI Recommendation: {selectedPA.aiRecommendation}</strong> (Confidence: {selectedPA.aiConfidenceScore}%)
                  <br />
                  <Typography variant="body2">{selectedPA.aiReasoning}</Typography>
                  {selectedPA.aiGuidelinesCited?.length > 0 && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      Guidelines: {selectedPA.aiGuidelinesCited.join(' | ')}
                    </Typography>
                  )}
                </Alert>
              )}
              <FormControl fullWidth required sx={{ mb: 2 }}>
                <InputLabel>Decision</InputLabel>
                <Select value={reviewDecision} label="Decision" onChange={(e) => setReviewDecision(e.target.value)}>
                  <MenuItem value="Approved">Approve</MenuItem>
                  <MenuItem value="Denied">Deny</MenuItem>
                </Select>
              </FormControl>

              {reviewDecision === 'Approved' && !selectedPA.status === 'Appealing' && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Approval Duration</InputLabel>
                  <Select value={approvalDurationDays} label="Approval Duration" onChange={(e) => setApprovalDurationDays(e.target.value)}>
                    {APPROVAL_DURATIONS.map(d => (
                      <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {reviewDecision === 'Denied' && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Denial Reason Code (CARC)</InputLabel>
                  <Select value={denialReasonCode} label="Denial Reason Code (CARC)" onChange={(e) => setDenialReasonCode(e.target.value)}>
                    <MenuItem value=""><em>Select a code (optional)</em></MenuItem>
                    {CARC_CODES.map(c => (
                      <MenuItem key={c.code} value={c.code}>CARC {c.code} — {c.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reviewer Notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Provide justification for your decision..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={reviewDecision === 'Approved' ? 'success' : reviewDecision === 'Denied' ? 'error' : 'primary'}
            disabled={!reviewDecision || reviewLoading}
            onClick={handleReview}
          >
            {reviewLoading ? 'Saving...' : reviewDecision === 'Approved' ? 'Approve' : reviewDecision === 'Denied' ? 'Deny' : 'Submit Decision'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onClose={() => setStatsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Prior Authorization Statistics</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle1" gutterBottom>Status Distribution</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle1" gutterBottom>Count by Status</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pieData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#2196f3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>PA Analytics — Turnaround, Denial Patterns & AI Accuracy</DialogTitle>
        <DialogContent>
          {analyticsData && (
            <Grid container spacing={3} sx={{ mt: 0 }}>
              {/* AI Accuracy */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>AI Accuracy</Typography>
                  <Typography variant="h3" fontWeight={800} color="primary.main">
                    {analyticsData.aiAccuracy?.accuracyPct ?? '—'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analyticsData.aiAccuracy?.correct ?? 0} / {analyticsData.aiAccuracy?.total ?? 0} cases matched
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    Auto-approved: <strong>{analyticsData.aiAccuracy?.autoApproved ?? 0}</strong>
                  </Typography>
                </Paper>
              </Grid>
              {/* Appeal outcomes */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Appeal Outcomes</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                    <Box>
                      <Typography variant="h4" fontWeight={800} color="success.main">{analyticsData.appealOutcomes?.Approved ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Won</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={800} color="error.main">{analyticsData.appealOutcomes?.Denied ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Lost</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Win rate: <strong>
                      {analyticsData.appealOutcomes?.Approved + analyticsData.appealOutcomes?.Denied > 0
                        ? Math.round((analyticsData.appealOutcomes.Approved / (analyticsData.appealOutcomes.Approved + analyticsData.appealOutcomes.Denied)) * 100)
                        : 0}%
                    </strong>
                  </Typography>
                </Paper>
              </Grid>
              {/* Denial rate chart */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Top Denial Rates by Service</Typography>
                  {analyticsData.denialRateByService?.slice(0, 5).map((row, i) => (
                    <Box key={i} sx={{ mb: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 140 }}>{row.serviceType || row._id}</Typography>
                        <Typography variant="caption" fontWeight={700} color="error.main">{Math.round(row.denialRate)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min(100, row.denialRate)} color="error" sx={{ height: 5, borderRadius: 2 }} />
                    </Box>
                  ))}
                </Paper>
              </Grid>
              {/* TAT chart */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Average Turnaround Time by Service (hours)</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analyticsData.tatByServiceType?.slice(0, 8).map(r => ({ name: r._id, avgHours: Math.round(r.avgTatHours) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis unit="h" />
                    <RechartsTooltip formatter={(v) => [`${v}h`, 'Avg TAT']} />
                    <Bar dataKey="avgHours" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              {/* Volume trend */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Submission Volume — Last 30 Days</Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analyticsData.volumeTrend?.map(r => ({ date: r._id, count: r.count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#2196f3" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
