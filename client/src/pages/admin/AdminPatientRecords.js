import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Chip, Tabs, Tab, Grid, Card, CardContent,
  LinearProgress, Tooltip, Switch, FormControlLabel, Select,
  MenuItem, InputLabel, FormControl, Stack, Divider, CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon, Flag as FlagIcon, Visibility as VisibilityIcon,
  GetApp as DownloadIcon,
  VerifiedUser as VerifiedUserIcon, Warning as WarningIcon,
  Person as PersonIcon, LocalHospital as HospitalIcon,
  Security as LockIcon, Man as ManIcon, Woman as WomanIcon,
} from '@mui/icons-material';
import { getAdminPatients, getAdminPatientById } from '../../services/adminPatientsService';
import { ModernLoadingIndicator } from '../../components/common';
import EllipsisCell from '../../components/common/EllipsisCell';
import EllipsisHeaderCell from '../../components/common/EllipsisHeaderCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
  pageHeaderBoxSx,
} from '../../components/common/adminTableStyles';
import { formatDate } from '../../utils/dateFormatter';

// ── helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return '—';
  const d = new Date(dob);
  if (isNaN(d)) return '—';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function calcCompleteness(p) {
  const checks = [
    !!p.name, !!p.dateOfBirth, !!p.gender,
    !!p.contactInfo?.email, !!p.contactInfo?.phone, !!p.contactInfo?.address,
    !!p.insuranceInfo?.provider,
    Array.isArray(p.medicalHistory) && p.medicalHistory.length > 0,
    Array.isArray(p.medications) && p.medications.length > 0,
    Array.isArray(p.allergies) && p.allergies.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function riskToStatus(score) {
  if (score >= 70) return 'Critical';
  if (score >= 30) return 'Stable';
  return 'Active';
}

function statusColor(status) {
  if (status === 'Critical') return 'error';
  if (status === 'Stable')   return 'info';
  return 'success';
}

// Patient model stores gender as 'male' / 'female' / 'other' (see server/models/Patient.js).
function getGenderInfo(gender) {
  const normalized = (gender || '').trim().toLowerCase();
  if (normalized === 'm' || normalized === 'male') return { label: 'Male', icon: <ManIcon fontSize="small" />, color: 'info.main' };
  if (normalized === 'f' || normalized === 'female') return { label: 'Female', icon: <WomanIcon fontSize="small" />, color: 'secondary.main' };
  if (normalized === 'other') return { label: 'Other', icon: <PersonIcon fontSize="small" />, color: 'text.secondary' };
  return { label: 'Not specified', icon: <PersonIcon fontSize="small" />, color: 'text.disabled' };
}

function hasActiveConsent(consentRecords) {
  if (!Array.isArray(consentRecords) || consentRecords.length === 0) return false;
  return consentRecords.some(r => !r.expiryDate || new Date(r.expiryDate) > new Date());
}

// Map real patient data → display record for the table
function toRecord(p) {
  return {
    id: p._id,
    patientId: p.patientId,
    name: p.name,
    age: calcAge(p.dateOfBirth),
    gender: p.gender,
    condition: p.medicalHistory?.[0]?.condition || '—',
    status: riskToStatus(p.riskScore || 0),
    lastVisit: p.recentVisits?.[0]?.date || null,
    completeness: calcCompleteness(p),
    consentVerified: hasActiveConsent(p.consentRecords),
    riskScore: p.riskScore || 0,
    primaryProvider: p.primaryProviderInfo?.name || p.primaryProvider || '—',
    organization: p.primaryProviderInfo?.organization || '—',
    // keep raw for detail view
    _raw: p,
  };
}

// TabPanel
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPatientRecords() {
  const [records, setRecords]             = useState([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  // Pagination & filters
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(10);
  const [search, setSearch]               = useState('');
  const [riskFilter, setRiskFilter]       = useState('');
  const [tabValue, setTabValue]           = useState(0);
  const [deIdentified, setDeIdentified]   = useState(true);

  // Dialogs
  const [detailOpen, setDetailOpen]       = useState(false);
  const [detailRecord, setDetailRecord]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [flagOpen, setFlagOpen]           = useState(false);
  const [flagTarget, setFlagTarget]       = useState(null);
  const [flagReason, setFlagReason]       = useState('');
  // Client-side flag state (no API backing yet)
  const [flagged, setFlagged]             = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminPatients({
        page,
        limit: rowsPerPage,
        search,
        riskLevel: riskFilter,
      });
      const payload = res?.data || res || {};
      setRecords((payload.patients || []).map(toRecord));
      setTotal(payload.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load patient records');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, riskFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openDetail = async (record) => {
    setDetailOpen(true);
    setDetailRecord(record);
    setDetailLoading(true);
    try {
      const res = await getAdminPatientById(record.patientId);
      const full = res?.data || res;
      setDetailRecord(toRecord(full));
    } catch (_) { /* keep existing record */ }
    finally { setDetailLoading(false); }
  };

  const tabFilter = (rows) => {
    switch (tabValue) {
      case 1: return rows.filter(r => flagged[r.id]);
      case 2: return rows.filter(r => r.completeness < 90);
      case 3: return rows.filter(r => !r.consentVerified);
      default: return rows;
    }
  };

  const displayRows = tabFilter(records);

  const maskId = (id) => deIdentified
    ? `${id.substring(0, 3)}***${id.slice(-2)}`
    : id;

  const handleExport = () => {
    const data = records.map(r => ({
      patientId: r.patientId, age: r.age, gender: r.gender,
      condition: r.condition, status: r.status, lastVisit: r.lastVisit,
      completeness: r.completeness, consentVerified: r.consentVerified,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient_records_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={pageHeaderBoxSx}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>Patient Records Oversight</Typography>
          <Typography variant="body2" color="text.secondary">
            Full access — all patients across all providers. Access is audit-logged.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={<Switch checked={deIdentified} onChange={e => setDeIdentified(e.target.checked)} size="small" />}
            label={<Typography variant="caption">De-identified</Typography>}
          />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport} size="small">
            Export
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small" label="Search patients" variant="outlined" sx={{ flex: 1 }}
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setPage(0); }}
            InputProps={{ endAdornment: <SearchIcon color="action" fontSize="small" /> }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Risk Level</InputLabel>
            <Select value={riskFilter} label="Risk Level" onChange={e => { setRiskFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="high">High (≥70)</MenuItem>
              <MenuItem value="medium">Medium (30–69)</MenuItem>
              <MenuItem value="low">Low (&lt;30)</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {total} total
          </Typography>
        </Stack>
      </Paper>

      {/* Tabs + Table */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="All Records" />
          <Tab label={`Flagged${Object.keys(flagged).length ? ` (${Object.keys(flagged).length})` : ''}`} />
          <Tab label="Incomplete" />
          <Tab label="Missing Consent" />
        </Tabs>
      </Box>

      {[0, 1, 2, 3].map(idx => (
        <TabPanel key={idx} value={tabValue} index={idx}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <ModernLoadingIndicator message="Loading patient records…" />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
              <Table size="small" sx={tableSx}>
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <EllipsisHeaderCell label="Patient ID" sx={{ width: '9%' }} />
                    <EllipsisHeaderCell label="Name" sx={{ width: '15%' }} />
                    <EllipsisHeaderCell label="Age" sx={{ width: '5%' }} />
                    <EllipsisHeaderCell label="Gender" sx={{ width: '7%' }} />
                    <EllipsisHeaderCell label="Primary Condition" sx={{ width: '16%' }} />
                    <EllipsisHeaderCell label="Status" sx={{ width: '8%' }} />
                    <EllipsisHeaderCell label="Last Visit" sx={{ width: '9%' }} />
                    <EllipsisHeaderCell label="Provider" sx={{ width: '11%' }} />
                    <EllipsisHeaderCell label="Completeness" sx={{ width: '11%' }} />
                    <EllipsisHeaderCell label="Consent" sx={{ width: '9%' }} />
                    <EllipsisHeaderCell label="Actions" sx={{ width: '48px' }} align="center" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No patient records found
                      </TableCell>
                    </TableRow>
                  ) : displayRows.map(record => (
                    <TableRow key={record.id} hover sx={tableBodyRowSx}>
                      <TableCell sx={{ width: '9%', fontFamily: 'monospace', fontSize: 12 }}>
                        {maskId(record.patientId)}
                      </TableCell>
                      <TableCell sx={{ width: '15%' }}>
                        <EllipsisCell value={deIdentified ? '— hidden —' : record.name} />
                      </TableCell>
                      <TableCell sx={{ width: '5%' }}>{record.age}</TableCell>
                      <TableCell sx={{ width: '7%' }}>
                        <Tooltip title={getGenderInfo(record.gender).label} placement="top">
                          <Box sx={{ display: 'flex', color: getGenderInfo(record.gender).color }}>
                            {getGenderInfo(record.gender).icon}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ width: '16%' }}><EllipsisCell value={record.condition} /></TableCell>
                      <TableCell sx={{ width: '8%' }}>
                        <Chip label={record.status} color={statusColor(record.status)} size="small" sx={compactChipSx} />
                      </TableCell>
                      <TableCell sx={{ width: '9%' }}>{formatDate(record.lastVisit)}</TableCell>
                      <TableCell sx={{ width: '11%' }}>
                        <EllipsisCell value={record.primaryProvider} variant="caption" />
                      </TableCell>
                      <TableCell sx={{ width: '11%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={record.completeness}
                            color={record.completeness < 80 ? 'warning' : 'success'}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">{record.completeness}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ width: '9%' }}>
                        {record.consentVerified ? (
                          <Tooltip title="Has active consent record">
                            <Chip icon={<VerifiedUserIcon />} label="Active" color="success" size="small" sx={compactChipSx} />
                          </Tooltip>
                        ) : (
                          <Tooltip title="No active consent record">
                            <Chip icon={<WarningIcon />} label="None" color="error" size="small" sx={compactChipSx} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell sx={{ width: '48px' }} align="center">
                        <Tooltip title="View details">
                          <IconButton size="small" color="primary" onClick={() => openDetail(record)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={flagged[record.id] ? 'Remove flag' : 'Flag record'}>
                          <IconButton
                            size="small"
                            color={flagged[record.id] ? 'error' : 'default'}
                            onClick={() => {
                              if (flagged[record.id]) {
                                setFlagged(f => { const n = { ...f }; delete n[record.id]; return n; });
                              } else {
                                setFlagTarget(record);
                                setFlagReason('');
                                setFlagOpen(true);
                              }
                            }}
                          >
                            <FlagIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      ))}

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
      />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          Patient Record — {detailRecord?.patientId}
          {detailLoading && <CircularProgress size={18} sx={{ ml: 1 }} />}
        </DialogTitle>
        <DialogContent dividers>
          {detailRecord && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Demographics</Typography>
                    <Divider sx={{ mb: 1 }} />
                    {[
                      ['Name', deIdentified ? '— hidden —' : detailRecord._raw?.name],
                      ['Age', detailRecord.age],
                      ['Gender', detailRecord.gender],
                      ['DOB', formatDate(detailRecord._raw?.dateOfBirth)],
                      ['Email', deIdentified ? '— hidden —' : detailRecord._raw?.contactInfo?.email],
                      ['Phone', deIdentified ? '— hidden —' : detailRecord._raw?.contactInfo?.phone],
                      ['Address', deIdentified ? '— hidden —' : detailRecord._raw?.contactInfo?.address],
                    ].map(([k, v]) => (
                      <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80 }}>{k}:</Typography>
                        {k === 'Gender' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: getGenderInfo(detailRecord.gender).color }}>
                            {getGenderInfo(detailRecord.gender).icon}
                            <Typography variant="body2">{getGenderInfo(detailRecord.gender).label}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">{v || '—'}</Typography>
                        )}
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      <HospitalIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      Provider & Insurance
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    {[
                      ['Provider', detailRecord.primaryProvider],
                      ['Organization', detailRecord.organization],
                      ['Insurance', detailRecord._raw?.insuranceInfo?.provider],
                      ['Policy #', detailRecord._raw?.insuranceInfo?.policyNumber],
                      ['Risk Score', detailRecord.riskScore],
                      ['Status', detailRecord.status],
                    ].map(([k, v]) => (
                      <Box key={k} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 100 }}>{k}:</Typography>
                        <Typography variant="body2" color="text.secondary">{v || '—'}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Medical History</Typography>
                    <Divider sx={{ mb: 1 }} />
                    {detailRecord._raw?.medicalHistory?.length ? detailRecord._raw.medicalHistory.map((h, i) => (
                      <Box key={i} sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{h.condition}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Diagnosed: {formatDate(h.diagnosedDate)} — {h.notes}
                        </Typography>
                      </Box>
                    )) : <Typography variant="body2" color="text.secondary">None recorded</Typography>}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      <LockIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      Consent Records
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    {detailRecord._raw?.consentRecords?.length ? detailRecord._raw.consentRecords.map((c, i) => {
                      const expired = c.expiryDate && new Date(c.expiryDate) < new Date();
                      return (
                        <Box key={i} sx={{ mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={c.accessLevel} size="small" color={expired ? 'default' : 'success'} />
                            <Chip label={expired ? 'Expired' : 'Active'} size="small" variant="outlined" color={expired ? 'error' : 'success'} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Provider: {c.providerId} · Granted: {formatDate(c.consentDate)}
                            {c.expiryDate ? ` · Expires: ${formatDate(c.expiryDate)}` : ''}
                          </Typography>
                        </Box>
                      );
                    }) : <Typography variant="body2" color="text.secondary">No consent records</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={flagOpen} onClose={() => setFlagOpen(false)}>
        <DialogTitle>Flag Patient Record</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Flagging: <strong>{flagTarget?.patientId}</strong>
          </Typography>
          <TextField
            fullWidth multiline rows={3} label="Reason for flagging"
            value={flagReason} onChange={e => setFlagReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlagOpen(false)}>Cancel</Button>
          <Button
            variant="contained" color="warning"
            onClick={() => {
              if (flagTarget) setFlagged(f => ({ ...f, [flagTarget.id]: flagReason }));
              setFlagOpen(false);
            }}
          >
            Flag Record
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
