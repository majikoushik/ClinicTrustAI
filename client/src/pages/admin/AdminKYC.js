import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, TablePagination, Chip, IconButton,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab,
  Alert, Snackbar, Tooltip, Divider, Avatar, Switch, FormControlLabel,
  Autocomplete, Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Visibility as ViewIcon,
  CheckCircle as ApproveIcon, Cancel as RejectIcon, Download as DownloadIcon,
  Schedule as PendingIcon, VerifiedUser as VerifiedIcon, Person as PersonIcon,
  Business as OrgIcon, Phone as PhoneIcon, LocationOn as LocationIcon,
  AssignmentInd as LicenseIcon, Close as CloseIcon,
  Edit as EditIcon, Print as FaxIcon, Badge as BadgeIcon,
  DeleteOutline as DeleteIcon, WarningAmber as WarnIcon,
  ForwardToInbox as ResendEmailIcon, MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { get, post, patch, del } from '../../utils/apiUtils';
import { authStorage } from '../../utils/storageUtils';
import { formatDate } from '../../utils/dateFormatter';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';

const _RAW = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE = _RAW.replace(/\/api$/, '');

/* ── Static reference data (mirrors OnboardingProfileSetup) ─────────────── */

const SPECIALTIES = [
  'Allergy & Immunology','Anesthesiology','Cardiology','Cardiovascular Surgery',
  'Clinical Genetics','Colon & Rectal Surgery','Critical Care Medicine',
  'Dermatology','Emergency Medicine','Endocrinology','Family Medicine',
  'Gastroenterology','General Surgery','Geriatrics','Hematology',
  'Hematology / Oncology','Hospice & Palliative Medicine','Hospitalist',
  'Infectious Disease','Internal Medicine','Interventional Radiology',
  'Medical Oncology','Neonatal-Perinatal Medicine','Nephrology',
  'Neurological Surgery','Neurology','Nuclear Medicine','Obstetrics & Gynecology',
  'Occupational Medicine','Ophthalmology','Oral & Maxillofacial Surgery',
  'Orthopedic Surgery','Otolaryngology (ENT)','Pain Management',
  'Pathology','Pediatric Surgery','Pediatrics','Physical Medicine & Rehabilitation',
  'Plastic Surgery','Podiatry','Pharmacist','Preventive Medicine','Psychiatry','Psychology',
  'Pulmonology','Radiation Oncology','Radiology','Rheumatology',
  'Sleep Medicine','Sports Medicine','Thoracic Surgery','Transplant Surgery',
  'Urology','Vascular Surgery','Wound Care',
];

const AGE_GROUPS = [
  'Neonatal (0–30 days)', 'Infant (1–12 months)', 'Pediatric (1–12 yrs)',
  'Adolescent (13–17 yrs)', 'Adult (18–64 yrs)', 'Geriatric (65+)',
];

const LANGUAGES = [
  'English','Spanish','Mandarin','Cantonese','French','Hindi','Portuguese',
  'Arabic','Russian','Tagalog','Vietnamese','Korean','German','Italian',
  'Japanese','Polish','Urdu','Bengali','Punjabi','Persian',
];

const INSURANCE_PLANS = [
  'Medicare','Medicaid','Medicare Advantage','Tricare',
  'Blue Cross Blue Shield','Aetna','Cigna','United Healthcare',
  'Humana','Kaiser Permanente','Anthem','Centene','Molina Healthcare',
  'WellCare','Oscar Health','Bright Health','Self-Pay / Uninsured',
  'Workers Compensation','No Fault / Auto',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: '',  label: 'Prefer not to say' },
];

/* ── KYC config ─────────────────────────────────────────────────────────── */

const KYC_STATUS = {
  pending_email:      { label: 'Email Unverified',    color: 'default' },
  profile_incomplete: { label: 'Profile Incomplete',  color: 'warning' },
  doc_pending:        { label: 'Doc Pending',          color: 'warning' },
  under_review:       { label: 'Under Review',         color: 'info' },
  verified:           { label: 'Verified',             color: 'success' },
  rejected:           { label: 'Rejected',             color: 'error' },
};

const EDITABLE_STATUSES = ['pending_email', 'profile_incomplete', 'doc_pending', 'under_review', 'verified', 'rejected'];
const STATUS_TABS = ['all', 'profile_incomplete', 'doc_pending', 'under_review', 'verified', 'rejected'];

const initials = name => (name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const avatarColor = name => ['#1565c0','#2e7d32','#6a1b9a','#c62828','#0277bd'][(name || '').charCodeAt(0) % 5];
const genderLabel = g => g === 'M' ? 'Male' : g === 'F' ? 'Female' : (g || '—');

const EDIT_FORM_INIT = {
  kycStatus: '', rejectionReason: '',
  credential: '', gender: '', organizationName: '', specialties: [],
  phone: '', fax: '',
  address: { line1: '', line2: '', city: '', state: '', zip: '' },
  licenseNumber: '', licenseState: '', deaNumber: '',
  acceptingNewPatients: true, telehealthAvailable: false,
  ageGroupsTreated: [], languagesSpoken: [], insuranceAccepted: [],
  conditionsTreated: [], boardCertifications: [], hospitalAffiliations: [],
};

/* ── Chip-input: free-text tags ──────────────────────────────────────────── */
function ChipInput({ label, value = [], onChange }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  };
  return (
    <Box>
      <Box display="flex" gap={1} mb={0.75}>
        <TextField size="small" fullWidth label={label} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Type and press Enter or Add" />
        <Button variant="outlined" size="small" onClick={add} sx={{ minWidth: 56, whiteSpace: 'nowrap' }}>Add</Button>
      </Box>
      <Box display="flex" flexWrap="wrap" gap={0.5}>
        {value.map(v => (
          <Chip key={v} label={v} size="small" onDelete={() => onChange(value.filter(x => x !== v))}
            sx={{ bgcolor: '#f1f5f9' }} />
        ))}
      </Box>
    </Box>
  );
}

/* ── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon }) {
  return (
    <Paper elevation={1} sx={{ p: 2.5, textAlign: 'center' }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h4" fontWeight={800} color={color}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

/* ── Section label ───────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" fontWeight={700}
      textTransform="uppercase" letterSpacing={0.5} display="block" mb={1.5} mt={0.5}>
      {children}
    </Typography>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function AdminKYC() {
  const [profiles, setProfiles] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pendingDocs: 0, underReview: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actioning, setActioning] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editTabIndex, setEditTabIndex] = useState(0);
  const [editForm, setEditForm] = useState(EDIT_FORM_INIT);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Approve confirmation dialog
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);

  // Reject confirmation dialog
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Admin resend verification email
  const [resending, setResending] = useState(false);

  // Row action menu (kebab) — consolidates the row's icon buttons into one menu
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuProfile, setActionMenuProfile] = useState(null);
  const openActionMenu = (event, profile) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuProfile(profile);
  };
  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuProfile(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = STATUS_TABS[tabIndex];
      const params = status !== 'all' ? { status } : {};
      const data = await get('/admin/kyc', params);
      if (data.success) { setProfiles(data.data || []); setMeta(data.meta || {}); }
    } catch (e) {
      showSnack('Failed to load KYC data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tabIndex]);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (profileId, status) => {
    setActioning(true);
    try {
      await patch(`/admin/kyc/${profileId}`, { status, rejectionReason: status === 'rejected' ? rejectionReason : '' });
      showSnack(`Provider ${status === 'verified' ? 'approved' : 'rejected'} successfully.`);
      setDialogOpen(false);
      setRejectionReason('');
      load();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Action failed', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleDownloadDoc = (profileId) => {
    const raw = authStorage.get('token', false) || '';
    const token = raw.replace(/^"|"$/g, '');
    window.open(`${API_BASE}/api/admin/kyc/${profileId}/document?token=${token}`, '_blank');
  };

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const handleDeleteClick = (p, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget(p);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await del(`/admin/kyc/${deleteTarget._id}`);
      showSnack(`Provider "${deleteTarget.user?.name || deleteTarget.user?.email || 'Unknown'}" deleted.`);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      load();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveClick = (p, e) => {
    if (e) e.stopPropagation();
    setApproveTarget(p);
    setApproveConfirmOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    await handleDecision(approveTarget._id, 'verified');
    setApproveConfirmOpen(false);
    setApproveTarget(null);
  };

  const handleRejectClick = (p, e) => {
    if (e) e.stopPropagation();
    setRejectTarget(p);
    setRejectReason('');
    setRejectConfirmOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActioning(true);
    try {
      await patch(`/admin/kyc/${rejectTarget._id}`, { status: 'rejected', rejectionReason: rejectReason });
      showSnack('Provider rejected.');
      setRejectConfirmOpen(false);
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Action failed', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleAdminResend = async () => {
    if (!selected) return;
    setResending(true);
    try {
      await post(`/admin/kyc/${selected._id}/resend-verification`, {});
      showSnack(`Verification email resent to ${selected.user?.email}`);
    } catch (e) {
      showSnack(e.response?.data?.error || 'Failed to resend verification email', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleEditOpen = (p, e) => {
    if (e) e.stopPropagation();
    setEditTarget(p);
    setEditTabIndex(0);
    setEditForm({
      kycStatus:           p.kycStatus || '',
      rejectionReason:     p.kycRejectionReason || '',
      credential:          p.credential || '',
      gender:              p.gender || '',
      organizationName:    p.organizationName || '',
      specialties:         p.specialties?.length ? p.specialties : (p.specialty ? [p.specialty] : []),
      phone:               p.phone || '',
      fax:                 p.fax || '',
      address: {
        line1: p.address?.line1 || '',
        line2: p.address?.line2 || '',
        city:  p.address?.city  || '',
        state: p.address?.state || '',
        zip:   p.address?.zip   || '',
      },
      licenseNumber:        p.licenseNumber        || '',
      licenseState:         p.licenseState         || '',
      deaNumber:            p.deaNumber            || '',
      acceptingNewPatients: p.acceptingNewPatients ?? true,
      telehealthAvailable:  p.telehealthAvailable  ?? false,
      ageGroupsTreated:     p.ageGroupsTreated     || [],
      languagesSpoken:      p.languagesSpoken       || [],
      insuranceAccepted:    p.insuranceAccepted     || [],
      conditionsTreated:    p.conditionsTreated     || [],
      boardCertifications:  p.boardCertifications  || [],
      hospitalAffiliations: p.hospitalAffiliations || [],
    });
    setEditDialogOpen(true);
  };

  const setEF = (field, value) => setEditForm(prev => ({ ...prev, [field]: value }));
  const setEFAddr = (field, value) => setEditForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const { kycStatus, rejectionReason: rejReason, ...profileFields } = editForm;
      // Save all profile fields
      await patch(`/admin/kyc/${editTarget._id}/profile`, profileFields);
      // Change status only if it changed
      if (kycStatus !== editTarget.kycStatus) {
        await patch(`/admin/kyc/${editTarget._id}`, {
          status: kycStatus,
          rejectionReason: kycStatus === 'rejected' ? rejReason : '',
        });
      }
      showSnack('Provider profile updated successfully.');
      setEditDialogOpen(false);
      load();
    } catch (e) {
      showSnack(e.message || 'Failed to update profile', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // Percentages sum to 100% — actions column uses a small fixed px width instead.
  const COLUMN_WIDTHS = {
    provider: '22%', organization: '17%', npi: '11%', specialty: '16%',
    license: '12%', submitted: '11%', status: '11%', actions: '48px',
  };

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.user?.name || '').toLowerCase().includes(q) ||
      (p.user?.email || '').toLowerCase().includes(q) ||
      (p.npi || '').includes(q) ||
      (p.user?.organization || '').toLowerCase().includes(q)
    );
  });
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl">
      <Box py={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Provider KYC Verification</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Review and approve provider identity verification documents
            </Typography>
          </Box>
          <Tooltip title="Refresh"><IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
        </Box>

        {/* Stats */}
        <Grid container spacing={2.5} mb={4}>
          {[
            { label: 'Total Providers', value: meta.total || profiles.length, color: 'text.primary', icon: <PersonIcon sx={{ fontSize: 32 }} /> },
            { label: 'Docs Required',   value: meta.pendingDocs || 0,         color: '#ed6c02',      icon: <PendingIcon sx={{ fontSize: 32 }} /> },
            { label: 'Under Review',    value: meta.underReview || 0,         color: '#0288d1',      icon: <VerifiedIcon sx={{ fontSize: 32 }} /> },
            { label: 'Verified',        value: meta.verified || 0,            color: '#2e7d32',      icon: <ApproveIcon sx={{ fontSize: 32 }} /> },
            { label: 'Rejected',        value: meta.rejected || 0,            color: '#c62828',      icon: <RejectIcon sx={{ fontSize: 32 }} /> },
          ].map((s, i) => (
            <Grid item xs={6} sm={4} md key={i}><StatCard {...s} /></Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
            <Tabs value={tabIndex} onChange={(_, v) => { setTabIndex(v); setPage(0); }}
              sx={{ '& .MuiTab-root': { minHeight: 36, py: 0.5, textTransform: 'none', fontWeight: 600 } }}>
              {['All','Profile Incomplete','Doc Pending','Under Review','Verified','Rejected'].map(label => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
            <Box flex={1} />
            <TextField size="small" placeholder="Search name, email, NPI…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ width: 260 }} />
          </Box>
        </Paper>

        {loading ? (
          <Box py={8} textAlign="center"><Typography color="text.secondary">Loading…</Typography></Box>
        ) : filtered.length === 0 ? (
          <Box py={8} textAlign="center">
            <VerifiedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No providers match your filters.</Typography>
          </Box>
        ) : (
          <Paper elevation={1}>
            <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
              <Table size="small" sx={tableSx}>
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ width: COLUMN_WIDTHS.provider }}>Provider</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.organization }}>Organization</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.npi }}>NPI</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.specialty }}>Specialty</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.license }}>License #</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.submitted }}>Submitted</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.status }}>KYC Status</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.actions }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map(p => {
                    const sta = KYC_STATUS[p.kycStatus] || KYC_STATUS.profile_incomplete;
                    const name = p.user?.name || 'Unknown';
                    const isReviewable = p.kycStatus === 'under_review';
                    return (
                      <TableRow key={p._id} hover
                        onClick={() => { setSelected(p); setDialogOpen(true); }}
                        sx={{ ...tableBodyRowSx, cursor: 'pointer', bgcolor: isReviewable ? 'info.50' : 'inherit' }}>
                        <TableCell sx={{ width: COLUMN_WIDTHS.provider }}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ bgcolor: avatarColor(name), width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{initials(name)}</Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <EllipsisCell value={name} variant="body2" sx={{ fontWeight: 600 }} />
                              <EllipsisCell value={p.user?.email} variant="caption" sx={{ color: 'text.secondary', display: 'block' }} />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ width: COLUMN_WIDTHS.organization }}><EllipsisCell value={p.user?.organization} /></TableCell>
                        <TableCell sx={{ width: COLUMN_WIDTHS.npi }}><Typography variant="body2" fontFamily="monospace" noWrap>{p.npi || '—'}</Typography></TableCell>
                        <TableCell sx={{ width: COLUMN_WIDTHS.specialty }}><EllipsisCell value={p.specialty} /></TableCell>
                        <TableCell sx={{ width: COLUMN_WIDTHS.license }}><EllipsisCell value={p.licenseNumber} /></TableCell>
                        <TableCell sx={{ width: COLUMN_WIDTHS.submitted }}><Typography variant="caption" color="text.secondary">{formatDate(p.createdAt)}</Typography></TableCell>
                        <TableCell sx={{ width: COLUMN_WIDTHS.status }}>
                          <Chip label={sta.label} color={sta.color} size="small" variant={isReviewable ? 'filled' : 'outlined'} sx={compactChipSx} />
                        </TableCell>
                        <TableCell sx={{ width: COLUMN_WIDTHS.actions }} align="center" onClick={e => e.stopPropagation()}>
                          <IconButton size="small" onClick={(e) => openActionMenu(e, p)}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[10, 25, 50]}
              onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }} />
          </Paper>
        )}
      </Box>

      {/* ── Row action menu (kebab) ─────────────────────────────────────────── */}
      {actionMenuProfile && (() => {
        const p = actionMenuProfile;
        const isVerified = p.kycStatus === 'verified';
        const isReviewable = p.kycStatus === 'under_review';
        const runAction = (fn) => { closeActionMenu(); fn(); };
        return (
          <Menu
            anchorEl={actionMenuAnchorEl}
            open={Boolean(actionMenuAnchorEl)}
            onClose={closeActionMenu}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => runAction(() => { setSelected(p); setDialogOpen(true); })}>
              <ListItemIcon><ViewIcon fontSize="small" color="primary" /></ListItemIcon>
              <ListItemText>View details</ListItemText>
            </MenuItem>
            {p.kycDocumentPath && (
              <MenuItem onClick={() => runAction(() => handleDownloadDoc(p._id))}>
                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Download document</ListItemText>
              </MenuItem>
            )}
            {!isVerified && (
              <MenuItem onClick={() => runAction(() => handleEditOpen(p, null))}>
                <ListItemIcon><EditIcon fontSize="small" color="primary" /></ListItemIcon>
                <ListItemText>Edit profile</ListItemText>
              </MenuItem>
            )}
            {isReviewable && [
              <MenuItem key="approve" onClick={() => runAction(() => handleApproveClick(p, null))}>
                <ListItemIcon><ApproveIcon fontSize="small" color="success" /></ListItemIcon>
                <ListItemText>Approve</ListItemText>
              </MenuItem>,
              <MenuItem key="reject" onClick={() => runAction(() => handleRejectClick(p, null))}>
                <ListItemIcon><RejectIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Reject</ListItemText>
              </MenuItem>,
            ]}
            <Divider />
            <MenuItem onClick={() => runAction(() => handleDeleteClick(p, null))}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Delete provider</ListItemText>
            </MenuItem>
          </Menu>
        );
      })()}

      {/* ── View / Decision Dialog ────────────────────────────────────────── */}
      {selected && (
        <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setRejectionReason(''); }} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
            <Avatar sx={{ bgcolor: avatarColor(selected.user?.name || ''), width: 40, height: 40 }}>
              {initials(selected.user?.name || '')}
            </Avatar>
            <Box flex={1}>
              <Typography fontWeight={700}>{selected.user?.name || 'Provider'}</Typography>
              <Typography variant="caption" color="text.secondary">{selected.user?.email}</Typography>
            </Box>
            <Chip label={KYC_STATUS[selected.kycStatus]?.label} color={KYC_STATUS[selected.kycStatus]?.color} size="small" />
            <IconButton onClick={() => setDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>

            {/* Identity & professional */}
            <SectionLabel>Identity &amp; Professional</SectionLabel>
            <Grid container spacing={2} mb={2}>
              {[
                selected.npi         && { icon: <LicenseIcon />, label: 'NPI',          val: selected.npi,        mono: true },
                selected.credential  && { icon: <BadgeIcon />,   label: 'Credential',   val: selected.credential },
                selected.gender      && { icon: <PersonIcon />,  label: 'Gender',       val: genderLabel(selected.gender) },
                selected.user?.organization && { icon: <OrgIcon />, label: 'Organization', val: selected.user.organization },
                selected.organizationName && { icon: <OrgIcon />, label: 'Practice / Clinic', val: selected.organizationName },
              ].filter(Boolean).map(({ icon, label, val, mono }) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <Box sx={{ color: 'text.secondary', mt: 0.25 }}>{icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" fontWeight={600} fontFamily={mono ? 'monospace' : undefined}>{val}</Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Specialties */}
            {(selected.specialties?.length || selected.specialty) && (
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>Specialties</Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {(selected.specialties?.length ? selected.specialties : [selected.specialty]).map(s => (
                    <Chip key={s} label={s} size="small" sx={{ bgcolor: '#ede9fe', color: '#5b21b6', fontWeight: 600 }} />
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Contact */}
            <SectionLabel>Contact Information</SectionLabel>
            <Grid container spacing={2} mb={2}>
              {selected.phone && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Phone</Typography>
                      <Typography variant="body2" fontWeight={600}>{selected.phone}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              {selected.fax && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <FaxIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Fax</Typography>
                      <Typography variant="body2" fontWeight={600}>{selected.fax}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              {(selected.address?.line1 || selected.address?.city) && (
                <Grid item xs={12}>
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <LocationIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Address</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {[selected.address?.line1, selected.address?.line2].filter(Boolean).join(', ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[selected.address?.city, selected.address?.state, selected.address?.zip].filter(Boolean).join(', ')}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* License */}
            <SectionLabel>License &amp; Credentials</SectionLabel>
            <Grid container spacing={2} mb={2}>
              {[
                selected.licenseNumber && { icon: <LicenseIcon />, label: 'License Number', val: `${selected.licenseNumber}${selected.licenseState ? ` (${selected.licenseState})` : ''}` },
                selected.deaNumber     && { icon: <LicenseIcon />, label: 'DEA Number',     val: selected.deaNumber },
              ].filter(Boolean).map(({ icon, label, val }) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <Box sx={{ color: 'text.secondary', mt: 0.25 }}>{icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" fontWeight={600}>{val}</Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Referral & practice */}
            <SectionLabel>Referral &amp; Practice Details</SectionLabel>
            <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
              <Chip size="small"
                label={selected.acceptingNewPatients !== false ? '✓ Accepting New Patients' : '✗ Not Accepting New Patients'}
                color={selected.acceptingNewPatients !== false ? 'success' : 'default'} />
              <Chip size="small"
                label={selected.telehealthAvailable ? '✓ Telehealth Available' : '✗ No Telehealth'}
                color={selected.telehealthAvailable ? 'primary' : 'default'} variant="outlined" />
            </Box>
            {[
              { label: 'Age Groups',           items: selected.ageGroupsTreated,    bg: '#e0f2fe', fg: '#0369a1' },
              { label: 'Languages Spoken',     items: selected.languagesSpoken,     bg: '#f0fdf4', fg: '#166534' },
              { label: 'Insurance Accepted',   items: selected.insuranceAccepted,   bg: '#f0fdf4', fg: '#166534' },
              { label: 'Conditions Treated',   items: selected.conditionsTreated,   bg: '#fef9c3', fg: '#854d0e' },
              { label: 'Board Certifications', items: selected.boardCertifications, bg: '#f1f5f9', fg: '#334155' },
              { label: 'Hospital Affiliations',items: selected.hospitalAffiliations,bg: '#f1f5f9', fg: '#334155' },
            ].filter(r => r.items?.length).map(({ label, items, bg, fg }) => (
              <Box key={label} mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {items.map(i => <Chip key={i} label={i} size="small" sx={{ bgcolor: bg, color: fg }} />)}
                </Box>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* Document */}
            {selected.kycDocumentPath ? (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <DownloadIcon color="primary" />
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={600}>Verification Document</Typography>
                  <Typography variant="caption" color="text.secondary">{selected.kycDocumentOriginalName || 'document'}</Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={() => handleDownloadDoc(selected._id)}>Download</Button>
              </Paper>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>No document uploaded yet.</Alert>
            )}

            {selected.kycStatus === 'rejected' && selected.kycRejectionReason && (
              <Alert severity="error" sx={{ mb: 2 }}><strong>Rejection reason:</strong> {selected.kycRejectionReason}</Alert>
            )}
            {selected.kycStatus === 'pending_email' && (
              <Alert severity="warning" icon={<ResendEmailIcon />} sx={{ mb: 2 }}>
                This provider has not yet verified their email address.
                Use the <strong>Resend Verification Email</strong> button below to send a new link.
              </Alert>
            )}
            {selected.kycStatus === 'under_review' && (
              <TextField fullWidth multiline rows={2} label="Rejection reason (if rejecting)"
                value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                placeholder="Explain why this provider is being rejected (optional but recommended)…" />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button onClick={() => { setDialogOpen(false); setRejectionReason(''); }}>Close</Button>
            <Box flex={1} />
            {selected.kycStatus === 'pending_email' && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<ResendEmailIcon />}
                disabled={resending}
                onClick={handleAdminResend}
              >
                {resending ? 'Sending…' : 'Resend Verification Email'}
              </Button>
            )}
            {selected.kycStatus !== 'verified' && selected.kycStatus !== 'pending_email' && (
              <Button variant="outlined" startIcon={<EditIcon />}
                onClick={() => { setDialogOpen(false); handleEditOpen(selected, null); }}>
                Edit Profile
              </Button>
            )}
            {selected.kycStatus === 'under_review' && (
              <>
                <Button variant="outlined" color="error" disabled={actioning}
                  onClick={() => handleDecision(selected._id, 'rejected')}
                  startIcon={<RejectIcon />}>Reject</Button>
                <Button variant="contained" color="success" disabled={actioning}
                  onClick={() => handleDecision(selected._id, 'verified')}
                  startIcon={<ApproveIcon />}>Approve</Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* ── Edit Profile Dialog ───────────────────────────────────────────── */}
      {editTarget && (
        <Dialog open={editDialogOpen} onClose={() => !editSaving && setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
            <Avatar sx={{ bgcolor: avatarColor(editTarget.user?.name || ''), width: 40, height: 40 }}>
              {initials(editTarget.user?.name || '')}
            </Avatar>
            <Box flex={1}>
              <Typography fontWeight={700}>Edit Provider Profile</Typography>
              <Typography variant="caption" color="text.secondary">
                {editTarget.user?.name} — {editTarget.user?.email}
              </Typography>
            </Box>
            <IconButton onClick={() => setEditDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }} disabled={editSaving}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <Divider />

          {/* Edit tabs */}
          <Tabs value={editTabIndex} onChange={(_, v) => setEditTabIndex(v)} variant="scrollable" scrollButtons="auto"
            sx={{ px: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44 } }}>
            <Tab label="Professional" />
            <Tab label="Practice & Referral" />
            <Tab label="Contact" />
            <Tab label="License" />
            <Tab label="KYC Status" />
          </Tabs>

          <DialogContent sx={{ pt: 3, minHeight: 420 }}>

            {/* ── Tab 0: Professional ── */}
            {editTabIndex === 0 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <Autocomplete multiple freeSolo
                    options={SPECIALTIES}
                    value={editForm.specialties}
                    onChange={(_, v) => setEF('specialties', v)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option} size="small" {...getTagProps({ index })}
                          sx={{ bgcolor: '#ede9fe', color: '#5b21b6' }} />
                      ))
                    }
                    renderInput={params => <TextField {...params} label="Specialties *" placeholder="Add specialty…" />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Credential" value={editForm.credential}
                    onChange={e => setEF('credential', e.target.value)}
                    placeholder="e.g. MD, DO, NP, PA, RPH" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select value={editForm.gender} label="Gender" onChange={e => setEF('gender', e.target.value)}>
                      {GENDER_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Practice / Clinic Name" value={editForm.organizationName}
                    onChange={e => setEF('organizationName', e.target.value)}
                    placeholder="e.g. City Medical Center" />
                </Grid>
              </Grid>
            )}

            {/* ── Tab 1: Practice & Referral ── */}
            {editTabIndex === 1 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Switch checked={editForm.acceptingNewPatients} onChange={e => setEF('acceptingNewPatients', e.target.checked)} color="success" />}
                    label="Accepting New Patients"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Switch checked={editForm.telehealthAvailable} onChange={e => setEF('telehealthAvailable', e.target.checked)} color="primary" />}
                    label="Telehealth Available"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                    Age Groups Treated
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.75}>
                    {AGE_GROUPS.map(ag => {
                      const sel = editForm.ageGroupsTreated.includes(ag);
                      return (
                        <Chip key={ag} label={ag} size="small" clickable
                          onClick={() => setEF('ageGroupsTreated', sel
                            ? editForm.ageGroupsTreated.filter(x => x !== ag)
                            : [...editForm.ageGroupsTreated, ag])}
                          sx={{ bgcolor: sel ? '#0369a1' : '#e0f2fe', color: sel ? '#fff' : '#0369a1', fontWeight: sel ? 700 : 400 }} />
                      );
                    })}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete multiple
                    options={LANGUAGES}
                    value={editForm.languagesSpoken}
                    onChange={(_, v) => setEF('languagesSpoken', v)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option} size="small" {...getTagProps({ index })} sx={{ bgcolor: '#f0fdf4', color: '#166534' }} />
                      ))
                    }
                    renderInput={params => <TextField {...params} label="Languages Spoken" placeholder="Select languages…" />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete multiple
                    options={INSURANCE_PLANS}
                    value={editForm.insuranceAccepted}
                    onChange={(_, v) => setEF('insuranceAccepted', v)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option} size="small" {...getTagProps({ index })} sx={{ bgcolor: '#f0fdf4', color: '#166534' }} />
                      ))
                    }
                    renderInput={params => <TextField {...params} label="Insurance Accepted" placeholder="Select plans…" />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <ChipInput label="Conditions Treated" value={editForm.conditionsTreated}
                    onChange={v => setEF('conditionsTreated', v)} />
                </Grid>
                <Grid item xs={12}>
                  <ChipInput label="Board Certifications" value={editForm.boardCertifications}
                    onChange={v => setEF('boardCertifications', v)} />
                </Grid>
                <Grid item xs={12}>
                  <ChipInput label="Hospital Affiliations" value={editForm.hospitalAffiliations}
                    onChange={v => setEF('hospitalAffiliations', v)} />
                </Grid>
              </Grid>
            )}

            {/* ── Tab 2: Contact ── */}
            {editTabIndex === 2 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone *" value={editForm.phone}
                    onChange={e => setEF('phone', e.target.value)} placeholder="e.g. 515-296-1301" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Fax" value={editForm.fax}
                    onChange={e => setEF('fax', e.target.value)} placeholder="e.g. 515-292-0000" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Address Line 1" value={editForm.address.line1}
                    onChange={e => setEFAddr('line1', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Address Line 2" value={editForm.address.line2}
                    onChange={e => setEFAddr('line2', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth label="City" value={editForm.address.city}
                    onChange={e => setEFAddr('city', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>State</InputLabel>
                    <Select value={editForm.address.state} label="State" onChange={e => setEFAddr('state', e.target.value)}>
                      {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="ZIP" value={editForm.address.zip}
                    onChange={e => setEFAddr('zip', e.target.value)} inputProps={{ maxLength: 10 }} />
                </Grid>
              </Grid>
            )}

            {/* ── Tab 3: License ── */}
            {editTabIndex === 3 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="License Number" value={editForm.licenseNumber}
                    onChange={e => setEF('licenseNumber', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>License State</InputLabel>
                    <Select value={editForm.licenseState} label="License State" onChange={e => setEF('licenseState', e.target.value)}>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="DEA Number" value={editForm.deaNumber}
                    onChange={e => setEF('deaNumber', e.target.value)} />
                </Grid>
              </Grid>
            )}

            {/* ── Tab 4: KYC Status ── */}
            {editTabIndex === 4 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>KYC Status</InputLabel>
                    <Select value={editForm.kycStatus} label="KYC Status" onChange={e => setEF('kycStatus', e.target.value)}>
                      {EDITABLE_STATUSES.map(s => (
                        <MenuItem key={s} value={s}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip label={KYC_STATUS[s]?.label} color={KYC_STATUS[s]?.color} size="small" />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {editForm.kycStatus === 'rejected' && (
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={3} label="Rejection Reason"
                      value={editForm.rejectionReason}
                      onChange={e => setEF('rejectionReason', e.target.value)}
                      placeholder="Explain why this provider is being rejected…" />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Changing the status to <strong>Verified</strong> or <strong>Rejected</strong> will send a notification email to the provider.
                  </Alert>
                </Grid>
              </Grid>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button onClick={() => setEditDialogOpen(false)} disabled={editSaving}>Cancel</Button>
            <Box flex={1} />
            <Button variant="contained" onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>

      {/* ── Approve Confirmation Dialog ──────────────────────────────────── */}
      <Dialog
        open={approveConfirmOpen}
        onClose={() => { if (!actioning) { setApproveConfirmOpen(false); setApproveTarget(null); } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <ApproveIcon color="success" />
          Approve Provider?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={1}>
            You are about to approve:
          </Typography>
          <Typography variant="body2" fontWeight={700} mb={2}>
            {approveTarget?.user?.name || 'Unknown'} &mdash; {approveTarget?.user?.email}
          </Typography>
          <Alert severity="success" icon={false}>
            Approving will grant this provider <strong>full platform access</strong> and send them a confirmation email.
            A blockchain wallet will be created for their account.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setApproveConfirmOpen(false); setApproveTarget(null); }} disabled={actioning}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApproveConfirm}
            disabled={actioning}
            startIcon={<ApproveIcon />}
          >
            {actioning ? 'Approving…' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reject Confirmation Dialog ────────────────────────────────────── */}
      <Dialog
        open={rejectConfirmOpen}
        onClose={() => { if (!actioning) { setRejectConfirmOpen(false); setRejectTarget(null); setRejectReason(''); } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <RejectIcon color="error" />
          Reject Provider?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={1}>
            You are about to reject:
          </Typography>
          <Typography variant="body2" fontWeight={700} mb={2}>
            {rejectTarget?.user?.name || 'Unknown'} &mdash; {rejectTarget?.user?.email}
          </Typography>
          <Alert severity="warning" icon={false} sx={{ mb: 2 }}>
            The provider will be notified by email. Their account access will be <strong>disabled</strong>.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection reason (recommended)"
            placeholder="Explain why this application is being rejected…"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setRejectConfirmOpen(false); setRejectTarget(null); setRejectReason(''); }} disabled={actioning}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectConfirm}
            disabled={actioning}
            startIcon={<RejectIcon />}
          >
            {actioning ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => { if (!deleting) { setDeleteConfirmOpen(false); setDeleteTarget(null); } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarnIcon color="error" />
          Delete Provider?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={1}>
            You are about to permanently delete:
          </Typography>
          <Typography variant="body2" fontWeight={700} mb={2}>
            {deleteTarget?.user?.name || 'Unknown'} &mdash; {deleteTarget?.user?.email}
          </Typography>
          <Alert severity="error" icon={false}>
            This will hard-delete <strong>all records</strong> for this provider — account,
            profile, wallet, blockchain identity, and all related data.
            The email address will become available for new sign-up. <strong>This cannot be undone.</strong>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={<DeleteIcon />}
          >
            {deleting ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
