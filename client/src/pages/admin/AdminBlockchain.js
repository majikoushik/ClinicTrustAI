import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Tab, Tabs, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Alert, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, TextField,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  AccountTree as ChainIcon,
  Shield as ShieldIcon,
  Pending as PendingIcon,
  HowToVote as ApproveIcon,
  Block as RejectIcon,
  Info as InfoIcon,
  Storage as LedgerIcon,
  NetworkCheck as NetworkIcon,
  AccountBalanceWallet as AllowanceIcon,
} from '@mui/icons-material';
import { get, post } from '../../utils/apiUtils';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';

// ── helpers ──────────────────────────────────────────────────────────────────

function shortHash(hash) {
  if (!hash || hash === 'genesis') return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_COLOR = {
  genesis: 'default',
  token: 'primary',
  analytics_anchor: 'secondary',
  consent: 'info',
  referral: 'success',
  referral_update: 'success',
  admin_op: 'warning',
};

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color = 'primary.main', loading }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }} elevation={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ color, mr: 1 }}>{icon}</Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
      {loading ? <CircularProgress size={20} /> : (
        <Typography variant="h5" fontWeight="bold">{value ?? '—'}</Typography>
      )}
    </Paper>
  );
}

// ── Tab 0 — Chain Status ───────────────────────────────────────────────────────

function ChainStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get('/admin/blockchain/status');
      if (res.success) setData(res.data);
      else setError(res.error || 'Failed to load chain status');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isLive = data?.mode === 'polygon';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Chain Status</Typography>
        <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard label="Mode" value={data?.mode?.toUpperCase()} icon={<NetworkIcon />}
            color={isLive ? 'success.main' : 'info.main'} loading={loading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Network" value={data?.network} icon={<ChainIcon />}
            color="primary.main" loading={loading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Total Transactions" value={data?.totalTransactions} icon={<LedgerIcon />}
            color="secondary.main" loading={loading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Current Block" value={data?.currentBlock} icon={<ShieldIcon />}
            color="warning.main" loading={loading} />
        </Grid>
      </Grid>

      {data && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Chain Details</Typography>
          <Grid container spacing={1}>
            {[
              ['Genesis Hash', data.genesisHash],
              ['Chain Tip Hash', data.chainTipHash],
              ['Last Activity', timeAgo(data.chainTipAt)],
              ['Contract Address', data.contractAddress || 'N/A (Ledger mode)'],
            ].map(([label, val]) => (
              <Grid item xs={12} sm={6} key={label}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>{label}:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {typeof val === 'string' && val.length > 30 ? shortHash(val) : val}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {isLive && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Connected to live Polygon {data.network} — on-chain transactions active.
            </Alert>
          )}
          {!isLive && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Running in <strong>MongoDB Ledger</strong> mode. Set <code>POLYGON_RPC_URL</code>,{' '}
              <code>CLINICTOKEN_ADDRESS</code>, and <code>PRIVATE_KEY</code> in <code>.env</code> to
              switch to live Polygon.
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
}

// ── Tab 1 — Ledger Browser ────────────────────────────────────────────────────

function LedgerBrowser() {
  const [txs, setTxs] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get(`/admin/blockchain/transactions?page=${page}&limit=15`);
      if (res.success) {
        setTxs(res.data);
        setPagination(res.pagination);
      } else {
        setError(res.error || 'Failed to load transactions');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (txId) => {
    try {
      const res = await get(`/admin/blockchain/transactions/${txId}`);
      if (res.success) setSelected(res.data);
    } catch (e) { /* ignore */ }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Ledger Browser
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({pagination.total} total)
          </Typography>
        </Typography>
        <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
        <Table size="small" sx={tableSx}>
          <TableHead>
            <TableRow sx={tableHeadRowSx}>
              <TableCell sx={{ width: '9%' }}>Block #</TableCell>
              <TableCell sx={{ width: '11%' }}>Type</TableCell>
              <TableCell sx={{ width: '22%' }}>Transaction ID</TableCell>
              <TableCell sx={{ width: '22%' }}>Hash</TableCell>
              <TableCell sx={{ width: '22%' }}>Prev Hash</TableCell>
              <TableCell sx={{ width: '14%' }}>Time</TableCell>
              <TableCell sx={{ width: '48px' }} align="center">Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {txs.map((tx) => (
              <TableRow key={tx.transactionId} hover sx={tableBodyRowSx}>
                <TableCell sx={{ width: '9%' }}>{tx.blockNumber ?? '—'}</TableCell>
                <TableCell sx={{ width: '11%' }}>
                  <Chip label={tx.type} size="small" color={TYPE_COLOR[tx.type] || 'default'} sx={compactChipSx} />
                </TableCell>
                <TableCell sx={{ width: '22%' }}>
                  <EllipsisCell value={shortHash(tx.transactionId)} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                </TableCell>
                <TableCell sx={{ width: '22%' }}>
                  <EllipsisCell value={shortHash(tx.hash)} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                </TableCell>
                <TableCell sx={{ width: '22%' }}>
                  <EllipsisCell value={shortHash(tx.previousHash)} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                </TableCell>
                <TableCell sx={{ width: '14%' }}>{timeAgo(tx.timestamp)}</TableCell>
                <TableCell sx={{ width: '48px' }} align="center">
                  <Tooltip title="View detail & verify">
                    <IconButton size="small" onClick={() => loadDetail(tx.transactionId)}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!loading && txs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No transactions yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1 }}>
          <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Typography variant="body2" sx={{ alignSelf: 'center' }}>
            Page {page + 1} / {pagination.pages}
          </Typography>
          <Button size="small" disabled={page >= pagination.pages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Box>
      )}

      {/* Detail Dialog */}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Transaction Detail</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['Transaction ID', selected.transactionId],
                  ['Type', selected.type],
                  ['Block #', selected.blockNumber],
                  ['Hash', selected.hash],
                  ['Previous Hash', selected.previousHash],
                  ['Timestamp', selected.timestamp ? new Date(selected.timestamp).toLocaleString() : '—'],
                ].map(([label, val]) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {String(val ?? '—')}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {selected.verification && (
                <Alert severity={selected.verification.verified ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {selected.verification.verified
                    ? `Verified — Hash valid: ${selected.verification.hashValid}, Chain link: ${selected.verification.chainValid}, Source: ${selected.verification.source}`
                    : `Verification FAILED — ${selected.verification.error || 'Hash or chain link mismatch'}`}
                </Alert>
              )}

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Payload</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(selected.data, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab 2 — Integrity Audit ───────────────────────────────────────────────────

function IntegrityAudit() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get('/admin/blockchain/integrity');
      if (res.success) setResult(res.data);
      else setError(res.error || 'Audit failed');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Chain Integrity Audit</Typography>
        <Button variant="contained" onClick={run} disabled={loading} startIcon={<ShieldIcon />}>
          {loading ? 'Auditing…' : 'Run Audit'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && !loading && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <ShieldIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Click "Run Audit" to verify every block's hash and chain linkage.
          </Typography>
        </Paper>
      )}

      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color="text.secondary">Auditing chain…</Typography>
        </Box>
      )}

      {result && (
        <Box>
          <Alert severity={result.valid ? 'success' : 'error'} sx={{ mb: 3 }}>
            {result.valid
              ? `Chain is INTACT — all ${result.audited} records verified successfully.`
              : `Chain INTEGRITY FAILURE — ${result.broken} of ${result.audited} records are broken!`}
          </Alert>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              ['Audited', result.audited, 'text.primary'],
              ['Intact', result.intact, 'success.main'],
              ['Broken', result.broken, result.broken > 0 ? 'error.main' : 'success.main'],
            ].map(([label, val, color]) => (
              <Grid item xs={4} key={label}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={color}>{val}</Typography>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {result.issues.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Broken Records</Typography>
              <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
                <Table size="small" sx={tableSx}>
                  <TableHead>
                    <TableRow sx={tableHeadRowSx}>
                      <TableCell sx={{ width: '10%' }}>Block #</TableCell>
                      <TableCell sx={{ width: '26%' }}>Transaction ID</TableCell>
                      <TableCell sx={{ width: '12%' }}>Hash OK</TableCell>
                      <TableCell sx={{ width: '12%' }}>Link OK</TableCell>
                      <TableCell sx={{ width: '20%' }}>Expected Prev</TableCell>
                      <TableCell sx={{ width: '20%' }}>Got Prev</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.issues.map((issue) => (
                      <TableRow key={issue.transactionId} sx={tableBodyRowSx}>
                        <TableCell sx={{ width: '10%' }}>{issue.blockNumber}</TableCell>
                        <TableCell sx={{ width: '26%' }}>
                          <EllipsisCell value={shortHash(issue.transactionId)} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                        </TableCell>
                        <TableCell sx={{ width: '12%' }}>
                          {issue.hashOk
                            ? <CheckCircleIcon color="success" fontSize="small" />
                            : <CancelIcon color="error" fontSize="small" />}
                        </TableCell>
                        <TableCell sx={{ width: '12%' }}>
                          {issue.linkOk
                            ? <CheckCircleIcon color="success" fontSize="small" />
                            : <CancelIcon color="error" fontSize="small" />}
                        </TableCell>
                        <TableCell sx={{ width: '20%' }}>
                          <EllipsisCell value={shortHash(issue.expected)} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                        </TableCell>
                        <TableCell sx={{ width: '20%' }}>
                          <EllipsisCell value={shortHash(issue.got)} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Tab 3 — Multi-sig Operations ──────────────────────────────────────────────

function MultiSigOperations() {
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionDialog, setActionDialog] = useState(null); // { op, mode: 'approve'|'reject' }
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get(`/admin/blockchain/operations?status=${statusFilter}`);
      if (res.success) setOps(res.data);
      else setError(res.error || 'Failed to load operations');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      const { op, mode } = actionDialog;
      const endpoint = `/admin/blockchain/operations/${op._id}/${mode}`;
      const body = mode === 'reject' ? { reason: rejectReason } : {};
      const res = await post(endpoint, body);
      setActionMsg({ type: res.success ? 'success' : 'error', text: res.message || res.error });
      setActionDialog(null);
      setRejectReason('');
      load();
    } catch (e) {
      setActionMsg({ type: 'error', text: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const opStatusColor = { pending: 'warning', approved: 'info', executed: 'success', rejected: 'error', expired: 'default' };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Multi-Sig Token Operations</Typography>
        <Box sx={{ display: 'flex', gap: 1, mr: 1 }}>
          {['pending', 'executed', 'rejected', 'expired'].map(s => (
            <Chip
              key={s}
              label={s}
              size="small"
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={opStatusColor[s]}
              onClick={() => setStatusFilter(s)}
              clickable
            />
          ))}
        </Box>
        <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
      </Box>

      {actionMsg && (
        <Alert severity={actionMsg.type} sx={{ mb: 2 }} onClose={() => setActionMsg(null)}>
          {actionMsg.text}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        Mint and burn operations require <strong>2 admin approvals</strong> before execution (configurable via{' '}
        <code>TOKEN_MULTISIG_REQUIRED</code> in .env).
      </Alert>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {!loading && ops.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <PendingIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No {statusFilter} operations</Typography>
        </Paper>
      )}

      {ops.map((op) => (
        <Paper key={op._id} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={op.type.toUpperCase()}
                  size="small"
                  color={op.type === 'mint' ? 'success' : 'error'}
                />
                <Chip label={op.status} size="small" color={opStatusColor[op.status]} variant="outlined" />
                <Typography variant="body2" color="text.secondary">{timeAgo(op.createdAt)}</Typography>
              </Box>
              <Typography variant="body1">
                <strong>{op.amount} CLT</strong> → {op.providerName || op.providerId}
              </Typography>
              <Typography variant="body2" color="text.secondary">Reason: {op.reason}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Approvals: {op.approvals?.length ?? 0} / {op.requiredApprovals}
                {op.approvals?.length > 0 && (
                  <span> ({op.approvals.map(a => a.adminName || a.adminId).join(', ')})</span>
                )}
              </Typography>
              {op.executedTxId && (
                <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: 11 }}>
                  Tx: {shortHash(op.executedTxId)}
                </Typography>
              )}
            </Box>

            {op.status === 'pending' && (
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <Tooltip title="Approve">
                  <Button
                    size="small" variant="contained" color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => setActionDialog({ op, mode: 'approve' })}
                  >
                    Approve
                  </Button>
                </Tooltip>
                <Tooltip title="Reject">
                  <Button
                    size="small" variant="outlined" color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => { setActionDialog({ op, mode: 'reject' }); setRejectReason(''); }}
                  >
                    Reject
                  </Button>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Paper>
      ))}

      {/* Confirm dialog */}
      <Dialog open={Boolean(actionDialog)} onClose={() => setActionDialog(null)}>
        <DialogTitle>
          {actionDialog?.mode === 'approve' ? 'Approve Operation' : 'Reject Operation'}
        </DialogTitle>
        <DialogContent>
          {actionDialog && (
            <Box>
              <DialogContentText sx={{ mb: 2 }}>
                {actionDialog.mode === 'approve'
                  ? `Approve ${actionDialog.op.type} of ${actionDialog.op.amount} CLT to ${actionDialog.op.providerName}?`
                  : `Reject ${actionDialog.op.type} of ${actionDialog.op.amount} CLT?`}
              </DialogContentText>
              {actionDialog.mode === 'reject' && (
                <TextField
                  label="Rejection reason (optional)"
                  fullWidth
                  multiline
                  rows={2}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)}>Cancel</Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionDialog?.mode === 'approve' ? 'success' : 'error'}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={18} /> : actionDialog?.mode === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab 4 — Allowance Manager ─────────────────────────────────────────────────

function AllowanceManager() {
  const [providerId, setProviderId] = useState('');
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveAmount, setApproveAmount]   = useState('');
  const [msg, setMsg]               = useState(null);

  const checkAllowance = async () => {
    if (!providerId.trim()) return;
    setLoading(true); setResult(null); setMsg(null);
    try {
      const res = await get(`/admin/blockchain/allowance/${providerId.trim()}`);
      if (res.success) setResult(res.data);
      else setMsg({ type: 'error', text: res.error });
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };

  const submitApprove = async () => {
    if (!approveAmount || Number(approveAmount) < 1) return;
    setApproveLoading(true); setMsg(null);
    try {
      const res = await post(`/admin/blockchain/allowance/${providerId.trim()}/approve`, { amount: Number(approveAmount) });
      if (res.success) {
        setMsg({ type: 'success', text: `Approval tx submitted: ${res.data?.txHash || 'synthetic mode'}` });
        checkAllowance();
      } else {
        setMsg({ type: 'error', text: res.error });
      }
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setApproveLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>Allowance Manager</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ERC-20 allowance is required before the platform can execute an admin burn on-chain.
        In <strong>ledger mode</strong> this is not needed — burns write directly to MongoDB.
        In <strong>Polygon live mode</strong>, the provider must grant the platform wallet an allowance.
      </Typography>

      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Check Provider Allowance</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Provider ID"
            size="small"
            value={providerId}
            onChange={e => setProviderId(e.target.value)}
            sx={{ flexGrow: 1 }}
            placeholder="MongoDB _id of the provider"
          />
          <Button variant="contained" onClick={checkAllowance} disabled={loading || !providerId.trim()}>
            {loading ? <CircularProgress size={18} /> : 'Check'}
          </Button>
        </Box>
      </Paper>

      {result && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              ['Mode', result.mode?.toUpperCase(), result.mode === 'polygon' ? 'success.main' : 'info.main'],
              ['On-chain Allowance', result.onChainAllowance !== null ? `${result.onChainAllowance} CLT` : 'N/A', 'text.primary'],
              ['Pending Burns', `${result.pendingBurnTotal} CLT (${result.pendingBurns} ops)`, 'warning.main'],
              ['Sufficient', result.allowanceSufficient === null ? 'N/A (ledger)' : result.allowanceSufficient ? 'Yes' : 'No',
                result.allowanceSufficient ? 'success.main' : result.allowanceSufficient === false ? 'error.main' : 'text.secondary'],
            ].map(([label, val, color]) => (
              <Grid item xs={6} sm={3} key={label}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight="bold" color={color}>{val}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2"><strong>Provider:</strong> {result.provider?.name || result.provider?.email} ({result.provider?.walletAddress || 'no wallet'})</Typography>
            <Typography variant="body2"><strong>Platform wallet:</strong> {result.platformWallet || 'not configured'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{result.note}</Typography>
          </Paper>

          <Alert severity={result.mode === 'ledger' ? 'success' : result.allowanceSufficient ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {result.mode === 'ledger'
              ? 'Ledger mode — allowance not required. Admin burns execute directly via MongoDB.'
              : result.allowanceSufficient
              ? 'Allowance is sufficient. Admin burns can proceed on-chain.'
              : 'Allowance is insufficient for pending burns. Use the form below to approve via stored key, or ask the provider to manually call approve() on the contract.'}
          </Alert>

          {result.mode === 'polygon' && !result.allowanceSufficient && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Approve via Stored Key
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                If this provider's wallet was generated with <code>WALLET_MASTER_MNEMONIC</code> and
                <code>WALLET_ENCRYPTION_KEY</code>, the platform can sign the approval transaction automatically.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Approve amount (CLT)"
                  type="number"
                  size="small"
                  value={approveAmount}
                  onChange={e => setApproveAmount(e.target.value)}
                  sx={{ width: 200 }}
                />
                <Button variant="contained" color="warning" onClick={submitApprove}
                  disabled={approveLoading || !approveAmount}>
                  {approveLoading ? <CircularProgress size={18} /> : 'Submit Approval Tx'}
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminBlockchain() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Blockchain Ledger
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor the ClinicToken chain, verify transaction integrity, and manage multi-sig mint/burn approvals.
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<NetworkIcon />} iconPosition="start" label="Chain Status" />
          <Tab icon={<LedgerIcon />} iconPosition="start" label="Ledger" />
          <Tab icon={<ShieldIcon />} iconPosition="start" label="Integrity Audit" />
          <Tab icon={<PendingIcon />} iconPosition="start" label="Multi-Sig Operations" />
          <Tab icon={<AllowanceIcon />} iconPosition="start" label="Allowance Manager" />
        </Tabs>
      </Paper>

      <Box>
        {tab === 0 && <ChainStatus />}
        {tab === 1 && <LedgerBrowser />}
        {tab === 2 && <IntegrityAudit />}
        {tab === 3 && <MultiSigOperations />}
        {tab === 4 && <AllowanceManager />}
      </Box>
    </Box>
  );
}
