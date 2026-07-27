import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTokenBalance,
  fetchRedemptionServices,
  redeemTokens,
  selectTokenBalance,
  selectRedemptionServices,
  selectTokenLoading
} from '../../redux/slices/tokenSlice';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Alert,
  Avatar,
  IconButton
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  ArrowBack as ArrowBackIcon,
  ShoppingCart as ShoppingCartIcon,
  Token as TokenIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function TokenRedeem() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get data from Redux
  const tokenBalance = useSelector(selectTokenBalance);
  const redemptionServices = useSelector(selectRedemptionServices);
  const services = useMemo(() => redemptionServices || [], [redemptionServices]);
  const tokenLoading = useSelector(selectTokenLoading);
  
  // Local UI state
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  
  // Redemption state
  const [selectedService, setSelectedService] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    // Fetch data from Redux
    dispatch(fetchTokenBalance());
    dispatch(fetchRedemptionServices());

    // If we need to simulate services data when the API is not ready, we can use this
    /* const mockServices = [
          {
            id: 'svc-1',
            name: 'Premium Analytics Report',
            description: 'Access to advanced analytics reports with detailed insights and recommendations. Includes AI-driven predictions and custom visualizations.',
            tokenCost: 25,
            category: 'analytics',
            available: true,
            image: '/analytics-icon.svg',
            benefits: [
              'Advanced patient risk stratification',
              'Operational efficiency insights',
              'Financial performance metrics',
              'Custom visualizations'
            ]
          },
          {
            id: 'svc-2',
            name: 'Priority Referral Processing',
            description: 'Expedited processing of patient referrals. Your referrals will be prioritized in the network, reducing wait times and improving patient experience.',
            tokenCost: 15,
            category: 'referrals',
            available: true,
            image: '/referral-icon.svg',
            benefits: [
              'Faster referral processing',
              'Priority in the network queue',
              'Enhanced tracking capabilities',
              'Automated follow-ups'
            ]
          },
          {
            id: 'svc-3',
            name: 'Extended Data Storage',
            description: 'Additional secure storage for patient records and analytics data. Expand your blockchain storage capacity for more comprehensive record keeping.',
            tokenCost: 30,
            category: 'storage',
            available: true,
            image: '/storage-icon.svg',
            benefits: [
              'Increased blockchain storage capacity',
              'Enhanced data retention',
              'Secure backup solutions',
              'Improved data accessibility'
            ]
          },
          {
            id: 'svc-4',
            name: 'AI Consultation Assistant',
            description: 'AI-powered assistant for patient consultations with real-time insights. Get intelligent suggestions and relevant information during patient visits.',
            tokenCost: 50,
            category: 'ai',
            available: true,
            image: '/ai-icon.svg',
            benefits: [
              'Real-time clinical decision support',
              'Medication interaction alerts',
              'Treatment recommendation engine',
              'Patient history summarization'
            ]
          },
          {
            id: 'svc-5',
            name: 'Network Membership Upgrade',
            description: 'Upgrade your membership tier in the ClinicTrust network. Access exclusive features and benefits reserved for premium members.',
            tokenCost: 100,
            category: 'membership',
            available: true,
            image: '/membership-icon.svg',
            benefits: [
              'Reduced transaction fees',
              'Priority support access',
              'Early access to new features',
              'Voting rights on network governance'
            ]
          },
          {
            id: 'svc-6',
            name: 'Blockchain Certification',
            description: 'Verify and certify your medical credentials on the blockchain. Create an immutable record of your qualifications accessible to the network.',
            tokenCost: 40,
            category: 'certification',
            available: true,
            image: '/certification-icon.svg',
            benefits: [
              'Immutable credential verification',
              'Network-wide recognition',
              'Simplified credentialing process',
              'Enhanced professional profile'
            ]
          }
        ];
        
    */
  }, [dispatch]);

  // Filter services based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredServices(services);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = services.filter(service => 
        service.name.toLowerCase().includes(lowercasedSearch) ||
        service.description.toLowerCase().includes(lowercasedSearch) ||
        service.category.toLowerCase().includes(lowercasedSearch)
      );
      setFilteredServices(filtered);
    }
  }, [searchTerm, services]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false);
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
    navigate('/app/tokens');
  };

  const handleRedeemService = async () => {
    if (!selectedService) return;
    
    setIsRedeeming(true);
    
    try {
      // Use Redux to redeem tokens
      const result = await dispatch(redeemTokens({
        serviceId: selectedService.id,
        amount: selectedService.tokenCost,
        serviceName: selectedService.name
      })).unwrap();
      
      // Set transaction ID from the result
      setTransactionId(result.transactionId || `tx_${Math.random().toString(36).substring(2, 15)}`);
      
      // Close confirm dialog and open success dialog
      setConfirmDialogOpen(false);
      setSuccessDialogOpen(true);
    } catch (err) {
      console.error('Error redeeming service:', err);
      setError(err.message || 'Failed to redeem service. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Group services by category
  const getServicesByCategory = () => {
    const categories = {};
    
    filteredServices.forEach(service => {
      if (!categories[service.category]) {
        categories[service.category] = [];
      }
      categories[service.category].push(service);
    });
    
    return categories;
  };

  // Format category name
  const formatCategoryName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
  };

  if (tokenLoading.balance || tokenLoading.services) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="pulse" message="Loading redemption services..." />
      </Box>
    );
  }

  const servicesByCategory = getServicesByCategory();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Redeem Tokens
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/tokens')}
        >
          Back to Tokens
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TokenIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" component="div">
              {tokenBalance} Tokens
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Available Balance
            </Typography>
          </Box>
        </Box>
        <TextField
          placeholder="Search services..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>
      
      {Object.keys(servicesByCategory).length === 0 ? (
        <Alert severity="info">
          No services found matching your search criteria.
        </Alert>
      ) : (
        Object.entries(servicesByCategory).map(([category, categoryServices]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              {formatCategoryName(category)} Services
            </Typography>
            <Grid container spacing={3}>
              {categoryServices.map((service) => (
                <Grid item xs={12} md={6} lg={4} key={service.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="card-hover">
                    <CardMedia
                      component="div"
                      sx={{
                        height: 140,
                        backgroundColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <TokenIcon sx={{ fontSize: 60, color: 'white' }} />
                    </CardMedia>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {service.name}
                        </Typography>
                        <Chip
                          label={`${service.tokenCost} Tokens`}
                          color="primary"
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {service.description}
                      </Typography>
                      {service.benefits && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Benefits:
                          </Typography>
                          <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                            {service.benefits.map((benefit, index) => (
                              <li key={index}>
                                <Typography variant="body2">
                                  {benefit}
                                </Typography>
                              </li>
                            ))}
                          </ul>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained"
                        startIcon={<ShoppingCartIcon />}
                        onClick={() => handleSelectService(service)}
                        disabled={tokenBalance < service.tokenCost}
                        fullWidth
                      >
                        Redeem
                      </Button>
                    </CardActions>
                    {tokenBalance < service.tokenCost && (
                      <Box sx={{ p: 1, bgcolor: 'error.light', textAlign: 'center' }}>
                        <Typography variant="caption" color="error.dark">
                          Insufficient tokens
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleConfirmDialogClose}
        aria-labelledby="confirm-redemption-dialog-title"
      >
        <DialogTitle id="confirm-redemption-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            <ShoppingCartIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Confirm Redemption
          </Typography>
          <IconButton aria-label="close" onClick={handleConfirmDialogClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            You are about to redeem <strong>{selectedService?.tokenCost} tokens</strong> for:
          </DialogContentText>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="h6">
              {selectedService?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedService?.description}
            </Typography>
          </Box>
          <DialogContentText>
            Your current balance is {tokenBalance} tokens, and after this redemption, it will be {selectedService ? tokenBalance - selectedService.tokenCost : tokenBalance} tokens.
            This transaction will be recorded on the blockchain and cannot be reversed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose}>Cancel</Button>
          <Button 
            onClick={handleRedeemService} 
            variant="contained"
            disabled={isRedeeming}
            startIcon={isRedeeming ? <ModernLoadingIndicator size="small" variant="circular" /> : <ShoppingCartIcon />}
          >
            {isRedeeming ? 'Processing...' : 'Confirm Redemption'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={handleSuccessDialogClose}
        aria-labelledby="redemption-success-dialog-title"
      >
        <DialogTitle id="redemption-success-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'success.main' }}>
            <CheckCircleIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" component="span">
            Redemption Successful
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            You have successfully redeemed {selectedService?.tokenCost} tokens for {selectedService?.name}.
            This transaction has been recorded on the blockchain.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Transaction ID:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {transactionId}
            </Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              New Token Balance:
            </Typography>
            <Typography variant="h6" color="primary">
              {tokenBalance} Tokens
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessDialogClose} variant="contained" autoFocus>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
