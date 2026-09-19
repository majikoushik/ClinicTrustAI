const express = require('express');
const router = express.Router();
const PredictiveAlert = require('../models/PredictiveAlert');
const { protect } = require('../middleware/auth');

// GET /api/predictive-alerts — get active alerts for the authenticated provider
router.get('/', protect, async (req, res) => {
  try {
    const { status = 'active', type, severity, limit = 20 } = req.query;
    const filter = { providerId: req.user.id };
    if (status !== 'all') filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const alerts = await PredictiveAlert.find(filter)
      .sort({ severity: 1, generatedAt: -1 })
      .limit(Number(limit))
      .populate('patientId', 'name dateOfBirth gender');

    // Sort by severity priority
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = alerts.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

    res.json({ success: true, data: sorted, count: sorted.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/predictive-alerts/summary — count by severity for dashboard badge
router.get('/summary', protect, async (req, res) => {
  try {
    const counts = await PredictiveAlert.aggregate([
      { $match: { providerId: req.user.id, status: 'active' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    const summary = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    counts.forEach(({ _id, count }) => { summary[_id] = count; summary.total += count; });
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/predictive-alerts/:id/acknowledge
router.patch('/:id/acknowledge', protect, async (req, res) => {
  try {
    const alert = await PredictiveAlert.findOneAndUpdate(
      { _id: req.params.id, providerId: req.user.id },
      { status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy: req.user.id },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/predictive-alerts/:id/resolve
router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    const { wasActionTaken, outcomeNotes } = req.body;
    const alert = await PredictiveAlert.findOneAndUpdate(
      { _id: req.params.id, providerId: req.user.id },
      { status: 'resolved', resolvedAt: new Date(), wasActionTaken, outcomeNotes },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/predictive-alerts/:id/dismiss
router.patch('/:id/dismiss', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const alert = await PredictiveAlert.findOneAndUpdate(
      { _id: req.params.id, providerId: req.user.id },
      { status: 'dismissed', dismissedAt: new Date(), dismissedReason: reason },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
