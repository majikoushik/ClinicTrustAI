const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  // Referral data uses application-generated string IDs (for example,
  // "referral-1"). Declaring the path prevents Mongoose from trying to cast
  // those IDs to ObjectId and hydrating them as undefined.
  _id: {
    type: String,
    default: () => `referral-${new mongoose.Types.ObjectId()}`
  },
  patient: {
    type: String,
    ref: 'Patient',
    required: true
  },
  referringProvider: {
    type: String,
    ref: 'User',
    required: true
  },
  receivingProvider: {
    type: String,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  attachedRecords: [{
    recordType: String,
    recordId: String,
    accessGranted: {
      type: Boolean,
      default: false
    },
    consentTransactionId: String
  }],
  appointmentDate: Date,
  completionDate: Date,
  diagnosis: String,
  treatment: String,
  followUpRecommendations: String,
  billing: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'settled', 'disputed'],
      default: 'pending'
    },
    insuranceClaim: {
      claimId: String,
      submissionDate: Date,
      status: String,
      amount: Number
    },
    smartContractId: String,
    transactionId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
ReferralSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Referral', ReferralSchema);
