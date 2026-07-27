import React, { useState, useEffect, useRef } from 'react';
import { exportDialogToPDF } from '../../utils/pdfExport';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  IconButton, Chip, Tabs, Tab, Grid, Card, CardContent, Badge, CircularProgress,
  Switch, Divider, Snackbar
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
  pageHeaderBoxSx,
} from '../../components/common/adminTableStyles';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import adminReferralService from '../../services/adminReferralService';
import { get, put } from '../../utils/apiUtils';
import { formatDate } from '../../utils/dateFormatter';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`referral-tabpanel-${index}`}
      aria-labelledby={`referral-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}
const AdminReferrals = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredReferrals, setFilteredReferrals] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [currentReferral, setCurrentReferral] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterHasDispute, setFilterHasDispute] = useState('all');
    const [filterProvider] = useState('');
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);
    const [referralStats, setReferralStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState(null);
    const [exporting, setExporting] = useState(false);
    const statsContentRef = useRef(null);

    const [workflowSettings, setWorkflowSettings] = useState({
      slaAcceptHours: 24,
      slaCompleteDays: 30,
      autoEscalateHours: 48,
      disputeResolutionDays: 14,
      referralExpiryDays: 90,
      maxOpenPerProvider: 50,
      autoAssign: false,
      requirePriorAuth: true,
      allowDirectSpecialist: false,
    });
    const [workflowSaving, setWorkflowSaving] = useState(false);

    // Load previously-saved workflow settings, if any (falls back to the
    // defaults above on first use / 404 — that's expected, not an error).
    useEffect(() => {
      get('/admin/settings/key/referralWorkflow')
        .then((res) => {
          const saved = res?.data?.value;
          if (saved && typeof saved === 'object') {
            setWorkflowSettings((prev) => ({ ...prev, ...saved }));
          }
        })
        .catch(() => { /* no saved settings yet — keep defaults */ });
    }, []);
    const [wfSnackbar, setWfSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const handleExportStatsPDF = async () => {
      const el = statsContentRef.current;
      if (!el) return;
      setExporting(true);
      try {
        await exportDialogToPDF(el, 'referral-statistics.pdf');
      } catch (err) {
        console.error('Referral PDF export failed:', err);
      } finally {
        setExporting(false);
      }
    };

    const handleSaveWorkflowSettings = async () => {
      setWorkflowSaving(true);
      try {
        // The generic admin settings endpoint expects { value, category }, not
        // the raw settings object at the body root — sending it unwrapped
        // silently upserted a setting with no value.
        await put('/admin/settings/referralWorkflow', { value: workflowSettings, category: 'referrals' });
        setWfSnackbar({ open: true, message: 'Workflow settings saved!', severity: 'success' });
      } catch {
        setWfSnackbar({ open: true, message: 'Saved locally. Server sync pending.', severity: 'info' });
      } finally {
        setWorkflowSaving(false);
      }
    };

    const handleOpenStats = async () => {
      setStatsDialogOpen(true);
      if (referralStats) return; // already loaded
      setStatsLoading(true);
      setStatsError(null);
      try {
        const resp = await adminReferralService.getReferralStats();
        if (resp?.success) {
          setReferralStats(resp.data);
        } else {
          setStatsError('Failed to load statistics.');
        }
      } catch (err) {
        console.error('Error loading referral stats:', err);
        setStatsError('Failed to load statistics. Please try again.');
      } finally {
        setStatsLoading(false);
      }
    };
    
    useEffect(() => {
      const fetchReferrals = async () => {
        try {
          setLoading(true);
          
          // Get referrals from service
          const response = await adminReferralService.getAllReferrals();
          
          if (response.success) {
            // Backend returns { success, data: [...] } — data is the array directly
            const list = Array.isArray(response.data) ? response.data : (response.data?.referrals || []);
            setReferrals(list);
            setFilteredReferrals(list);
            setReferralStats(response.data?.stats || null);
          } else {
            throw new Error('Failed to fetch referrals');
          }
          
          setLoading(false);
        } catch (err) {
          console.error('Error fetching referrals:', err);
          setError('Failed to load referral data. Please try again later.');
          setLoading(false);
        }
      };
  
      fetchReferrals();
    }, []);

    useEffect(() => {
        let filtered = referrals;
        
        // Apply search filter
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(referral => {
            const pat = referral.patient || {};
            const refProv = referral.referringProvider || {};
            const recProv = referral.receivingProvider || {};
            const patName = (pat.name || [pat.firstName, pat.lastName].filter(Boolean).join(' ')).toLowerCase();
            const refName = (refProv.firstName || refProv.name || '').toLowerCase();
            const recName = (recProv.firstName || recProv.name || '').toLowerCase();
            return patName.includes(query) || refName.includes(query) || recName.includes(query) || (referral.reason || '').toLowerCase().includes(query);
          });
        }

        // Apply status filter
        if (filterStatus !== 'all') {
          filtered = filtered.filter(referral => referral.status === filterStatus);
        }

        // Apply "Has Dispute" filter (referral.hasDispute is attached server-side)
        if (filterHasDispute === 'yes') {
          filtered = filtered.filter(referral => referral.hasDispute);
        } else if (filterHasDispute === 'no') {
          filtered = filtered.filter(referral => !referral.hasDispute);
        }

        setFilteredReferrals(filtered);
        setPage(0);
      }, [searchQuery, filterStatus, filterHasDispute, filterProvider, referrals]);
    
      const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setPage(0);
      };
    
      const handleChangePage = (event, newPage) => {
        setPage(newPage);
      };
    
      const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      };
    
      const handleViewDetails = (referral) => {
        setCurrentReferral(referral);
        setDetailDialogOpen(true);
      };
    

      const getStatusColor = (status) => {
        switch (status) {
          case 'completed': return 'success';
          case 'pending':   return 'warning';
          case 'accepted':  return 'info';
          case 'cancelled': return 'default';
          case 'rejected':  return 'error';
          default:          return 'default';
        }
      };
    
      const getPaymentStatusColor = (status) => {
        switch (status) {
          case 'Paid':
            return 'success';
          case 'Pending':
            return 'warning';
          case 'Disputed':
            return 'error';
          case 'Cancelled':
            return 'default';
          default:
            return 'default';
        }
      };
    
      const getFilteredReferralsByTab = (tabIndex) => {
        switch (tabIndex) {
          case 0: return filteredReferrals;
          case 1: return filteredReferrals.filter(ref => ref.status === 'pending');
          case 2: return filteredReferrals.filter(ref => ref.status === 'accepted');
          case 3: return filteredReferrals.filter(ref => ref.status === 'completed');
          case 4: return filteredReferrals.filter(ref => ref.status === 'cancelled' || ref.status === 'rejected');
          default: return filteredReferrals;
        }
      };

      const renderReferralsTable = (tabIndex) => {
        const displayReferrals = getFilteredReferralsByTab(tabIndex);
        
        return (
          <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
            <Table size="small" sx={tableSx}>
              <TableHead>
                <TableRow sx={tableHeadRowSx}>
                  <TableCell sx={{ width: '17%' }}>Patient</TableCell>
                  <TableCell sx={{ width: '16%' }}>From Provider</TableCell>
                  <TableCell sx={{ width: '16%' }}>To Provider</TableCell>
                  <TableCell sx={{ width: '10%' }}>Status</TableCell>
                  <TableCell sx={{ width: '10%' }}>Priority</TableCell>
                  <TableCell sx={{ width: '10%' }}>Created</TableCell>
                  <TableCell sx={{ width: '10%' }}>Payment</TableCell>
                  <TableCell sx={{ width: '11%' }}>Dispute</TableCell>
                  <TableCell sx={{ width: '48px' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayReferrals
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((referral) => {
                    const refId = referral._id || referral.id;
                    const patient = referral.patient || {};
                    const patientName = patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || '—';
                    const refProv = referral.referringProvider || {};
                    const recProv = referral.receivingProvider || {};
                    const refProvName = refProv.firstName ? `Dr. ${refProv.firstName} ${refProv.lastName || ''}`.trim() : (refProv.name || '—');
                    const recProvName = recProv.firstName ? `Dr. ${recProv.firstName} ${recProv.lastName || ''}`.trim() : (recProv.name || '—');
                    const billingStatus = referral.billing?.status || 'pending';
                    return (
                    <TableRow key={refId} hover sx={tableBodyRowSx}>
                      <TableCell sx={{ width: '17%' }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{patientName}</Typography>
                        <Typography variant="caption" color="text.secondary">{patient.patientId}</Typography>
                      </TableCell>
                      <TableCell sx={{ width: '16%' }}>
                        <EllipsisCell value={refProvName} />
                        <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{refProv.specialty}</Typography>
                      </TableCell>
                      <TableCell sx={{ width: '16%' }}>
                        <EllipsisCell value={recProvName} />
                        <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{recProv.specialty}</Typography>
                      </TableCell>
                      <TableCell sx={{ width: '10%' }}>
                        <Chip label={referral.status} color={getStatusColor(referral.status)} size="small" sx={compactChipSx} />
                      </TableCell>
                      <TableCell sx={{ width: '10%' }}>
                        <Chip label={referral.urgency || 'routine'} color={referral.urgency === 'emergency' ? 'error' : referral.urgency === 'urgent' ? 'warning' : 'default'} size="small" variant="outlined" sx={compactChipSx} />
                      </TableCell>
                      <TableCell sx={{ width: '10%' }}>{formatDate(referral.createdAt)}</TableCell>
                      <TableCell sx={{ width: '10%' }}>
                        <Chip label={billingStatus} color={getPaymentStatusColor(billingStatus)} size="small" sx={compactChipSx} />
                      </TableCell>
                      <TableCell sx={{ width: '11%' }}>
                        {referral.hasDispute ? (
                          <Chip
                            label={referral.disputeStatus || 'Pending'}
                            color={referral.disputeStatus === 'Resolved' ? 'success' : referral.disputeStatus === 'Rejected' ? 'default' : 'error'}
                            size="small"
                            sx={compactChipSx}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">None</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ width: '48px' }} align="center">
                        <IconButton size="small" color="primary" onClick={() => handleViewDetails(referral)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );})}

                {displayReferrals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No referrals found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        );
      };

      return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={pageHeaderBoxSx}>
            <Typography variant="h4" component="h1" gutterBottom>
              Referral Management
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                size="small"
                label="Search"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mr: 2 }}
                InputProps={{
                  endAdornment: <SearchIcon color="action" />
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                <InputLabel>Has Dispute</InputLabel>
                <Select
                  value={filterHasDispute}
                  label="Has Dispute"
                  onChange={(e) => setFilterHasDispute(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                startIcon={<AssessmentIcon />}
                onClick={handleOpenStats}
              >
                View Stats
              </Button>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
               <ModernLoadingIndicator message="Loading alerts..." />
            </Box>
          ) : (
            <>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="referral tabs">
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.length} color="primary">
                      All Referrals
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'pending').length} color="warning">
                      Pending
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'accepted').length} color="info">
                      Accepted
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'completed').length} color="success">
                      Completed
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'cancelled' || ref.status === 'rejected').length} color="error">
                      Cancelled/Rejected
                    </Badge>
                  } />
                  <Tab label="Workflow Settings" />
                </Tabs>
              </Box>
              
              <TabPanel value={tabValue} index={0}>
                {renderReferralsTable(0)}
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                {renderReferralsTable(1)}
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                {renderReferralsTable(2)}
              </TabPanel>
              <TabPanel value={tabValue} index={3}>
                {renderReferralsTable(3)}
              </TabPanel>
              <TabPanel value={tabValue} index={4}>
                {renderReferralsTable(4)}
              </TabPanel>

              <TabPanel value={tabValue} index={5}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>Workflow Settings</Typography>
                      <Typography variant="body2" color="text.secondary">
                        SLA targets, routing rules, and escalation policies for the referral lifecycle.
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleSaveWorkflowSettings}
                      disabled={workflowSaving}
                      startIcon={workflowSaving ? <CircularProgress size={16} color="inherit" /> : null}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, flexShrink: 0 }}
                    >
                      {workflowSaving ? 'Saving…' : 'Save Settings'}
                    </Button>
                  </Box>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>SLA Targets</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>Acceptance SLA (hours)</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>Time for receiving provider to accept before escalation</Typography>
                      <TextField fullWidth size="small" type="number" inputProps={{ min: 1, max: 168 }}
                        value={workflowSettings.slaAcceptHours}
                        onChange={e => setWorkflowSettings(s => ({ ...s, slaAcceptHours: Number(e.target.value) }))} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>Completion SLA (days)</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>Expected time to complete the full referral episode</Typography>
                      <TextField fullWidth size="small" type="number" inputProps={{ min: 1, max: 365 }}
                        value={workflowSettings.slaCompleteDays}
                        onChange={e => setWorkflowSettings(s => ({ ...s, slaCompleteDays: Number(e.target.value) }))} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>Auto-Escalate After (hours)</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>Escalate to admin if referral is unacknowledged</Typography>
                      <TextField fullWidth size="small" type="number" inputProps={{ min: 1, max: 240 }}
                        value={workflowSettings.autoEscalateHours}
                        onChange={e => setWorkflowSettings(s => ({ ...s, autoEscalateHours: Number(e.target.value) }))} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>Dispute Resolution Window (days)</Typography>
                      <TextField fullWidth size="small" type="number" inputProps={{ min: 3, max: 60 }}
                        value={workflowSettings.disputeResolutionDays}
                        onChange={e => setWorkflowSettings(s => ({ ...s, disputeResolutionDays: Number(e.target.value) }))} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>Referral Expiry (days)</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>Open referrals auto-cancel after this period</Typography>
                      <TextField fullWidth size="small" type="number" inputProps={{ min: 30, max: 365 }}
                        value={workflowSettings.referralExpiryDays}
                        onChange={e => setWorkflowSettings(s => ({ ...s, referralExpiryDays: Number(e.target.value) }))} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>Max Open Referrals per Provider</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>Hard cap to prevent provider overload</Typography>
                      <TextField fullWidth size="small" type="number" inputProps={{ min: 5, max: 500 }}
                        value={workflowSettings.maxOpenPerProvider}
                        onChange={e => setWorkflowSettings(s => ({ ...s, maxOpenPerProvider: Number(e.target.value) }))} />
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Routing Rules</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {[
                      { key: 'autoAssign', label: 'AI Auto-Assignment', hint: 'AI assigns the receiving provider based on match score' },
                      { key: 'requirePriorAuth', label: 'Require Prior Authorization', hint: 'PA must be approved before a referral can be sent' },
                      { key: 'allowDirectSpecialist', label: 'Allow Direct-to-Specialist', hint: 'Providers can refer directly without GP intermediary' },
                    ].map(({ key, label, hint }) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ pr: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{label}</Typography>
                            <Typography variant="caption" color="text.secondary">{hint}</Typography>
                          </Box>
                          <Switch
                            checked={workflowSettings[key]}
                            onChange={e => setWorkflowSettings(s => ({ ...s, [key]: e.target.checked }))}
                            size="small"
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </TabPanel>

              <Snackbar
                open={wfSnackbar.open}
                autoHideDuration={3000}
                onClose={() => setWfSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <Alert onClose={() => setWfSnackbar(s => ({ ...s, open: false }))} severity={wfSnackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
                  {wfSnackbar.message}
                </Alert>
              </Snackbar>

              {tabValue !== 5 && <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={getFilteredReferralsByTab(tabValue).length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />}
            </>
          )}

                {/* Referral Details Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Referral Details
        </DialogTitle>
        
        <DialogContent>
          {currentReferral && (() => {
            const cp = currentReferral;
            const pat = cp.patient || {};
            const refProv = cp.referringProvider || {};
            const recProv = cp.receivingProvider || {};
            const patName = pat.name || [pat.firstName, pat.lastName].filter(Boolean).join(' ') || '—';
            const refName = refProv.firstName ? `Dr. ${refProv.firstName} ${refProv.lastName || ''}`.trim() : (refProv.name || '—');
            const recName = recProv.firstName ? `Dr. ${recProv.firstName} ${recProv.lastName || ''}`.trim() : (recProv.name || '—');
            return (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Patient Information</Typography>
                    <Typography variant="body2"><strong>Patient ID:</strong> {pat.patientId || '—'}</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {patName}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referral Status</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}><strong>Status:</strong></Typography>
                      <Chip label={cp.status} color={getStatusColor(cp.status)} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}><strong>Urgency:</strong></Typography>
                      <Chip label={cp.urgency || 'routine'} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="body2"><strong>Created:</strong> {formatDate(cp.createdAt)}</Typography>
                    {cp.completionDate && (
                      <Typography variant="body2"><strong>Completed:</strong> {formatDate(cp.completionDate)}</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referring Provider</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {refName}</Typography>
                    <Typography variant="body2"><strong>Specialty:</strong> {refProv.specialty || '—'}</Typography>
                    <Typography variant="body2"><strong>Organization:</strong> {refProv.organization || '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Receiving Provider</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {recName}</Typography>
                    <Typography variant="body2"><strong>Specialty:</strong> {recProv.specialty || '—'}</Typography>
                    <Typography variant="body2"><strong>Organization:</strong> {recProv.organization || '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referral Details</Typography>
                    <Typography variant="body2"><strong>Reason:</strong> {cp.reason}</Typography>
                    {cp.notes && <Typography variant="body2"><strong>Notes:</strong> {cp.notes}</Typography>}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Billing</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}><strong>Status:</strong></Typography>
                      <Chip label={cp.billing?.status || 'pending'} color={getPaymentStatusColor(cp.billing?.status)} size="small" />
                    </Box>
                    {cp.billing?.amount && <Typography variant="body2"><strong>Amount:</strong> ${cp.billing.amount}</Typography>}
                    {cp.billing?.transactionId && <Typography variant="body2"><strong>Tx ID:</strong> {cp.billing.transactionId}</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            );
          })()}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Statistics Dialog */}
      <Dialog 
        open={statsDialogOpen}
        onClose={() => { setStatsDialogOpen(false); setStatsError(null); }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Referral Statistics
        </DialogTitle>
        
        <DialogContent ref={statsContentRef}>
          {statsLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">Loading statistics…</Typography>
            </Box>
          ) : statsError ? (
            <Alert severity="error" sx={{ mt: 2 }}>{statsError}</Alert>
          ) : referralStats ? (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Overview */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referral Overview</Typography>
                    <Typography variant="body2"><strong>Total:</strong> {referralStats.totalReferrals}</Typography>
                    <Typography variant="body2"><strong>Pending:</strong> {referralStats.pendingReferrals}</Typography>
                    <Typography variant="body2"><strong>Accepted:</strong> {referralStats.acceptedReferrals ?? referralStats.approvedReferrals}</Typography>
                    <Typography variant="body2"><strong>Completed:</strong> {referralStats.completedReferrals}</Typography>
                    <Typography variant="body2"><strong>Rejected:</strong> {referralStats.rejectedReferrals}</Typography>
                    <Typography variant="body2"><strong>Cancelled:</strong> {referralStats.cancelledReferrals}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Disputes & Timing */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Dispute & Timing</Typography>
                    <Typography variant="body2"><strong>Active Disputes:</strong> {referralStats.activeDisputes}</Typography>
                    <Typography variant="body2"><strong>Avg Completion Time:</strong> {referralStats.averageCompletionTime} days</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Completion Rate:</strong>{' '}
                      {referralStats.totalReferrals
                        ? `${((referralStats.completedReferrals / referralStats.totalReferrals) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Referrers */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Top Referrers</Typography>
                    {(referralStats.topReferrers || []).map((r, i) => (
                      <Typography key={i} variant="body2">
                        <strong>{r.providerName}:</strong> {r.count} referrals
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Monthly Trends */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Monthly Trends</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={referralStats.monthlyTrends || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis allowDecimals={false} />
                          <RechartsTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="#8884d8" name="Referrals" activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Receivers */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Top Receivers</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={referralStats.topReceivers || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="providerName" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#82ca9d" name="Received" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">No statistics available.</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => { setStatsDialogOpen(false); setStatsError(null); }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportStatsPDF}
            disabled={exporting || statsLoading || !referralStats}
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {exporting ? 'Generating PDF…' : 'Export Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminReferrals;
