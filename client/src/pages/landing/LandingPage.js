import React, { useTransition, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  useTheme,
  Avatar,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Psychology as AIMatchIcon,
  Mic as AmbientIcon,
  CalendarMonth as CalendarIcon,
  Storefront as DtxIcon,
  NotificationsActive as EngageIcon,
  GppGood as ComplianceIcon,
  Assignment as PriorAuthIcon,
  Hub as FHIRIcon,
  Storage as BlockchainIcon,
} from '@mui/icons-material';

export default function LandingPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();

  // Scroll to section when navigated here from another page with state.scrollTo
  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) {
        // Small delay lets the page finish painting before scrolling
        const id = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        return () => clearTimeout(id);
      }
    }
  }, [location.state]);

  const handleNavigation = (path) => {
    startTransition(() => { if (path) navigate(path); });
  };

  // ── Hero ──────────────────────────────────────────────────────────────
  const Hero = () => (
    <Box sx={{
      background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      color: 'white',
      py: { xs: 8, md: 12 },
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Chip
              label="Now featuring Ambient AI · DTx Marketplace · FHIR R4"
              size="small"
              sx={{ mb: 2.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, fontSize: '0.72rem', borderRadius: 1 }}
            />
            <Typography variant="h1" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2.4rem', md: '3.4rem' }, mb: 2, lineHeight: 1.15 }}>
              The Complete Clinical Referral &amp; Care Coordination Platform
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 400, opacity: 0.9, lineHeight: 1.5 }}>
              AI-powered referral matching, ambient voice documentation, automated prior auth, FHIR R4 interoperability — and a token economy that rewards quality outcomes.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={4}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => handleNavigation('/register')}
                sx={{ py: 1.5, px: 4, fontWeight: 600, fontSize: '1rem' }}
              >
                {isPending ? 'Loading…' : 'Get Started Free'}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                onClick={() => handleNavigation('/login')}
                sx={{ py: 1.5, px: 4, fontWeight: 600, fontSize: '1rem', borderColor: 'white',
                  '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' } }}
              >
                {isPending ? 'Loading…' : 'Sign In'}
              </Button>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {['HIPAA Compliant', '21st Century Cures Act', 'HL7 FHIR R4', 'SOC 2 Ready'].map((badge) => (
                <Box key={badge} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <CheckCircleIcon sx={{ fontSize: 15, opacity: 0.85 }} />
                  <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>{badge}</Typography>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
            <Box sx={{
              width: '100%', maxWidth: 560, height: 420,
              borderRadius: 4, overflow: 'hidden',
              background: 'linear-gradient(135deg, #0a2463 0%, #3e92cc 100%)',
              boxShadow: '0px 10px 30px rgba(0,0,0,0.3)',
              transform: 'perspective(1000px) rotateY(-10deg)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              position: 'relative', p: 4,
            }}>
              {[
                { icon: <AIMatchIcon sx={{ fontSize: 18 }} />, label: 'AI Referral Matching', top: '12%', left: '8%' },
                { icon: <AmbientIcon sx={{ fontSize: 18 }} />, label: 'Ambient Clinical AI', top: '20%', right: '6%' },
                { icon: <ComplianceIcon sx={{ fontSize: 18 }} />, label: 'Info Blocking Compliance', bottom: '25%', left: '6%' },
                { icon: <FHIRIcon sx={{ fontSize: 18 }} />, label: 'FHIR R4 API', bottom: '16%', right: '8%' },
              ].map((item) => (
                <Box key={item.label} sx={{
                  position: 'absolute',
                  top: item.top, bottom: item.bottom,
                  left: item.left, right: item.right,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 2, px: 1.5, py: 0.85,
                  display: 'flex', alignItems: 'center', gap: 1,
                  border: '1px solid rgba(255,255,255,0.25)',
                  animation: 'float 6s ease-in-out infinite',
                }}>
                  <Box sx={{ color: 'white', lineHeight: 0 }}>{item.icon}</Box>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
              <Box
                component="img"
                src="/logo.svg"
                alt="ClinicTrust AI"
                sx={{ width: 150, height: 150, filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.3))', animation: 'pulse 3s ease-in-out infinite' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', bottom: -150, left: -150, width: 400, height: 400, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
    </Box>
  );

  // ── Stats ──────────────────────────────────────────────────────────────
  const Stats = () => {
    const stats = [
      { value: '2,500+', label: 'Healthcare Providers' },
      { value: '85%',    label: 'Faster Prior Auth Approvals' },
      { value: '2 hrs',  label: 'Saved Daily with Ambient AI' },
      { value: '99.9%',  label: 'Platform Uptime' },
    ];
    return (
      <Box sx={{ py: { xs: 4, md: 6 }, backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100] }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            {stats.map((s, i) => (
              <Grid item xs={6} md={3} key={i} sx={{ textAlign: 'center' }}>
                <Typography variant="h3" component="p" sx={{ fontWeight: 700, mb: 0.5, color: theme.palette.primary.main }}>
                  {s.value}
                </Typography>
                <Typography variant="body1" color="text.secondary">{s.label}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };

  // ── Platform Capabilities — 8 feature cards ────────────────────────────
  const PlatformCapabilities = () => {
    const capabilities = [
      {
        icon: <AIMatchIcon />, color: '#1565c0',
        title: 'AI Referral Matching',
        description: 'ML engine scores specialists on 12+ factors — specialty fit, availability, payer rules, and historical acceptance rates.',
        tags: ['60% faster placement', 'ML-powered scoring'],
      },
      {
        icon: <AmbientIcon />, color: '#6a1b9a',
        title: 'Ambient Clinical Intelligence',
        description: 'Voice-powered documentation generates structured SOAP notes in real-time during consultations — no keyboard required.',
        tags: ['2 hrs saved/day', 'EHR-ready notes'],
      },
      {
        icon: <DtxIcon />, color: '#00695c',
        title: 'Digital Therapeutics Marketplace',
        description: 'Prescribe and manage FDA-cleared DTx programs. Patients earn tokens on completion, redeemable for platform features.',
        tags: ['50+ programs', 'Token rewards'],
      },
      {
        icon: <CalendarIcon />, color: '#00838f',
        title: 'Appointment Scheduling',
        description: 'Real-time provider availability with patient self-scheduling, automated reminders, and no-show risk scoring.',
        tags: ['24/7 self-booking', '40% fewer no-shows'],
      },
      {
        icon: <EngageIcon />, color: '#b71c1c',
        title: 'Patient Engagement',
        description: 'Multi-channel notifications (SMS, email, in-app) with personalized engagement scoring and follow-up automation.',
        tags: ['Automated reminders', 'Engagement scores'],
      },
      {
        icon: <ComplianceIcon />, color: '#2e7d32',
        title: 'Information Blocking Compliance',
        description: '21st Century Cures Act built-in. Full EHI audit trails, access logs, and exception documentation — zero penalties.',
        tags: ['ONC compliant', 'Full audit trail'],
      },
      {
        icon: <FHIRIcon />, color: '#0277bd',
        title: 'FHIR R4 Interoperability',
        description: 'Bidirectional HL7 FHIR R4 APIs connect to Epic, Cerner, Meditech, and any SMART on FHIR-enabled system.',
        tags: ['Epic & Cerner ready', 'SMART on FHIR'],
      },
      {
        icon: <PriorAuthIcon />, color: '#e65100',
        title: 'Prior Authorization Engine',
        description: 'Submit, track, and manage prior auths automatically. ML model predicts approval likelihood before you hit send.',
        tags: ['Auto-submission', 'Approval prediction'],
      },
      {
        icon: <BlockchainIcon />, color: '#0d1b3e',
        title: 'Blockchain Audit Trail',
        description: 'Every referral event, token transaction, and consent change is recorded immutably on Hyperledger Fabric — cryptographically verifiable by all parties.',
        tags: ['Tamper-proof ledger', 'Hyperledger Fabric'],
      },
    ];

    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.default }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 2.5 }}>
              FULL PLATFORM
            </Typography>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
              Everything Your Practice Needs, Built In
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, mx: 'auto' }}>
              Eight integrated capabilities that replace five or more point solutions — all in a single HIPAA-compliant platform.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {capabilities.map((cap, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    borderTop: `4px solid ${cap.color}`,
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': { transform: 'translateY(-6px)', boxShadow: theme.shadows[8] },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: 1.5,
                      bgcolor: cap.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mb: 2, color: 'white', '& svg': { fontSize: 24 },
                    }}>
                      {cap.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={700} mb={1} sx={{ fontSize: '0.97rem', lineHeight: 1.35 }}>
                      {cap.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {cap.description}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {cap.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            fontSize: '0.69rem', height: 22,
                            bgcolor: `${cap.color}18`,
                            color: cap.color,
                            fontWeight: 700,
                            border: `1px solid ${cap.color}30`,
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };

  // ── AI Intelligence Showcase ───────────────────────────────────────────
  const AIShowcase = () => (
    <Box sx={{
      py: { xs: 6, md: 10 },
      background: theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, rgba(26,35,126,0.15), rgba(106,27,154,0.12))`
        : 'linear-gradient(135deg, #e8eaf6, #f3e5f5)',
    }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="overline" color="secondary" sx={{ fontWeight: 700, letterSpacing: 2.5 }}>
            CLINICAL AI
          </Typography>
          <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
            Intelligence at Every Step of Care
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 660, mx: 'auto' }}>
            Two AI modules that eliminate the biggest time drains in a provider's day.
          </Typography>
        </Box>

        <Grid container spacing={4} alignItems="stretch">
          {/* AI Referral Matching */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#1565c0', p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1.5, color: 'white', lineHeight: 0 }}>
                  <AIMatchIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="white">AI Referral Matching</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>Smart specialist placement engine</Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body1" color="text.secondary" mb={3} sx={{ lineHeight: 1.65 }}>
                  Our ML engine analyses a patient's clinical profile, payer requirements, specialist availability, and historical outcomes — then ranks the best-fit providers in seconds.
                </Typography>
                {[
                  'Scores specialists on 12+ clinical and operational factors',
                  'Real-time availability eliminates back-and-forth phone calls',
                  'Payer-specific routing reduces authorization denials by 38%',
                  'Self-improves from acceptance and rejection patterns over time',
                ].map((point) => (
                  <Box key={point} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                    <CheckCircleIcon sx={{ color: '#1565c0', mt: 0.2, flexShrink: 0, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ lineHeight: 1.55 }}>{point}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Ambient Clinical Intelligence */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#6a1b9a', p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1.5, color: 'white', lineHeight: 0 }}>
                  <AmbientIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="white">Ambient Clinical Intelligence</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>Voice-powered documentation</Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body1" color="text.secondary" mb={3} sx={{ lineHeight: 1.65 }}>
                  Let the AI listen. It generates structured SOAP notes, referral summaries, and ICD-10 code suggestions automatically — reviewed and signed by the provider in under 60 seconds.
                </Typography>
                {[
                  'Passive voice capture with zero interruption to clinical workflow',
                  'Structured SOAP notes generated in under 60 seconds',
                  'Auto-suggests ICD-10 and CPT codes from the conversation',
                  'Providers save an average of 2 hours of documentation per day',
                ].map((point) => (
                  <Box key={point} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                    <CheckCircleIcon sx={{ color: '#6a1b9a', mt: 0.2, flexShrink: 0, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ lineHeight: 1.55 }}>{point}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  // ── Compliance & Interoperability ──────────────────────────────────────
  const ComplianceTrust = () => {
    const pillars = [
      {
        icon: <ComplianceIcon sx={{ fontSize: 44 }} />,
        badge: '21st Century Cures Act',
        badgeColor: '#2e7d32',
        title: 'Information Blocking Compliance',
        description: 'Full EHI access audit trail, compliant data exchange, and exception documentation. Be ONC inspection-ready from day one.',
        points: [
          'ONC information blocking rules enforced',
          'Electronic Health Information (EHI) access logs',
          'Patient data portability built into every workflow',
        ],
      },
      {
        icon: <FHIRIcon sx={{ fontSize: 44 }} />,
        badge: 'SMART on FHIR',
        badgeColor: '#0277bd',
        title: 'HL7 FHIR R4 Interoperability',
        description: 'Plug into any modern EHR. Our FHIR R4 API layer enables bidirectional patient data flow with Epic, Cerner, and Meditech.',
        points: [
          'HL7 FHIR R4 compliant REST APIs',
          'SMART on FHIR OAuth2 authorization',
          'CDS Hooks for clinical decision support',
        ],
      },
      {
        icon: <PriorAuthIcon sx={{ fontSize: 44 }} />,
        badge: 'CMS Mandated',
        badgeColor: '#e65100',
        title: 'Prior Authorization Engine',
        description: 'Automated PA submission, real-time payer status, and ML-powered approval prediction before you submit — every time.',
        points: [
          'Direct payer EDI X12 278 transactions',
          'ML approval-likelihood scoring per procedure',
          'CMS Prior Auth interoperability rule compliant',
        ],
      },
    ];

    return (
      <Box sx={{
        py: { xs: 6, md: 10 },
        background: `linear-gradient(120deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
        color: 'white',
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 2.5 }}>
              TRUST &amp; COMPLIANCE
            </Typography>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
              Built for Today's Regulatory Reality
            </Typography>
            <Typography variant="h6" sx={{ maxWidth: 680, mx: 'auto', opacity: 0.85 }}>
              Compliance isn't a checkbox — it's the foundation. Every workflow is designed around HIPAA, ONC, and CMS mandates.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {pillars.map((p, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 20px 48px rgba(0,0,0,0.35)' },
                }}>
                  <CardContent sx={{ p: 3.5 }}>
                    <Box sx={{ color: 'rgba(255,255,255,0.9)', mb: 1.5, lineHeight: 0 }}>{p.icon}</Box>
                    <Chip
                      label={p.badge}
                      size="small"
                      sx={{ mb: 2, bgcolor: p.badgeColor, color: 'white', fontWeight: 700, fontSize: '0.7rem' }}
                    />
                    <Typography variant="h6" fontWeight={700} mb={1.5} sx={{ lineHeight: 1.35 }}>
                      {p.title}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85, mb: 2.5, lineHeight: 1.65 }}>
                      {p.description}
                    </Typography>
                    {p.points.map((pt) => (
                      <Box key={pt} sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', mt: 0.2, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ opacity: 0.85, fontSize: '0.82rem', lineHeight: 1.5 }}>{pt}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };

  // ── Blockchain Foundation ─────────────────────────────────────────────
  const BlockchainSection = () => {
    const blocks = [
      { type: 'Token TX',     hash: '#A3F2…8D1', event: 'Tokens earned — referral completed', time: '2s ago' },
      { type: 'Referral',     hash: '#B8C1…4F7', event: 'Dr. Smith → Dr. Chen, Alice J.',    time: '1m ago' },
      { type: 'Consent',      hash: '#D9E2…1A3', event: 'Patient consent updated — EHI',     time: '4m ago' },
      { type: 'PA Approval',  hash: '#F4A1…9C6', event: 'Prior auth approved — Payer XYZ',   time: '7m ago' },
    ];

    const highlights = [
      {
        title: 'Immutable Audit Trail',
        desc: 'Every referral, consent, and token event is permanently on-chain. No record can be altered or deleted — ever.',
      },
      {
        title: 'Transparent Token Economy',
        desc: 'Token issuance, transfers, and redemptions settle on-chain. Providers verify their own balance independently, without trusting a central server.',
      },
      {
        title: 'Smart Contract Governance',
        desc: 'Data-sharing agreements are enforced by code, not paperwork. Access revokes automatically the moment consent expires.',
      },
      {
        title: 'Provider Identity On-Chain',
        desc: 'NPI-verified credentials are anchored to the ledger — eliminating credential fraud and enabling trust across the full referral network.',
      },
    ];

    return (
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: '#0d1b3e', color: 'white', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative glows */}
        <Box sx={{ position: 'absolute', top: -80,  right: -80,  width: 280, height: 280, borderRadius: '50%', bgcolor: 'rgba(25,118,210,0.12)', zIndex: 0 }} />
        <Box sx={{ position: 'absolute', bottom: -100, left: -100, width: 340, height: 340, borderRadius: '50%', bgcolor: 'rgba(106,27,154,0.10)', zIndex: 0 }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 7 }}>
            <Chip
              label="HYPERLEDGER FABRIC"
              size="small"
              sx={{
                mb: 2,
                bgcolor: 'rgba(25,118,210,0.28)',
                color: '#90caf9',
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: 1.5,
                border: '1px solid rgba(144,202,249,0.3)',
              }}
            />
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
              Blockchain is Our Foundation — Not a Feature
            </Typography>
            <Typography variant="h6" sx={{ maxWidth: 700, mx: 'auto', opacity: 0.82, lineHeight: 1.65 }}>
              Every clinical event, token transfer, and data consent in ClinicTrust AI is permanently recorded on an enterprise blockchain — giving every stakeholder a single, cryptographically verifiable source of truth.
            </Typography>
          </Box>

          {/* Live block chain visualizer */}
          <Box sx={{ mb: 7 }}>
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'stretch', minWidth: { xs: 580, md: 'auto' }, gap: 0 }}>
                {blocks.map((block, i) => (
                  <React.Fragment key={i}>
                    <Box sx={{
                      flex: 1,
                      border: '1px solid rgba(144,202,249,0.22)',
                      borderRadius: 2.5,
                      p: { xs: 1.5, md: 2.5 },
                      bgcolor: 'rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.75,
                      transition: 'background 0.2s',
                      '&:hover': { bgcolor: 'rgba(144,202,249,0.1)' },
                    }}>
                      {/* Block number + confirmed dot */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(144,202,249,0.6)', fontFamily: 'monospace', fontSize: '0.67rem' }}>
                          Block #{1000 + i * 23}
                        </Typography>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 6px #4caf50' }} />
                      </Box>
                      {/* Type */}
                      <Typography variant="body2" fontWeight={700} sx={{ color: 'white', fontSize: '0.84rem' }}>
                        {block.type}
                      </Typography>
                      {/* Hash */}
                      <Typography variant="caption" sx={{ color: '#90caf9', fontFamily: 'monospace', fontSize: '0.69rem' }}>
                        {block.hash}
                      </Typography>
                      {/* Event description */}
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.68rem', lineHeight: 1.45 }}>
                        {block.event}
                      </Typography>
                      {/* Timestamp */}
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.32)', fontSize: '0.65rem', mt: 'auto' }}>
                        {block.time}
                      </Typography>
                    </Box>
                    {i < blocks.length - 1 && (
                      <Box sx={{
                        display: 'flex', alignItems: 'center', px: { xs: 0.5, md: 1 },
                        color: 'rgba(144,202,249,0.45)', fontSize: '1.4rem', flexShrink: 0, userSelect: 'none',
                      }}>
                        →
                      </Box>
                    )}
                  </React.Fragment>
                ))}
              </Box>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'rgba(255,255,255,0.28)', fontSize: '0.7rem', letterSpacing: 0.5 }}>
              Live on Hyperledger Fabric · Immutable · Cryptographically signed · All parties verifiable
            </Typography>
          </Box>

          {/* 4 key properties */}
          <Grid container spacing={2.5}>
            {highlights.map((h, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Box sx={{
                  p: 3,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(144,202,249,0.14)',
                  height: '100%',
                  display: 'flex',
                  gap: 1.75,
                  transition: 'background 0.2s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.09)' },
                }}>
                  <CheckCircleIcon sx={{ color: '#90caf9', fontSize: 22, mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'white', mb: 0.5 }}>
                      {h.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.62)', lineHeight: 1.65 }}>
                      {h.desc}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };

  // ── How It Works ──────────────────────────────────────────────────────
  const HowItWorks = () => {
    const steps = [
      {
        number: '01',
        title: 'Verified Registration',
        description: 'Providers join with NPI-verified credentials. Identity and activity are anchored on the blockchain for a permanent, tamper-proof audit trail.',
      },
      {
        number: '02',
        title: 'AI Matches the Right Specialist',
        description: 'Our ML engine finds the best-fit specialist in seconds — weighing clinical match, availability, payer rules, and patient preferences.',
      },
      {
        number: '03',
        title: 'Prior Auth & Scheduling — Automated',
        description: 'Prior auth is submitted automatically while the patient self-schedules. Smart reminders fire at exactly the right moment.',
      },
      {
        number: '04',
        title: 'Earn Tokens, Improve Outcomes',
        description: 'Providers earn tokens for completed referrals and DTx prescriptions. Redeem for AI analysis, priority processing, or advanced analytics.',
      },
    ];

    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.paper }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
              How ClinicTrust AI Works
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
              From referral creation to completed care — the entire workflow in one platform.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {steps.map((step, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <Box sx={{
                    mr: 3, width: 60, height: 60, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 2, backgroundColor: theme.palette.primary.main,
                    color: 'white', fontWeight: 700, fontSize: '1.4rem',
                  }}>
                    {step.number}
                  </Box>
                  <Box>
                    <Typography variant="h5" component="h3" sx={{ mb: 1, fontWeight: 600 }}>{step.title}</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65 }}>{step.description}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => handleNavigation('/register')}
              sx={{ py: 1.5, px: 4, fontWeight: 600, fontSize: '1rem' }}
            >
              {isPending ? 'Loading…' : 'Start Your Free Trial'}
            </Button>
          </Box>
        </Container>
      </Box>
    );
  };

  // ── Patient-Centered Tools ─────────────────────────────────────────────
  const PatientEcosystem = () => {
    const tools = [
      {
        icon: <CalendarIcon sx={{ fontSize: 52 }} />,
        color: '#00838f',
        title: 'Patient Self-Scheduling',
        description: 'Patients book their own follow-ups and specialist appointments from any device, 24/7. Real-time slot availability, automated reminders, and no-show risk scoring.',
        stats: [{ value: '40%', label: 'fewer no-shows' }, { value: '24/7', label: 'availability' }],
      },
      {
        icon: <EngageIcon sx={{ fontSize: 52 }} />,
        color: '#b71c1c',
        title: 'Notifications & Engagement',
        description: 'Automated multi-channel outreach (SMS, email, in-app) keeps patients on track. Engagement score surfaces patients at risk of dropping their care plan.',
        stats: [{ value: '3×', label: 'engagement lift' }, { value: 'SMS+Email', label: 'channels' }],
      },
      {
        icon: <DtxIcon sx={{ fontSize: 52 }} />,
        color: '#6a1b9a',
        title: 'Digital Therapeutics Marketplace',
        description: 'Browse, prescribe, and track FDA-cleared DTx programs across mental health, metabolic, MSK, and cardiovascular conditions. Patients earn tokens on completion.',
        stats: [{ value: '50+', label: 'DTx programs' }, { value: 'Token', label: 'rewards' }],
      },
    ];

    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50] }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 2.5 }}>
              PATIENT EXPERIENCE
            </Typography>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
              Tools That Keep Patients in the Loop
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, mx: 'auto' }}>
              From self-scheduling to digital therapeutics — give patients an active role in their own care journey.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {tools.map((tool, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card elevation={2} sx={{
                  height: '100%', borderRadius: 3,
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: theme.shadows[8] },
                }}>
                  <Box sx={{ bgcolor: tool.color, py: 4.5, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
                    {tool.icon}
                  </Box>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} mb={1.5}>{tool.title}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={3} sx={{ lineHeight: 1.65 }}>
                      {tool.description}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      {tool.stats.map((s) => (
                        <Box key={s.label} sx={{ textAlign: 'center', flex: 1, p: 1.5, borderRadius: 2, bgcolor: `${tool.color}12` }}>
                          <Typography variant="h6" fontWeight={800} sx={{ color: tool.color }}>{s.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };

  // ── Benefits ──────────────────────────────────────────────────────────
  const Benefits = () => {
    const benefitsList = [
      'Eliminate phone-tag with AI-powered specialist matching',
      'Reclaim 2+ hours per day with ambient voice documentation',
      'Automate prior authorization — reduce denials by up to 38%',
      'Achieve 21st Century Cures Act compliance out of the box',
      'Connect to Epic, Cerner, and Meditech via HL7 FHIR R4',
      'Reduce no-show rates by 40% with smart patient reminders',
      'Prescribe digital therapeutics and track patient adherence',
      'Earn token incentives tied to completed referrals and outcomes',
      'Ensure full HIPAA compliance with a blockchain audit trail',
      'Scale from solo practice to multi-specialty network seamlessly',
    ];

    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.default }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 2.5 }}>
                WHY CLINICTRUST AI
              </Typography>
              <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '2rem', md: '2.5rem' } }}>
                Benefits for Healthcare Providers
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
                ClinicTrust AI delivers measurable ROI — less administrative burden, more time with patients, and outcomes-based incentives that grow with your practice.
              </Typography>

              {benefitsList.map((benefit, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex', alignItems: 'flex-start', py: 1.1,
                    borderBottom: index < benefitsList.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  }}
                >
                  <CheckCircleIcon color="success" sx={{ mr: 2, mt: 0.15, flexShrink: 0, fontSize: 20 }} />
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{benefit}</Typography>
                </Box>
              ))}

              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() => handleNavigation('/register')}
                sx={{ mt: 4, py: 1.5, px: 4, fontWeight: 600, fontSize: '1rem' }}
              >
                {isPending ? 'Loading…' : 'Start Free Today'}
              </Button>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{
                width: '100%', height: 500, borderRadius: 3,
                boxShadow: theme.shadows[10],
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                position: 'relative', overflow: 'hidden',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
              }}>
                <Box sx={{
                  width: 260, height: 260, borderRadius: '50%', background: 'white',
                  boxShadow: '0px 5px 20px rgba(0,0,0,0.12)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  position: 'relative', zIndex: 2,
                }}>
                  <Box component="img" src="/certification-icon.svg" alt="Certification"
                    sx={{ width: 120, height: 120, filter: 'drop-shadow(0px 5px 10px rgba(0,0,0,0.1))', animation: 'pulse 3s ease-in-out infinite' }}
                  />
                </Box>

                {/* Floating metric cards */}
                {[
                  { label: 'Referral Speed', value: '−85%', color: '#1565c0', top: '8%',    left: '5%' },
                  { label: 'PA Denials',     value: '−38%', color: '#2e7d32', top: '8%',    right: '5%' },
                  { label: 'Doc Time',       value: '−2 hrs', color: '#6a1b9a', bottom: '10%', left: '5%' },
                  { label: 'No-Shows',       value: '−40%', color: '#b71c1c', bottom: '10%', right: '5%' },
                ].map((s) => (
                  <Box key={s.label} sx={{
                    position: 'absolute',
                    top: s.top, bottom: s.bottom, left: s.left, right: s.right,
                    bgcolor: 'white', borderRadius: 2, p: 1.5,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.13)',
                    textAlign: 'center', minWidth: 88,
                  }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  };

  // ── Testimonials ──────────────────────────────────────────────────────
  const Testimonials = () => {
    const testimonials = [
      {
        quote: "The AI referral matching cut our specialist wait time from 10 days to under 2. ClinicTrust AI paid for itself in the first month.",
        author: "Dr. Sarah Johnson",
        role: "Chief Medical Officer",
        organization: "Metro Health System",
      },
      {
        quote: "Ambient Clinical Intelligence is a game changer. I walk out of every consult with a complete SOAP note — I haven't typed a clinical note in weeks.",
        author: "Dr. Michael Chen",
        role: "Neurologist",
        organization: "Advanced Care Partners",
      },
      {
        quote: "Prior auth used to take my team 3 hours per case. With the automation engine it's fully hands-off. The predictive approval score is surprisingly accurate.",
        author: "Dr. Lisa Rodriguez",
        role: "Primary Care Physician",
        organization: "Community Health Network",
      },
    ];

    return (
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.paper }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
              What Healthcare Providers Say
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
              Real outcomes from providers who've moved their practice to ClinicTrust AI.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {testimonials.map((t, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 4, borderRadius: 2 }}>
                  <CardContent sx={{ flexGrow: 1, p: 0 }}>
                    <Typography variant="body1" sx={{ mb: 3, fontStyle: 'italic', fontSize: '1.05rem', lineHeight: 1.7 }}>
                      "{t.quote}"
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                        {t.author.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t.author}</Typography>
                        <Typography variant="body2" color="text.secondary">{t.role}, {t.organization}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  };

  // ── Call to Action ─────────────────────────────────────────────────────
  const CallToAction = () => (
    <Box sx={{
      py: { xs: 6, md: 10 },
      background: `linear-gradient(120deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
      color: 'white', textAlign: 'center',
    }}>
      <Container maxWidth="md">
        <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
          Ready to Transform Your Healthcare Practice?
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, maxWidth: 700, mx: 'auto', lineHeight: 1.6 }}>
          Join thousands of providers already using ClinicTrust AI to cut admin time, improve patient outcomes, and earn incentives for quality care.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => handleNavigation('/register')}
            component={RouterLink}
            to="/register"
            sx={{ py: 1.5, px: 4, fontWeight: 600, fontSize: '1rem' }}
          >
            {isPending ? 'Loading…' : "Sign Up Now — It's Free"}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            onClick={() => handleNavigation('/contact')}
            component={RouterLink}
            to="/contact"
            sx={{ py: 1.5, px: 4, fontWeight: 600, fontSize: '1rem', borderColor: 'white',
              '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            {isPending ? 'Loading…' : 'Request a Demo'}
          </Button>
        </Stack>
        <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={3} mt={5}>
          {['No credit card required', 'HIPAA compliant from day one', 'Setup in under 30 minutes'].map((t) => (
            <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CheckCircleIcon sx={{ fontSize: 17, opacity: 0.8 }} />
              <Typography variant="body2" sx={{ opacity: 0.85 }}>{t}</Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Hero />
      <Stats />
      <Box id="capabilities">
        <PlatformCapabilities />
      </Box>
      <Box id="ai-intelligence">
        <AIShowcase />
      </Box>
      <Box id="compliance">
        <ComplianceTrust />
      </Box>
      <Box id="blockchain">
        <BlockchainSection />
      </Box>
      <Box id="how-it-works">
        <HowItWorks />
      </Box>
      <Box id="patient-tools">
        <PatientEcosystem />
      </Box>
      <Box id="benefits">
        <Benefits />
      </Box>
      <Box id="testimonials">
        <Testimonials />
      </Box>
      <Box>
        <CallToAction />
      </Box>
    </Box>
  );
}
