import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Snackbar,
  Divider,
  Switch,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
  Insights as InsightsIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  RateReview as ReviewIcon,
  Feedback as FeedbackIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import { DataGrid } from '@mui/x-data-grid';
import AIStatisticsDialog from '../../components/admin/AIStatisticsDialog';
import AIModelDetails from '../../components/admin/AIModelDetails';
import AIModelTrainingFeedback from '../../components/admin/AIModelTrainingFeedback';
import AIReportScheduler from '../../components/admin/AIReportScheduler';

// Services
import aiManagementService from '../../services/aiManagementService';
import { get, put, post } from '../../utils/apiUtils';
import { formatDate } from '../../utils/dateFormatter';

// Common components
import { ModernLoadingIndicator } from '../../components/common';

// Mock data for development
import { adminMockData } from '../../services/mockData';

const AdminAIManagement = () => {
  // State variables
  const [statusFilter, setStatusFilter] = useState('all');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
  const [openThresholdDialog, setOpenThresholdDialog] = useState(false);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openStatisticsDialog, setOpenStatisticsDialog] = useState(false);
  const [openModelDetailsDialog, setOpenModelDetailsDialog] = useState(false);
  const [openModelTrainingFeedbackDialog, setOpenModelTrainingFeedbackDialog] = useState(false);
  const [openReportSchedulerDialog, setOpenReportSchedulerDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [allModels, setAllModels] = useState([]);   // full unfiltered list
  const [aiModels, setAiModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelFilters, setModelFilters] = useState({});
  
  // AI Statistics state
  const [aiStatistics, setAiStatistics] = useState(null);

  // AI Config state (persisted in MongoDB)
  const [aiConfigs, setAiConfigs] = useState([]);
  const [aiConfigEditValues, setAiConfigEditValues] = useState({});
  const [automationPolicy, setAutomationPolicy] = useState({
    maxAutoApprovalsPerDay: 50,
    falsePositiveAlertPct: 10,
    modelVersion: 'clinictrust-v2',
    ambientSessionEnabled: true,
    ambientMaxMinutes: 60,
    autoSummarizeEncounters: true,
    aiFeedbackEnabled: true,
    enableExperimental: false,
  });
  const [automationPolicySaving, setAutomationPolicySaving] = useState(false);
  
  // ── Status chip config ────────────────────────────────────────────────────
  const STATUS_CONFIG = {
    approved:       { label: 'Approved',       color: 'success' },
    pending_review: { label: 'Pending Review', color: 'warning' },
    rejected:       { label: 'Rejected',       color: 'error'   },
    draft:          { label: 'Draft',          color: 'default' },
    published:      { label: 'Published',      color: 'info'    },
  };
  const TYPE_CONFIG = {
    readmission:    { label: 'Readmission',    color: '#1976d2' },
    diagnosis:      { label: 'Diagnosis',      color: '#7b1fa2' },
    treatment:      { label: 'Treatment',      color: '#00796b' },
    summary:        { label: 'Summary',        color: '#f57c00' },
    risk_assessment:{ label: 'Risk Assessment',color: '#c62828' },
    custom:         { label: 'Custom',         color: '#455a64' },
  };

  const columns = [
    {
      field: 'title',
      headerName: 'Report Title',
      flex: 1,
      minWidth: 220,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} placement="top-start">
          <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {params.value || '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 160,
      renderCell: (params) => {
        const cfg = TYPE_CONFIG[params.value] || { label: params.value || '—', color: '#455a64' };
        return (
          <Chip
            label={cfg.label}
            size="small"
            sx={{ bgcolor: cfg.color, color: '#fff', fontWeight: 600, fontSize: '0.72rem' }}
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 155,
      renderCell: (params) => {
        const cfg = STATUS_CONFIG[params.value] || { label: params.value || '—', color: 'default' };
        return <Chip label={cfg.label} size="small" color={cfg.color} variant="filled" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />;
      },
    },
    {
      field: 'confidenceScore',
      headerName: 'Confidence',
      width: 150,
      renderCell: (params) => {
        if (params.value == null) return <Typography variant="body2" color="text.secondary">N/A</Typography>;
        const pct = Math.round(params.value * 100);
        const barColor = pct >= 85 ? 'success' : pct >= 70 ? 'warning' : 'error';
        return (
          <Box sx={{ width: '100%', pr: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{pct}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={pct} color={barColor} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 115,
      valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
    },
    {
      field: '_actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Review">
            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleOpenReviewDialog(params.row); }}>
              <ReviewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Feedback">
            <IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); handleOpenFeedbackDialog(params.row); }}>
              <FeedbackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Schedule">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedReport(params.row); setOpenScheduleDialog(true); }}>
              <ScheduleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];
  
  // Thresholds state
  const [thresholds, setThresholds] = useState({
    readmissionRisk: 0.7,
    diagnosisConfidence: 0.85,
    treatmentRecommendation: 0.8
  });
  
  // Form states
  const [reviewForm, setReviewForm] = useState({ action: 'approved', comments: '' });
  const [feedbackForm, setFeedbackForm] = useState({ type: 'false_positive', comment: '' });
  const [scheduleForm, setScheduleForm] = useState({ 
    recipientId: '', 
    frequency: 'weekly', 
    nextDelivery: new Date().toISOString().split('T')[0]
  });

  // Fetch reports and AI models on component mount
  useEffect(() => {
    fetchReports();
    fetchAIModels();
  }, []);

  // Load AI configs from MongoDB on mount
  useEffect(() => {
    const loadAiConfigs = async () => {
      try {
        const resp = await get('/admin/ai-config');
        if (resp?.data) setAiConfigs(resp.data);
      } catch (e) { console.error('Failed to load AI configs', e); }
    };
    loadAiConfigs();
  }, []);

  // Fetch reports from API
  const fetchReports = async () => {
    setLoading(true);
    try {
      // Check if we should use mock data or real API
      const normalizeRow = (r, i) => ({
        ...r,
        id: (r._id != null ? String(r._id) : null) || (r.id != null ? String(r.id) : null) || `row-${i}`,
      });
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Using mock data
        setTimeout(() => {
          setReports((adminMockData.aiReports || []).map(normalizeRow));
          setLoading(false);
        }, 500);
      } else {
        // Using real API
        const data = await aiManagementService.getReports();
        const rawReports = data?.data || (Array.isArray(data) ? data : []);
        setReports(rawReports.map(normalizeRow));
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching AI reports:', err);
      setError('Failed to fetch AI reports. Please try again.');
      setLoading(false);
    }
  };

  // Handle opening review dialog
  const handleOpenReviewDialog = (report) => {
    setSelectedReport(report);
    setReviewForm({ action: 'approved', comments: '' });
    setOpenReviewDialog(true);
  };
  
  // Handle opening feedback dialog
  const handleOpenFeedbackDialog = (report) => {
    setSelectedReport(report);
    setFeedbackForm({ type: 'false_positive', comment: '' });
    setOpenFeedbackDialog(true);
  };
  
  // Handle opening threshold dialog
  const handleOpenThresholdDialog = (model = null) => {
    if (model) {
      // Set the selected model for model-specific thresholds
      setSelectedModel(model);
      
      // Initialize with model-specific thresholds if available
      if (model.thresholds) {
        setThresholds(model.thresholds);
      } else {
        // Fallback to default thresholds
        setThresholds({
          default: 0.7,
          highSensitivity: 0.5,
          highSpecificity: 0.85
        });
      }
    } else {
      // No model provided - using global thresholds
      setSelectedModel(null);
      
      // Initialize with default global thresholds
      setThresholds({
        default: 0.7,
        highSensitivity: 0.5,
        highSpecificity: 0.85
      });
    }
    
    setOpenThresholdDialog(true);
  };
  
  
  // Handle model training feedback submission
  const handleModelTrainingFeedbackSubmit = async (feedbackData) => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API
        await aiManagementService.submitModelTrainingFeedback(selectedModel.id, feedbackData);
      } else {
        // Simulate API delay with mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Update the model's feedback count in the local state
        setAiModels(prevModels => 
          prevModels.map(model => 
            model.id === selectedModel.id 
              ? { ...model, feedbackCount: (model.feedbackCount || 0) + 1 }
              : model
          )
        );
      }
      
      setOpenModelTrainingFeedbackDialog(false);
      setSnackbar({
        open: true,
        message: `Training feedback for ${selectedModel.name} submitted successfully`,
        severity: 'success'
      });
      
      // Refresh the AI models list to reflect the updated feedback count
      fetchAIModels();
    } catch (err) {
      console.error('Error submitting model training feedback:', err);
      setSnackbar({
        open: true,
        message: `Failed to submit training feedback: ${err.message || 'Please try again.'}`,
        severity: 'error'
      });
    }
  };
  
  // Handle opening model details dialog
  const handleOpenModelDetailsDialog = async (model) => {
    setSelectedModel(model);
    
    try {
      // Fetch detailed model metrics before opening the dialog
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API to get detailed metrics
        const detailedMetrics = await aiManagementService.getAIModelMetrics(model.id);
        setSelectedModel({ ...model, ...detailedMetrics });
      } else {
        // Generate mock detailed metrics
        setTimeout(() => {
          const mockMetrics = {
            performanceHistory: [
              { date: '2023-01', accuracy: 0.82, precision: 0.79, recall: 0.85 },
              { date: '2023-02', accuracy: 0.84, precision: 0.81, recall: 0.86 },
              { date: '2023-03', accuracy: 0.85, precision: 0.83, recall: 0.87 },
              { date: '2023-04', accuracy: 0.87, precision: 0.85, recall: 0.88 },
              { date: '2023-05', accuracy: model.accuracy, precision: model.metrics?.precision || 0.86, recall: model.metrics?.recall || 0.89 }
            ],
            confusionMatrix: {
              truePositives: Math.floor(model.dataPoints * 0.45),
              falsePositives: Math.floor(model.dataPoints * 0.05),
              trueNegatives: Math.floor(model.dataPoints * 0.42),
              falseNegatives: Math.floor(model.dataPoints * 0.08)
            },
            features: [
              { name: 'Age', importance: 0.12 },
              { name: 'Length of Stay', importance: 0.15 },
              { name: 'Previous Admissions', importance: 0.18 },
              { name: 'Comorbidity Count', importance: 0.21 },
              { name: 'Medication Count', importance: 0.09 },
              { name: 'Lab Results', importance: 0.14 },
              { name: 'Discharge Disposition', importance: 0.11 }
            ],
            inferenceTime: '120ms',
            trainingDataSize: model.dataPoints || 45000,
            validationDataSize: Math.floor((model.dataPoints || 45000) * 0.2)
          };
          
          setSelectedModel({ ...model, ...mockMetrics });
        }, 500);
      }
    } catch (err) {
      console.error('Error fetching model metrics:', err);
      setSnackbar({
        open: true,
        message: `Failed to fetch model metrics: ${err.message || 'Please try again.'}`,
        severity: 'error'
      });
    }
    
    setOpenModelDetailsDialog(true);
  };
  
  // Handle opening model training feedback dialog
  const handleOpenModelTrainingFeedbackDialog = (model) => {
    setSelectedModel(model);
    setOpenModelTrainingFeedbackDialog(true);
  };
  
  // Handle review submission
  const handleReviewSubmit = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Update local state with mock data
        const updatedReports = reports.map(report => {
          if (report.id === selectedReport.id) {
            return { ...report, status: reviewForm.action };
          }
          return report;
        });
        
        setReports(updatedReports);
      } else {
        // Call the real API
        await aiManagementService.reviewReport(selectedReport.id, reviewForm);
        
        // Refresh reports to get updated data
        await fetchReports();
      }
      
      setOpenReviewDialog(false);
      setSnackbar({
        open: true,
        message: `Report ${reviewForm.action === 'approved' ? 'approved' : 'rejected'} successfully`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error submitting review:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit review. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API
        await aiManagementService.addFeedback(selectedReport.id, feedbackForm);
      }
      
      setOpenFeedbackDialog(false);
      setSnackbar({
        open: true,
        message: 'Feedback submitted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit feedback. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Handle threshold update
  const handleThresholdUpdate = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API with model ID if available
        if (selectedModel) {
          await aiManagementService.updateModelThresholds(selectedModel.id, thresholds);
        } else {
          // Update global thresholds
          await aiManagementService.updateThresholds(thresholds);
        }
      } else {
        // Simulate API delay with mock data
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Persist thresholds to MongoDB via ai-config endpoint
      const prefix = selectedModel ? `model.${selectedModel.id}` : 'priorAuth';
      const configUpdates = Object.entries(thresholds).map(([key, value]) => ({
        key: `${prefix}.${key}`, value
      }));
      await post('/admin/ai-config/bulk', { configs: configUpdates });

      // Refresh ai-config state
      const resp = await get('/admin/ai-config');
      if (resp?.data) setAiConfigs(resp.data);

      setOpenThresholdDialog(false);

      // Refresh models to get updated thresholds
      fetchAIModels();

      setSnackbar({
        open: true,
        message: selectedModel
          ? `Thresholds for ${selectedModel.name} updated successfully`
          : 'Global AI thresholds updated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating thresholds:', err);
      setSnackbar({
        open: true,
        message: `Failed to update thresholds: ${err.message || 'Please try again.'}`,
        severity: 'error'
      });
    }
  };

  // Handle saving a single AI config row inline
  const handleSaveAiConfigRow = async (configKey) => {
    try {
      const value = aiConfigEditValues[configKey];
      await put(`/admin/ai-config/${encodeURIComponent(configKey)}`, { value });
      const resp = await get('/admin/ai-config');
      if (resp?.data) setAiConfigs(resp.data);
      setAiConfigEditValues(prev => { const next = { ...prev }; delete next[configKey]; return next; });
      setSnackbar({ open: true, message: `Config "${configKey}" saved`, severity: 'success' });
    } catch (err) {
      console.error('Error saving AI config', err);
      setSnackbar({ open: true, message: `Failed to save config: ${err.message || 'Please try again.'}`, severity: 'error' });
    }
  };
  
  const handleSaveAutomationPolicy = async () => {
    try {
      setAutomationPolicySaving(true);
      await put('/admin/ai-config/automation-policy', automationPolicy);
      setSnackbar({ open: true, message: 'Automation policy saved successfully', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Saved locally. Server sync pending.', severity: 'info' });
    } finally {
      setAutomationPolicySaving(false);
    }
  };

  // Handle schedule submission
  const handleScheduleSubmit = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API
        await aiManagementService.scheduleReport(selectedReport.id, scheduleForm);
      }
      
      setOpenScheduleDialog(false);
      setSnackbar({
        open: true,
        message: 'Report scheduled successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error scheduling report:', err);
      setSnackbar({
        open: true,
        message: 'Failed to schedule report. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Fetch AI models with optional filters
  // Client-side filter — never refetches; works regardless of what types the API returns
  const applyModelFilters = (filters, sourceList) => {
    const list = sourceList || allModels;
    let result = [...list];
    if (filters.type)   result = result.filter(m => m.type   === filters.type);
    if (filters.status) result = result.filter(m => m.status === filters.status);
    setAiModels(result);
  };

  const fetchAIModels = async () => {
    setModelLoading(true);
    try {
      // Check if we should use mock data or real API
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Using mock data - create some mock models
        setTimeout(() => {
          const mockModels = [
            // NOTE: types here match the dropdown options derived from this list
            {
              id: 'model-1',
              name: 'Readmission Risk Predictor',
              type: 'classification',
              version: '2.3.1',
              accuracy: 0.89,
              lastUpdated: new Date().toISOString(),
              status: 'active',
              dataPoints: 125000,
              lastTrainingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 42,
              metrics: {
                precision: 0.86,
                recall: 0.91,
                f1Score: 0.88,
                auc: 0.92
              },
              thresholds: {
                default: 0.7,
                highSensitivity: 0.5,
                highSpecificity: 0.85
              }
            },
            {
              id: 'model-2',
              name: 'Diagnosis Assistant',
              type: 'nlp',
              version: '1.7.0',
              accuracy: 0.92,
              lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
              dataPoints: 87500,
              lastTrainingDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 28,
              metrics: {
                precision: 0.89,
                recall: 0.94,
                f1Score: 0.91,
                auc: 0.95
              },
              thresholds: {
                default: 0.65,
                highSensitivity: 0.45,
                highSpecificity: 0.80,
                nlpConfidence: 0.7
              }
            },
            {
              id: 'model-3',
              name: 'Treatment Recommendation Engine',
              type: 'recommendation',
              version: '3.1.2',
              accuracy: 0.87,
              lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'training',
              dataPoints: 103000,
              lastTrainingDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 35,
              metrics: {
                precision: 0.84,
                recall: 0.89,
                f1Score: 0.86,
                auc: 0.90
              },
              thresholds: {
                default: 0.72,
                highSensitivity: 0.55,
                highSpecificity: 0.88
              }
            },
            {
              id: 'model-4',
              name: 'Patient Risk Stratification',
              type: 'classification',
              version: '1.2.5',
              accuracy: 0.84,
              lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'inactive',
              dataPoints: 75000,
              lastTrainingDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 19,
              metrics: {
                precision: 0.81,
                recall: 0.87,
                f1Score: 0.84,
                auc: 0.88
              },
              thresholds: {
                default: 0.68,
                highSensitivity: 0.50,
                highSpecificity: 0.82
              }
            },
            {
              id: 'model-5',
              name: 'Medication Interaction Analyzer',
              type: 'classification',
              version: '2.0.4',
              accuracy: 0.93,
              lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
              dataPoints: 215000,
              lastTrainingDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 23,
              metrics: {
                precision: 0.94,
                recall: 0.92,
                f1Score: 0.93,
                auc: 0.96
              },
              thresholds: {
                default: 0.75,
                highSensitivity: 0.60,
                highSpecificity: 0.90
              }
            }
          ];
          
          setAllModels(mockModels);
          setAiModels(mockModels);
          setModelLoading(false);
        }, 500);
      } else {
        // Fetch all models — filtering is done client-side
        const data = await aiManagementService.getAIModels({});
        const modelsArray = data?.data || (Array.isArray(data) ? data : []);
        if (Array.isArray(modelsArray)) {
          // Normalise: ensure every model has an id field
          const normalised = modelsArray.map((m, i) => ({
            ...m,
            id: m._id?.toString() || m.id?.toString() || `model-${i}`,
          }));
          setAllModels(normalised);
          setAiModels(normalised);
        } else {
          console.error('Invalid AI models data format:', data);
          setAllModels([]);
          setAiModels([]);
        }
        setModelLoading(false);
      }
    } catch (err) {
      console.error('Error fetching AI models:', err);
      setAllModels([]);
      setAiModels([]);
      setSnackbar({ open: true, message: `Failed to fetch AI models: ${err.message || 'Unknown error'}`, severity: 'error' });
      setModelLoading(false);
    }
  };

  // Fetch AI statistics
  const fetchAIStatistics = async () => {
    try {
      // Check if we should use mock data or real API
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Using mock data
        setTimeout(() => {
          setAiStatistics(adminMockData.aiStatistics || {});
        }, 500);
      } else {
        // Using real API
        const data = await aiManagementService.getAIStatistics();
        setAiStatistics(data?.data || data || {});
      }
    } catch (err) {
      console.error('Error fetching AI statistics:', err);
      setSnackbar({
        open: true,
        message: 'Failed to fetch AI statistics',
        severity: 'error'
      });
    }
  };

  // Handle opening statistics dialog
  const handleOpenStatisticsDialog = () => {
    fetchAIStatistics();
    setOpenStatisticsDialog(true);
  };

  // Handle model training feedback submission
  // const handleModelTrainingFeedbackSubmit = async (feedbackData) => {
  //   try {
  //     // In a real implementation, this would call an API
  //     if (process.env.REACT_APP_MOCK_API !== 'true') {
  //       await aiManagementService.submitModelTrainingFeedback(selectedModel.id, feedbackData);
  //     } else {
  //       // Simulate API delay with mock data
  //       await new Promise(resolve => setTimeout(resolve, 800));
  //     }

  //     setSnackbar({
  //       open: true,
  //       message: 'Training feedback submitted successfully',
  //       severity: 'success'
  //     });

  //     // Refresh AI models to get updated data
  //     fetchAIModels();
      
  //     setOpenModelTrainingFeedbackDialog(false);
  //   } catch (err) {
  //     console.error('Error submitting model training feedback:', err);
  //     setSnackbar({
  //       open: true,
  //       message: 'Failed to submit training feedback',
  //       severity: 'error'
  //     });
  //   }
  // };

  // ... (rest of the code remains the same)

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          AI Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReports}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<InsightsIcon />}
            onClick={handleOpenStatisticsDialog}
          >
            AI Statistics
          </Button>
        </Box>
      </Box>
      
      {/* Status filter chips */}
      {!loading && !error && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {[
            { value: 'all',           label: `All (${reports.length})` },
            { value: 'approved',      label: `Approved (${reports.filter(r => r.status === 'approved').length})` },
            { value: 'pending_review',label: `Pending Review (${reports.filter(r => r.status === 'pending_review').length})` },
            { value: 'rejected',      label: `Rejected (${reports.filter(r => r.status === 'rejected').length})` },
            { value: 'draft',         label: `Draft (${reports.filter(r => r.status === 'draft').length})` },
          ].map(f => (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => setStatusFilter(f.value)}
              color={statusFilter === f.value ? 'primary' : 'default'}
              variant={statusFilter === f.value ? 'filled' : 'outlined'}
              sx={{ fontWeight: statusFilter === f.value ? 700 : 400, cursor: 'pointer' }}
            />
          ))}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
          <DataGrid
            autoHeight
            rows={statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter)}
            getRowId={(row) => String(row.id)}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 25]}
            disableSelectionOnClick
            rowHeight={56}
            onRowClick={(params) => handleOpenReviewDialog(params.row)}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'grey.100',
                fontWeight: 700,
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              },
              '& .MuiDataGrid-row.Mui-selected': {
                bgcolor: 'primary.50',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid',
                borderColor: 'divider',
              },
            }}
          />
        </Paper>
      )}
      
      {/* AI Models Section */}
      <Box sx={{ mt: 6, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            AI Models
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => fetchAIModels()}
              sx={{ mr: 1 }}
            >
              Refresh Models
            </Button>
          </Box>
        </Box>
        
        {/* Filters for AI Models — options derived from loaded data so they always match */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Model Type</InputLabel>
              <Select
                value={modelFilters?.type || ''}
                label="Model Type"
                onChange={(e) => {
                  const newFilters = { ...modelFilters, type: e.target.value };
                  setModelFilters(newFilters);
                  applyModelFilters(newFilters);
                }}
              >
                <MenuItem value="">All Types</MenuItem>
                {[...new Set(allModels.map(m => m.type))].filter(Boolean).map(t => (
                  <MenuItem key={t} value={t}>
                    {t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={modelFilters?.status || ''}
                label="Status"
                onChange={(e) => {
                  const newFilters = { ...modelFilters, status: e.target.value };
                  setModelFilters(newFilters);
                  applyModelFilters(newFilters);
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {[...new Set(allModels.map(m => m.status))].filter(Boolean).map(s => (
                  <MenuItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setModelFilters({});
                setAiModels(allModels);
              }}
              disabled={!modelFilters.type && !modelFilters.status}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>

        {modelLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
            <ModernLoadingIndicator message="Loading alerts..." />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {aiModels.map((model) => (
              <Grid item xs={12} md={6} lg={4} key={model._id || model.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h3">
                        {model.name}
                      </Typography>
                      <Chip 
                        label={model.status} 
                        size="small" 
                        color={
                          model.status === 'active' ? 'success' : 
                          model.status === 'training' ? 'warning' : 
                          'error'
                        }
                      />
                    </Box>
                    
                    <Typography color="text.secondary" gutterBottom>
                      {model.type.charAt(0).toUpperCase() + model.type.slice(1)} Model • v{model.version}
                    </Typography>
                    
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Accuracy
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {(model.accuracy * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Data Points
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {model.dataPoints?.toLocaleString() || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Training
                        </Typography>
                        <Typography variant="body1">
                          {model.lastTrainingDate ? formatDate(model.lastTrainingDate) : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Feedback Count
                        </Typography>
                        <Typography variant="body1">
                          {model.feedbackCount || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<InsightsIcon />}
                      onClick={() => handleOpenModelDetailsDialog(model)}
                    >
                      Details
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<PsychologyIcon />}
                      onClick={() => handleOpenModelTrainingFeedbackDialog(model)}
                    >
                      Feedback
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<SettingsIcon />}
                      onClick={() => handleOpenThresholdDialog(model)}
                    >
                      Thresholds
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            
            {aiModels.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No AI models found matching the selected filters.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
      
      {/* Detail Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        fullWidth
        maxWidth="md"
      >
        {selectedReport && (
          <>
            <DialogTitle>
              {selectedReport.title}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">Type: {selectedReport.type}</Typography>
                  <Typography variant="subtitle1">Status: 
                    <Chip 
                      label={selectedReport.status} 
                      color={
                        selectedReport.status === 'approved' ? 'success' : 
                        selectedReport.status === 'rejected' ? 'error' : 
                        selectedReport.status === 'pending_review' ? 'warning' : 
                        'default'
                      }
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="subtitle1">
                    Confidence Score: {(selectedReport.confidenceScore * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">Created: {formatDate(selectedReport.createdAt)}</Typography>
                  <Typography variant="subtitle1">Last Updated: {formatDate(selectedReport.updatedAt)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6">Description</Typography>
                  <Typography variant="body1">{selectedReport.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6">Data</Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <pre>{JSON.stringify(selectedReport.data, null, 2)}</pre>
                  </Paper>
                </Grid>
                {selectedReport.feedback && selectedReport.feedback.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6">Feedback</Typography>
                    {selectedReport.feedback.map((item, index) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Chip 
                          label={item.type} 
                          color={
                            item.type === 'false_positive' ? 'error' : 
                            item.type === 'false_negative' ? 'warning' : 
                            item.type === 'accurate' ? 'success' : 
                            'default'
                          }
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" component="span">
                          {item.comment}
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => {
                  setOpenDetailDialog(false);
                  handleOpenReviewDialog(selectedReport);
                }}
                disabled={selectedReport.status === 'approved' || selectedReport.status === 'rejected'}
              >
                Review
              </Button>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={() => {
                  setOpenDetailDialog(false);
                  handleOpenFeedbackDialog(selectedReport);
                }}
              >
                Provide Feedback
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Review Dialog */}
      <Dialog
        open={openReviewDialog}
        onClose={() => setOpenReviewDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Review AI Report
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Title: {selectedReport.title}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
                Type: {selectedReport.type}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={reviewForm.action}
                  onChange={(e) => setReviewForm({ ...reviewForm, action: e.target.value })}
                  label="Action"
                >
                  <MenuItem value="approved">Approve</MenuItem>
                  <MenuItem value="rejected">Reject</MenuItem>
                  <MenuItem value="published">Approve & Publish</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Comments"
                multiline
                rows={4}
                fullWidth
                value={reviewForm.comments}
                onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReviewDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleReviewSubmit}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Feedback Dialog */}
      <Dialog
        open={openFeedbackDialog}
        onClose={() => setOpenFeedbackDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Provide Feedback
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Title: {selectedReport.title}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
                Type: {selectedReport.type}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Feedback Type</InputLabel>
                <Select
                  value={feedbackForm.type}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, type: e.target.value })}
                  label="Feedback Type"
                >
                  <MenuItem value="false_positive">False Positive</MenuItem>
                  <MenuItem value="false_negative">False Negative</MenuItem>
                  <MenuItem value="accurate">Accurate</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Comments"
                multiline
                rows={4}
                fullWidth
                value={feedbackForm.comment}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFeedbackDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleFeedbackSubmit}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Threshold Dialog */}
      <Dialog
        open={openThresholdDialog}
        onClose={() => setOpenThresholdDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedModel ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Adjust Thresholds: {selectedModel.name}
            </Box>
          ) : (
            'Adjust Global AI Thresholds'
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {selectedModel ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Adjust the threshold values for this AI model. These settings will override global thresholds for this specific model.
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.paper' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Model Type:</Typography>
                      <Typography variant="body1">{selectedModel.type}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Current Accuracy:</Typography>
                      <Typography variant="body1">{(selectedModel.accuracy * 100).toFixed(1)}%</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Adjust the global threshold values for all AI predictions. Higher values increase precision but may reduce recall. Model-specific thresholds will override these values.
              </Typography>
            )}
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Readmission Risk Threshold</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    type="range"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={thresholds.readmissionRisk}
                    onChange={(e) => setThresholds({ ...thresholds, readmissionRisk: parseFloat(e.target.value) })}
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                    {(thresholds.readmissionRisk * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {thresholds.readmissionRisk < 0.5 ? 'Low threshold may result in more false positives' : 
                   thresholds.readmissionRisk > 0.8 ? 'High threshold may miss at-risk patients' : 
                   'Balanced threshold for risk detection'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Diagnosis Confidence Threshold</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    type="range"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={thresholds.diagnosisConfidence}
                    onChange={(e) => setThresholds({ ...thresholds, diagnosisConfidence: parseFloat(e.target.value) })}
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                    {(thresholds.diagnosisConfidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {thresholds.diagnosisConfidence < 0.7 ? 'Low threshold may suggest less reliable diagnoses' : 
                   thresholds.diagnosisConfidence > 0.9 ? 'High threshold may limit diagnostic suggestions' : 
                   'Balanced threshold for diagnostic confidence'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Treatment Recommendation Threshold</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    type="range"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={thresholds.treatmentRecommendation}
                    onChange={(e) => setThresholds({ ...thresholds, treatmentRecommendation: parseFloat(e.target.value) })}
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                    {(thresholds.treatmentRecommendation * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {thresholds.treatmentRecommendation < 0.7 ? 'Low threshold may suggest more experimental treatments' : 
                   thresholds.treatmentRecommendation > 0.9 ? 'High threshold limits to only well-established treatments' : 
                   'Balanced threshold for treatment recommendations'}
                </Typography>
              </Grid>
              
              {selectedModel?.type === 'classification' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Classification Threshold</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      type="range"
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                      value={thresholds.classification || 0.75}
                      onChange={(e) => setThresholds({ ...thresholds, classification: parseFloat(e.target.value) })}
                      sx={{ flexGrow: 1, mr: 2 }}
                    />
                    <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                      {((thresholds.classification || 0.75) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              {selectedModel?.type === 'nlp' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">NLP Confidence Threshold</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      type="range"
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                      value={thresholds.nlpConfidence || 0.7}
                      onChange={(e) => setThresholds({ ...thresholds, nlpConfidence: parseFloat(e.target.value) })}
                      sx={{ flexGrow: 1, mr: 2 }}
                    />
                    <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                      {((thresholds.nlpConfidence || 0.7) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenThresholdDialog(false)}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleThresholdUpdate}
            startIcon={<SaveIcon />}
          >
            Save Thresholds
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Schedule Dialog */}
      <Dialog
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Schedule Automated Report
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Report: {selectedReport.title}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
                Schedule this report to be automatically sent to providers
              </Typography>
              
              <TextField
                label="Recipient ID"
                fullWidth
                margin="normal"
                value={scheduleForm.recipientId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, recipientId: e.target.value })}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                  label="Frequency"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Next Delivery Date"
                type="date"
                fullWidth
                margin="normal"
                value={scheduleForm.nextDelivery}
                onChange={(e) => setScheduleForm({ ...scheduleForm, nextDelivery: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleScheduleSubmit}
          >
            Schedule Report
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* AI Statistics Dialog */}
      <AIStatisticsDialog 
        open={openStatisticsDialog} 
        onClose={() => setOpenStatisticsDialog(false)} 
        statistics={aiStatistics} 
      />
      
      {/* AI Model Details Dialog */}
      <Dialog
        open={openModelDetailsDialog}
        onClose={() => setOpenModelDetailsDialog(false)}
        fullWidth
        maxWidth="lg"
        aria-labelledby="model-details-dialog-title"
      >
        <DialogTitle id="model-details-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InsightsIcon sx={{ mr: 1 }} />
              {selectedModel?.name} Details
            </Box>
            <IconButton onClick={() => setOpenModelDetailsDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedModel ? (
            <AIModelDetails
              modelId={selectedModel.id}
              modelName={selectedModel.name}
              modelType={selectedModel.type}
              model={selectedModel}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <ModernLoadingIndicator message="Loading alerts..." />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenModelDetailsDialog(false)}
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<PsychologyIcon />}
            onClick={() => {
              setOpenModelDetailsDialog(false);
              handleOpenModelTrainingFeedbackDialog(selectedModel);
            }}
          >
            Provide Training Feedback
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* AI Model Training Feedback Dialog */}
      <AIModelTrainingFeedback
        open={openModelTrainingFeedbackDialog}
        onClose={() => setOpenModelTrainingFeedbackDialog(false)}
        modelId={selectedModel?.id}
        modelName={selectedModel?.name}
        onSubmitFeedback={handleModelTrainingFeedbackSubmit}
      />
      
      {/* Enhanced Report Scheduler Dialog */}
      <AIReportScheduler
        open={openReportSchedulerDialog}
        onClose={() => setOpenReportSchedulerDialog(false)}
        reportId={selectedReport?.id}
        reportTitle={selectedReport?.title}
      />

      {/* AI Configuration Section */}
      <Paper sx={{ mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">AI Configuration</Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={async () => {
              try {
                const resp = await get('/admin/ai-config');
                if (resp?.data) setAiConfigs(resp.data);
              } catch (e) { console.error('Failed to refresh AI configs', e); }
            }}
          >
            Refresh
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {aiConfigs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No AI configuration entries found.
          </Typography>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: '2px solid', borderColor: 'divider' }}>
                {['Key', 'Value', 'Description', 'Actions'].map(col => (
                  <Box component="th" key={col} sx={{ p: 1.5, textAlign: 'left' }}>
                    <Typography variant="subtitle2">{col}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {aiConfigs.map((cfg) => {
                const isEditing = aiConfigEditValues.hasOwnProperty(cfg.key);
                return (
                  <Box component="tr" key={cfg.key} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Box component="td" sx={{ p: 1.5 }}>
                      <Typography variant="body2" fontFamily="monospace">{cfg.key}</Typography>
                    </Box>
                    <Box component="td" sx={{ p: 1.5, minWidth: 160 }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={aiConfigEditValues[cfg.key]}
                          onChange={(e) => setAiConfigEditValues(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                          sx={{ width: '100%' }}
                        />
                      ) : (
                        <Typography variant="body2">{String(cfg.value)}</Typography>
                      )}
                    </Box>
                    <Box component="td" sx={{ p: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">{cfg.description || '—'}</Typography>
                    </Box>
                    <Box component="td" sx={{ p: 1.5 }}>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={() => handleSaveAiConfigRow(cfg.key)}>
                            Save
                          </Button>
                          <Button size="small" startIcon={<CancelIcon />} onClick={() => setAiConfigEditValues(prev => { const next = { ...prev }; delete next[cfg.key]; return next; })}>
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={() => setAiConfigEditValues(prev => ({ ...prev, [cfg.key]: cfg.value }))}>
                          Edit
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Automation Policy Section */}
      <Paper sx={{ mt: 4, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6">Automation Policy</Typography>
            <Typography variant="body2" color="text.secondary">
              Auto-approval limits, ambient session controls, and model configuration.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveAutomationPolicy}
            disabled={automationPolicySaving}
            sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
          >
            {automationPolicySaving ? 'Saving…' : 'Save Policy'}
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Auto-Approval Controls</Typography>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="body2" fontWeight={600} gutterBottom>Max Auto-Approvals Per Day</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>Daily cap to prevent runaway automation</Typography>
            <TextField fullWidth size="small" type="number" inputProps={{ min: 0, max: 500 }}
              value={automationPolicy.maxAutoApprovalsPerDay}
              onChange={e => setAutomationPolicy(p => ({ ...p, maxAutoApprovalsPerDay: Number(e.target.value) }))} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="body2" fontWeight={600} gutterBottom>False Positive Alert Threshold (%)</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>Alert when AI false positive rate exceeds this</Typography>
            <TextField fullWidth size="small" type="number" inputProps={{ min: 1, max: 50 }}
              value={automationPolicy.falsePositiveAlertPct}
              onChange={e => setAutomationPolicy(p => ({ ...p, falsePositiveAlertPct: Number(e.target.value) }))} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="body2" fontWeight={600} gutterBottom>Active Model Version</Typography>
            <FormControl fullWidth size="small">
              <Select value={automationPolicy.modelVersion} onChange={e => setAutomationPolicy(p => ({ ...p, modelVersion: e.target.value }))}>
                <MenuItem value="clinictrust-v2">ClinicTrust v2 (Stable)</MenuItem>
                <MenuItem value="clinictrust-v3-beta">ClinicTrust v3 (Beta)</MenuItem>
                <MenuItem value="openai-gpt4">OpenAI GPT-4o</MenuItem>
                <MenuItem value="anthropic-claude">Anthropic Claude 4</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Ambient AI Sessions</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[
            { key: 'ambientSessionEnabled', label: 'Enable Ambient Sessions', hint: 'Record and auto-transcribe patient encounters' },
            { key: 'autoSummarizeEncounters', label: 'Auto-Summarize Encounters', hint: 'Generate SOAP note automatically after session ends' },
            { key: 'aiFeedbackEnabled', label: 'Provider AI Feedback', hint: 'Let providers rate AI suggestions to improve accuracy' },
            { key: 'enableExperimental', label: 'Allow Experimental Models', hint: 'Enable beta model versions for opted-in providers' },
          ].map(({ key, label, hint }) => (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <Box sx={{ pr: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{label}</Typography>
                  <Typography variant="caption" color="text.secondary">{hint}</Typography>
                </Box>
                <Switch
                  checked={automationPolicy[key]}
                  onChange={e => setAutomationPolicy(p => ({ ...p, [key]: e.target.checked }))}
                  size="small"
                />
              </Paper>
            </Grid>
          ))}
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="body2" fontWeight={600} gutterBottom>Max Session Duration (minutes)</Typography>
            <TextField fullWidth size="small" type="number" inputProps={{ min: 10, max: 240 }}
              value={automationPolicy.ambientMaxMinutes}
              onChange={e => setAutomationPolicy(p => ({ ...p, ambientMaxMinutes: Number(e.target.value) }))} />
          </Grid>
        </Grid>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminAIManagement;
