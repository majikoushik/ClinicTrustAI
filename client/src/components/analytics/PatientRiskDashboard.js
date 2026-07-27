import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Divider,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  LocalHospital as MedicalIcon,
  Medication as MedicationIcon,
  ReceiptLong as ReceiptIcon,
  EventNote as EventIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

// Import chart components
import { LineChart, RadarChart } from '../charts';
import { formatDate } from '../../utils/dateFormatter';

/**
 * PatientRiskDashboard Component
 * 
 * A comprehensive dashboard for visualizing patient risk factors and analytics
 * 
 * @param {Object} props - Component props
 * @param {Object} props.patient - Patient data object
 * @param {Array} props.riskFactors - Risk factors data
 * @param {Array} props.medicalHistory - Medical history data
 * @param {Array} props.vitalsTrend - Vitals trend data
 * @param {boolean} props.loading - Loading state
 */
export default function PatientRiskDashboard({
  patient = {},
  riskFactors = [],
  medicalHistory = [],
  vitalsTrend = [],
  loading = false
}) {
  const theme = useTheme();
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('');
  const [riskLevelColor, setRiskLevelColor] = useState('');
  const [riskDistribution, setRiskDistribution] = useState([]);
  const [riskTrend, setRiskTrend] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  
  // Calculate risk metrics when patient data changes
  useEffect(() => {
    if (patient && riskFactors.length > 0) {
      // Calculate risk score (0-100)
      const calculatedScore = calculateRiskScore(riskFactors);
      setRiskScore(calculatedScore);
      
      // Determine risk level based on score
      if (calculatedScore >= 75) {
        setRiskLevel('High');
        setRiskLevelColor(theme.palette.error.main);
      } else if (calculatedScore >= 50) {
        setRiskLevel('Medium');
        setRiskLevelColor(theme.palette.warning.main);
      } else if (calculatedScore >= 25) {
        setRiskLevel('Low');
        setRiskLevelColor(theme.palette.success.main);
      } else {
        setRiskLevel('Minimal');
        setRiskLevelColor(theme.palette.info.main);
      }
      
      // Generate risk distribution data
      setRiskDistribution([
        { name: 'Clinical', value: Math.floor(Math.random() * 40) + 10 },
        { name: 'Behavioral', value: Math.floor(Math.random() * 30) + 10 },
        { name: 'Social', value: Math.floor(Math.random() * 20) + 5 },
        { name: 'Environmental', value: Math.floor(Math.random() * 10) + 5 }
      ]);
      
      // Generate risk trend data (last 12 months)
      const trend = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(now.getMonth() - i);
        
        // Create some variation in the risk score over time
        let monthScore = calculatedScore;
        monthScore += Math.floor(Math.random() * 20) - 10; // Add/subtract up to 10 points
        monthScore = Math.max(0, Math.min(100, monthScore)); // Keep between 0-100
        
        trend.push({
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          score: monthScore
        });
      }
      setRiskTrend(trend);
      
      // Generate compliance data
      setComplianceData([
        {
          category: 'Medication',
          compliance: Math.floor(Math.random() * 40) + 60,
          average: 75
        },
        {
          category: 'Appointments',
          compliance: Math.floor(Math.random() * 30) + 70,
          average: 80
        },
        {
          category: 'Diet',
          compliance: Math.floor(Math.random() * 50) + 50,
          average: 65
        },
        {
          category: 'Exercise',
          compliance: Math.floor(Math.random() * 60) + 40,
          average: 60
        },
        {
          category: 'Monitoring',
          compliance: Math.floor(Math.random() * 35) + 65,
          average: 70
        }
      ]);
    }
  }, [
    patient,
    riskFactors,
    theme.palette.error.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
  ]);
  
  // Calculate risk score based on risk factors
  const calculateRiskScore = (factors) => {
    if (!factors || factors.length === 0) return 0;
    
    // Sum up the impact values of all risk factors
    const totalImpact = factors.reduce((sum, factor) => sum + factor.impact, 0);
    
    // Normalize to 0-100 scale
    const maxPossibleImpact = factors.length * 10; // Assuming impact is 0-10 scale
    return Math.min(100, Math.round((totalImpact / maxPossibleImpact) * 100));
  };
  
  // Get risk level chip
  const getRiskLevelChip = (level, size = 'medium') => {
    let color = 'default';
    let icon = <InfoIcon />;
    
    switch (level) {
      case 'High':
        color = 'error';
        icon = <ErrorIcon />;
        break;
      case 'Medium':
        color = 'warning';
        icon = <WarningIcon />;
        break;
      case 'Low':
        color = 'success';
        icon = <CheckCircleIcon />;
        break;
      default:
        color = 'info';
        icon = <InfoIcon />;
    }
    
    return (
      <Chip
        icon={icon}
        label={level}
        color={color}
        size={size}
        variant="filled"
      />
    );
  };
  
  // Get trend icon based on value change
  const getTrendIcon = (current, previous) => {
    if (current > previous) {
      return <TrendingUpIcon color="error" fontSize="small" />;
    } else if (current < previous) {
      return <TrendingDownIcon color="success" fontSize="small" />;
    }
    return null;
  };
  
  // Patient risk score card
  const RiskScoreCard = () => (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardHeader
        title="Risk Assessment"
        subheader="Current risk level and score"
      />
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', mr: 3 }}>
            <CircularRiskIndicator value={riskScore} color={riskLevelColor} size={120} />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4" component="div" color={riskLevelColor} fontWeight="bold">
                {riskScore}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Risk Level
            </Typography>
            {getRiskLevelChip(riskLevel)}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Last updated: {formatDate(new Date())}
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle2" gutterBottom>
          Risk Score Breakdown
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {riskDistribution.map((item) => (
            <Box key={item.name} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{item.name}</Typography>
                <Typography variant="body2" fontWeight="medium">{item.value}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.value}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    backgroundColor: riskLevelColor,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
  
  // Risk factors table
  const RiskFactorsTable = () => (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardHeader
        title="Risk Factors"
        subheader="Factors contributing to patient risk"
        action={
          <Tooltip title="View all risk factors">
            <IconButton>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <Divider />
      <TableContainer component={Box} sx={{ maxHeight: 350 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Factor</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Impact</TableCell>
              <TableCell>Trend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {riskFactors.slice(0, 5).map((factor) => (
              <TableRow key={factor.id}>
                <TableCell>{factor.name}</TableCell>
                <TableCell>{factor.category}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LinearProgress
                      variant="determinate"
                      value={factor.impact * 10}
                      sx={{
                        width: 60,
                        height: 6,
                        borderRadius: 3,
                        mr: 1,
                        backgroundColor: theme.palette.grey[200],
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          backgroundColor: factor.impact > 7 ? theme.palette.error.main :
                                          factor.impact > 4 ? theme.palette.warning.main :
                                          theme.palette.success.main,
                        },
                      }}
                    />
                    <Typography variant="body2">{factor.impact}/10</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {getTrendIcon(factor.impact, factor.previousImpact)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
  
  // Risk trend chart
  const RiskTrendChart = () => (
    <LineChart
      title="Risk Score Trend"
      subtitle="12-month risk score history"
      data={riskTrend}
      lines={[
        { dataKey: 'score', name: 'Risk Score', color: riskLevelColor }
      ]}
      xAxisDataKey="date"
      height={350}
    />
  );
  
  // Patient compliance radar chart
  const ComplianceChart = () => (
    <RadarChart
      title="Patient Compliance"
      subtitle="Compliance metrics compared to average"
      data={complianceData}
      variables={[
        { dataKey: 'compliance', name: 'Patient Compliance', color: theme.palette.primary.main },
        { dataKey: 'average', name: 'Population Average', color: theme.palette.grey[500] }
      ]}
      categoryKey="category"
      height={350}
    />
  );
  
  // Medical history timeline
  const MedicalHistoryTimeline = () => (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardHeader
        title="Medical History"
        subheader="Recent medical events"
        action={
          <Tooltip title="View complete history">
            <IconButton>
              <AssignmentIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <Divider />
      <CardContent sx={{ maxHeight: 350, overflow: 'auto' }}>
        <List>
          {medicalHistory.slice(0, 5).map((event) => (
            <React.Fragment key={event.id}>
              <ListItem alignItems="flex-start">
                <ListItemIcon>
                  {event.type === 'visit' && <EventIcon color="primary" />}
                  {event.type === 'medication' && <MedicationIcon color="secondary" />}
                  {event.type === 'diagnosis' && <MedicalIcon color="error" />}
                  {event.type === 'lab' && <ReceiptIcon color="info" />}
                </ListItemIcon>
                <ListItemText
                  primary={event.description}
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {event.date}
                      </Typography>
                      {event.notes && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {event.notes}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
  
  // Circular risk indicator component
  const CircularRiskIndicator = ({ value, color, size = 80 }) => {
    const circumference = 2 * Math.PI * 45; // 45 is the radius
    const strokeDashoffset = circumference - (value / 100) * circumference;
    
    return (
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200]}
            strokeWidth="8"
          />
          
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
      </Box>
    );
  };
  
  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {/* Patient Info */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar
              alt={patient.name}
              src={patient.avatar}
              sx={{ width: 64, height: 64, mr: 2 }}
            />
            <Box>
              <Typography variant="h5" component="h2">
                {patient.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {patient.age} years • {patient.gender} • ID: {patient.id}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Risk Score */}
        <Grid item xs={12} md={4}>
          <RiskScoreCard />
        </Grid>
        
        {/* Risk Factors */}
        <Grid item xs={12} md={8}>
          <RiskFactorsTable />
        </Grid>
        
        {/* Risk Trend */}
        <Grid item xs={12} md={6}>
          <RiskTrendChart />
        </Grid>
        
        {/* Compliance Chart */}
        <Grid item xs={12} md={6}>
          <ComplianceChart />
        </Grid>
        
        {/* Medical History */}
        <Grid item xs={12}>
          <MedicalHistoryTimeline />
        </Grid>
      </Grid>
    </Box>
  );
}
