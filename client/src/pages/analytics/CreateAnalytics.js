import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Autocomplete,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Analytics as AnalyticsIcon,
  Label as LabelIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarTodayIcon,
  Storage as StorageIcon,
  Notes as NotesIcon
} from '@mui/icons-material';

const steps = ['Select Analysis Type', 'Configure Parameters', 'Data Sources'];

// Analytics types with descriptions
const analyticsTypes = [
  {
    value: 'patientRisk',
    label: 'Patient Risk Analysis',
    description: 'Identify high-risk patients based on medical history, demographics, and recent visits.',
    icon: <AnalyticsIcon />
  },
  {
    value: 'operationalEfficiency',
    label: 'Operational Efficiency',
    description: 'Analyze clinic operations, resource utilization, and identify bottlenecks.',
    icon: <AnalyticsIcon />
  },
  {
    value: 'patientOutcomes',
    label: 'Patient Outcomes',
    description: 'Evaluate treatment effectiveness and patient outcomes for specific conditions.',
    icon: <AnalyticsIcon />
  },
  {
    value: 'financialMetrics',
    label: 'Financial Metrics',
    description: 'Analyze financial performance, billing efficiency, and reimbursement patterns.',
    icon: <AnalyticsIcon />
  },
  {
    value: 'custom',
    label: 'Custom Analysis',
    description: 'Define a custom analytics report with specific parameters.',
    icon: <AnalyticsIcon />
  }
];

export default function CreateAnalytics() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [analyticsData, setAnalyticsData] = useState({
    // Analysis type
    type: '',
    name: '',
    description: '',
    
    // Parameters
    parameters: {},
    
    // Data sources
    dataSources: [],
    timeRange: {
      start: '',
      end: ''
    }
  });
  
  // Available data sources
  const [availableDataSources, setAvailableDataSources] = useState([]);
  const [loading, setLoading] = useState(false);

  // Type-specific parameter fields
  const [parameterFields, setParameterFields] = useState([]);

  useEffect(() => {
    // Fetch available data sources
    const fetchDataSources = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be an API call to fetch data sources
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate data sources
        const mockDataSources = [
          {
            id: 'ds-1',
            name: 'Patient Records',
            type: 'patient',
            description: 'Demographic and medical history data',
            recordCount: 250
          },
          {
            id: 'ds-2',
            name: 'Appointment Data',
            type: 'appointment',
            description: 'Appointment scheduling and attendance records',
            recordCount: 1250
          },
          {
            id: 'ds-3',
            name: 'Billing Records',
            type: 'billing',
            description: 'Billing and insurance claim data',
            recordCount: 850
          },
          {
            id: 'ds-4',
            name: 'Lab Results',
            type: 'lab',
            description: 'Laboratory test results',
            recordCount: 620
          },
          {
            id: 'ds-5',
            name: 'Medication Records',
            type: 'medication',
            description: 'Prescription and medication adherence data',
            recordCount: 780
          }
        ];
        
        setAvailableDataSources(mockDataSources);
      } catch (err) {
        console.error('Error fetching data sources:', err);
        setError('Failed to load data sources. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDataSources();
  }, []);

  // Update parameter fields when analysis type changes
  useEffect(() => {
    if (!analyticsData.type) {
      setParameterFields([]);
      return;
    }
    
    // Set default name and description based on type
    const selectedType = analyticsTypes.find(type => type.value === analyticsData.type);
    if (selectedType && !analyticsData.name) {
      setAnalyticsData(prev => ({
        ...prev,
        name: selectedType.label,
        description: selectedType.description
      }));
    }
    
    // Set parameter fields based on type
    switch (analyticsData.type) {
      case 'patientRisk':
        setParameterFields([
          {
            name: 'riskThreshold',
            label: 'Risk Threshold',
            type: 'slider',
            min: 0,
            max: 100,
            defaultValue: 70,
            helperText: 'Patients with risk scores above this threshold will be flagged'
          },
          {
            name: 'includeFactors',
            label: 'Include Risk Factors',
            type: 'checkbox',
            defaultValue: true,
            helperText: 'Include detailed risk factors in the analysis'
          },
          {
            name: 'conditionFocus',
            label: 'Condition Focus',
            type: 'select',
            options: [
              { value: 'all', label: 'All Conditions' },
              { value: 'diabetes', label: 'Diabetes' },
              { value: 'hypertension', label: 'Hypertension' },
              { value: 'heart_disease', label: 'Heart Disease' },
              { value: 'copd', label: 'COPD' }
            ],
            defaultValue: 'all',
            helperText: 'Focus analysis on specific conditions'
          }
        ]);
        break;
      case 'operationalEfficiency':
        setParameterFields([
          {
            name: 'departmentFocus',
            label: 'Department Focus',
            type: 'select',
            options: [
              { value: 'all', label: 'All Departments' },
              { value: 'reception', label: 'Reception & Check-in' },
              { value: 'nursing', label: 'Nursing' },
              { value: 'physicians', label: 'Physicians' },
              { value: 'lab', label: 'Laboratory' },
              { value: 'billing', label: 'Billing' }
            ],
            defaultValue: 'all',
            helperText: 'Focus analysis on specific departments'
          },
          {
            name: 'metricFocus',
            label: 'Metric Focus',
            type: 'multiselect',
            options: [
              { value: 'wait_time', label: 'Wait Times' },
              { value: 'resource_utilization', label: 'Resource Utilization' },
              { value: 'patient_flow', label: 'Patient Flow' },
              { value: 'appointment_adherence', label: 'Appointment Adherence' }
            ],
            defaultValue: ['wait_time', 'resource_utilization'],
            helperText: 'Select metrics to include in analysis'
          }
        ]);
        break;
      case 'patientOutcomes':
        setParameterFields([
          {
            name: 'conditionFocus',
            label: 'Condition Focus',
            type: 'select',
            options: [
              { value: 'all', label: 'All Conditions' },
              { value: 'diabetes', label: 'Diabetes' },
              { value: 'hypertension', label: 'Hypertension' },
              { value: 'heart_disease', label: 'Heart Disease' },
              { value: 'asthma', label: 'Asthma' },
              { value: 'arthritis', label: 'Arthritis' }
            ],
            defaultValue: 'all',
            helperText: 'Focus analysis on specific conditions'
          },
          {
            name: 'outcomeMetrics',
            label: 'Outcome Metrics',
            type: 'multiselect',
            options: [
              { value: 'treatment_success', label: 'Treatment Success Rate' },
              { value: 'readmission', label: 'Readmission Rate' },
              { value: 'medication_adherence', label: 'Medication Adherence' },
              { value: 'patient_satisfaction', label: 'Patient Satisfaction' },
              { value: 'quality_of_life', label: 'Quality of Life Measures' }
            ],
            defaultValue: ['treatment_success', 'readmission'],
            helperText: 'Select outcome metrics to include in analysis'
          },
          {
            name: 'compareToBaseline',
            label: 'Compare to Baseline',
            type: 'checkbox',
            defaultValue: true,
            helperText: 'Compare outcomes to baseline or historical data'
          }
        ]);
        break;
      case 'financialMetrics':
        setParameterFields([
          {
            name: 'metricFocus',
            label: 'Metric Focus',
            type: 'multiselect',
            options: [
              { value: 'revenue', label: 'Revenue Analysis' },
              { value: 'claims', label: 'Claims Processing' },
              { value: 'reimbursement', label: 'Reimbursement Rates' },
              { value: 'denials', label: 'Claim Denials' },
              { value: 'cost', label: 'Cost Analysis' }
            ],
            defaultValue: ['revenue', 'claims'],
            helperText: 'Select financial metrics to include in analysis'
          },
          {
            name: 'includeForecast',
            label: 'Include Forecast',
            type: 'checkbox',
            defaultValue: true,
            helperText: 'Include financial forecasting in the analysis'
          }
        ]);
        break;
      case 'custom':
        setParameterFields([
          {
            name: 'customParameters',
            label: 'Custom Parameters',
            type: 'textarea',
            defaultValue: '',
            helperText: 'Enter custom analysis parameters in JSON format'
          }
        ]);
        break;
      default:
        setParameterFields([]);
    }
    
    // Initialize parameters with default values
    const initialParameters = {};
    parameterFields.forEach(field => {
      initialParameters[field.name] = field.defaultValue;
    });
    
    setAnalyticsData(prev => ({
      ...prev,
      parameters: initialParameters
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsData.type]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setAnalyticsData({
        ...analyticsData,
        [parent]: {
          ...analyticsData[parent],
          [child]: value
        }
      });
    } else {
      setAnalyticsData({
        ...analyticsData,
        [name]: value
      });
    }
  };

  const handleParameterChange = (name, value) => {
    setAnalyticsData({
      ...analyticsData,
      parameters: {
        ...analyticsData.parameters,
        [name]: value
      }
    });
  };

  const handleDataSourcesChange = (event, newValue) => {
    setAnalyticsData({
      ...analyticsData,
      dataSources: newValue
    });
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const validateStep = () => {
    switch (activeStep) {
      case 0:
        // Validate analysis type
        return !!analyticsData.type && !!analyticsData.name;
      case 1:
        // Parameters are optional
        return true;
      case 2:
        // Validate data sources
        return analyticsData.dataSources.length > 0 && 
               !!analyticsData.timeRange.start && 
               !!analyticsData.timeRange.end;
      default:
        return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // In a real app, this would be an API call to create an analytics job
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful response
      console.log('Analytics job created:', analyticsData);
      
      setSuccess(true);
      
      // Navigate to analytics dashboard after a delay
      setTimeout(() => {
        navigate('/app/analytics');
      }, 2000);
    } catch (err) {
      console.error('Error creating analytics job:', err);
      setError('Failed to create analytics job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Analysis Type
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="type-label">Analysis Type</InputLabel>
                  <Select
                    labelId="type-label"
                    id="type"
                    name="type"
                    value={analyticsData.type}
                    label="Analysis Type"
                    onChange={handleInputChange}
                  >
                    {analyticsTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Select the type of analysis to perform
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              {analyticsData.type && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="overline" color="text.secondary">
                      Report Details
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Analysis Name"
                      name="name"
                      value={analyticsData.name}
                      onChange={handleInputChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LabelIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      name="description"
                      multiline
                      rows={2}
                      value={analyticsData.description}
                      onChange={handleInputChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <DescriptionIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
            
            {analyticsData.type && (
              <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {analyticsTypes.find(t => t.value === analyticsData.type)?.label}
                </Typography>
                <Typography variant="body2">
                  {analyticsTypes.find(t => t.value === analyticsData.type)?.description}
                </Typography>
              </Paper>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure Parameters
            </Typography>
            <Grid container spacing={3}>
              {parameterFields.map((field) => (
                <Grid
                  item
                  xs={12}
                  sm={field.type === 'select' || field.type === 'checkbox' ? 6 : 12}
                  key={field.name}
                >
                  {field.type === 'select' && (
                    <FormControl fullWidth>
                      <InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
                      <Select
                        labelId={`${field.name}-label`}
                        id={field.name}
                        value={analyticsData.parameters[field.name] || field.defaultValue}
                        label={field.label}
                        onChange={(e) => handleParameterChange(field.name, e.target.value)}
                      >
                        {field.options.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>{field.helperText}</FormHelperText>
                    </FormControl>
                  )}
                  
                  {field.type === 'multiselect' && (
                    <FormControl fullWidth>
                      <Autocomplete
                        multiple
                        options={field.options}
                        getOptionLabel={(option) => typeof option === 'string' ? 
                          field.options.find(o => o.value === option)?.label || option : 
                          option.label}
                        value={analyticsData.parameters[field.name] || field.defaultValue}
                        onChange={(e, newValue) => handleParameterChange(field.name, newValue.map(v => 
                          typeof v === 'string' ? v : v.value))}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={field.label}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => {
                            const label = typeof option === 'string' ? 
                              field.options.find(o => o.value === option)?.label || option : 
                              option.label;
                            return (
                              <Chip
                                label={label}
                                {...getTagProps({ index })}
                              />
                            );
                          })
                        }
                        renderOption={(props, option) => (
                          <li {...props}>
                            {option.label}
                          </li>
                        )}
                      />
                      <FormHelperText>{field.helperText}</FormHelperText>
                    </FormControl>
                  )}
                  
                  {field.type === 'checkbox' && (
                    <FormControl fullWidth>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={analyticsData.parameters[field.name] || field.defaultValue}
                            onChange={(e) => handleParameterChange(field.name, e.target.checked)}
                            name={field.name}
                          />
                        }
                        label={field.label}
                      />
                      <FormHelperText>{field.helperText}</FormHelperText>
                    </FormControl>
                  )}
                  
                  {field.type === 'textarea' && (
                    <TextField
                      fullWidth
                      label={field.label}
                      multiline
                      rows={4}
                      value={analyticsData.parameters[field.name] || field.defaultValue}
                      onChange={(e) => handleParameterChange(field.name, e.target.value)}
                      helperText={field.helperText}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <NotesIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                </Grid>
              ))}
              
              {parameterFields.length === 0 && analyticsData.type && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    No configurable parameters for this analysis type.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Data Sources
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={availableDataSources}
                  loading={loading}
                  getOptionLabel={(option) => `${option.name} (${option.recordCount} records)`}
                  value={analyticsData.dataSources}
                  onChange={handleDataSourcesChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Data Sources"
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <StorageIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {loading ? <ModernLoadingIndicator variant="button" color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option.name}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description} | {option.recordCount} records
                        </Typography>
                      </Box>
                    </li>
                  )}
                  sx={{ mb: 3 }}
                />
                <FormHelperText>
                  Select the data sources to include in the analysis
                </FormHelperText>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="overline" color="text.secondary">
                  Time Range
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Start Date"
                  name="timeRange.start"
                  type="date"
                  value={analyticsData.timeRange.start}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="End Date"
                  name="timeRange.end"
                  type="date"
                  value={analyticsData.timeRange.end}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            {analyticsData.dataSources.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon fontSize="small" color="action" />
                  Selected Data Sources
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {analyticsData.dataSources.map((source) => (
                    <Chip
                      key={source.id}
                      label={`${source.name} (${source.recordCount} records)`}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Total Records: {analyticsData.dataSources.reduce((sum, source) => sum + source.recordCount, 0)}
                </Typography>
              </Paper>
            )}
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Create Analytics Report
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/app/analytics')}
          >
            Back to Analytics
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Analytics job created successfully! Redirecting...
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box component="form" onSubmit={handleSubmit}>
          {getStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0 || isSubmitting}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  type="submit"
                  startIcon={<SaveIcon />}
                  disabled={isSubmitting || !validateStep()}
                >
                  {isSubmitting ? <ModernLoadingIndicator variant="button" size={24} /> : 'Create Report'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForwardIcon />}
                  disabled={!validateStep()}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
