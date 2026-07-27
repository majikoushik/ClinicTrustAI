import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Button, Chip, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Snackbar, Avatar, Stack
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Email as EmailIcon,
  VerifiedUser as KycIcon,
  Person as ProfileIcon,
  HourglassTop as PendingIcon,
  Lock as LockIcon,
  Logout as LogoutIcon,
  ArrowForward as ArrowIcon,
  CloudUpload as UploadIcon,
  TaskAlt as TaskAltIcon,
} from '@mui/icons-material';
import onboardingService from '../../services/onboardingService';
import { useAuth } from '../../contexts';

/* ─── Steps ────────────────────────────────────────────── */
const STEPS = [
  {
    key: 'profile_created',
    label: 'Account Created',
    icon: ProfileIcon,
    detail: 'Your ClinicTrust AI provider account has been set up successfully.',
    time: null,
    action: null,
    accentColor: '#6366f1',
  },
  {
    key: 'email_verified',
    label: 'Verify Your Email',
    icon: EmailIcon,
    detail: 'Check your inbox and click the verification link we sent you.',
    time: '~2 min',
    action: 'email',
    accentColor: '#0ea5e9',
  },
  {
    key: 'profile_reviewed',
    label: 'Complete Your Profile',
    icon: ProfileIcon,
    detail: 'Review and confirm your specialty, practice name, and contact details.',
    time: '~2 min',
    action: 'profile',
    accentColor: '#8b5cf6',
  },
  {
    key: 'docs_uploaded',
    label: 'Upload Verification Documents',
    icon: KycIcon,
    detail: 'Submit your medical license number so we can verify your credentials.',
    time: '~3 min',
    action: 'docs',
    accentColor: '#10b981',
  },
];

const STATUS_META = {
  pending_email:      { label: 'Pending Email Verification',        severity: 'warning', icon: <EmailIcon fontSize="small" /> },
  profile_incomplete: { label: 'Complete Your Profile to Continue', severity: 'warning', icon: <ProfileIcon fontSize="small" /> },
  doc_pending:        { label: 'Please Upload Your Documents',       severity: 'warning', icon: <KycIcon fontSize="small" /> },
  under_review:       { label: 'Under Review — 1-2 business days',  severity: 'info',    icon: <PendingIcon fontSize="small" /> },
  verified:           { label: 'Verified — Full Access Granted',    severity: 'success', icon: <TaskAltIcon fontSize="small" /> },
  rejected:           { label: 'Verification Rejected',             severity: 'error',   icon: <KycIcon fontSize="small" /> },
};

/* ─── Step state helpers ───────────────────────────────── */
function stepStatus(key, steps, kycStatus) {
  // Infer completion from kycStatus when onboardingSteps flags are out of sync
  // (e.g. admin manually changed the status via KYC page)
  const emailVerifiedByStatus   = ['profile_incomplete', 'doc_pending', 'under_review', 'verified', 'rejected'].includes(kycStatus);
  const profileReviewedByStatus = ['doc_pending', 'under_review', 'verified', 'rejected'].includes(kycStatus);
  const docsUploadedByStatus    = ['under_review', 'verified', 'rejected'].includes(kycStatus);

  const isDone = {
    profile_created:  steps.profile_created,
    email_verified:   steps.email_verified   || emailVerifiedByStatus,
    profile_reviewed: steps.profile_reviewed || profileReviewedByStatus,
    docs_uploaded:    steps.docs_uploaded    || docsUploadedByStatus,
  };

  if (isDone[key]) return 'done';

  const emailDone   = isDone.email_verified;
  const profileDone = isDone.profile_reviewed;

  if (key === 'profile_created' || key === 'email_verified') return 'active';
  if (key === 'profile_reviewed') return emailDone  ? 'active' : 'locked';
  if (key === 'docs_uploaded')    return profileDone ? 'active' : 'locked';
  return 'locked';
}

/* ─── Circular progress indicator ─────────────────────── */
function ProgressRing({ value, size = 96 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - value / 100);
  return (
    <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#6366f1" strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box position="absolute" display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h5" fontWeight={800} lineHeight={1} color="primary.main">{value}%</Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>done</Typography>
      </Box>
    </Box>
  );
}

/* ─── Individual step card ─────────────────────────────── */
function StepCard({ step, index, status, resendCooldown, onAction }) {
  const done    = status === 'done';
  const locked  = status === 'locked';
  const StepIcon = step.icon;

  return (
    <Box display="flex" gap={0}>
      {/* Left rail */}
      <Box display="flex" flexDirection="column" alignItems="center" mr={2.5}>
        {/* Circle */}
        <Avatar
          sx={{
            width: 48, height: 48, flexShrink: 0,
            bgcolor: done ? '#10b981' : locked ? '#e5e7eb' : step.accentColor,
            color: done ? '#fff' : locked ? '#9ca3af' : '#fff',
            boxShadow: !done && !locked ? `0 0 0 5px ${step.accentColor}22` : 'none',
            transition: 'all 0.3s',
            fontWeight: 700, fontSize: 18,
          }}
        >
          {done   ? <CheckIcon sx={{ fontSize: 24 }} /> :
           locked ? <LockIcon sx={{ fontSize: 20 }} /> :
                    <StepIcon sx={{ fontSize: 22 }} />}
        </Avatar>
        {/* Connector line (not on last step) */}
        {index < STEPS.length - 1 && (
          <Box
            sx={{
              width: 2, flex: 1, minHeight: 28,
              bgcolor: done ? '#10b981' : '#e5e7eb',
              my: 0.75,
              transition: 'background-color 0.3s',
            }}
          />
        )}
      </Box>

      {/* Card */}
      <Box flex={1} mb={index < STEPS.length - 1 ? 1 : 0}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2.5,
            border: '1.5px solid',
            borderColor: done ? '#10b98133' : locked ? '#f1f5f9' : `${step.accentColor}44`,
            bgcolor: done ? '#f0fdf4' : locked ? '#f8fafc' : '#fff',
            borderLeftWidth: locked ? '1.5px' : 4,
            borderLeftColor: done ? '#10b981' : locked ? '#f1f5f9' : step.accentColor,
            opacity: locked ? 0.65 : 1,
            transition: 'all 0.25s',
            mb: 0.5,
          }}
        >
          <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between"
            flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.4}>
                <Typography
                  variant="subtitle1" fontWeight={700}
                  color={done ? 'success.dark' : locked ? 'text.disabled' : 'text.primary'}
                  lineHeight={1.3}
                >
                  {step.label}
                </Typography>
                {done && <Chip label="Complete" size="small" color="success" sx={{ height: 20, fontSize: 11 }} />}
                {locked && <Chip label="Locked" size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#e2e8f0', color: '#64748b' }} />}
              </Box>
              <Typography variant="body2" color={locked ? 'text.disabled' : 'text.secondary'} lineHeight={1.5}>
                {step.detail}
              </Typography>
            </Box>

            {/* CTA */}
            <Box flexShrink={0}>
              {done && (
                <TaskAltIcon sx={{ fontSize: 32, color: '#10b981' }} />
              )}
              {!done && !locked && step.action && (
                <Button
                  variant="contained" size="medium" endIcon={<ArrowIcon />}
                  onClick={() => onAction(step.action)}
                  disabled={step.action === 'email' && resendCooldown > 0}
                  sx={{
                    bgcolor: step.accentColor,
                    '&:hover': { bgcolor: step.accentColor, filter: 'brightness(0.9)' },
                    whiteSpace: 'nowrap', borderRadius: 2, px: 2.5,
                    boxShadow: `0 4px 14px ${step.accentColor}44`,
                  }}
                >
                  {step.action === 'email'
                    ? (resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email')
                    : step.action === 'docs' ? 'Upload Now'
                    : 'Get Started'}
                </Button>
              )}
              {!done && !locked && step.time && (
                <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={0.5}>
                  {step.time}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

/* ─── Main component ───────────────────────────────────── */
export default function OnboardingWall() {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { logout, currentUser, refreshUser, loading: authLoading } = useAuth();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [resendCooldown, setResendCooldown] = useState(0);

  // Doc upload dialog
  const [docDialog, setDocDialog] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Redirect to login if not authenticated (wait for AuthContext to finish initialising)
  useEffect(() => {
    if (!authLoading && !currentUser) {
      startTransition(() => navigate('/login'));
    }
  }, [authLoading, currentUser, navigate, startTransition]);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = async () => {
    try {
      const res = await onboardingService.getStatus();
      if (res.success) {
        setStatusData(res.data);
        // If admin has fully approved the account, refresh auth context and go to app
        if (res.data?.kycStatus === 'verified') {
          try { await refreshUser(); } catch (_) {}
          startTransition(() => navigate('/app/dashboard'));
        }
      }
    } catch (e) {
      console.error('Failed to load onboarding status', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await onboardingService.resendVerification();
      showSnack('Verification email sent! Check your inbox.');
      let t = 60;
      setResendCooldown(t);
      const iv = setInterval(() => { t--; setResendCooldown(t); if (t <= 0) clearInterval(iv); }, 1000);
    } catch (e) {
      showSnack('Failed to resend email', 'error');
    }
  };

  const handleDocSubmit = async () => {
    if (!licenseNumber.trim()) { showSnack('License number is required', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('licenseNumber', licenseNumber);
      fd.append('licenseState', licenseState);
      if (docFile) fd.append('document', docFile);
      await onboardingService.uploadDocuments(fd);
      showSnack('Documents submitted! Our team will review within 1-2 business days.');
      setDocDialog(false);
      loadStatus();
    } catch (e) {
      showSnack(e?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAction = (action) => {
    if (action === 'email')   { handleResend(); return; }
    if (action === 'profile') { startTransition(() => navigate('/onboarding/profile')); return; }
    if (action === 'docs')    { setDocDialog(true); return; }
  };

  const handleLogout = async () => {
    await logout();
    startTransition(() => navigate('/login'));
  };

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  if (loading) return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="grey.50">
      <CircularProgress size={40} />
    </Box>
  );

  const steps       = statusData?.steps || {};
  const kycStatus   = statusData?.kycStatus || 'pending_email';
  const statusMeta  = STATUS_META[kycStatus] || STATUS_META.pending_email;
  const completedCount = STEPS.filter(s => !!steps[s.key]).length;
  const progress    = Math.round((completedCount / STEPS.length) * 100);
  const allDocsDone = !!steps.docs_uploaded;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="sm">

        {/* ── Header card ────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5 }, mb: 3, borderRadius: 3,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}
        >
          {/* decorative circle */}
          <Box sx={{
            position: 'absolute', right: -40, top: -40,
            width: 180, height: 180, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.07)',
          }} />
          <Box sx={{
            position: 'absolute', right: 20, bottom: -60,
            width: 140, height: 140, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
          }} />

          <Box display="flex" justifyContent="space-between" alignItems="flex-start" position="relative" zIndex={1}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 2, fontSize: 11 }}>
                ClinicTrust AI
              </Typography>
              <Typography variant="h5" fontWeight={800} mb={0.5} lineHeight={1.2}>
                Complete Your Setup
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {completedCount < STEPS.length
                  ? `${STEPS.length - completedCount} step${STEPS.length - completedCount !== 1 ? 's' : ''} remaining before full access`
                  : 'All steps complete — pending admin review'}
              </Typography>
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center" gap={0.5} ml={2} flexShrink={0}>
              <ProgressRing value={progress} size={88} />
              <Typography variant="caption" sx={{ opacity: 0.75, fontSize: 11 }}>
                {completedCount}/{STEPS.length} steps
              </Typography>
            </Box>
          </Box>

          <Button
            startIcon={<LogoutIcon />} onClick={handleLogout} size="small"
            sx={{
              mt: 2, color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.35)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.6)' },
            }}
            variant="outlined"
          >
            Sign Out
          </Button>
        </Paper>

        {/* ── KYC status banner ──────────────────────── */}
        <Alert
          severity={statusMeta.severity}
          icon={statusMeta.icon}
          sx={{ mb: 3, borderRadius: 2.5, '& .MuiAlert-message': { fontWeight: 500 } }}
        >
          {statusMeta.label}
          {kycStatus === 'rejected' && statusData?.kycRejectionReason && (
            <Typography variant="body2" mt={0.5} color="error.dark">
              Reason: {statusData.kycRejectionReason}
            </Typography>
          )}
          {kycStatus === 'under_review' && (
            <Typography variant="body2" mt={0.5} color="info.dark">
              You'll receive an email confirmation once your documents are approved.
            </Typography>
          )}
        </Alert>

        {/* ── Step timeline ──────────────────────────── */}
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2.5} color="text.primary">
            Setup Checklist
          </Typography>

          {STEPS.map((step, i) => {
            const status = stepStatus(step.key, steps, kycStatus);
            return (
              <StepCard
                key={step.key}
                step={step}
                index={i}
                status={status}
                resendCooldown={resendCooldown}
                onAction={handleAction}
              />
            );
          })}
        </Paper>

        {/* ── Under review completion banner ─────────── */}
        {(kycStatus === 'under_review' || allDocsDone) && (
          <Paper
            elevation={0}
            sx={{
              mt: 3, p: 3, borderRadius: 3, textAlign: 'center',
              bgcolor: '#f0fdf4', border: '1.5px solid #bbf7d0',
            }}
          >
            <TaskAltIcon sx={{ fontSize: 48, color: '#10b981', mb: 1 }} />
            <Typography variant="h6" fontWeight={700} mb={0.5}>You're all set!</Typography>
            <Typography variant="body2" color="text.secondary">
              Your documents are under review. Our team will approve your account within 1-2 business days.
              We'll notify you by email as soon as you're verified.
            </Typography>
          </Paper>
        )}

      </Container>

      {/* ── Document upload dialog ─────────────────── */}
      <Dialog
        open={docDialog}
        onClose={() => !uploading && setDocDialog(false)}
        maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: '#10b98120', color: '#10b981', width: 40, height: 40 }}>
              <UploadIcon />
            </Avatar>
            <Box>
              <Typography fontWeight={700} lineHeight={1.2}>Upload Verification</Typography>
              <Typography variant="caption" color="text.secondary">Medical license & supporting docs</Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: 13 }}>
            Your license number is required. A document upload is optional but speeds up review.
          </Alert>

          <TextField
            fullWidth required
            label="Medical License Number"
            placeholder="e.g. MD-123456"
            value={licenseNumber}
            onChange={e => setLicenseNumber(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          />
          <TextField
            fullWidth
            label="License State"
            placeholder="e.g. NY"
            inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
            value={licenseState}
            onChange={e => setLicenseState(e.target.value.toUpperCase().slice(0, 2))}
            sx={{ mb: 2 }}
            size="small"
          />
          <Button
            variant="outlined" component="label" fullWidth
            startIcon={<UploadIcon />}
            sx={{
              borderStyle: 'dashed', borderRadius: 2, py: 1.5,
              color: docFile ? '#10b981' : 'text.secondary',
              borderColor: docFile ? '#10b981' : 'divider',
            }}
          >
            {docFile ? `✓ ${docFile.name}` : 'Upload License / ID (PDF, JPG, PNG)'}
            <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setDocFile(e.target.files[0])} />
          </Button>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDocDialog(false)} disabled={uploading}>Cancel</Button>
          <Button
            variant="contained" onClick={handleDocSubmit} disabled={uploading}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, px: 3, borderRadius: 2 }}
          >
            {uploading ? <CircularProgress size={20} color="inherit" /> : 'Submit Documents'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ────────────────────────────────── */}
      <Snackbar
        open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{ borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
