import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Button, Paper, Switch, Divider, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, InputAdornment, IconButton, Tabs, Tab, Grid, Card,
  CardContent, CardHeader, Chip, Select, MenuItem, FormControl,
  InputLabel, Slider, Avatar, Badge, Tooltip, LinearProgress,
  FormHelperText, CircularProgress, Autocomplete
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  DataUsage as DataUsageIcon,
  Person as PersonIcon,
  LocalHospital as PracticeIcon,
  CompareArrows as ReferralIcon,
  SmartToy as AIIcon,
  CameraAlt as CameraIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  Schedule as ScheduleIcon,
  Psychology as PsychologyIcon,
  Mic as MicIcon,
  Analytics as AnalyticsIcon,
  Token as TokenIcon,
  Message as MessageIcon,
  Verified as VerifiedIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Fax as FaxIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';
import { updateUserProfile, updateProfileImage, getUserSettings, updateUserSettings } from '../../services/userService';
import { post } from '../../utils/apiUtils';
import { authStorage } from '../../utils/storageUtils';
import { useAuth } from '../../contexts/AuthContext';
import { setDateFormat } from '../../utils/dateFormatter';

// ── helpers ──────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function SectionCard({ title, icon, children, action }) {
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader
        avatar={icon}
        title={<Typography variant="subtitle1" fontWeight={600}>{title}</Typography>}
        action={action}
        sx={{ pb: 0 }}
      />
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SettingRow({ primary, secondary, control, divider = true }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
        <Box sx={{ flex: 1, pr: 2 }}>
          <Typography variant="body2" fontWeight={500}>{primary}</Typography>
          {secondary && <Typography variant="caption" color="text.secondary">{secondary}</Typography>}
        </Box>
        <Box sx={{ flexShrink: 0 }}>{control}</Box>
      </Box>
      {divider && <Divider />}
    </>
  );
}

// ── password strength ─────────────────────────────────────────────────────────

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'error' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['error', 'error', 'warning', 'info', 'success', 'success'];
  return { score, label: labels[score] || 'Excellent', color: colors[score] || 'success' };
}

// ── chip input ────────────────────────────────────────────────────────────────

function ChipInput({ label, values, onChange, suggestions = [] }) {
  const [input, setInput] = useState('');
  const add = (val) => {
    const v = val.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        {values.map((v) => (
          <Chip key={v} label={v} size="small" onDelete={() => onChange(values.filter((x) => x !== v))} />
        ))}
      </Box>
      <Autocomplete
        freeSolo
        options={suggestions.filter((s) => !values.includes(s))}
        inputValue={input}
        onInputChange={(_, v) => setInput(v)}
        onChange={(_, v) => v && add(v)}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label={label}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(input); }
            }}
            InputProps={{ ...params.InputProps, endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => add(input)} disabled={!input.trim()}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )}}
          />
        )}
      />
    </Box>
  );
}

// ── constants ─────────────────────────────────────────────────────────────────

const SPECIALTIES = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Pulmonology',
  'Gastroenterology', 'Nephrology', 'Endocrinology', 'Rheumatology',
  'Dermatology', 'Psychiatry', 'Ophthalmology', 'Urology', 'ENT',
  'Internal Medicine', 'Family Medicine', 'Pediatrics', 'Geriatrics',
  'Emergency Medicine', 'Radiology', 'Pathology', 'Anesthesiology',
  'Obstetrics & Gynecology', 'Vascular Surgery', 'Thoracic Surgery',
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'Mandarin', 'Cantonese', 'Hindi',
  'Arabic', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'German',
  'Italian', 'Vietnamese', 'Tagalog',
];

const INSURANCE_PLANS = [
  'Medicare', 'Medicaid', 'Blue Cross Blue Shield', 'Aetna', 'Cigna',
  'UnitedHealthcare', 'Humana', 'Anthem', 'Tricare', 'Kaiser Permanente',
  'AmeriHealth', 'Centene', 'Molina Healthcare',
];

const CREDENTIALS = ['MD', 'DO', 'NP', 'PA', 'MBBS', 'FACS', 'FACC', 'FACP', 'PhD', 'PharmD'];
const AGE_GROUPS = ['Neonatal (0-1 mo)', 'Infant (1-12 mo)', 'Pediatric (1-12 yr)', 'Adolescent (13-17)', 'Adult (18-64)', 'Geriatric (65+)'];

// ── default state ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILE = {
  firstName: '', lastName: '', email: '', specialty: '', credential: '',
  phone: '', fax: '', organization: '', bio: '', npi: '',
};

const DEFAULT_DISPLAY = {
  dateFormat: 'MM/DD/YYYY',
};

const DEFAULT_PRACTICE = {
  acceptingNewPatients: true, maxNewPatientsPerWeek: 10,
  telehealthAvailable: false, telehealthOnly: false,
  consultationHours: '9:00 AM – 5:00 PM Mon–Fri',
  languagesSpoken: ['English'],
  ageGroupsTreated: ['Adult (18-64)'],
  insuranceAccepted: [],
  boardCertifications: [],
  hospitalAffiliations: [],
  conditionsTreated: [],
};

const DEFAULT_REFERRAL_PREFS = {
  autoAcceptFromVerified: false,
  maxReferralsPerWeek: 20,
  targetResponseHours: '24',
  acceptedIncomingSpecialties: [],
  notificationTiming: 'immediate',
  autoDeclineWhenFull: true,
  outOfNetworkHandling: 'review',
  requireReferralNote: true,
  preferredReferralSources: [],
};

const DEFAULT_NOTIFICATIONS = {
  newReferral: true, referralAccepted: true, referralDeclined: true,
  referralCompleted: true, secureMessage: true, unreadMessageDigest: true,
  tokenEarned: true, tokenSpent: false, tokenStaked: false,
  aiAlertCritical: true, aiAlertHigh: true, aiAlertMedium: false, aiAlertLow: false,
  priorAuthUpdate: true, blockchainEvent: false, analyticsReady: true,
  productUpdates: false,
  emailDigestFrequency: 'realtime',
  inAppSound: true,
};

const DEFAULT_AI_PREFS = {
  enableAIMatching: true,
  paAnalysisMode: 'auto',
  showClinicalRecommendations: 'always',
  ambientAutoSave: true,
  ambientOutputFormat: 'SOAP',
  alertMinSeverity: 'high',
  clinicalPanelDefault: 'collapsed',
  alertRefreshMinutes: 15,
  includeAIInReferralNotes: true,
  riskScoreDisplayMode: 'numeric_with_tier',
  feedbackOnAlerts: true,
};

const DEFAULT_SECURITY = {
  twoFactorEnabled: false,
  loginNotifications: true,
  sessionTimeoutMinutes: 60,
  passwordExpiryDays: 90,
  shareAnonymizedData: true,
  allowAIAnalysis: true,
  participateInResearch: false,
  dataRetentionMonths: 24,
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { currentUser, refreshUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [display, setDisplay] = useState(DEFAULT_DISPLAY);
  const [practice, setPractice] = useState(DEFAULT_PRACTICE);
  const [referralPrefs, setReferralPrefs] = useState(DEFAULT_REFERRAL_PREFS);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [aiPrefs, setAiPrefs] = useState(DEFAULT_AI_PREFS);
  const [security, setSecurity] = useState(DEFAULT_SECURITY);

  // password change
  const [pwDialog, setPwDialog] = useState(false);
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // avatar — preview is a local blob URL; avatarFile is the raw File to upload
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [kycVerified, setKycVerified] = useState(false);

  // ── load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const storedUser = authStorage.get('user') || {};
        setKycVerified(storedUser.kycVerified || false);
        // Prefer the live value from AuthContext (currentUser) — it reflects the
        // most-recent DB value including photos uploaded in previous sessions.
        const liveImage = currentUser?.profileImage || storedUser.profileImage;
        if (liveImage) setAvatarPreview(liveImage);

        // Profile from stored auth user
        setProfile({
          firstName: storedUser.firstName || '',
          lastName: storedUser.lastName || '',
          email: storedUser.email || '',
          specialty: storedUser.specialty || '',
          credential: storedUser.credential || '',
          phone: storedUser.phone || '',
          fax: storedUser.fax || '',
          organization: storedUser.organization || '',
          bio: storedUser.bio || '',
          npi: storedUser.npi || storedUser.kycDocuments?.licenseNumber || '',
        });

        // Try to load persisted settings
        try {
          const saved = await getUserSettings();
          const s = saved?.data || saved || {};
          if (s.display) {
            const merged = { ...DEFAULT_DISPLAY, ...s.display };
            setDisplay(merged);
            setDateFormat(merged.dateFormat);
          }
          if (s.practice) setPractice({ ...DEFAULT_PRACTICE, ...s.practice });
          if (s.referralPrefs) setReferralPrefs({ ...DEFAULT_REFERRAL_PREFS, ...s.referralPrefs });
          if (s.notifications) setNotifications({ ...DEFAULT_NOTIFICATIONS, ...s.notifications });
          if (s.aiPrefs) setAiPrefs({ ...DEFAULT_AI_PREFS, ...s.aiPrefs });
          if (s.security) setSecurity({ ...DEFAULT_SECURITY, ...s.security });
        } catch (_) {
          // silently use defaults if settings not persisted yet
        }
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── flash helpers ───────────────────────────────────────────────────────────
  const flashSuccess = (msg) => {
    setSaveSuccess(msg);
    setSaveError('');
    setTimeout(() => setSaveSuccess(''), 3500);
  };
  const flashError = (msg) => {
    setSaveError(msg);
    setSaveSuccess('');
    setTimeout(() => setSaveError(''), 5000);
  };

  // ── save handlers ───────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    try {
      // 1. Upload new avatar first (if one was selected)
      let savedImageUrl = null;
      if (avatarFile) {
        const imgResult = await updateProfileImage(avatarFile);
        // userService returns the full response envelope; extract the URL
        savedImageUrl = imgResult?.profileImage || imgResult?.data?.profileImage || null;
        setAvatarFile(null); // clear dirty state

        // Replace blob preview with the persistent server URL
        if (savedImageUrl) {
          const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
          const fullUrl = savedImageUrl.startsWith('/uploads/') ? `${API_ORIGIN}${savedImageUrl}` : savedImageUrl;
          if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(fullUrl);
        }
      }

      // 2. Save the rest of the profile
      await updateUserProfile({
        firstName: profile.firstName, lastName: profile.lastName,
        specialty: profile.specialty, credential: profile.credential,
        phone: profile.phone, fax: profile.fax, bio: profile.bio,
      });

      // 2b. Save display preferences (date format, etc.) alongside the profile
      const currentSettings = await getUserSettings().catch(() => ({}));
      const currentSettingsData = currentSettings?.data || currentSettings || {};
      await updateUserSettings({ ...currentSettingsData, display });
      setDateFormat(display.dateFormat);

      // 3. Update local auth storage
      const stored = authStorage.get('user') || {};
      authStorage.set('user', {
        ...stored,
        ...profile,
        ...(savedImageUrl ? { profileImage: savedImageUrl } : {}),
      });

      // 4. Refresh AuthContext so top bar + all consumers re-render with latest data
      await refreshUser();

      flashSuccess('Profile saved.');
    } catch (e) {
      console.error('saveProfile error', e);
      flashError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (section, data, label) => {
    setSaving(true);
    try {
      const current = await getUserSettings().catch(() => ({}));
      const currentData = current?.data || current || {};
      await updateUserSettings({ ...currentData, [section]: data });
      flashSuccess(`${label} saved.`);
    } catch (e) { flashError(`Failed to save ${label}.`); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    // Revoke previous blob URL to avoid memory leak
    if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── password change ─────────────────────────────────────────────────────────
  const openPwDialog = () => {
    setPwDialog(true); setPwError(''); setPwSuccess(false);
    setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  const closePwDialog = () => setPwDialog(false);

  const handleChangePassword = async () => {
    setPwError('');
    if (!pwData.currentPassword) return setPwError('Current password is required');
    if (pwData.newPassword.length < 8) return setPwError('New password must be at least 8 characters');
    if (pwData.newPassword !== pwData.confirmPassword) return setPwError('Passwords do not match');
    const strength = passwordStrength(pwData.newPassword);
    if (strength.score < 2) return setPwError('Password is too weak. Add uppercase letters, numbers, or symbols.');

    setPwSaving(true);
    try {
      await post('/auth/change-password', { currentPassword: pwData.currentPassword, newPassword: pwData.newPassword });
      setPwSuccess(true);
      setTimeout(() => { closePwDialog(); setPwSuccess(false); }, 2000);
    } catch (e) {
      setPwError(e?.response?.data?.error || 'Incorrect current password or server error.');
    } finally { setPwSaving(false); }
  };

  const pwStrength = passwordStrength(pwData.newPassword);

  // ── generic updaters ────────────────────────────────────────────────────────
  const setP = useCallback((k, v) => setProfile((s) => ({ ...s, [k]: v })), []);
  const setDisp = useCallback((k, v) => setDisplay((s) => ({ ...s, [k]: v })), []);
  const setPr = useCallback((k, v) => setPractice((s) => ({ ...s, [k]: v })), []);
  const setRp = useCallback((k, v) => setReferralPrefs((s) => ({ ...s, [k]: v })), []);
  const setN = useCallback((k, v) => setNotifications((s) => ({ ...s, [k]: v })), []);
  const setAi = useCallback((k, v) => setAiPrefs((s) => ({ ...s, [k]: v })), []);
  const setSec = useCallback((k, v) => setSecurity((s) => ({ ...s, [k]: v })), []);

  // ── render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="pulse" message="Loading settings..." />
      </Box>
    );
  }

  const tabConfig = [
    { label: 'Profile', icon: <PersonIcon fontSize="small" /> },
    { label: 'Practice', icon: <PracticeIcon fontSize="small" /> },
    { label: 'Referral Prefs', icon: <ReferralIcon fontSize="small" /> },
    { label: 'Notifications', icon: <NotificationsIcon fontSize="small" /> },
    { label: 'AI & Tools', icon: <AIIcon fontSize="small" /> },
    { label: 'Security', icon: <SecurityIcon fontSize="small" /> },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your profile, practice details, referral preferences, and account security.
        </Typography>
      </Box>

      {saveSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess('')}>{saveSuccess}</Alert>}
      {saveError  && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setSaveError('')}>{saveError}</Alert>}

      <Paper elevation={0} variant="outlined">
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabConfig.map((t, i) => (
              <Tab
                key={i}
                icon={t.icon}
                iconPosition="start"
                label={t.label}
                sx={{ minHeight: 56, textTransform: 'none', fontWeight: 500 }}
              />
            ))}
          </Tabs>
        </Box>

        {/* ── TAB 0: Profile ─────────────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: { xs: 2, md: 4 } }}>

            {/* Avatar */}
            <SectionCard title="Profile Photo" icon={<PersonIcon color="primary" />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Tooltip title="Upload photo">
                      <IconButton
                        size="small"
                        component="label"
                        sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                      >
                        <CameraIcon sx={{ fontSize: 16 }} />
                        <input hidden accept="image/*" type="file" onChange={handleAvatarChange} />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <Avatar
                    src={avatarPreview}
                    sx={{ width: 88, height: 88, fontSize: 32, bgcolor: 'primary.main' }}
                  >
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {profile.firstName} {profile.lastName}
                    {kycVerified && (
                      <Tooltip title="KYC Verified Provider">
                        <VerifiedIcon sx={{ ml: 1, fontSize: 18, color: 'success.main', verticalAlign: 'middle' }} />
                      </Tooltip>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{profile.credential} · {profile.specialty}</Typography>
                  <Typography variant="caption" color="text.secondary">{profile.organization}</Typography>
                </Box>
              </Box>
            </SectionCard>

            {/* Personal Info */}
            <SectionCard title="Personal & Professional Info" icon={<EditIcon color="primary" />}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="First Name" size="small" value={profile.firstName} onChange={(e) => setP('firstName', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Last Name" size="small" value={profile.lastName} onChange={(e) => setP('lastName', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email Address" size="small" value={profile.email} disabled
                    helperText="Contact support to change your email address"
                    InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" color="action" /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Credential</InputLabel>
                    <Select label="Credential" value={profile.credential} onChange={(e) => setP('credential', e.target.value)}>
                      {CREDENTIALS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label="NPI Number" size="small" value={profile.npi} disabled
                    helperText="NPI is set during KYC verification"
                    InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" color="action" /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Primary Specialty</InputLabel>
                    <Select label="Primary Specialty" value={profile.specialty} onChange={(e) => setP('specialty', e.target.value)}>
                      {SPECIALTIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Organization / Practice Name" size="small" value={profile.organization} disabled
                    helperText="Managed by your organization admin" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone" size="small" value={profile.phone} onChange={(e) => setP('phone', e.target.value)}
                    placeholder="(555) 000-0000"
                    InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" color="action" /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Fax" size="small" value={profile.fax} onChange={(e) => setP('fax', e.target.value)}
                    placeholder="(555) 000-0001"
                    InputProps={{ startAdornment: <InputAdornment position="start"><FaxIcon fontSize="small" color="action" /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={3} label="Short Bio / Summary" size="small"
                    value={profile.bio} onChange={(e) => setP('bio', e.target.value)}
                    placeholder="Brief professional summary visible to referring providers..."
                    inputProps={{ maxLength: 500 }}
                    helperText={`${profile.bio.length}/500 characters`} />
                </Grid>
              </Grid>
            </SectionCard>

            {/* Display Preferences */}
            <SectionCard title="Display Preferences" icon={<CalendarMonthIcon color="primary" />}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Date Format</InputLabel>
                    <Select
                      label="Date Format"
                      value={display.dateFormat}
                      onChange={(e) => {
                        setDisp('dateFormat', e.target.value);
                        setDateFormat(e.target.value); // live preview across the app immediately
                      }}
                    >
                      <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (e.g. 12/31/2024)</MenuItem>
                      <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (e.g. 31/12/2024)</MenuItem>
                      <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2024-12-31)</MenuItem>
                    </Select>
                    <FormHelperText>
                      Controls how dates are displayed throughout your provider portal
                    </FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>
            </SectionCard>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save Profile'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ── TAB 1: Practice ───────────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: { xs: 2, md: 4 } }}>

            <SectionCard title="Availability" icon={<ScheduleIcon color="primary" />}>
              <SettingRow
                primary="Accepting New Patients"
                secondary="Allow new patients to be referred to you"
                control={<Switch checked={practice.acceptingNewPatients} onChange={(e) => setPr('acceptingNewPatients', e.target.checked)} />}
              />
              {practice.acceptingNewPatients && (
                <Box sx={{ py: 1.5 }}>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    Max new referrals per week: <strong>{practice.maxNewPatientsPerWeek}</strong>
                  </Typography>
                  <Slider
                    value={practice.maxNewPatientsPerWeek}
                    onChange={(_, v) => setPr('maxNewPatientsPerWeek', v)}
                    min={1} max={60} step={1}
                    marks={[{ value: 1, label: '1' }, { value: 20, label: '20' }, { value: 40, label: '40' }, { value: 60, label: '60' }]}
                    sx={{ mt: 1 }}
                  />
                  <Divider sx={{ mt: 2 }} />
                </Box>
              )}
              <SettingRow
                primary="Telehealth Available"
                secondary="Accept virtual consultation referrals"
                control={<Switch checked={practice.telehealthAvailable} onChange={(e) => setPr('telehealthAvailable', e.target.checked)} />}
              />
              {practice.telehealthAvailable && (
                <>
                  <SettingRow
                    primary="Telehealth Only"
                    secondary="Only accept virtual consultations — no in-person"
                    control={<Switch checked={practice.telehealthOnly} onChange={(e) => setPr('telehealthOnly', e.target.checked)} />}
                    divider={false}
                  />
                </>
              )}
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth size="small" label="Consultation Hours"
                  value={practice.consultationHours}
                  onChange={(e) => setPr('consultationHours', e.target.value)}
                  placeholder="e.g. 9:00 AM – 5:00 PM Mon–Fri"
                  helperText="Visible to referring providers when matching"
                />
              </Box>
            </SectionCard>

            <SectionCard title="Patient Demographics" icon={<PersonIcon color="primary" />}>
              <Typography variant="body2" fontWeight={500} gutterBottom>Age Groups Treated</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {AGE_GROUPS.map((ag) => {
                  const selected = practice.ageGroupsTreated.includes(ag);
                  return (
                    <Chip
                      key={ag}
                      label={ag}
                      size="small"
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      onClick={() => setPr('ageGroupsTreated', selected
                        ? practice.ageGroupsTreated.filter((x) => x !== ag)
                        : [...practice.ageGroupsTreated, ag])}
                    />
                  );
                })}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" fontWeight={500} gutterBottom>Languages Spoken</Typography>
              <ChipInput
                label="Add language"
                values={practice.languagesSpoken}
                onChange={(v) => setPr('languagesSpoken', v)}
                suggestions={LANGUAGES}
              />
            </SectionCard>

            <SectionCard title="Insurance & Credentials" icon={<VerifiedIcon color="primary" />}>
              <Typography variant="body2" fontWeight={500} gutterBottom>Insurance Accepted</Typography>
              <ChipInput
                label="Add insurance plan"
                values={practice.insuranceAccepted}
                onChange={(v) => setPr('insuranceAccepted', v)}
                suggestions={INSURANCE_PLANS}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight={500} gutterBottom>Board Certifications</Typography>
              <ChipInput
                label="Add certification"
                values={practice.boardCertifications}
                onChange={(v) => setPr('boardCertifications', v)}
                suggestions={['ABIM', 'ABFM', 'ABEM', 'ABS', 'ABR', 'ABN', 'ABOG', 'ABOS']}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight={500} gutterBottom>Hospital Affiliations</Typography>
              <ChipInput
                label="Add hospital"
                values={practice.hospitalAffiliations}
                onChange={(v) => setPr('hospitalAffiliations', v)}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight={500} gutterBottom>Conditions Treated</Typography>
              <ChipInput
                label="Add condition"
                values={practice.conditionsTreated}
                onChange={(v) => setPr('conditionsTreated', v)}
                suggestions={['Diabetes', 'Hypertension', 'Heart Failure', 'COPD', 'Atrial Fibrillation', 'CKD', 'Osteoarthritis', 'Depression', 'Anxiety', 'GERD']}
              />
            </SectionCard>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={() => saveSettings('practice', practice, 'Practice settings')} disabled={saving}>
                {saving ? 'Saving…' : 'Save Practice Settings'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ── TAB 2: Referral Prefs ─────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: { xs: 2, md: 4 } }}>

            <SectionCard title="Incoming Referral Handling" icon={<ReferralIcon color="primary" />}>
              <SettingRow
                primary="Auto-Accept from Verified Providers"
                secondary="Automatically accept referrals from KYC-verified providers in your network"
                control={<Switch checked={referralPrefs.autoAcceptFromVerified} onChange={(e) => setRp('autoAcceptFromVerified', e.target.checked)} />}
              />
              <SettingRow
                primary="Auto-Decline When at Capacity"
                secondary="Automatically decline new referrals when weekly maximum is reached"
                control={<Switch checked={referralPrefs.autoDeclineWhenFull} onChange={(e) => setRp('autoDeclineWhenFull', e.target.checked)} />}
              />
              <SettingRow
                primary="Require Referral Clinical Note"
                secondary="Require referring provider to include clinical notes with each referral"
                control={<Switch checked={referralPrefs.requireReferralNote} onChange={(e) => setRp('requireReferralNote', e.target.checked)} />}
                divider={false}
              />
            </SectionCard>

            <SectionCard title="Capacity & Response" icon={<ScheduleIcon color="primary" />}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  Max referrals per week: <strong>{referralPrefs.maxReferralsPerWeek}</strong>
                </Typography>
                <Slider
                  value={referralPrefs.maxReferralsPerWeek}
                  onChange={(_, v) => setRp('maxReferralsPerWeek', v)}
                  min={1} max={100} step={1}
                  marks={[{ value: 1, label: '1' }, { value: 25, label: '25' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <FormControl fullWidth size="small">
                <InputLabel>Target Response Time</InputLabel>
                <Select
                  label="Target Response Time"
                  value={referralPrefs.targetResponseHours}
                  onChange={(e) => setRp('targetResponseHours', e.target.value)}
                >
                  <MenuItem value="4">Same day (within 4 hours)</MenuItem>
                  <MenuItem value="24">Within 24 hours</MenuItem>
                  <MenuItem value="48">Within 48 hours</MenuItem>
                  <MenuItem value="72">Within 72 hours</MenuItem>
                  <MenuItem value="168">Within 1 week</MenuItem>
                </Select>
                <FormHelperText>Shown to referring providers when you appear in match results</FormHelperText>
              </FormControl>
            </SectionCard>

            <SectionCard title="Specialty Filtering" icon={<PracticeIcon color="primary" />}>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Accepted Incoming Specialties
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Only receive referrals from these referring specialties. Leave empty to accept all.
              </Typography>
              <ChipInput
                label="Add specialty"
                values={referralPrefs.acceptedIncomingSpecialties}
                onChange={(v) => setRp('acceptedIncomingSpecialties', v)}
                suggestions={SPECIALTIES}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight={500} gutterBottom>Preferred Referral Sources</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Tag providers or organizations you work closely with to prioritize their referrals.
              </Typography>
              <ChipInput
                label="Add provider or practice name"
                values={referralPrefs.preferredReferralSources}
                onChange={(v) => setRp('preferredReferralSources', v)}
              />
            </SectionCard>

            <SectionCard title="Out-of-Network Referrals" icon={<InfoIcon color="primary" />}>
              <FormControl fullWidth size="small">
                <InputLabel>Handling</InputLabel>
                <Select
                  label="Handling"
                  value={referralPrefs.outOfNetworkHandling}
                  onChange={(e) => setRp('outOfNetworkHandling', e.target.value)}
                >
                  <MenuItem value="accept">Always Accept</MenuItem>
                  <MenuItem value="review">Review Case-by-Case (Recommended)</MenuItem>
                  <MenuItem value="decline">Always Decline</MenuItem>
                </Select>
                <FormHelperText>Applies to referrals from providers outside your network</FormHelperText>
              </FormControl>
            </SectionCard>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={() => saveSettings('referralPrefs', referralPrefs, 'Referral preferences')} disabled={saving}>
                {saving ? 'Saving…' : 'Save Referral Preferences'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ── TAB 3: Notifications ──────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: { xs: 2, md: 4 } }}>

            <SectionCard title="Referral Events" icon={<ReferralIcon color="primary" />}>
              <SettingRow primary="New Referral Received"   secondary="Notify when a provider refers a patient to you"       control={<Switch checked={notifications.newReferral}        onChange={(e) => setN('newReferral', e.target.checked)} />} />
              <SettingRow primary="Referral Accepted"       secondary="Notify when the specialist accepts your referral"     control={<Switch checked={notifications.referralAccepted}   onChange={(e) => setN('referralAccepted', e.target.checked)} />} />
              <SettingRow primary="Referral Declined"       secondary="Notify when a referral is declined (with reason)"    control={<Switch checked={notifications.referralDeclined}   onChange={(e) => setN('referralDeclined', e.target.checked)} />} />
              <SettingRow primary="Referral Completed"      secondary="Notify when the care episode is marked complete"     control={<Switch checked={notifications.referralCompleted}  onChange={(e) => setN('referralCompleted', e.target.checked)} />} divider={false} />
            </SectionCard>

            <SectionCard title="Secure Messaging" icon={<MessageIcon color="primary" />}>
              <SettingRow primary="New Message"             secondary="Notify immediately when a new message arrives"       control={<Switch checked={notifications.secureMessage}      onChange={(e) => setN('secureMessage', e.target.checked)} />} />
              <SettingRow primary="Unread Message Digest"   secondary="Daily summary of unread messages in active threads" control={<Switch checked={notifications.unreadMessageDigest} onChange={(e) => setN('unreadMessageDigest', e.target.checked)} />} divider={false} />
            </SectionCard>

            <SectionCard title="AI Predictive Alerts" icon={<AIIcon color="primary" />}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Choose which severity levels trigger a notification when new alerts are generated for your patients.
              </Typography>
              <SettingRow primary="Critical Alerts"  secondary="Immediate review required — life-critical risk signals"    control={<Switch color="error"   checked={notifications.aiAlertCritical} onChange={(e) => setN('aiAlertCritical', e.target.checked)} />} />
              <SettingRow primary="High Severity"    secondary="Significant risk increase — action recommended within 24h" control={<Switch color="warning" checked={notifications.aiAlertHigh}     onChange={(e) => setN('aiAlertHigh', e.target.checked)} />} />
              <SettingRow primary="Medium Severity"  secondary="Care gap or moderate risk — schedule follow-up"           control={<Switch color="info"    checked={notifications.aiAlertMedium}   onChange={(e) => setN('aiAlertMedium', e.target.checked)} />} />
              <SettingRow primary="Low Severity"     secondary="Routine reminders and general wellness signals"           control={<Switch checked={notifications.aiAlertLow}     onChange={(e) => setN('aiAlertLow', e.target.checked)} />} divider={false} />
            </SectionCard>

            <SectionCard title="Token & Blockchain" icon={<TokenIcon color="primary" />}>
              <SettingRow primary="Tokens Earned"           secondary="Notify when you earn CTRUST tokens for actions"     control={<Switch checked={notifications.tokenEarned}        onChange={(e) => setN('tokenEarned', e.target.checked)} />} />
              <SettingRow primary="Tokens Spent"            secondary="Notify when you redeem tokens for services"        control={<Switch checked={notifications.tokenSpent}         onChange={(e) => setN('tokenSpent', e.target.checked)} />} />
              <SettingRow primary="Staking Events"          secondary="Notify when staked tokens mature or are released"  control={<Switch checked={notifications.tokenStaked}        onChange={(e) => setN('tokenStaked', e.target.checked)} />} />
              <SettingRow primary="Blockchain Events"       secondary="On-chain confirmations and wallet activity"        control={<Switch checked={notifications.blockchainEvent}    onChange={(e) => setN('blockchainEvent', e.target.checked)} />} divider={false} />
            </SectionCard>

            <SectionCard title="Other" icon={<AnalyticsIcon color="primary" />}>
              <SettingRow primary="Prior Auth Updates"      secondary="Status changes on prior authorization submissions"  control={<Switch checked={notifications.priorAuthUpdate}    onChange={(e) => setN('priorAuthUpdate', e.target.checked)} />} />
              <SettingRow primary="Analytics Reports Ready" secondary="When your monthly analytics snapshot is available" control={<Switch checked={notifications.analyticsReady}     onChange={(e) => setN('analyticsReady', e.target.checked)} />} />
              <SettingRow primary="Product Updates"         secondary="New features, improvements, and platform news"     control={<Switch checked={notifications.productUpdates}     onChange={(e) => setN('productUpdates', e.target.checked)} />} divider={false} />
            </SectionCard>

            <SectionCard title="Delivery Preferences" icon={<ScheduleIcon color="primary" />}>
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Email Digest Frequency</InputLabel>
                  <Select
                    label="Email Digest Frequency"
                    value={notifications.emailDigestFrequency}
                    onChange={(e) => setN('emailDigestFrequency', e.target.value)}
                  >
                    <MenuItem value="realtime">Real-time (send immediately)</MenuItem>
                    <MenuItem value="hourly">Hourly batched digest</MenuItem>
                    <MenuItem value="daily">Once daily (morning summary)</MenuItem>
                    <MenuItem value="weekly">Weekly summary</MenuItem>
                    <MenuItem value="off">Email off — in-app only</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <SettingRow
                primary="In-App Notification Sound"
                secondary="Play a sound when new in-app notifications arrive"
                control={<Switch checked={notifications.inAppSound} onChange={(e) => setN('inAppSound', e.target.checked)} />}
                divider={false}
              />
            </SectionCard>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={() => saveSettings('notifications', notifications, 'Notification settings')} disabled={saving}>
                {saving ? 'Saving…' : 'Save Notification Settings'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ── TAB 4: AI & Tools ─────────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ px: { xs: 2, md: 4 } }}>

            <Alert severity="info" sx={{ mb: 3 }} icon={<AIIcon />}>
              AI features use Azure OpenAI. Settings here control how AI assists you — not whether it can access your data (see Privacy in Security tab).
            </Alert>

            <SectionCard title="Referral Matching AI" icon={<ReferralIcon color="primary" />}>
              <SettingRow
                primary="AI-Powered Referral Matching"
                secondary="Use AI to rank and suggest specialist matches based on clinical compatibility and outcome history"
                control={<Switch checked={aiPrefs.enableAIMatching} onChange={(e) => setAi('enableAIMatching', e.target.checked)} />}
                divider={false}
              />
            </SectionCard>

            <SectionCard title="Prior Authorization Assistant" icon={<PsychologyIcon color="primary" />}>
              <FormControl fullWidth size="small">
                <InputLabel>PA Analysis Mode</InputLabel>
                <Select
                  label="PA Analysis Mode"
                  value={aiPrefs.paAnalysisMode}
                  onChange={(e) => setAi('paAnalysisMode', e.target.value)}
                >
                  <MenuItem value="auto">Auto-run on each referral submission</MenuItem>
                  <MenuItem value="manual">Manual trigger only</MenuItem>
                  <MenuItem value="off">Disabled</MenuItem>
                </Select>
                <FormHelperText>Controls when the AI analyzes a referral for prior authorization likelihood</FormHelperText>
              </FormControl>
              <Divider sx={{ my: 2 }} />
              <SettingRow
                primary="Include AI Summary in Referral Notes"
                secondary="Automatically append AI-generated clinical justification to outgoing referral notes"
                control={<Switch checked={aiPrefs.includeAIInReferralNotes} onChange={(e) => setAi('includeAIInReferralNotes', e.target.checked)} />}
                divider={false}
              />
            </SectionCard>

            <SectionCard title="Clinical Recommendation Panel" icon={<AIIcon color="primary" />}>
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Show Clinical Recommendations</InputLabel>
                  <Select
                    label="Show Clinical Recommendations"
                    value={aiPrefs.showClinicalRecommendations}
                    onChange={(e) => setAi('showClinicalRecommendations', e.target.value)}
                  >
                    <MenuItem value="always">Always visible in patient view</MenuItem>
                    <MenuItem value="on-demand">On-demand (click to reveal)</MenuItem>
                    <MenuItem value="off">Off</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <FormControl fullWidth size="small">
                <InputLabel>AI Assistant Panel Default State</InputLabel>
                <Select
                  label="AI Assistant Panel Default State"
                  value={aiPrefs.clinicalPanelDefault}
                  onChange={(e) => setAi('clinicalPanelDefault', e.target.value)}
                >
                  <MenuItem value="collapsed">Collapsed (click to open)</MenuItem>
                  <MenuItem value="expanded">Expanded by default</MenuItem>
                  <MenuItem value="floating">Floating button</MenuItem>
                </Select>
              </FormControl>
            </SectionCard>

            <SectionCard title="Ambient AI (Voice Documentation)" icon={<MicIcon color="primary" />}>
              <SettingRow
                primary="Auto-Save Ambient Sessions"
                secondary="Automatically save generated SOAP notes and referral drafts when a session ends"
                control={<Switch checked={aiPrefs.ambientAutoSave} onChange={(e) => setAi('ambientAutoSave', e.target.checked)} />}
              />
              <Box sx={{ mt: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Preferred Output Format</InputLabel>
                  <Select
                    label="Preferred Output Format"
                    value={aiPrefs.ambientOutputFormat}
                    onChange={(e) => setAi('ambientOutputFormat', e.target.value)}
                  >
                    <MenuItem value="SOAP">SOAP Note (Subjective, Objective, Assessment, Plan)</MenuItem>
                    <MenuItem value="narrative">Narrative summary</MenuItem>
                    <MenuItem value="checklist">Structured checklist</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </SectionCard>

            <SectionCard title="Predictive Alerts" icon={<WarningIcon color="primary" />}>
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Minimum Severity to Surface</InputLabel>
                  <Select
                    label="Minimum Severity to Surface"
                    value={aiPrefs.alertMinSeverity}
                    onChange={(e) => setAi('alertMinSeverity', e.target.value)}
                  >
                    <MenuItem value="critical">Critical only</MenuItem>
                    <MenuItem value="high">High and above (Recommended)</MenuItem>
                    <MenuItem value="medium">Medium and above</MenuItem>
                    <MenuItem value="low">All alerts</MenuItem>
                  </Select>
                  <FormHelperText>Alerts below this threshold are generated but hidden from your dashboard</FormHelperText>
                </FormControl>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Alert Refresh Interval</InputLabel>
                  <Select
                    label="Alert Refresh Interval"
                    value={aiPrefs.alertRefreshMinutes}
                    onChange={(e) => setAi('alertRefreshMinutes', e.target.value)}
                  >
                    <MenuItem value={5}>Every 5 minutes</MenuItem>
                    <MenuItem value={15}>Every 15 minutes (Recommended)</MenuItem>
                    <MenuItem value={30}>Every 30 minutes</MenuItem>
                    <MenuItem value={60}>Every hour</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <SettingRow
                primary="Provide Alert Feedback"
                secondary="Rate alert accuracy (thumbs up/down) to improve AI personalization over time"
                control={<Switch checked={aiPrefs.feedbackOnAlerts} onChange={(e) => setAi('feedbackOnAlerts', e.target.checked)} />}
                divider={false}
              />
            </SectionCard>

            <SectionCard title="Risk Score Display" icon={<AnalyticsIcon color="primary" />}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Score Format</InputLabel>
                <Select
                  label="Risk Score Format"
                  value={aiPrefs.riskScoreDisplayMode}
                  onChange={(e) => setAi('riskScoreDisplayMode', e.target.value)}
                >
                  <MenuItem value="numeric_with_tier">Numeric score + tier label (e.g. 82 — HIGH)</MenuItem>
                  <MenuItem value="tier_only">Tier label only (e.g. HIGH)</MenuItem>
                  <MenuItem value="numeric_only">Numeric only (e.g. 82)</MenuItem>
                  <MenuItem value="color_only">Color indicator only</MenuItem>
                </Select>
                <FormHelperText>Controls how patient risk scores appear in your patient list and referral views</FormHelperText>
              </FormControl>
            </SectionCard>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={() => saveSettings('aiPrefs', aiPrefs, 'AI & Tools settings')} disabled={saving}>
                {saving ? 'Saving…' : 'Save AI & Tools Settings'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ── TAB 5: Security ───────────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ px: { xs: 2, md: 4 } }}>

            <SectionCard title="Account Security" icon={<LockIcon color="primary" />}>
              <SettingRow
                primary="Two-Factor Authentication"
                secondary="Require a one-time code in addition to your password at login"
                control={<Switch checked={security.twoFactorEnabled} onChange={(e) => setSec('twoFactorEnabled', e.target.checked)} />}
              />
              {security.twoFactorEnabled && (
                <Alert severity="info" sx={{ mx: 0, mb: 1 }}>
                  2FA setup requires an authenticator app (Google Authenticator or Authy). Contact support to complete configuration.
                </Alert>
              )}
              <SettingRow
                primary="Login Notifications"
                secondary="Receive an email when your account is accessed from a new device or location"
                control={<Switch checked={security.loginNotifications} onChange={(e) => setSec('loginNotifications', e.target.checked)} />}
              />
              <Box sx={{ py: 1.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Session Timeout</InputLabel>
                  <Select
                    label="Session Timeout"
                    value={security.sessionTimeoutMinutes}
                    onChange={(e) => setSec('sessionTimeoutMinutes', e.target.value)}
                  >
                    <MenuItem value={15}>15 minutes</MenuItem>
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 hour (Recommended)</MenuItem>
                    <MenuItem value={240}>4 hours</MenuItem>
                    <MenuItem value={480}>8 hours</MenuItem>
                    <MenuItem value={0}>Never (not recommended for clinical use)</MenuItem>
                  </Select>
                  <FormHelperText>Auto-logout after this period of inactivity</FormHelperText>
                </FormControl>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ py: 1.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Password Expiry</InputLabel>
                  <Select
                    label="Password Expiry"
                    value={security.passwordExpiryDays}
                    onChange={(e) => setSec('passwordExpiryDays', e.target.value)}
                  >
                    <MenuItem value={30}>30 days</MenuItem>
                    <MenuItem value={60}>60 days</MenuItem>
                    <MenuItem value={90}>90 days (Recommended for HIPAA)</MenuItem>
                    <MenuItem value={180}>180 days</MenuItem>
                    <MenuItem value={365}>1 year</MenuItem>
                    <MenuItem value={0}>Never</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>Change Password</Typography>
                  <Typography variant="caption" color="text.secondary">Update your account password</Typography>
                </Box>
                <Button variant="outlined" onClick={openPwDialog} startIcon={<LockIcon />}>
                  Change Password
                </Button>
              </Box>
            </SectionCard>

            <SectionCard title="Privacy & Data Sharing" icon={<DataUsageIcon color="primary" />}>
              <SettingRow
                primary="Share Anonymized Data for Network Analytics"
                secondary="Allow de-identified referral and outcome data to be used to improve matching quality across the network"
                control={<Switch checked={security.shareAnonymizedData} onChange={(e) => setSec('shareAnonymizedData', e.target.checked)} />}
              />
              <SettingRow
                primary="Allow AI Analysis of My Patient Data"
                secondary="Permit Azure OpenAI to process clinical data to generate insights, summaries, and risk scores"
                control={<Switch checked={security.allowAIAnalysis} onChange={(e) => setSec('allowAIAnalysis', e.target.checked)} />}
              />
              <SettingRow
                primary="Participate in Healthcare Research"
                secondary="Allow fully anonymized aggregate data to be included in published research and quality improvement studies"
                control={<Switch checked={security.participateInResearch} onChange={(e) => setSec('participateInResearch', e.target.checked)} />}
                divider={false}
              />
              <Alert severity="info" sx={{ mt: 2 }} icon={<InfoIcon />}>
                All data sharing is HIPAA-compliant. Patient identifiers are never included. See our{' '}
                <Typography component="span" variant="body2" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                  Privacy Policy
                </Typography>{' '}
                for full details.
              </Alert>
            </SectionCard>

            <SectionCard title="Data Retention" icon={<DataUsageIcon color="primary" />}>
              <FormControl fullWidth size="small">
                <InputLabel>Data Retention Period</InputLabel>
                <Select
                  label="Data Retention Period"
                  value={security.dataRetentionMonths}
                  onChange={(e) => setSec('dataRetentionMonths', e.target.value)}
                >
                  <MenuItem value={12}>12 months</MenuItem>
                  <MenuItem value={24}>24 months (Recommended)</MenuItem>
                  <MenuItem value={36}>36 months</MenuItem>
                  <MenuItem value={48}>48 months</MenuItem>
                  <MenuItem value={60}>60 months</MenuItem>
                </Select>
                <FormHelperText>
                  Clinical data required for continuity of care is retained regardless of this setting per HIPAA minimum necessary standard.
                </FormHelperText>
              </FormControl>
            </SectionCard>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={() => saveSettings('security', security, 'Security & Privacy settings')} disabled={saving}>
                {saving ? 'Saving…' : 'Save Security Settings'}
              </Button>
            </Box>
          </Box>
        </TabPanel>
      </Paper>

      {/* ── Change Password Dialog ──────────────────────────────────────────── */}
      <Dialog open={pwDialog} onClose={closePwDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            <LockIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" sx={{ flex: 1 }}>Change Password</Typography>
          <IconButton onClick={closePwDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {pwError   && <Alert severity="error"   sx={{ mb: 2 }}>{pwError}</Alert>}
          {pwSuccess && <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully!</Alert>}
          <DialogContentText sx={{ mb: 2 }}>
            Enter your current password and choose a new one.
          </DialogContentText>

          {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
            <TextField
              key={field}
              margin="dense"
              label={field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
              type={showPw[field] ? 'text' : 'password'}
              fullWidth variant="outlined"
              name={field}
              value={pwData[field]}
              onChange={(e) => setPwData((s) => ({ ...s, [field]: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw((s) => ({ ...s, [field]: !s[field] }))} edge="end">
                      {showPw[field] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />
          ))}

          {pwData.newPassword && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Password strength</Typography>
                <Typography variant="caption" color={`${pwStrength.color}.main`} fontWeight={600}>{pwStrength.label}</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(pwStrength.score / 5) * 100}
                color={pwStrength.color}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePwDialog}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained" disabled={pwSaving} startIcon={pwSaving ? null : <LockIcon />}>
            {pwSaving ? <CircularProgress size={18} color="inherit" /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
