import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, List, ListItem, ListItemButton,
  ListItemText, ListItemAvatar, Avatar, Divider, TextField, IconButton,
  Chip, Badge, Alert, CircularProgress, Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Forum as ForumIcon,
  Lock as LockIcon,
  Circle as CircleIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts';
import messagingService from '../../services/messagingService';
import { formatRelativeTime } from '../../utils/dateFormatter';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (ts) => {
  if (!ts) return '';
  return formatRelativeTime(ts);
};

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = ['#1976d2', '#388e3c', '#7b1fa2', '#f57c00', '#0288d1', '#c62828'];
const avatarColor = (name = '') =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ── Thread list item ──────────────────────────────────────────────────────────
function ThreadListItem({ thread, selected, onClick }) {
  const { lastMessage: lm, unreadCount, referral } = thread;
  const otherName = lm ? (lm.senderName === 'You' ? lm.receiverName : lm.senderName) : 'Provider';
  const patientLabel = referral?.patientName || referral?.patient?.name || 'Patient';

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          selected={selected}
          onClick={onClick}
          sx={{ py: 1.5, px: 2, alignItems: 'flex-start' }}
        >
          <ListItemAvatar sx={{ minWidth: 44, mt: 0.5 }}>
            <Avatar sx={{ bgcolor: avatarColor(otherName), width: 38, height: 38, fontSize: 14 }}>
              {initials(otherName)}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            disableTypography
            primary={
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={unreadCount > 0 ? 700 : 500} noWrap sx={{ flex: 1, mr: 1 }}>
                  {otherName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {fmtTime(lm?.createdAt)}
                </Typography>
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="caption" color="primary.main" fontWeight={500} display="block" noWrap>
                  Re: {patientLabel} — {referral?.reason || 'Referral'}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.3}>
                  <Typography
                    variant="caption"
                    color={unreadCount > 0 ? 'text.primary' : 'text.secondary'}
                    fontWeight={unreadCount > 0 ? 600 : 400}
                    noWrap
                    sx={{ flex: 1, mr: 1 }}
                  >
                    {lm?.content || ''}
                  </Typography>
                  {unreadCount > 0 && (
                    <Badge badgeContent={unreadCount} color="primary" sx={{ flexShrink: 0 }} />
                  )}
                </Box>
              </Box>
            }
          />
        </ListItemButton>
      </ListItem>
      <Divider component="li" />
    </>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ message, isMine }) {
  return (
    <Box
      display="flex"
      justifyContent={isMine ? 'flex-end' : 'flex-start'}
      mb={1.5}
      px={1}
    >
      {!isMine && (
        <Avatar
          sx={{ bgcolor: avatarColor(message.senderName), width: 30, height: 30, mr: 1, mt: 0.5, fontSize: 11, flexShrink: 0 }}
        >
          {initials(message.senderName)}
        </Avatar>
      )}
      <Box maxWidth="72%">
        {!isMine && (
          <Typography variant="caption" color="text.secondary" display="block" mb={0.3} ml={0.5}>
            {message.senderName}
          </Typography>
        )}
        <Paper
          elevation={0}
          sx={{
            p: 1.25,
            borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            bgcolor: isMine ? 'primary.main' : 'grey.100',
            color: isMine ? 'primary.contrastText' : 'text.primary',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
        </Paper>
        <Box display="flex" alignItems="center" gap={0.5} mt={0.3} justifyContent={isMine ? 'flex-end' : 'flex-start'}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            {fmtTime(message.createdAt)}
          </Typography>
          {isMine && (
            <Tooltip title={message.readAt ? 'Read' : 'Delivered'}>
              {message.readAt
                ? <CheckIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                : <CircleIcon sx={{ fontSize: 8, color: 'text.disabled' }} />
              }
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const ProviderInbox = () => {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?._id || currentUser?.id;

  const [threads, setThreads]           = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [selectedReferralId, setSelectedReferralId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);     // { referral, messages }
  const [threadLoading, setThreadLoading] = useState(false);
  const [composing, setComposing]       = useState('');
  const [sending, setSending]           = useState(false);
  const [sendError, setSendError]       = useState(null);

  const bottomRef = useRef(null);

  // Load thread list
  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    const res = await messagingService.getThreads(currentUserId);
    if (res?.success) setThreads(res.data || []);
    setThreadsLoading(false);
  }, [currentUserId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Load selected thread
  const openThread = useCallback(async (referralId) => {
    setSelectedReferralId(referralId);
    setThreadLoading(true);
    setComposing('');
    setSendError(null);
    const res = await messagingService.getThread(referralId);
    if (res?.success) {
      setActiveThread(res.data);
      // Refresh thread list to clear unread count
      setThreads((prev) =>
        prev.map((t) => (t._id === referralId ? { ...t, unreadCount: 0 } : t))
      );
    }
    setThreadLoading(false);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length]);

  const handleSend = async () => {
    const trimmed = composing.trim();
    if (!trimmed || !selectedReferralId || sending) return;
    setSending(true);
    setSendError(null);

    // Determine receiver from active thread
    const msgs = activeThread?.messages || [];
    const lastOther = [...msgs].reverse().find((m) => m.senderId !== currentUserId);
    const receiverId   = lastOther?.senderId;
    const receiverName = lastOther?.senderName;

    const res = await messagingService.sendMessage(
      selectedReferralId, trimmed, receiverId, receiverName
    );

    if (res?.success) {
      setComposing('');
      setActiveThread((prev) => ({
        ...prev,
        messages: [...(prev?.messages || []), res.data],
      }));
      // Bump thread to top
      setThreads((prev) => {
        const updated = prev.map((t) =>
          t._id === selectedReferralId ? { ...t, lastMessage: res.data } : t
        );
        return updated.sort(
          (a, b) => new Date(b.lastMessage?.createdAt) - new Date(a.lastMessage?.createdAt)
        );
      });
    } else {
      setSendError(res?.error || 'Failed to send message');
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const totalUnread = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4, px: { xs: 1, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <ForumIcon color="primary" />
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>
            Secure Provider Messaging
            {totalUnread > 0 && (
              <Chip label={`${totalUnread} unread`} color="primary" size="small" sx={{ ml: 1.5, verticalAlign: 'middle' }} />
            )}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            <LockIcon sx={{ fontSize: 13, color: 'success.main' }} />
            <Typography variant="caption" color="success.main" fontWeight={500}>
              HIPAA-compliant · Messages are tied to referral records and logged for compliance
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Split-pane layout */}
      <Paper variant="outlined" sx={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: 500, overflow: 'hidden' }}>

        {/* Thread list — left pane */}
        <Box
          sx={{
            width: { xs: selectedReferralId ? 0 : '100%', sm: 300, md: 340 },
            minWidth: { sm: 260 },
            borderRight: 1,
            borderColor: 'divider',
            display: { xs: selectedReferralId ? 'none' : 'flex', sm: 'flex' },
            flexDirection: 'column',
            bgcolor: 'background.paper',
          }}
        >
          <Box px={2} py={1.5} borderBottom={1} borderColor="divider">
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              CONVERSATIONS ({threads.length})
            </Typography>
          </Box>
          {threadsLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress size={28} />
            </Box>
          ) : threads.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} px={3} textAlign="center">
              <ForumIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" variant="body2">No conversations yet.</Typography>
              <Typography color="text.disabled" variant="caption" mt={0.5}>
                Messages are automatically created when you have an active referral.
              </Typography>
            </Box>
          ) : (
            <List disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
              {threads.map((t) => (
                <ThreadListItem
                  key={t._id}
                  thread={t}
                  selected={t._id === selectedReferralId}
                  onClick={() => openThread(t._id)}
                />
              ))}
            </List>
          )}
        </Box>

        {/* Conversation pane — right */}
        <Box
          sx={{
            flex: 1,
            display: { xs: selectedReferralId ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            bgcolor: '#fafafa',
          }}
        >
          {!selectedReferralId ? (
            /* Empty state */
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} textAlign="center" px={4}>
              <ForumIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>Select a conversation</Typography>
              <Typography variant="body2" color="text.disabled">
                Choose a referral thread from the left to view the secure message history between providers.
              </Typography>
            </Box>
          ) : threadLoading ? (
            <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
              <CircularProgress size={36} />
            </Box>
          ) : activeThread ? (
            <>
              {/* Thread header */}
              <Box
                px={2.5} py={1.5}
                borderBottom={1} borderColor="divider"
                bgcolor="background.paper"
                display="flex" alignItems="center" gap={1}
              >
                {/* Back button on mobile */}
                <IconButton
                  size="small"
                  sx={{ display: { sm: 'none' }, mr: 0.5 }}
                  onClick={() => setSelectedReferralId(null)}
                >
                  ←
                </IconButton>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {activeThread.referral?.reason || 'Referral'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Patient: {activeThread.referral?.patientName || activeThread.referral?.patient?.name || '—'}
                    {' · '}
                    <Chip
                      label={activeThread.referral?.status || 'active'}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ height: 16, fontSize: 10, ml: 0.5 }}
                    />
                  </Typography>
                </Box>
                <Tooltip title="All messages are encrypted and HIPAA-compliant">
                  <Box display="flex" alignItems="center" gap={0.4}>
                    <LockIcon sx={{ fontSize: 14, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main" sx={{ display: { xs: 'none', md: 'block' } }}>
                      Encrypted
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>

              {/* Message bubbles */}
              <Box flex={1} overflowY="auto" py={2} sx={{ overflowY: 'auto' }}>
                {activeThread.messages.length === 0 ? (
                  <Box textAlign="center" mt={4}>
                    <Typography color="text.disabled" variant="body2">No messages yet. Start the conversation below.</Typography>
                  </Box>
                ) : (
                  activeThread.messages.map((msg) => (
                    <Bubble
                      key={msg._id}
                      message={msg}
                      isMine={msg.senderId === currentUserId || msg.senderName === 'You'}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </Box>

              {/* Compose */}
              <Box
                px={2} py={1.5}
                borderTop={1} borderColor="divider"
                bgcolor="background.paper"
              >
                {sendError && (
                  <Alert severity="error" onClose={() => setSendError(null)} sx={{ mb: 1, py: 0 }}>
                    {sendError}
                  </Alert>
                )}
                <Box display="flex" gap={1} alignItems="flex-end">
                  <TextField
                    multiline
                    maxRows={4}
                    fullWidth
                    placeholder="Type a secure message… (Enter to send, Shift+Enter for new line)"
                    value={composing}
                    onChange={(e) => setComposing(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="small"
                    disabled={sending}
                    inputProps={{ maxLength: 2000 }}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={!composing.trim() || sending}
                    sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: 'action.disabledBackground' } }}
                  >
                    {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  </IconButton>
                </Box>
                <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
                  {composing.length}/2000 characters · Messages are logged for HIPAA compliance
                </Typography>
              </Box>
            </>
          ) : null}
        </Box>
      </Paper>
    </Container>
  );
};

export default ProviderInbox;
