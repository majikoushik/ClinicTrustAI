import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Tabs,
  Tab,
  Autocomplete,
  Menu
} from '@mui/material';
import { ModernLoadingIndicator } from '../../../components/common';
import EllipsisCell from '../../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../../components/common/adminTableStyles';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Flag as FlagIcon,
  Category as CategoryIcon,
  AssignmentInd as AssignmentIndIcon,
  Done as DoneIcon,
  Timeline as TimelineIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { formatDateTime } from '../../../utils/dateFormatter';
import * as adminMessagingService from '../../../services/adminMessagingService';

/**
 * EscalationWorkflows component for managing AI-flagged cases requiring attention
 */
const EscalationWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openResolveDialog, setOpenResolveDialog] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: ''
  });
  const [openFiltersDialog, setOpenFiltersDialog] = useState(false);

  // Row action menu (kebab) — see AdminProviders.js for the reference pattern
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuWorkflow, setActionMenuWorkflow] = useState(null);
  const openActionMenu = (event, workflow) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuWorkflow(workflow);
  };
  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuWorkflow(null);
  };

  // Mock providers for assignment
  const [providers] = useState([
    { id: 'user-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinictrust.ai' },
    { id: 'user-2', name: 'Dr. Michael Chen', email: 'michael.chen@clinictrust.ai' },
    { id: 'user-3', name: 'Dr. Emily Rodriguez', email: 'emily.rodriguez@clinictrust.ai' },
    { id: 'user-4', name: 'Dr. Robert Davis', email: 'robert.davis@clinictrust.ai' },
    { id: 'user-5', name: 'Dr. Lisa Wilson', email: 'lisa.wilson@clinictrust.ai' }
  ]);

  // Form state for resolution
  const [resolutionData, setResolutionData] = useState({
    action: '',
    notes: '',
    resolvedBy: null
  });

  // Form state for assignment
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Fetch escalation workflows on component mount
  useEffect(() => {
    fetchWorkflows();
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch workflows when filters change
  useEffect(() => {
    fetchWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Fetch workflows from the service
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await adminMessagingService.getEscalationWorkflows(filters);
      setWorkflows(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching escalation workflows:', err);
      setError('Failed to load escalation workflows. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await adminMessagingService.getEscalationStatistics();
      setStatistics(response.data);
    } catch (err) {
      console.error('Error fetching escalation statistics:', err);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Set filters based on tab
    switch (newValue) {
      case 0: // All
        setFilters({
          status: '',
          priority: '',
          category: ''
        });
        break;
      case 1: // Pending Review
        setFilters({
          status: 'pending_review',
          priority: '',
          category: ''
        });
        break;
      case 2: // In Progress
        setFilters({
          status: 'in_progress',
          priority: '',
          category: ''
        });
        break;
      case 3: // Resolved
        setFilters({
          status: 'resolved',
          priority: '',
          category: ''
        });
        break;
      case 4: // High Priority
        setFilters({
          status: '',
          priority: 'high',
          category: ''
        });
        break;
      default:
        setFilters({
          status: '',
          priority: '',
          category: ''
        });
    }
  };

  // Open dialog for viewing workflow details
  const handleViewWorkflow = (workflow) => {
    setCurrentWorkflow(workflow);
    setOpenViewDialog(true);
  };

  // Open dialog for assigning workflow
  const handleAssignPrompt = (workflow) => {
    setCurrentWorkflow(workflow);
    setSelectedProvider(workflow.assignedTo || null);
    setOpenAssignDialog(true);
  };

  // Open dialog for resolving workflow
  const handleResolvePrompt = (workflow) => {
    setCurrentWorkflow(workflow);
    setResolutionData({
      action: '',
      notes: '',
      resolvedBy: null
    });
    setOpenResolveDialog(true);
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Apply filters
  const handleApplyFilters = () => {
    setOpenFiltersDialog(false);
    fetchWorkflows();
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category: ''
    });
    setOpenFiltersDialog(false);
  };

  // Handle resolution form input changes
  const handleResolutionInputChange = (e) => {
    const { name, value } = e.target;
    setResolutionData({
      ...resolutionData,
      [name]: value
    });
  };

  // Handle provider selection for resolution
  const handleResolverChange = (event, newValue) => {
    setResolutionData({
      ...resolutionData,
      resolvedBy: newValue
    });
  };

  // Handle provider selection for assignment
  const handleProviderChange = (event, newValue) => {
    setSelectedProvider(newValue);
  };

  // Submit assignment
  const handleAssign = async () => {
    if (!selectedProvider) return;
    
    try {
      await adminMessagingService.assignEscalationWorkflow(currentWorkflow.id, selectedProvider);
      setOpenAssignDialog(false);
      fetchWorkflows();
      fetchStatistics();
    } catch (err) {
      console.error('Error assigning workflow:', err);
      setError('Failed to assign workflow. Please try again.');
    }
  };

  // Submit resolution
  const handleResolve = async () => {
    try {
      await adminMessagingService.resolveEscalationWorkflow(currentWorkflow.id, {
        ...resolutionData,
        resolvedBy: resolutionData.resolvedBy || { 
          id: 'admin-1', 
          name: 'Admin User', 
          email: 'admin@clinictrust.ai' 
        }
      });
      setOpenResolveDialog(false);
      fetchWorkflows();
      fetchStatistics();
    } catch (err) {
      console.error('Error resolving workflow:', err);
      setError('Failed to resolve workflow. Please try again.');
    }
  };

  // Get color for priority chip
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  // Get color for status chip
  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'pending_review':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Shared row-action menu — one instance, opened against whichever row's
  // kebab button was clicked (see openActionMenu/closeActionMenu above).
  const renderActionMenu = () => {
    const workflow = actionMenuWorkflow;
    if (!workflow) return null;
    const runAction = (fn) => { closeActionMenu(); fn(); };
    return (
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => runAction(() => handleViewWorkflow(workflow))}>
          <ListItemIcon><VisibilityIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        {workflow.status !== 'resolved' && [
          <MenuItem key="assign" onClick={() => runAction(() => handleAssignPrompt(workflow))}>
            <ListItemIcon><AssignmentIndIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Assign</ListItemText>
          </MenuItem>,
          <MenuItem key="resolve" onClick={() => runAction(() => handleResolvePrompt(workflow))}>
            <ListItemIcon><DoneIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Resolve</ListItemText>
          </MenuItem>,
        ]}
      </Menu>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2">
          Escalation Workflows
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<FilterListIcon />}
          onClick={() => setOpenFiltersDialog(true)}
        >
          Filters
        </Button>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {statistics.totalWorkflows}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="warning.main">
                  {statistics.statusDistribution?.pendingReview || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Review
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="error.main">
                  {statistics.highPriority || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Priority
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="info.main">
                  {statistics.unassigned || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unassigned
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Tabs for filtering */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Cases" />
          <Tab label="Pending Review" />
          <Tab label="In Progress" />
          <Tab label="Resolved" />
          <Tab label="High Priority" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
           <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
          <Table size="small" sx={tableSx}>
            <TableHead>
              <TableRow sx={tableHeadRowSx}>
                <TableCell sx={{ width: '16%' }}>Title</TableCell>
                <TableCell sx={{ width: '13%' }}>Patient</TableCell>
                <TableCell sx={{ width: '9%' }}>Risk Score</TableCell>
                <TableCell sx={{ width: '9%' }}>Priority</TableCell>
                <TableCell sx={{ width: '11%' }}>Status</TableCell>
                <TableCell sx={{ width: '12%' }}>Category</TableCell>
                <TableCell sx={{ width: '13%' }}>Assigned To</TableCell>
                <TableCell sx={{ width: '15%' }}>Flagged At</TableCell>
                <TableCell sx={{ width: '48px' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No escalation workflows found.
                  </TableCell>
                </TableRow>
              ) : (
                workflows.map((workflow) => (
                  <TableRow key={workflow.id} hover sx={tableBodyRowSx}>
                    <TableCell sx={{ width: '16%' }}><EllipsisCell value={workflow.title} /></TableCell>
                    <TableCell sx={{ width: '13%' }}><EllipsisCell value={workflow.patientName} /></TableCell>
                    <TableCell sx={{ width: '9%' }}>
                      <Chip
                        label={`${Math.round(workflow.aiRiskScore * 100)}%`}
                        color={workflow.aiRiskScore > 0.8 ? 'error' : workflow.aiRiskScore > 0.6 ? 'warning' : 'success'}
                        size="small"
                        sx={compactChipSx}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '9%' }}>
                      <Chip
                        label={workflow.priority}
                        color={getPriorityColor(workflow.priority)}
                        size="small"
                        sx={compactChipSx}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '11%' }}>
                      <Chip
                        label={workflow.status.replace('_', ' ')}
                        color={getStatusColor(workflow.status)}
                        size="small"
                        sx={compactChipSx}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '12%' }}><EllipsisCell value={workflow.category} /></TableCell>
                    <TableCell sx={{ width: '13%' }}>
                      <EllipsisCell value={workflow.assignedTo ? workflow.assignedTo.name : 'Unassigned'} />
                    </TableCell>
                    <TableCell sx={{ width: '15%' }}>{formatDateTime(workflow.flaggedAt)}</TableCell>
                    <TableCell sx={{ width: '48px' }} align="center">
                      <IconButton size="small" onClick={(e) => openActionMenu(e, workflow)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {renderActionMenu()}

      {/* View Workflow Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        {currentWorkflow && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">{currentWorkflow.title}</Typography>
                <Chip
                  label={currentWorkflow.status.replace('_', ' ')}
                  color={getStatusColor(currentWorkflow.status)}
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Patient Information" />
                    <Divider />
                    <CardContent>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <PersonIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Patient Name" 
                            secondary={currentWorkflow.patientName} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <AssignmentIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Patient ID" 
                            secondary={currentWorkflow.patientId} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Escalation Details" />
                    <Divider />
                    <CardContent>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <WarningIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="AI Risk Score" 
                            secondary={`${Math.round(currentWorkflow.aiRiskScore * 100)}%`} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <FlagIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Priority" 
                            secondary={currentWorkflow.priority} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CategoryIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Category" 
                            secondary={currentWorkflow.category} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <AccessTimeIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Flagged At" 
                            secondary={formatDateTime(currentWorkflow.flaggedAt)} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <AssignmentIndIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Assigned To" 
                            secondary={currentWorkflow.assignedTo ? currentWorkflow.assignedTo.name : 'Unassigned'} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader title="Risk Factors & Recommendations" />
                    <Divider />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            Risk Factors
                          </Typography>
                          <List dense>
                            {currentWorkflow.details.riskFactors.map((factor, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  <WarningIcon color="warning" />
                                </ListItemIcon>
                                <ListItemText primary={factor} />
                              </ListItem>
                            ))}
                          </List>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" gutterBottom>
                            AI Recommendations
                          </Typography>
                          <List dense>
                            {currentWorkflow.details.aiRecommendations.map((recommendation, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  <CheckIcon color="success" />
                                </ListItemIcon>
                                <ListItemText primary={recommendation} />
                              </ListItem>
                            ))}
                          </List>
                        </Grid>
                      </Grid>
                      
                      <Typography variant="subtitle1" sx={{ mt: 2 }}>
                        Notes
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {currentWorkflow.details.notes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader 
                      title="Timeline" 
                      avatar={<TimelineIcon />}
                    />
                    <Divider />
                    <CardContent>
                      <Box sx={{ maxWidth: '100%', overflowX: 'hidden' }}>
                        <Timeline position="alternate" sx={{ padding: 0, margin: 0 }}>
                          {currentWorkflow.timeline.map((event, index) => (
                            <TimelineItem key={index}>
                              <TimelineOppositeContent sx={{ m: 'auto 0' }} color="text.secondary">
                                {formatDateTime(event.timestamp)}
                              </TimelineOppositeContent>
                              <TimelineSeparator>
                                <TimelineDot color={
                                  event.action.includes('Flagged') ? 'warning' :
                                  event.action.includes('Assigned') ? 'primary' :
                                  event.action.includes('Resolved') ? 'success' : 'grey'
                                } />
                                {index < currentWorkflow.timeline.length - 1 && <TimelineConnector />}
                              </TimelineSeparator>
                              <TimelineContent sx={{ py: '12px', px: 2 }}>
                                <Typography variant="body1">
                                  {event.action}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {event.user}
                                </Typography>
                              </TimelineContent>
                            </TimelineItem>
                          ))}
                        </Timeline>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {currentWorkflow.resolution && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardHeader 
                        title="Resolution" 
                        avatar={<DoneIcon color="success" />}
                      />
                      <Divider />
                      <CardContent>
                        <Typography variant="subtitle1">
                          Action Taken: {currentWorkflow.resolution.action}
                        </Typography>
                        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                          {currentWorkflow.resolution.notes}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Resolved by {currentWorkflow.resolution.resolvedBy.name} on {formatDateTime(currentWorkflow.resolution.timestamp)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
              {currentWorkflow.status !== 'resolved' && (
                <>
                  <Button 
                    onClick={() => {
                      setOpenViewDialog(false);
                      handleAssignPrompt(currentWorkflow);
                    }} 
                    color="primary"
                  >
                    Assign
                  </Button>
                  <Button 
                    onClick={() => {
                      setOpenViewDialog(false);
                      handleResolvePrompt(currentWorkflow);
                    }} 
                    variant="contained" 
                    color="success"
                  >
                    Resolve
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Assign Workflow Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)}>
        <DialogTitle>Assign Workflow</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select a provider to assign this workflow to:
          </DialogContentText>
          <Autocomplete
            id="provider-select"
            options={providers}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            value={selectedProvider}
            onChange={handleProviderChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Provider"
                fullWidth
                required
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                    {option.name.charAt(0)}
                  </Avatar>
                  {option.name} ({option.email})
                </Box>
              </li>
            )}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssign} 
            variant="contained" 
            color="primary"
            disabled={!selectedProvider}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Workflow Dialog */}
      <Dialog open={openResolveDialog} onClose={() => setOpenResolveDialog(false)}>
        <DialogTitle>Resolve Workflow</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Provide resolution details for this workflow:
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="action"
                label="Action Taken"
                fullWidth
                value={resolutionData.action}
                onChange={handleResolutionInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Resolution Notes"
                fullWidth
                multiline
                rows={4}
                value={resolutionData.notes}
                onChange={handleResolutionInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                id="resolver-select"
                options={providers}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                value={resolutionData.resolvedBy}
                onChange={handleResolverChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Resolved By"
                    fullWidth
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                        {option.name.charAt(0)}
                      </Avatar>
                      {option.name} ({option.email})
                    </Box>
                  </li>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResolveDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleResolve} 
            variant="contained" 
            color="success"
            disabled={!resolutionData.action || !resolutionData.notes}
          >
            Resolve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filters Dialog */}
      <Dialog open={openFiltersDialog} onClose={() => setOpenFiltersDialog(false)}>
        <DialogTitle>Filter Escalation Workflows</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending_review">Pending Review</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={filters.priority}
                  onChange={handleFilterChange}
                  label="Priority"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  label="Category"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="readmission">Readmission</MenuItem>
                  <MenuItem value="lab_result">Lab Result</MenuItem>
                  <MenuItem value="medication">Medication</MenuItem>
                  <MenuItem value="appointment">Appointment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetFilters}>Reset</Button>
          <Button onClick={handleApplyFilters} variant="contained" color="primary">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EscalationWorkflows;
