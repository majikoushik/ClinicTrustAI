import React, { useState, useTransition } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Button, TextField, Typography, Grid, Alert,
  CircularProgress, Stepper, Step, StepLabel, Card, CardContent,
  Divider, InputAdornment, IconButton, LinearProgress, Link, Chip
} from '@mui/material';
import {
  CheckCircle as CheckIcon, Email as EmailIcon,
  Visibility, VisibilityOff, ArrowBack as BackIcon, LocalHospital as NpiIcon,
  Person as PersonIcon, Business as OrgIcon
} from '@mui/icons-material';
import onboardingService from '../../services/onboardingService';
import { authStorage } from '../../utils/storageUtils';

const _RAW = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE = _RAW.replace(/\/api$/, '');
const STEPS = ['Find Your NPI', 'Account Setup', 'Verify Email'];
function passwordStrength(p) {
  if (!p) return { level: 0, label: '', color: 'grey' };
  if (p.length < 8) return { level: 1, label: 'Too short', color: 'error' };
  if (p.length < 12) return { level: 2, label: 'Fair', color: 'warning' };
  return { level: 3, label: 'Strong', color: 'success' };
}

export default function Register() {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('doctor');
  const [npiInput, setNpiInput] = useState('');
  const [npiLoading, setNpiLoading] = useState(false);
  const [npiResult, setNpiResult] = useState(null);
  const [npiError, setNpiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [, setRegisteredToken] = useState('');
  const [error, setError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [npiStatus, setNpiStatus] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    organization: '', phone: '', city: '', state: '',
  });

  const handleNpiLookup = async () => {
    if (!/^\d{10}$/.test(npiInput)) {
      setNpiError('NPI must be exactly 10 digits');
      return;
    }
    setNpiLoading(true);
    setNpiError('');
    setNpiResult(null);
    setNpiStatus('');
    try {
      const res = await onboardingService.lookupNpi(npiInput);
      if (res.alreadyRegistered) {
        setNpiStatus(res.npiStatus || '');
        setNpiError(res.message || 'This NPI is already registered.');
      } else {
        setNpiResult(res.data);
      }
    } catch (err) {
      setNpiError(err.response?.data?.error || 'NPI not found. Please check the number and try again.');
    } finally {
      setNpiLoading(false);
    }
  };

  const handleNpiConfirm = () => {
    if (npiResult) {
      setForm(prev => ({
        ...prev,
        name: npiResult.name || prev.name,
        organization: npiResult.organizationName || prev.organization,
        phone: npiResult.address?.phone || prev.phone,
        city: npiResult.address?.city || prev.city,
        state: npiResult.address?.state || prev.state,
      }));
    }
    setStep(1);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        firstName: form.name.split(' ')[0],
        lastName: form.name.split(' ').slice(1).join(' ') || form.name.split(' ')[0],
        email: form.email,
        password: form.password,
        role,
        organization: form.organization || form.name,
        specialty: npiResult?.specialty || '',
        npi: npiResult?.npi || null,
        npiData: npiResult || null,
        credential: npiResult?.credential || '',
        phone: form.phone,
        address: { line1: '', city: form.city, state: form.state, zip: '' },
      };
      const { data } = await axios.post(`${API_BASE}/api/auth/register`, payload);
      if (data.success) {
        authStorage.set('token', data.token);
        setRegisteredEmail(form.email);
        setRegisteredToken(data.token);
        setStep(2);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      const serverError = err.response?.data?.error || 'Registration failed. Please try again.';
      const serverNpiStatus = err.response?.data?.npiStatus;
      if (serverNpiStatus) {
        // NPI conflict — go back to step 0 and show the status-aware card
        setNpiStatus(serverNpiStatus);
        setNpiError(serverError);
        setNpiResult(null);
        setStep(0);
      } else {
        setError(serverError);
        if (serverError === 'Email already registered') {
          setEmailExists(true);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    try {
      await onboardingService.resendVerification();
      setResendMsg('success');
      let t = 60;
      setResendCooldown(t);
      const iv = setInterval(() => {
        t -= 1;
        setResendCooldown(t);
        if (t <= 0) clearInterval(iv);
      }, 1000);
    } catch (e) {
      console.error(e);
      setResendMsg('error');
    }
  };

  const pwStrength = passwordStrength(form.password);

  return (
    <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map(label => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* Step 0: NPI Lookup */}
      {step === 0 && (
        <Box>
          <Typography variant="h5" fontWeight={700} mb={0.5}>Find Your NPI</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Your NPI is verified against the national NPPES registry to ensure security.
          </Typography>

          {/* Role selector */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {[['doctor','Doctor'],['clinic','Clinic'],['hospital','Hospital'],['lab','Lab']].map(([val, label]) => (
              <Chip
                key={val} label={label} clickable
                color={role === val ? 'primary' : 'default'}
                variant={role === val ? 'filled' : 'outlined'}
                onClick={() => setRole(val)}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth label="NPI Number" value={npiInput}
              onChange={e => { setNpiInput(e.target.value.replace(/\D/g, '').slice(0, 10)); setNpiError(''); setNpiResult(null); setNpiStatus(''); }}
              placeholder="10-digit NPI number"
              onKeyDown={e => e.key === 'Enter' && handleNpiLookup()}
              InputProps={{ startAdornment: <InputAdornment position="start"><NpiIcon color="action" /></InputAdornment> }}
            />
            <Button variant="contained" onClick={handleNpiLookup} disabled={npiLoading || npiInput.length !== 10} sx={{ minWidth: 100, px: 2 }}>
              {npiLoading ? <CircularProgress size={20} color="inherit" /> : 'Look Up'}
            </Button>
          </Box>

          {npiError && !npiStatus && (
            <Alert severity="error" sx={{ mb: 2 }}>{npiError}</Alert>
          )}

          {npiError && npiStatus && (
            <Card variant="outlined" sx={{ mb: 2, borderColor: npiStatus === 'verified' ? 'success.main' : 'warning.main', bgcolor: npiStatus === 'verified' ? 'success.50' : 'warning.50' }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography fontWeight={700} color={npiStatus === 'verified' ? 'success.dark' : 'warning.dark'} mb={0.5}>
                  NPI Already Registered
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>{npiError}</Typography>
                {npiStatus === 'pending_email' ? (
                  <Button
                    variant="contained" size="small" component={RouterLink} to="/login"
                    sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
                  >
                    Sign In &amp; Verify Email
                  </Button>
                ) : (
                  <Button variant="outlined" size="small" component={RouterLink} to="/login">
                    Sign In
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {npiResult && (
            <Card variant="outlined" sx={{ mb: 2, borderColor: 'success.main', bgcolor: 'success.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckIcon color="success" />
                  <Typography fontWeight={700} color="success.main">NPI Found</Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>{npiResult.name}{npiResult.credential ? `, ${npiResult.credential}` : ''}</Typography>
                <Typography color="text.secondary">{npiResult.specialty}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {[npiResult.address?.city, npiResult.address?.state].filter(Boolean).join(', ')}
                </Typography>
                <Typography variant="caption" color="text.disabled">NPI: {npiResult.npi}</Typography>
              </CardContent>
            </Card>
          )}

          <Button
            fullWidth variant="contained" size="large"
            disabled={!npiResult}
            onClick={handleNpiConfirm}
            sx={{ mb: 1 }}
          >
            Yes, that's me — Continue
          </Button>

          {['clinic','hospital','lab'].includes(role) && (
            <Button fullWidth variant="text" color="inherit" size="small"
              onClick={() => setStep(1)}
              sx={{ color: 'text.secondary' }}
            >
              Skip NPI lookup
            </Button>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" textAlign="center" color="text.secondary" mb={1}>
            NPI required for doctors. Your NPI is verified against the national NPPES registry.
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">Sign in</Link>
          </Typography>
        </Box>
      )}

      {/* Step 1: Account Setup */}
      {step === 1 && (
        <Box>
          <Button startIcon={<BackIcon />} onClick={() => setStep(0)} sx={{ mb: 2 }} size="small">Back</Button>
          <Typography variant="h5" fontWeight={700} mb={0.5}>Create Your Account</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {npiResult ? 'We pre-filled your details from the NPPES registry. Review and complete.' : 'Fill in your details to create your account.'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              {emailExists && (
                <> — <Link component={RouterLink} to="/login">Sign in instead</Link></>
              )}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Full Name"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Email Address" type="email"
                value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setEmailExists(false); setError(''); }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Organization / Practice Name"
                value={form.organization} onChange={e => setForm(p => ({ ...p, organization: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start"><OrgIcon color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Phone Number" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={7}>
              <TextField fullWidth label="City" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              />
            </Grid>
            <Grid item xs={5}>
              <TextField fullWidth label="State" value={form.state}
                onChange={e => setForm(p => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(s => !s)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              {form.password && (
                <Box sx={{ mt: 0.5 }}>
                  <LinearProgress variant="determinate" value={(pwStrength.level / 3) * 100}
                    color={pwStrength.color} sx={{ height: 4, borderRadius: 2 }} />
                  <Typography variant="caption" color={`${pwStrength.color}.main`}>{pwStrength.label}</Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                error={!!(form.confirmPassword && form.password !== form.confirmPassword)}
                helperText={form.confirmPassword && form.password !== form.confirmPassword ? 'Passwords do not match' : ''}
              />
            </Grid>
          </Grid>

          <Button fullWidth variant="contained" size="large" sx={{ mt: 3 }}
            disabled={submitting} onClick={handleSubmit}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
          </Button>
        </Box>
      )}

      {/* Step 2: Check Email */}
      {step === 2 && (
        <Box textAlign="center">
          <Box sx={{ bgcolor: 'primary.50', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <EmailIcon sx={{ fontSize: 44, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" fontWeight={700} mb={1}>Check your inbox</Typography>
          <Typography color="text.secondary" mb={1}>
            We've sent a verification link to:
          </Typography>
          <Typography fontWeight={700} color="primary.main" mb={3}>{registeredEmail}</Typography>
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            Click the link in the email to verify your account, then sign in to continue your onboarding.
          </Alert>
          {resendMsg === 'success' && (
            <Alert severity="success" sx={{ mb: 2 }}>Verification email resent! Check your inbox.</Alert>
          )}
          {resendMsg === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>Failed to resend email. Please try again.</Alert>
          )}
          <Button variant="outlined" onClick={handleResend} disabled={resendCooldown > 0} sx={{ mb: 2 }}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive it? Resend"}
          </Button>
          <br />
          <Button variant="text" onClick={() => startTransition(() => navigate('/login'))}>
            Go to Sign In
          </Button>
        </Box>
      )}
    </Box>
  );
}
