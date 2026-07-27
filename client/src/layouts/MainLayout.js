import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  Typography,
  Divider,
  IconButton,
  InputBase,
  Tooltip,
  Fab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  SwapHoriz as ReferralsIcon,
  Analytics as AnalyticsIcon,
  Token as TokenIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  ChevronLeft as ChevronLeftIcon,
  AdminPanelSettings as AdminIcon,
  Storage as BlockchainIcon,
  Assignment as AssignmentIcon,
  Mic as MicIcon,
  CalendarMonth as CalendarIcon,
  Storefront as StorefrontIcon,
  LocalPharmacy as RxIcon,
  Forum as ForumIcon,
  Shield as ShieldIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth, useToken, useNotification } from '../contexts';
import referralService from '../services/referralService';
import { ThemeToggle } from '../components/common';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 264;
const DRAWER_WIDTH_COLLAPSED = 80;

// Same grouped-sidebar treatment as AdminLayout.js — labeled sections, search
// filter, collapsible icon rail. Unlike the admin console, this portal has no
// top AppBar at all now: theme toggle, notifications and the profile menu all
// live in the drawer header/footer instead.
const getNavGroups = (userRole, counts, tokenBalance) => {
  const groups = [
    {
      label: 'Overview',
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/app/dashboard' },
      ],
    },
    {
      label: 'Patients & Referrals',
      items: [
        { text: 'Patients', icon: <PeopleIcon />, path: '/app/patients' },
        { text: 'Referrals', icon: <ReferralsIcon />, path: '/app/referrals', badge: { content: counts.total, color: 'secondary' } },
        { text: 'My Schedule', icon: <CalendarIcon />, path: '/app/schedule' },
      ],
    },
    {
      label: 'Clinical Tools',
      items: [
        { text: 'Prior Auth', icon: <AssignmentIcon />, path: '/app/prior-auth' },
        { text: 'Ambient AI', icon: <MicIcon />, path: '/app/ambient' },
      ],
    },
    {
      label: 'Care Programs',
      items: [
        { text: 'DTx Marketplace', icon: <StorefrontIcon />, path: '/app/dtx/marketplace' },
        { text: 'DTx Prescriptions', icon: <RxIcon />, path: '/app/dtx/prescriptions' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { text: 'Secure Messaging', icon: <ForumIcon />, path: '/app/messaging' },
      ],
    },
    {
      label: 'Financial',
      items: [
        { text: 'Tokens', icon: <TokenIcon />, path: '/app/tokens', badge: { content: tokenBalance, color: 'secondary' } },
        { text: 'Blockchain', icon: <BlockchainIcon />, path: '/app/blockchain/history' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { text: 'Analytics', icon: <AnalyticsIcon />, path: '/app/analytics' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { text: 'Settings', icon: <SettingsIcon />, path: '/app/settings' },
      ],
    },
  ];

  if (userRole === 'admin') {
    groups.push({
      label: 'Administration',
      items: [
        { text: 'Admin Panel', icon: <AdminIcon color="error" />, path: '/app/admin' },
      ],
    });
  }

  return groups;
};

// The desktop drawer is variant="permanent", which keeps it in normal flex
// flow (unlike "temporary", which renders position:fixed) — so Main already
// sits right after it with no manual offset needed. There's no top AppBar to
// compensate for either: all its former controls now live in the drawer, so
// the page content gets the full viewport height.
const Main = styled('main')(({ theme }) => ({
  flexGrow: 1,
  minWidth: 0,
  padding: theme.spacing(3),
}));

export default function MainLayout() {
  const { currentUser, logout } = useAuth();
  const { balance } = useToken();
  const { notifySuccess } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navFilter, setNavFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [referralCounts, setReferralCounts] = useState({
    pending: 0,
    accepted: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    total: 0
  });

  const isRailMode = collapsed && !isMobile;
  const sidebarWidth = isMobile ? 0 : (collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH);

  const handleMenuButtonClick = () => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  const navGroups = getNavGroups(currentUser?.role, referralCounts, balance);
  const filteredGroups = (() => {
    const q = navFilter.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.text.toLowerCase().includes(q)) }))
      .filter((group) => group.items.length > 0);
  })();

  useEffect(() => {
    if (currentUser && !['admin','superadmin'].includes(currentUser.role) && currentUser.onboardingStatus !== 'verified') {
      navigate('/onboarding');
    }
  }, [currentUser, navigate]);

  // Fetch referral counts when component mounts
  useEffect(() => {
    const fetchReferralCounts = async () => {
      try {
        const counts = await referralService.getReferralStatusCounts();
        setReferralCounts({
          pending: counts.pending || 0,
          accepted: counts.accepted || 0,
          completed: counts.completed || 0,
          rejected: counts.rejected || 0,
          cancelled: counts.cancelled || 0,
          total: Object.values(counts).reduce((sum, count) => sum + count, 0)
        });
      } catch (error) {
        console.error('Error fetching referral counts:', error);
      }
    };

    fetchReferralCounts();

    // Refresh counts every 5 minutes
    const intervalId = setInterval(fetchReferralCounts, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      notifySuccess('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isItemActive = (path) =>
    location.pathname === path || (path !== '/app/dashboard' && location.pathname.startsWith(path));

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand header — in rail mode this becomes a single centered burger
          button that re-expands the menu. */}
      {isRailMode ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 64, flexShrink: 0 }}>
          <Tooltip title="Expand menu" placement="right">
            <IconButton onClick={() => setCollapsed(false)} sx={{ bgcolor: 'action.hover' }}>
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, minHeight: 64, flexShrink: 0 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, flexShrink: 0 }}>
            <ShieldIcon fontSize="small" />
          </Avatar>
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap lineHeight={1.2}>
              ClinicTrust AI
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Provider Portal
            </Typography>
          </Box>
          {isMobile ? (
            <Tooltip title="Close menu">
              <IconButton size="small" onClick={() => setMobileOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Collapse menu">
              <IconButton size="small" onClick={() => setCollapsed(true)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      <Divider />

      {/* Search / filter */}
      {!isRailMode && (
        <Box sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', borderRadius: 2, px: 1.5, py: 0.75 }}>
            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <InputBase
              placeholder="Search menu…"
              value={navFilter}
              onChange={(e) => setNavFilter(e.target.value)}
              sx={{ fontSize: 14, flex: 1 }}
              inputProps={{ 'aria-label': 'Search menu' }}
            />
          </Box>
        </Box>
      )}

      {/* Scrollable nav — minHeight:0 is required so this flex item actually
          shrinks and scrolls internally instead of growing past the drawer's
          height and forcing the whole drawer to scroll too (double scrollbar). */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 1,
          pb: 1,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 3 },
        }}
      >
        {filteredGroups.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            No matching pages
          </Typography>
        )}
        {filteredGroups.map((group) => (
          <Box key={group.label} sx={{ mt: 1.5, '&:first-of-type': { mt: 0.5 } }}>
            {!isRailMode && (
              <Typography
                variant="overline"
                sx={{ display: 'block', px: 1.5, color: 'text.secondary', fontWeight: 700, fontSize: '0.68rem', letterSpacing: 0.6 }}
              >
                {group.label}
              </Typography>
            )}
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {group.items.map((item) => {
                const active = isItemActive(item.path);
                const iconNode = item.badge ? (
                  <Badge badgeContent={item.badge.content} color={item.badge.color} max={999}>
                    {item.icon}
                  </Badge>
                ) : item.icon;

                const button = (
                  <ListItemButton
                    component={RouterLink}
                    to={item.path}
                    selected={active}
                    onClick={() => { if (isMobile) setMobileOpen(false); }}
                    sx={{
                      borderRadius: 2,
                      mx: 0.5,
                      mb: 0.25,
                      minHeight: 42,
                      justifyContent: isRailMode ? 'center' : 'flex-start',
                      px: isRailMode ? 1 : 1.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      },
                      '&:not(.Mui-selected):hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isRailMode ? 0 : 1.5,
                        justifyContent: 'center',
                        color: active ? 'inherit' : 'text.secondary',
                        '& svg': { fontSize: 20 },
                      }}
                    >
                      {iconNode}
                    </ListItemIcon>
                    {!isRailMode && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500, noWrap: true }}
                      />
                    )}
                  </ListItemButton>
                );

                return (
                  <ListItem key={item.text} disablePadding>
                    {isRailMode ? (
                      <Tooltip title={item.text} placement="right">
                        {button}
                      </Tooltip>
                    ) : button}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Footer — everything the old top AppBar used to hold: theme toggle,
          notifications, and the profile menu (Profile/Settings/Admin/Logout).
          The provider's photo sits left of their name and doubles as the
          profile-menu trigger. Rail mode shows the same controls icon-only,
          stacked, with just the photo/avatar for the profile menu. */}
      <Box
        sx={{
          p: isRailMode ? 1 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isRailMode ? 'center' : 'flex-start',
          gap: isRailMode ? 0.5 : 1.25,
          flexDirection: isRailMode ? 'column' : 'row',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Account" placement={isRailMode ? 'right' : 'top'}>
          <IconButton size="small" onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
            {currentUser && currentUser.firstName ? (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }} src={currentUser.profileImage || undefined}>
                {currentUser.firstName.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <Avatar sx={{ width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            )}
          </IconButton>
        </Tooltip>

        {!isRailMode && currentUser && (
          <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {currentUser.firstName} {currentUser.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ textTransform: 'capitalize' }}>
              {currentUser.role}{currentUser.specialty ? ` · ${currentUser.specialty}` : ''}
            </Typography>
          </Box>
        )}

        <ThemeToggle variant="icon" size="small" />

        <Tooltip title="Notifications" placement={isRailMode ? 'right' : 'top'}>
          <IconButton size="small" onClick={handleNotificationsOpen}>
            <Badge badgeContent={4} color="error" showZero={false}>
              <NotificationsIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Mobile-only floating trigger — the drawer is an overlay on small
          screens, so this is the only way to reopen it once closed. Hidden
          once the drawer is open (it gets its own close button instead). */}
      {isMobile && !mobileOpen && (
        <Fab
          size="medium"
          color="primary"
          aria-label="open navigation"
          onClick={handleMenuButtonClick}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: (t) => t.zIndex.drawer + 1,
            boxShadow: 3,
          }}
        >
          <MenuIcon />
        </Fab>
      )}

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        anchor="left"
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? DRAWER_WIDTH : sidebarWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '& .MuiDrawer-paper': {
            width: isMobile ? DRAWER_WIDTH : sidebarWidth,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '1px 0 0 0 rgba(0,0,0,0.08)',
            overflow: 'hidden',
            transition: muiTheme.transitions.create('width', {
              easing: muiTheme.transitions.easing.sharp,
              duration: muiTheme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Main>
        <Outlet />
      </Main>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem component={RouterLink} to="/app/profile" onClick={handleProfileMenuClose}>
          Profile
        </MenuItem>
        <MenuItem component={RouterLink} to="/app/settings" onClick={handleProfileMenuClose}>
          Settings
        </MenuItem>
        {currentUser?.role === 'admin' && (
          <MenuItem component={RouterLink} to="/app/admin" onClick={handleProfileMenuClose}>
            Admin Panel
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>

      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationsClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">New referral received</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">Analytics report completed</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">15 tokens received</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationsClose}>
          <Typography variant="body2" fontWeight="bold">High-risk patient alert</Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          component={RouterLink}
          to="/app/notifications"
          onClick={handleNotificationsClose}
        >
          <Typography variant="body2" color="primary">View all notifications</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}
