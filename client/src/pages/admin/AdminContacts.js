import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, TablePagination, Chip, IconButton,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab,
  Alert, Snackbar, Tooltip, Divider, Stack, Avatar, Menu, ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as OrgIcon,
  Schedule as ScheduleIcon,
  Forum as InquiryIcon,
  CheckCircle as CheckIcon,
  MarkEmailRead as ReadIcon,
  Close as CloseIcon,
  ContactMail as ContactMailIcon,
  FiberNew as NewIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import contactAdminService from '../../services/contactAdminService';
import { formatDateTime } from '../../utils/dateFormatter';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
  pageHeaderBoxSx,
} from '../../components/common/adminTableStyles';

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_META = {
  new:       { label: 'New',       color: 'primary',  icon: <NewIcon sx={{ fontSize: 14 }} /> },
  read:      { label: 'Read',      color: 'default',  icon: <ReadIcon sx={{ fontSize: 14 }} /> },
  responded: { label: 'Responded', color: 'success',  icon: <CheckIcon sx={{ fontSize: 14 }} /> },
  closed:    { label: 'Closed',    color: 'warning',  icon: null },
};

const INQUIRY_META = {
  general:     { label: 'General',     color: '#0288d1' },
  sales:       { label: 'Sales',       color: '#2e7d32' },
  support:     { label: 'Support',     color: '#ed6c02' },
  partnership: { label: 'Partnership', color: '#7b1fa2' },
  demo:        { label: 'Demo',        color: '#c62828' },
};

const initials = (name = '') =>
  name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const avatarColor = (name = '') => {
  const colors = ['#1565c0', '#2e7d32', '#6a1b9a', '#c62828', '#0277bd', '#e65100'];
  return colors[name.charCodeAt(0) % colors.length];
};

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = 'primary.main', onClick, active }) {
  return (
    <Paper
      elevation={active ? 4 : 1}
      onClick={onClick}
      sx={{
        p: 2.5, textAlign: 'center', cursor: onClick ? 'pointer' : 'default',
        border: active ? `2px solid` : '2px solid transparent',
        borderColor: active ? color : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-2px)' } : {},
      }}
    >
      <Box sx={{ color, mb: 0.5, lineHeight: 0 }}>{icon}</Box>
      <Typography variant="h4" fontWeight={800} color={color}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

// ── detail dialog ─────────────────────────────────────────────────────────────
function DetailDialog({ contact, open, onClose, onStatusChange, onDelete }) {
  const [status, setStatus] = useState(contact?.status || 'new');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (contact) setStatus(contact.status); }, [contact]);

  const handleStatusSave = async () => {
    setSaving(true);
    await onStatusChange(contact._id, status);
    setSaving(false);
  };

  if (!contact) return null;
  const inq = INQUIRY_META[contact.inquiryType] || INQUIRY_META.general;
  const sta = STATUS_META[contact.status] || STATUS_META.new;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
        <Avatar sx={{ bgcolor: avatarColor(contact.name), width: 40, height: 40, fontSize: 15 }}>
          {initials(contact.name)}
        </Avatar>
        <Box flex={1}>
          <Typography fontWeight={700}>{contact.name}</Typography>
          <Typography variant="caption" color="text.secondary">{contact.email}</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Meta row */}
        <Stack direction="row" flexWrap="wrap" gap={1} mb={2.5}>
          <Chip
            label={inq.label}
            size="small"
            sx={{ bgcolor: `${inq.color}18`, color: inq.color, fontWeight: 700, border: `1px solid ${inq.color}30` }}
          />
          <Chip
            icon={sta.icon}
            label={sta.label}
            size="small"
            color={sta.color}
            variant={contact.status === 'new' ? 'filled' : 'outlined'}
          />
          <Chip
            icon={<ScheduleIcon sx={{ fontSize: 13 }} />}
            label={formatDateTime(contact.createdAt)}
            size="small"
            variant="outlined"
          />
        </Stack>

        {/* Contact info */}
        <Grid container spacing={1.5} mb={2.5}>
          {contact.phone && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">{contact.phone}</Typography>
              </Box>
            </Grid>
          )}
          {contact.organization && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <OrgIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">{contact.organization}</Typography>
              </Box>
            </Grid>
          )}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2">{contact.email}</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Subject + message */}
        <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Subject</Typography>
        <Typography variant="body2" mb={2}>{contact.subject}</Typography>

        <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Message</Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {contact.message}
          </Typography>
        </Paper>

        {/* Status update */}
        <Box mt={3} display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Update Status</InputLabel>
            <Select value={status} label="Update Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="read">Read</MenuItem>
              <MenuItem value="responded">Responded</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            onClick={handleStatusSave}
            disabled={saving || status === contact.status}
          >
            {saving ? 'Saving…' : 'Save Status'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
            startIcon={<EmailIcon />}
          >
            Reply
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => { onDelete(contact._id); onClose(); }}
        >
          Delete
        </Button>
        <Box flex={1} />
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
const STATUS_TABS = ['all', 'new', 'read', 'responded', 'closed'];

export default function AdminContacts() {
  const [contacts, setContacts]     = useState([]);
  const [meta, setMeta]             = useState({ total: 0, newCount: 0, respondedCount: 0, demoCount: 0 });
  const [loading, setLoading]       = useState(true);
  const [statusTab, setStatusTab]   = useState(0);
  const [search, setSearch]         = useState('');
  const [inquiryFilter, setInquiryFilter] = useState('all');
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected]     = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snack, setSnack]           = useState({ open: false, msg: '', severity: 'success' });

  // Row action menu (kebab) — keeps the grid to one action column instead of
  // a row of icon buttons, so it never needs horizontal scroll on narrow screens
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuContact, setActionMenuContact] = useState(null);
  const openActionMenu = (event, contact) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuContact(contact);
  };
  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuContact(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await contactAdminService.getAll(STATUS_TABS[statusTab]);
    if (res?.success) {
      setContacts(res.data || []);
      setMeta(res.meta || {});
    }
    setLoading(false);
  }, [statusTab]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    const res = await contactAdminService.updateStatus(id, status);
    if (res?.success) {
      setContacts(prev => prev.map(c => c._id === id ? { ...c, status } : c));
      if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
      setSnack({ open: true, msg: 'Status updated.', severity: 'success' });
    } else {
      setSnack({ open: true, msg: res?.error || 'Failed to update.', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    const res = await contactAdminService.delete(id);
    if (res?.success) {
      setContacts(prev => prev.filter(c => c._id !== id));
      setSnack({ open: true, msg: 'Enquiry deleted.', severity: 'success' });
    } else {
      setSnack({ open: true, msg: res?.error || 'Delete failed.', severity: 'error' });
    }
  };

  const openDetail = async (contact) => {
    setSelected(contact);
    setDialogOpen(true);
    // Auto-mark as read when opened
    if (contact.status === 'new') {
      await handleStatusChange(contact._id, 'read');
    }
  };

  // client-side search + inquiry filter
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      (c.organization || '').toLowerCase().includes(q);
    const matchInquiry = inquiryFilter === 'all' || c.inquiryType === inquiryFilter;
    return matchSearch && matchInquiry;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Percentages sum to 100% — with tableLayout: 'fixed' this guarantees the
  // table always fits the container's width on any screen size.
  const COLUMN_WIDTHS = {
    contact: '20%', organization: '15%', inquiry: '12%', subject: '25%',
    received: '13%', status: '15%', actions: '48px',
  };

  // Shared row-action menu — one instance, opened against whichever row's
  // kebab button was clicked (see openActionMenu/closeActionMenu above).
  const renderActionMenu = () => {
    const contact = actionMenuContact;
    if (!contact) return null;
    const runAction = (fn) => { closeActionMenu(); fn(); };
    return (
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => runAction(() => openDetail(contact))}>
          <ListItemIcon><ViewIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>View details</ListItemText>
        </MenuItem>
        <MenuItem
          component="a"
          href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
          onClick={closeActionMenu}
        >
          <ListItemIcon><EmailIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>Reply by email</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => runAction(() => handleDelete(contact._id))}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box py={4}>
        {/* Header */}
        <Box sx={pageHeaderBoxSx}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Contact Enquiries</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              All contact form submissions — view, triage, and respond.
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stat cards */}
        <Grid container spacing={2.5} mb={4}>
          {[
            {
              label: 'Total Enquiries',
              value: meta.total ?? contacts.length,
              icon: <ContactMailIcon sx={{ fontSize: 32 }} />,
              color: 'primary.main',
              tab: null,
            },
            {
              label: 'New (Unread)',
              value: meta.newCount ?? contacts.filter(c => c.status === 'new').length,
              icon: <NewIcon sx={{ fontSize: 32 }} />,
              color: '#1565c0',
              tab: 1,
            },
            {
              label: 'Responded',
              value: meta.respondedCount ?? contacts.filter(c => c.status === 'responded').length,
              icon: <CheckIcon sx={{ fontSize: 32 }} />,
              color: '#2e7d32',
              tab: 3,
            },
            {
              label: 'Demo Requests',
              value: meta.demoCount ?? contacts.filter(c => c.inquiryType === 'demo').length,
              icon: <InquiryIcon sx={{ fontSize: 32 }} />,
              color: '#c62828',
              tab: null,
              onClick: () => setInquiryFilter('demo'),
            },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <StatCard
                label={s.label}
                value={s.value}
                icon={s.icon}
                color={s.color}
                active={s.tab !== null && statusTab === s.tab}
                onClick={s.tab !== null ? () => setStatusTab(s.tab) : s.onClick}
              />
            </Grid>
          ))}
        </Grid>

        {/* Filter bar */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
            <Tabs
              value={statusTab}
              onChange={(_, v) => { setStatusTab(v); setPage(0); }}
              textColor="primary"
              indicatorColor="primary"
              sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, textTransform: 'none', fontWeight: 600 } }}
            >
              {STATUS_TABS.map(s => (
                <Tab key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} />
              ))}
            </Tabs>

            <Box flex={1} />

            <TextField
              size="small"
              placeholder="Search name, email, subject…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ width: 260 }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Inquiry Type</InputLabel>
              <Select value={inquiryFilter} label="Inquiry Type" onChange={e => { setInquiryFilter(e.target.value); setPage(0); }}>
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="sales">Sales</MenuItem>
                <MenuItem value="support">Support</MenuItem>
                <MenuItem value="partnership">Partnership</MenuItem>
                <MenuItem value="demo">Demo Request</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Table */}
        {loading ? (
          <Box textAlign="center" py={8}><Typography color="text.secondary">Loading enquiries…</Typography></Box>
        ) : filtered.length === 0 ? (
          <Box textAlign="center" py={8}>
            <ContactMailIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No enquiries match your filters.</Typography>
          </Box>
        ) : (
          <Paper elevation={1}>
            <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
              <Table size="small" sx={tableSx}>
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ width: COLUMN_WIDTHS.contact }}>Contact</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.organization }}>Organization</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.inquiry }}>Inquiry Type</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.subject }}>Subject</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.received }}>Received</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.status }}>Status</TableCell>
                    <TableCell sx={{ width: COLUMN_WIDTHS.actions }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map(contact => {
                    const inq = INQUIRY_META[contact.inquiryType] || INQUIRY_META.general;
                    const isNew = contact.status === 'new';
                    return (
                      <TableRow
                        key={contact._id}
                        hover
                        onClick={() => openDetail(contact)}
                        sx={{
                          ...tableBodyRowSx,
                          cursor: 'pointer',
                          fontWeight: isNew ? 700 : 400,
                          bgcolor: isNew ? 'primary.50' : 'inherit',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        {/* Contact */}
                        <TableCell sx={{ width: COLUMN_WIDTHS.contact }}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ bgcolor: avatarColor(contact.name), width: 32, height: 32, fontSize: 12 }}>
                              {initials(contact.name)}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" fontWeight={isNew ? 700 : 500} noWrap>
                                {contact.name}
                              </Typography>
                              <EllipsisCell value={contact.email} variant="caption" sx={{ color: 'text.secondary' }} />
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Org */}
                        <TableCell sx={{ width: COLUMN_WIDTHS.organization }}>
                          <EllipsisCell value={contact.organization} variant="body2" sx={{ color: 'text.secondary' }} />
                        </TableCell>

                        {/* Inquiry Type */}
                        <TableCell sx={{ width: COLUMN_WIDTHS.inquiry }}>
                          <Chip
                            label={inq.label}
                            size="small"
                            sx={{ ...compactChipSx, bgcolor: `${inq.color}18`, color: inq.color, border: `1px solid ${inq.color}30` }}
                          />
                        </TableCell>

                        {/* Subject */}
                        <TableCell sx={{ width: COLUMN_WIDTHS.subject }}>
                          <EllipsisCell value={contact.subject} variant="body2" />
                        </TableCell>

                        {/* Date */}
                        <TableCell sx={{ width: COLUMN_WIDTHS.received }}>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {formatDateTime(contact.createdAt)}
                          </Typography>
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ width: COLUMN_WIDTHS.status }} onClick={e => e.stopPropagation()}>
                          <FormControl size="small" variant="standard" sx={{ minWidth: 110, maxWidth: '100%' }}>
                            <Select
                              value={contact.status}
                              onChange={e => handleStatusChange(contact._id, e.target.value)}
                              disableUnderline
                              renderValue={val => (
                                <Chip
                                  icon={STATUS_META[val]?.icon}
                                  label={STATUS_META[val]?.label || val}
                                  size="small"
                                  color={STATUS_META[val]?.color || 'default'}
                                  variant={val === 'new' ? 'filled' : 'outlined'}
                                  sx={compactChipSx}
                                />
                              )}
                              sx={{ '& .MuiSelect-select': { p: 0 } }}
                            >
                              <MenuItem value="new">New</MenuItem>
                              <MenuItem value="read">Read</MenuItem>
                              <MenuItem value="responded">Responded</MenuItem>
                              <MenuItem value="closed">Closed</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>

                        {/* Actions */}
                        <TableCell sx={{ width: COLUMN_WIDTHS.actions }} align="center" onClick={e => e.stopPropagation()}>
                          <IconButton size="small" onClick={(e) => openActionMenu(e, contact)}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPageOptions={[10, 25, 50]}
              onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
            />
            {renderActionMenu()}
          </Paper>
        )}
      </Box>

      {/* Detail dialog */}
      <DetailDialog
        contact={selected}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
