import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../contexts/AuthContext';
import { get } from '../../utils/apiUtils';
import { 
  fetchTokenBalance, 
  transferTokens,
  selectTokenBalance,
  selectTokenLoading
} from '../../redux/slices/tokenSlice';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Autocomplete,
  FormControl,
  FormHelperText,
  InputAdornment,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Token as TokenIcon,
  CheckCircle as CheckCircleIcon,
  Notes as NotesIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

const steps = ['Select Recipient', 'Amount & Purpose', 'Confirm Transfer'];

export default function TokenTransfer() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [, setSuccess] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  
  // Form data
  const [transferData, setTransferData] = useState({
    recipient: null,
    amount: '',
    purpose: '',
    note: ''
  });
  
  // Get data from Redux
  const dispatch = useDispatch();
  const tokenBalance = useSelector(selectTokenBalance);
  const tokenLoading = useSelector(selectTokenLoading);
  
  // Local state for recipients
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState({
    recipients: true
  });

  useEffect(() => {
    // Fetch token balance from Redux
    dispatch(fetchTokenBalance());
    
    // Fetch available recipients from the real provider list
    const fetchRecipients = async () => {
      try {
        setLoading(prev => ({ ...prev, recipients: true }));
        const res = await get('/providers');
        const all = Array.isArray(res?.data) ? res.data : [];
        // Exclude the currently logged-in user — you can't transfer to yourself
        const myId = currentUser?._id || currentUser?.id;
        const filtered = all.filter(p => (p._id || p.id) !== myId);
        setRecipients(filtered.map(p => ({
          id: p._id || p.id,
          name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
          organization: p.organization || '',
          specialty: p.specialty || '',
          role: p.role || 'provider',
        })));
      } catch (err) {
        console.error('Error fetching recipients:', err);
        setError('Failed to load recipients. Please try again later.');
      } finally {
        setLoading(prev => ({ ...prev, recipients: false }));
      }
    };

    fetchRecipients();
  }, [dispatch, currentUser?._id, currentUser?.id]);

  const handleRecipientChange = (event, newValue) => {
    setTransferData({
      ...transferData,
      recipient: newValue
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTransferData({
      ...transferData,
      [name]: value
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
        // Validate recipient selection
        return !!transferData.recipient;
      case 1:
        // Validate amount and purpose — no setState here (called during render)
        return !!(
          transferData.amount &&
          !isNaN(transferData.amount) &&
          Number.isInteger(Number(transferData.amount)) &&
          parseInt(transferData.amount, 10) > 0 &&
          parseInt(transferData.amount, 10) <= tokenBalance &&
          transferData.purpose
        );
      case 2:
        // Confirm step - always valid
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      // Use Redux to transfer tokens
      const result = await dispatch(transferTokens({
        recipientId: transferData.recipient.id,
        amount: parseInt(transferData.amount, 10),
        description: transferData.purpose,
        note: transferData.note
      })).unwrap();
      
      // Set transaction ID from the result
      setTransactionId(result.transactionId || `tx_${Math.random().toString(36).substring(2, 15)}`);
      
      setSuccess(true);
      setSuccessDialogOpen(true);
    } catch (err) {
      console.error('Error transferring tokens:', err);
      setError(err.message || 'Failed to transfer tokens. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
    navigate('/app/tokens');
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Recipient
            </Typography>
            <Autocomplete
              options={recipients}
              loading={loading.recipients}
              getOptionLabel={(option) => option.name || ''}
              value={transferData.recipient}
              onChange={handleRecipientChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Recipient"
                  required
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {loading.recipients ? <ModernLoadingIndicator variant="button" color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[option.organization, option.specialty, option.role ? option.role.charAt(0).toUpperCase() + option.role.slice(1) : ''].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                </li>
              )}
              sx={{ mb: 3 }}
            />
            
            {transferData.recipient && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {transferData.recipient.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[transferData.recipient.organization, transferData.recipient.specialty].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Role: <strong>{transferData.recipient.role.charAt(0).toUpperCase() + transferData.recipient.role.slice(1)}</strong>
                </Typography>
              </Paper>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Transfer Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={transferData.amount}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TokenIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                  error={transferData.amount && (isNaN(transferData.amount) || parseInt(transferData.amount) <= 0 || parseInt(transferData.amount) > tokenBalance)}
                  helperText={
                    transferData.amount && isNaN(transferData.amount) ? 'Please enter a valid number' :
                    transferData.amount && !Number.isInteger(Number(transferData.amount)) ? 'Token amount must be a whole number' :
                    transferData.amount && parseInt(transferData.amount, 10) <= 0 ? 'Amount must be greater than 0' :
                    transferData.amount && parseInt(transferData.amount, 10) > tokenBalance ? `Insufficient balance (${tokenBalance} tokens available)` :
                    `Available balance: ${tokenBalance} tokens`
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <TextField
                    label="Purpose"
                    name="purpose"
                    value={transferData.purpose}
                    onChange={handleInputChange}
                    select
                    SelectProps={{
                      native: true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    <option value="" disabled>Select a purpose</option>
                    <option value="collaboration">Collaboration</option>
                    <option value="referral">Referral Incentive</option>
                    <option value="data_sharing">Data Sharing</option>
                    <option value="service_payment">Service Payment</option>
                    <option value="other">Other</option>
                  </TextField>
                  <FormHelperText>
                    Select the purpose of this token transfer
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Note (Optional)"
                  name="note"
                  multiline
                  rows={3}
                  value={transferData.note}
                  onChange={handleInputChange}
                  placeholder="Add a note to the recipient..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <NotesIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirm Transfer
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please review the transfer details before confirming. This action cannot be undone.
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Recipient
                  </Typography>
                  <Typography variant="body1">
                    {transferData.recipient?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {transferData.recipient?.organization}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {transferData.amount} Tokens
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Purpose
                  </Typography>
                  <Typography variant="body1">
                    {transferData.purpose.charAt(0).toUpperCase() + transferData.purpose.slice(1).replace('_', ' ')}
                  </Typography>
                </Grid>
                {transferData.note && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Note
                    </Typography>
                    <Typography variant="body1">
                      {transferData.note}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
            <Alert severity="warning">
              <Typography variant="body2">
                This transaction will be recorded on the blockchain and cannot be reversed once confirmed.
                Your current balance is {tokenBalance} tokens, and after this transfer, it will be {tokenBalance - parseInt(transferData.amount)} tokens.
              </Typography>
            </Alert>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Transfer Tokens
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
        
        {tokenLoading.balance ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ModernLoadingIndicator variant="button" size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">
              Loading token balance...
            </Typography>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            Your current token balance: <strong>{tokenBalance} tokens</strong>
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {getStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={activeStep === 0 ? () => navigate('/app/tokens') : handleBack}
            disabled={isSubmitting}
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting || !validateStep()}
                startIcon={isSubmitting ? <ModernLoadingIndicator size="small" variant="circular" /> : <SendIcon />}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Transfer'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!validateStep()}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
      
      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={handleSuccessDialogClose}
        aria-labelledby="transfer-success-dialog-title"
      >
        <DialogTitle id="transfer-success-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            Transfer Successful
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have successfully transferred {transferData.amount} tokens to {transferData.recipient?.name}.
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
