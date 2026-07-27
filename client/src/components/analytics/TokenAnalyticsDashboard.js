import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  SwapHoriz as SwapIcon,
  CallReceived as ReceivedIcon,
  CallMade as SentIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

// Import chart components
import { LineChart, BarChart, PieChart } from '../charts';

/**
 * TokenAnalyticsDashboard Component
 * 
 * A comprehensive dashboard for visualizing token transactions and activity
 * 
 * @param {Object} props - Component props
 * @param {Object} props.tokenData - Token data object
 * @param {Array} props.transactions - Transaction history
 * @param {Array} props.activityData - Token activity data
 * @param {boolean} props.loading - Loading state
 */
export default function TokenAnalyticsDashboard({
  tokenData = {},
  transactions = [],
  activityData = [],
  loading = false
}) {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('month');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenTrend, setTokenTrend] = useState([]);
  const [tokenEarnedBySource, setTokenEarnedBySource] = useState([]);
  const [tokenSpentByCategory, setTokenSpentByCategory] = useState([]);
  const [transactionVolume, setTransactionVolume] = useState([]);
  const [peerComparison, setPeerComparison] = useState([]);
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Generate token analytics data when component mounts or time range changes
  useEffect(() => {
    generateTokenAnalytics(timeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);
  
  // Generate token analytics data based on time range
  const generateTokenAnalytics = (range) => {
    // Set token balance
    setTokenBalance(tokenData.balance || Math.floor(Math.random() * 1000) + 500);
    
    // Generate token trend data
    const trendData = [];
    const now = new Date();
    const dataPoints = range === 'week' ? 7 : range === 'month' ? 30 : 90;
    
    let currentBalance = tokenBalance;
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (dataPoints - i));
      
      // Random daily change between -10 and +20 tokens
      const earned = Math.floor(Math.random() * 20) + 1;
      const spent = Math.floor(Math.random() * 10);
      const dailyChange = earned - spent;
      
      // Adjust current balance for this day
      currentBalance = Math.max(0, currentBalance - dailyChange);
      
      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: currentBalance,
        earned: earned,
        spent: spent
      });
    }
    setTokenTrend(trendData);
    
    // Generate token earned by source data
    setTokenEarnedBySource([
      { name: 'Data Sharing', value: Math.floor(Math.random() * 300) + 200 },
      { name: 'Referrals', value: Math.floor(Math.random() * 200) + 150 },
      { name: 'Research', value: Math.floor(Math.random() * 150) + 100 },
      { name: 'Analytics', value: Math.floor(Math.random() * 100) + 50 },
      { name: 'Other', value: Math.floor(Math.random() * 50) + 25 }
    ]);
    
    // Generate token spent by category data
    setTokenSpentByCategory([
      { name: 'Services', value: Math.floor(Math.random() * 200) + 100 },
      { name: 'Data Access', value: Math.floor(Math.random() * 150) + 75 },
      { name: 'Premium Features', value: Math.floor(Math.random() * 100) + 50 },
      { name: 'Transfers', value: Math.floor(Math.random() * 75) + 25 },
      { name: 'Other', value: Math.floor(Math.random() * 50) + 10 }
    ]);
    
    // Generate transaction volume data
    const volumeData = [];
    const categories = ['Data Sharing', 'Referrals', 'Research', 'Analytics', 'Services'];
    
    for (const category of categories) {
      volumeData.push({
        name: category,
        incoming: Math.floor(Math.random() * 50) + 10,
        outgoing: Math.floor(Math.random() * 30) + 5
      });
    }
    setTransactionVolume(volumeData);
    
    // Generate peer comparison data
    setPeerComparison([
      {
        category: 'Tokens Earned',
        you: Math.floor(Math.random() * 300) + 500,
        average: Math.floor(Math.random() * 200) + 400,
        top: Math.floor(Math.random() * 400) + 700
      },
      {
        category: 'Tokens Spent',
        you: Math.floor(Math.random() * 200) + 300,
        average: Math.floor(Math.random() * 150) + 250,
        top: Math.floor(Math.random() * 250) + 400
      },
      {
        category: 'Transaction Volume',
        you: Math.floor(Math.random() * 50) + 30,
        average: Math.floor(Math.random() * 30) + 20,
        top: Math.floor(Math.random() * 70) + 50
      },
      {
        category: 'Network Size',
        you: Math.floor(Math.random() * 20) + 10,
        average: Math.floor(Math.random() * 15) + 8,
        top: Math.floor(Math.random() * 30) + 25
      },
      {
        category: 'Growth Rate',
        you: Math.floor(Math.random() * 20) + 5,
        average: Math.floor(Math.random() * 10) + 3,
        top: Math.floor(Math.random() * 30) + 15
      }
    ]);
  };
  
  // Format currency value
  const formatTokenValue = (value) => {
    return value.toLocaleString();
  };
  
  // Get trend indicator
  const getTrendIndicator = (current, previous) => {
    const percentChange = ((current - previous) / previous) * 100;
    
    if (percentChange > 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: theme.palette.success.main }}>
          <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" component="span">
            {percentChange.toFixed(1)}%
          </Typography>
        </Box>
      );
    } else if (percentChange < 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: theme.palette.error.main }}>
          <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" component="span">
            {Math.abs(percentChange).toFixed(1)}%
          </Typography>
        </Box>
      );
    }
    
    return null;
  };
  
  // Get transaction type chip
  const getTransactionTypeChip = (type) => {
    switch (type) {
      case 'earned':
        return (
          <Chip
            icon={<ReceivedIcon />}
            label="Earned"
            size="small"
            color="success"
            variant="outlined"
          />
        );
      case 'spent':
        return (
          <Chip
            icon={<SentIcon />}
            label="Spent"
            size="small"
            color="error"
            variant="outlined"
          />
        );
      case 'transfer_in':
        return (
          <Chip
            icon={<ReceivedIcon />}
            label="Received"
            size="small"
            color="info"
            variant="outlined"
          />
        );
      case 'transfer_out':
        return (
          <Chip
            icon={<SentIcon />}
            label="Sent"
            size="small"
            color="warning"
            variant="outlined"
          />
        );
      default:
        return (
          <Chip
            icon={<SwapIcon />}
            label="Other"
            size="small"
            color="default"
            variant="outlined"
          />
        );
    }
  };
  
  // Token balance summary card
  const TokenBalanceCard = () => (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardHeader
        title="Token Balance"
        subheader="Current balance and recent activity"
        avatar={
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
            <AccountBalanceIcon />
          </Avatar>
        }
      />
      <CardContent>
        <Typography variant="h3" component="div" gutterBottom>
          {formatTokenValue(tokenBalance)}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Last 30 Days
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Typography variant="h6" component="div" color="success.main" sx={{ mr: 1 }}>
                +{formatTokenValue(Math.floor(Math.random() * 200) + 100)}
              </Typography>
              {getTrendIndicator(tokenBalance, tokenBalance - 150)}
            </Box>
          </Box>
          
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              YTD Growth
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.5 }}>
              <Typography variant="h6" component="div" sx={{ mr: 1 }}>
                {Math.floor(Math.random() * 40) + 10}%
              </Typography>
              {getTrendIndicator(tokenBalance, tokenBalance * 0.8)}
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle2" gutterBottom>
          Recent Activity
        </Typography>
        
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {transactions.slice(0, 3).map((transaction) => (
            <Box 
              key={transaction.id} 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getTransactionTypeChip(transaction.type)}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {transaction.description}
                </Typography>
              </Box>
              <Typography 
                variant="body2" 
                fontWeight="medium"
                color={
                  transaction.type === 'earned' || transaction.type === 'transfer_in'
                    ? 'success.main'
                    : 'error.main'
                }
              >
                {transaction.type === 'earned' || transaction.type === 'transfer_in' ? '+' : '-'}
                {transaction.amount}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
  
  // Token trend chart
  const TokenTrendChart = () => (
    <LineChart
      title="Token Balance Trend"
      subtitle={`Balance history for the selected time period (${timeRange})`}
      data={tokenTrend}
      lines={[
        { dataKey: 'balance', name: 'Balance', color: theme.palette.primary.main }
      ]}
      xAxisDataKey="date"
      height={350}
      showBrush={true}
    />
  );
  
  // Token earned by source chart
  const TokenEarnedChart = () => (
    <PieChart
      title="Tokens Earned by Source"
      subtitle="Distribution of token earnings by activity"
      data={tokenEarnedBySource}
      dataKey="value"
      nameKey="name"
      height={350}
      donut={true}
    />
  );
  
  // Token spent by category chart
  const TokenSpentChart = () => (
    <PieChart
      title="Tokens Spent by Category"
      subtitle="Distribution of token spending by category"
      data={tokenSpentByCategory}
      dataKey="value"
      nameKey="name"
      height={350}
      donut={true}
      colors={[
        theme.palette.error.main,
        theme.palette.error.light,
        theme.palette.warning.main,
        theme.palette.warning.light,
        theme.palette.grey[500]
      ]}
    />
  );
  
  // Transaction volume chart
  const TransactionVolumeChart = () => (
    <BarChart
      title="Transaction Volume by Category"
      subtitle="Incoming vs outgoing transactions"
      data={transactionVolume}
      bars={[
        { dataKey: 'incoming', name: 'Incoming', color: theme.palette.success.main },
        { dataKey: 'outgoing', name: 'Outgoing', color: theme.palette.error.main }
      ]}
      xAxisDataKey="name"
      height={350}
    />
  );
  
  // Peer comparison chart
  const PeerComparisonChart = () => (
    <BarChart
      title="Peer Comparison"
      subtitle="Your activity compared to network average and top performers"
      data={peerComparison}
      bars={[
        { dataKey: 'you', name: 'You', color: theme.palette.primary.main },
        { dataKey: 'average', name: 'Network Average', color: theme.palette.grey[400] },
        { dataKey: 'top', name: 'Top 10%', color: theme.palette.secondary.main }
      ]}
      xAxisDataKey="category"
      height={350}
      layout="vertical"
    />
  );
  
  // Recent transactions table
  const RecentTransactionsTable = () => (
    <Card elevation={1}>
      <CardHeader
        title="Recent Transactions"
        subheader="Latest token activity"
        action={
          <Tooltip title="Download transaction history">
            <IconButton>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <Divider />
      <TableContainer component={Box} sx={{ maxHeight: 350 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Source/Destination</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>{getTransactionTypeChip(transaction.type)}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>{transaction.entity}</TableCell>
                <TableCell 
                  align="right"
                  sx={{
                    color: 
                      transaction.type === 'earned' || transaction.type === 'transfer_in'
                        ? theme.palette.success.main
                        : theme.palette.error.main,
                    fontWeight: 'medium'
                  }}
                >
                  {transaction.type === 'earned' || transaction.type === 'transfer_in' ? '+' : '-'}
                  {transaction.amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
  
  return (
    <Box sx={{ mt: 2 }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Token Analytics Dashboard
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            id="time-range-select"
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
            startAdornment={<CalendarIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="quarter">Last Quarter</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Grid container spacing={3}>
        {/* Token Balance */}
        <Grid item xs={12} md={4}>
          <TokenBalanceCard />
        </Grid>
        
        {/* Token Trend */}
        <Grid item xs={12} md={8}>
          <TokenTrendChart />
        </Grid>
        
        {/* Token Earned By Source */}
        <Grid item xs={12} md={6}>
          <TokenEarnedChart />
        </Grid>
        
        {/* Token Spent By Category */}
        <Grid item xs={12} md={6}>
          <TokenSpentChart />
        </Grid>
        
        {/* Transaction Volume */}
        <Grid item xs={12} md={6}>
          <TransactionVolumeChart />
        </Grid>
        
        {/* Peer Comparison */}
        <Grid item xs={12} md={6}>
          <PeerComparisonChart />
        </Grid>
        
        {/* Recent Transactions */}
        <Grid item xs={12}>
          <RecentTransactionsTable />
        </Grid>
      </Grid>
    </Box>
  );
}
