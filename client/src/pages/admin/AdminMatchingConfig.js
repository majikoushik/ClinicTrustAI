import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Switch, FormControlLabel, Slider,
  Button, Chip, TextField, IconButton, Divider, Alert, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import EllipsisCell from '../../components/common/EllipsisCell';
import { tableContainerSx, tableSx, tableBodyRowSx, compactChipSx } from '../../components/common/adminTableStyles';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  Psychology as AIIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Search as SearchIcon,
  TuneRounded as TuneIcon,
  GroupWork as GroupIcon,
} from '@mui/icons-material';
import { getMatchingConfig, updateMatchingConfig, resetMatchingConfig } from '../../services/adminMatchingConfigService';

// ── Test panel helpers ────────────────────────────────────────────────────────

function testSpecialtyMatch(searchTerm, synonymGroups, partialMatchEnabled) {
  if (!searchTerm || searchTerm.trim().length < 2) return null;
  const req = searchTerm.toLowerCase().trim();
  const results = [];

  for (const group of synonymGroups) {
    const lowerTerms = (group.terms || []).map(t => t.toLowerCase().trim());

    // Exact match
    if (lowerTerms.includes(req)) {
      results.push({ group: group.name, term: searchTerm, matchType: 'exact', score: 30 });
      continue;
    }

    if (partialMatchEnabled) {
      for (const term of group.terms) {
        const lower = term.toLowerCase().trim();
        if (lower.startsWith(req) || req.startsWith(lower)) {
          results.push({ group: group.name, term, matchType: 'prefix', score: 12 });
        } else if (req.length >= 4 && lower.includes(req)) {
          results.push({ group: group.name, term, matchType: 'contains', score: 9 });
        }
      }
    }
  }

  return results;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box sx={{ color: 'primary.main' }}>{icon}</Box>
      <Box>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Box>
  );
}

function ScoreSlider({ label, value, onChange, max = 50, helperText }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        <Chip label={`${value} pts`} size="small" color="primary" variant="outlined" />
      </Box>
      <Slider value={value} onChange={(_, v) => onChange(v)} min={0} max={max} step={1} marks />
      {helperText && <Typography variant="caption" color="text.secondary">{helperText}</Typography>}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminMatchingConfig() {
  const [config, setConfig]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState(null);
  const [resetDialog, setResetDialog] = useState(false);

  // Synonym group editing state
  const [newGroupName, setNewGroupName]     = useState('');
  const [newTermInputs, setNewTermInputs]   = useState({});

  // Test panel state
  const [testInput, setTestInput]   = useState('');
  const [testResults, setTestResults] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMatchingConfig();
      setConfig(res.data || res);
    } catch (err) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateMatchingConfig({
        bypassSpecialtyFilter: config.bypassSpecialtyFilter,
        partialMatchEnabled:   config.partialMatchEnabled,
        partialMatchScore:     config.partialMatchScore,
        minScoreThreshold:     config.minScoreThreshold,
        scoreWeights:          config.scoreWeights,
        synonymGroups:         config.synonymGroups,
      });
      setConfig(res.data || res);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetDialog(false);
    setSaving(true);
    try {
      const res = await resetMatchingConfig();
      setConfig(res.data || res);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  // ── Config field helpers ──────────────────────────────────────────────────

  const setFlag = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  const setWeight = (key, value) =>
    setConfig(prev => ({ ...prev, scoreWeights: { ...prev.scoreWeights, [key]: value } }));

  // ── Synonym group helpers ─────────────────────────────────────────────────

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    setConfig(prev => ({
      ...prev,
      synonymGroups: [...(prev.synonymGroups || []), { name: newGroupName.trim(), terms: [] }],
    }));
    setNewGroupName('');
  };

  const deleteGroup = (groupIndex) =>
    setConfig(prev => ({
      ...prev,
      synonymGroups: prev.synonymGroups.filter((_, i) => i !== groupIndex),
    }));

  const addTerm = (groupIndex) => {
    const term = (newTermInputs[groupIndex] || '').trim();
    if (!term) return;
    setConfig(prev => {
      const groups = [...prev.synonymGroups];
      groups[groupIndex] = { ...groups[groupIndex], terms: [...groups[groupIndex].terms, term] };
      return { ...prev, synonymGroups: groups };
    });
    setNewTermInputs(prev => ({ ...prev, [groupIndex]: '' }));
  };

  const deleteTerm = (groupIndex, termIndex) =>
    setConfig(prev => {
      const groups = [...prev.synonymGroups];
      groups[groupIndex] = { ...groups[groupIndex], terms: groups[groupIndex].terms.filter((_, i) => i !== termIndex) };
      return { ...prev, synonymGroups: groups };
    });

  // ── Test panel ────────────────────────────────────────────────────────────

  const runTest = () => {
    if (!config || !testInput.trim()) return;
    const results = testSpecialtyMatch(testInput, config.synonymGroups || [], config.partialMatchEnabled);
    setTestResults(results);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !config) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  const weights = config?.scoreWeights || {};

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            AI Matching Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control how providers are matched when clinicians create referrals. Changes take effect within 60 seconds.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={() => setResetDialog(true)}
            disabled={saving}
          >
            Reset Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : saved ? <CheckIcon /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            color={saved ? 'success' : 'primary'}
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={3}>

        {/* ── Global Flags ── */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionHeader icon={<TuneIcon />} title="Matching Behaviour" subtitle="Core flags that change how providers are filtered" />

            {/* Bypass flag */}
            <Paper
              variant="outlined"
              sx={{
                p: 2, mb: 2, borderRadius: 2,
                borderColor: config.bypassSpecialtyFilter ? 'warning.main' : 'divider',
                bgcolor: config.bypassSpecialtyFilter ? 'warning.50' : 'background.default',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.bypassSpecialtyFilter)}
                    onChange={e => setFlag('bypassSpecialtyFilter', e.target.checked)}
                    color="warning"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Bypass Specialty Filter
                      {config.bypassSpecialtyFilter && (
                        <Chip icon={<WarningIcon />} label="ACTIVE" color="warning" size="small" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      When ON: ignore all specialty rules and search ALL accepting providers by text. Use for broad searches or troubleshooting.
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', m: 0 }}
              />
            </Paper>

            {/* Partial match flag */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.partialMatchEnabled)}
                    onChange={e => setFlag('partialMatchEnabled', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>Partial / Prefix Matching</Typography>
                    <Typography variant="caption" color="text.secondary">
                      When ON: "Derma" matches "Dermatology", "Cardio" matches "Cardiology", etc. Min 4 characters for contains-match.
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', m: 0 }}
              />
              {config.partialMatchEnabled && (
                <Box sx={{ mt: 2, px: 1 }}>
                  <ScoreSlider
                    label="Partial Match Score"
                    value={config.partialMatchScore ?? 12}
                    onChange={v => setFlag('partialMatchScore', v)}
                    max={30}
                    helperText="Score awarded for prefix/partial specialty match (exact=30, synonym=22, partial=this value)"
                  />
                </Box>
              )}
            </Paper>

            {/* Min score threshold */}
            <Box sx={{ px: 1 }}>
              <ScoreSlider
                label="Minimum Score Threshold"
                value={config.minScoreThreshold ?? 0}
                onChange={v => setFlag('minScoreThreshold', v)}
                max={60}
                helperText="Providers scoring below this value are excluded from results (0 = include everyone)"
              />
            </Box>
          </Paper>
        </Grid>

        {/* ── Score Weights ── */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionHeader icon={<AIIcon />} title="Score Weights" subtitle="Maximum points each dimension can contribute (sum should stay near 100)" />
            <ScoreSlider label="Specialty Match"    value={weights.specialty      ?? 30} onChange={v => setWeight('specialty', v)}      max={50} />
            <ScoreSlider label="Insurance Match"    value={weights.insurance      ?? 25} onChange={v => setWeight('insurance', v)}      max={50} />
            <ScoreSlider label="Acceptance Rate"    value={weights.acceptanceRate ?? 20} onChange={v => setWeight('acceptanceRate', v)} max={50} />
            <ScoreSlider label="Availability"       value={weights.availability   ?? 15} onChange={v => setWeight('availability', v)}   max={50} />
            <ScoreSlider label="Token Standing"     value={weights.tokenStanding  ?? 10} onChange={v => setWeight('tokenStanding', v)}  max={30} />
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Total weight (excl. bonuses)</Typography>
              <Typography variant="caption" fontWeight={700}>
                {(weights.specialty ?? 30) + (weights.insurance ?? 25) + (weights.acceptanceRate ?? 20) + (weights.availability ?? 15) + (weights.tokenStanding ?? 10)} pts
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* ── Test Panel ── */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader icon={<SearchIcon />} title="Test Specialty Matching" subtitle="Preview which groups a search term would match before saving" />
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder='e.g. "Derma", "Cardio", "Kidney"'
                value={testInput}
                onChange={e => { setTestInput(e.target.value); setTestResults(null); }}
                onKeyDown={e => e.key === 'Enter' && runTest()}
              />
              <Button variant="contained" onClick={runTest} disabled={!testInput.trim()}>Test</Button>
            </Box>
            {testResults !== null && (
              testResults.length === 0 ? (
                <Alert severity="warning" icon={<WarningIcon />}>
                  No matches found for "{testInput}". Consider adding it as a synonym or enabling partial matching.
                </Alert>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {testResults.length} match{testResults.length !== 1 ? 'es' : ''} found:
                  </Typography>
                  <TableContainer sx={tableContainerSx}>
                    <Table size="small" sx={tableSx}>
                      <TableBody>
                        {testResults.map((r, i) => (
                          <TableRow key={i} hover sx={tableBodyRowSx}>
                            <TableCell sx={{ width: '20%' }}>
                              <Chip label={r.matchType} size="small"
                                color={r.matchType === 'exact' ? 'success' : r.matchType === 'prefix' ? 'primary' : 'default'}
                                sx={compactChipSx}
                              />
                            </TableCell>
                            <TableCell sx={{ width: '30%' }}><EllipsisCell value={r.term} /></TableCell>
                            <TableCell sx={{ width: '35%' }}><EllipsisCell value={r.group} variant="caption" sx={{ color: 'text.secondary' }} /></TableCell>
                            <TableCell sx={{ width: '15%' }} align="right"><Chip label={`+${r.score}`} size="small" variant="outlined" sx={compactChipSx} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )
            )}
          </Paper>
        </Grid>

        {/* ── Score Legend ── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader icon={<CheckIcon />} title="Matching Score Reference" subtitle="How each specialty match type contributes to the final score" />
            <TableContainer sx={tableContainerSx}>
              <Table size="small" sx={tableSx}>
                <TableBody>
                  {[
                    ['Exact match', 'Provider specialty = search term (case-insensitive)', '30 pts', 'success'],
                    ['Synonym match', 'Both terms appear in the same synonym group', '22 pts', 'primary'],
                    ['Sub-specialty match', 'Search term found in provider\'s subSpecialties list', '18 pts', 'primary'],
                    ['Partial/prefix match', '"Derma" → "Dermatology" (configurable)', '12 pts*', 'default'],
                    ['No match (normal mode)', 'Provider is excluded from results', '—', 'error'],
                    ['No match (bypass mode)', 'Provider included; text bonus applied if text matches', '+15 bonus', 'warning'],
                  ].map(([type, desc, score, color]) => (
                    <TableRow key={type} hover sx={tableBodyRowSx}>
                      <TableCell sx={{ width: '22%' }}><Chip label={type} size="small" color={color} sx={compactChipSx} /></TableCell>
                      <TableCell sx={{ width: '58%' }}><EllipsisCell value={desc} variant="caption" /></TableCell>
                      <TableCell sx={{ width: '20%' }} align="right"><Typography variant="body2" fontWeight={600}>{score}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * Partial match score is configurable above. Must be &lt; synonym score (22) to preserve ranking order.
            </Typography>
          </Paper>
        </Grid>

        {/* ── Synonym Groups ── */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SectionHeader icon={<GroupIcon />} title="Specialty Synonym Groups" subtitle="Map related specialty strings to the same match group. Case-insensitive. Changes are DB-persisted." />
              <Typography variant="caption" color="text.secondary">{config.synonymGroups?.length || 0} groups</Typography>
            </Box>

            {/* Add new group */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Add New Group</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Group name (e.g. Family Medicine)"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGroup()}
                  sx={{ flex: 1 }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={addGroup} disabled={!newGroupName.trim()}>
                  Add Group
                </Button>
              </Box>
            </Paper>

            {/* Existing groups */}
            {(config.synonymGroups || []).map((group, gi) => (
              <Accordion key={gi} disableGutters variant="outlined" sx={{ mb: 1, borderRadius: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography fontWeight={600}>{group.name}</Typography>
                    <Chip label={`${(group.terms || []).length} terms`} size="small" variant="outlined" />
                  </Box>
                  <Tooltip title="Delete group">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={e => { e.stopPropagation(); deleteGroup(gi); }}
                      sx={{ mr: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                    {(group.terms || []).map((term, ti) => (
                      <Chip
                        key={ti}
                        label={term}
                        onDelete={() => deleteTerm(gi, ti)}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                    {group.terms?.length === 0 && (
                      <Typography variant="caption" color="text.secondary">No terms yet — add some below.</Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Add synonym term…"
                      value={newTermInputs[gi] || ''}
                      onChange={e => setNewTermInputs(prev => ({ ...prev, [gi]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTerm(gi)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addTerm(gi)}
                      disabled={!(newTermInputs[gi] || '').trim()}
                    >
                      Add
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        </Grid>

      </Grid>

      {/* Sticky save bar */}
      {saving || saved ? null : (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ boxShadow: 6, borderRadius: 3 }}
          >
            Save Changes
          </Button>
        </Box>
      )}

      {/* Reset confirmation dialog */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)}>
        <DialogTitle>Reset to Factory Defaults?</DialogTitle>
        <DialogContent>
          <Typography>
            This will restore all synonym groups, score weights, and flags to their original values. Any custom groups you added will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Cancel</Button>
          <Button onClick={handleReset} color="warning" variant="contained">Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
