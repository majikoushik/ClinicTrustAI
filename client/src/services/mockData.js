/**
 * Mock Data Service
 * 
 * This service provides mock data for development and testing.
 * Centralizing mock data improves maintainability and consistency.
 */

import { generateMockTransactionId } from '../utils/blockchainUtils';

// Care quality index for dashboard
export const careQualityIndex = 86;

// Referral conversion rate for dashboard
export const referralConversionRate = 60;

// Analytics engagement growth for dashboard
export const analyticsEngagementGrowth = 15;

// Token estimated value for dashboard
export const tokenEstimatedValue = 75;

/**
 * Generate a random ID
 * 
 * @returns {string} Random ID
 */
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Generate a random date within a range
 * 
 * @param {number} startDays - Start days from now
 * @param {number} endDays - End days from now
 * @returns {Date} Random date
 */
const randomDate = (startDays = -30, endDays = 0) => {
  try {
    // Ensure parameters are valid numbers
    startDays = parseInt(startDays) || -30;
    endDays = parseInt(endDays) || 0;
    
    // Make sure end is not before start
    if (endDays < startDays) {
      [startDays, endDays] = [endDays, startDays];
    }
    
    const start = new Date();
    start.setDate(start.getDate() + startDays);
    
    const end = new Date();
    end.setDate(end.getDate() + endDays);
    
    // Ensure both dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Invalid date parameters, using current date');
      return new Date();
    }
    
    // Generate random date between start and end
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  } catch (error) {
    console.error('Error generating random date:', error);
    return new Date(); // Return current date as fallback
  }
};

/**
 * Generate a random number within a range
 * 
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
const randomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Pick a random item from an array
 * 
 * @param {Array} array - Array to pick from
 * @returns {any} Random item
 */
const randomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};


const roles = ['Doctor', 'Nurse', 'Admin', 'Specialist'];
const specialties = ['Cardiology', 'Neurology', 'Pediatrics', 'Oncology', 'General Practice', 'Orthopedics'];
  
// Different set of names than patients to ensure uniqueness
const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Skyler', 'Dakota',
                    'Cameron', 'Reese', 'Finley', 'Rowan', 'Emerson', 'Sage', 'Blair', 'Harley', 'Phoenix', 'Hayden',
                    'Kai', 'Remy', 'Justice', 'Shawn', 'Kendall', 'Parker', 'Blake', 'Drew', 'Elliott', 'Peyton',
                    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 
                    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
                    'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
                    'Emily', 'Emma', 'Madison', 'Olivia', 'Hannah', 'Abigail', 'Isabella', 'Samantha', 'Ashley', 'Sophia'];
const lastNames = ['Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter',
                  'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins',
                  'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey',
                  'Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
                  'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
                  'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King'];
  
const genders = ['Male', 'Female', 'Other'];
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const conditions = ['Hypertension', 'Diabetes', 'Asthma', 'Arthritis', 'Depression', 'Anxiety', 'COPD', 'Cancer', 'Heart Disease', 'Obesity'];
const medications = ['Lisinopril', 'Metformin', 'Albuterol', 'Ibuprofen', 'Sertraline', 'Alprazolam', 'Atorvastatin', 'Levothyroxine', 'Amlodipine', 'Omeprazole'];
const insuranceProviders = ['Blue Cross', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid', 'Tricare', 'Oscar Health'];
const organizations = ['City Medical Center','University Hospital','Community Health Clinic','Regional Medical Center','Wellness Partners','Chen Medical Group',
'Williams Clinic','Garcia Health Partners','Wilson Medical Associates','Thompson Family Practice','Brown Medical Center'];

const generateDoctorsNames = (count = 1)=>{
  return Array.from({ length: count }, (_, index) =>{
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const name = "Dr. " + firstName + " " + lastName;
    return name;
  });
}

/**
 * Generate mock user data
 * 
 * @param {number} count - Number of users to generate
 * @returns {Array} Array of user objects
 */
export const generateUsers = (count = 1, isProvider = false) => {
   
  return Array.from({ length: count }, (_, index) => {
    const id = generateId();
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const name = firstName + " " + lastName;
    const role = isProvider ? randomItem(['Doctor','Specialist']) : randomItem(roles);
    
    return {
      id,
      name,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@clinictrust.ai`,
      role,
      specialty: role === 'Doctor' || role === 'Specialist' ? randomItem(specialties) : null,
      createdAt: randomDate(-365, -1),
      lastLogin: randomDate(-7, 0),
      profileImage: `https://i.pravatar.cc/150?u=${id}`,
      status: randomItem(['active', 'inactive']),
      blockchainId: generateMockTransactionId(),
      verificationStatus: randomItem(['verified', 'pending', 'unverified']),
      tokenBalance: randomNumber(100, 5000)
    };
  });
};

/**
 * Generate mock patient data
 * 
 * @param {number} count - Number of patients to generate
 * @returns {Array} Array of patient objects
 */
export const generatePatients = (count = 50) => {
   
  return Array.from({ length: count }, (_, index) => {
    const id = generateId();
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const name = firstName + " " + lastName;
    const gender = randomItem(genders);
    const birthDate = randomDate(-36500, -3650); // 10-100 years ago
    const riskScore = Math.floor(Math.random() * 100);
    const riskLevel = riskScore > 70 ? 'high' : (riskScore > 30 ? 'medium' : 'low');
    
    // Generate random medical conditions (1-3)
    const patientConditions = [];
    const numConditions = Math.floor(Math.random() * 3) + 1;
    const shuffledConditions = [...conditions].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < numConditions; i++) {
      patientConditions.push({
        condition: shuffledConditions[i],
        diagnosedDate: randomDate(-1825, -30).toISOString(), // Diagnosed between 5 years and 1 month ago
        notes: `Regular monitoring required for ${shuffledConditions[i]}`
      });
    }
    
    // Generate random medications (1-3)
    const patientMedications = [];
    const numMedications = Math.floor(Math.random() * 3) + 1;
    const shuffledMedications = [...medications].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < numMedications; i++) {
      patientMedications.push({
        name: shuffledMedications[i],
        dosage: `${(Math.floor(Math.random() * 4) + 1) * 5}mg`,
        frequency: randomItem(['Once daily', 'Twice daily', 'Three times daily', 'As needed']),
        startDate: randomDate(-365, -7).toISOString() // Started between 1 year and 1 week ago
      });
    }
    
    return {
      id,
      patientId: `PT-${100000 + index}`,
      firstName,
      lastName,
      name,
      birthDate: birthDate.toISOString(),
      dateOfBirth: birthDate.toISOString(),
      age: Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000)),
      gender,
      contactInfo: {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `(${100 + Math.floor(Math.random() * 900)}) ${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}`,
        address: `${1000 + Math.floor(Math.random() * 9000)} ${randomItem(['Main', 'Oak', 'Maple', 'Cedar', 'Pine'])} ${randomItem(['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}, ${randomItem(['Anytown', 'Springfield', 'Franklin', 'Greenville', 'Riverside'])}, ${randomItem(['CA', 'NY', 'TX', 'FL', 'IL'])}`
      },
      insuranceInfo: {
        provider: randomItem(insuranceProviders),
        policyNumber: `POL-${10000000 + Math.floor(Math.random() * 90000000)}`,
        groupNumber: `GRP-${10000 + Math.floor(Math.random() * 90000)}`
      },
      primaryProvider: randomItem(generateDoctorsNames(10)),
      riskScore,
      riskLevel,
      bloodType: randomItem(bloodTypes),
      medicalHistory: patientConditions,
      medications: patientMedications,
      allergies: Math.random() > 0.7 ? [
        {
          allergen: randomItem(['Penicillin', 'Peanuts', 'Shellfish', 'Latex', 'Pollen', 'Dust', 'Pet Dander', 'Eggs']),
          reaction: randomItem(['Rash', 'Hives', 'Swelling', 'Difficulty breathing', 'Anaphylaxis']),
          severity: randomItem(['Mild', 'Moderate', 'Severe'])
        }
      ] : [],
      lastVisit: randomDate(-180, 0).toISOString(), // Last visit between 6 months ago and today
      nextAppointment: Math.random() > 0.5 ? randomDate(7, 90).toISOString() : null, // 50% chance of having a future appointment
      recentVisits: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => ({
        date: randomDate(-180, -1).toISOString(),
        provider: randomItem(generateDoctorsNames(5)),
        reason: randomItem(['Annual checkup', 'Follow-up', 'Illness', 'Injury', 'Vaccination', 'Prescription refill']),
        notes: randomItem(['Patient reported improvement', 'Condition stable', 'Referred to specialist', 'Prescribed medication', 'Recommended lifestyle changes'])
      })),
      createdAt: randomDate(-365, -30).toISOString(),
      updatedAt: randomDate(-30, 0).toISOString(),
      consentStatus: randomItem(['granted', 'revoked', 'pending', 'expired']),
      consentDate: randomDate(-90, -1).toISOString(),
      consentRecords: Math.random() > 0.5 ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => ({
        providerId: generateId(),
        providerName: randomItem(generateDoctorsNames(5)),
        organization: randomItem(organizations),
        accessLevel: randomItem(['limited', 'partial', 'full']),
        dataElements: ['demographics', 'medications', 'allergies', 'conditions'].slice(0, Math.floor(Math.random() * 4) + 1),
        consentDate: randomDate(-90, -30).toISOString(),
        expiryDate: randomDate(30, 365).toISOString(),
        blockchainTransactionId: generateMockTransactionId()
      })) : [],
      blockchainId: generateMockTransactionId(),
      insuranceProvider: randomItem(['Blue Cross', 'Aetna', 'UnitedHealth', 'Medicare', 'Medicaid', 'None']),
      insuranceNumber: `INS-${randomNumber(100000, 999999)}`
    };
  });
};

/**
 * Generate realistic medical notes based on specialty
 * 
 * @param {Array} specialties - Array of medical specialties
 * @returns {string} Realistic medical notes
 */
const generateMedicalNotes = (specialties) => {
  const specialty = randomItem(specialties);
  const symptoms = {
    'Cardiology': ['chest pain', 'shortness of breath', 'palpitations', 'dizziness', 'fatigue', 'edema', 'syncope'],
    'Neurology': ['headache', 'seizures', 'weakness', 'numbness', 'tremor', 'memory loss', 'confusion', 'gait disturbance'],
    'Pediatrics': ['fever', 'cough', 'rash', 'poor feeding', 'developmental delay', 'ear pain', 'vomiting', 'diarrhea'],
    'Oncology': ['unexplained weight loss', 'fatigue', 'pain', 'abnormal imaging', 'suspicious mass', 'night sweats', 'anemia'],
    'Orthopedics': ['joint pain', 'swelling', 'limited range of motion', 'fracture', 'back pain', 'muscle weakness', 'instability'],
    'Dermatology': ['rash', 'itching', 'lesion', 'discoloration', 'hair loss', 'nail changes', 'skin thickening']
  };
  
  const diagnoses = {
    'Cardiology': ['hypertension', 'coronary artery disease', 'atrial fibrillation', 'heart failure', 'valvular disease', 'arrhythmia'],
    'Neurology': ['migraine', 'epilepsy', 'multiple sclerosis', 'Parkinson\'s disease', 'stroke', 'peripheral neuropathy', 'dementia'],
    'Pediatrics': ['acute otitis media', 'bronchiolitis', 'asthma', 'ADHD', 'developmental delay', 'gastroenteritis'],
    'Oncology': ['breast cancer', 'lung cancer', 'colorectal cancer', 'lymphoma', 'leukemia', 'melanoma', 'prostate cancer'],
    'Orthopedics': ['osteoarthritis', 'rheumatoid arthritis', 'fracture', 'rotator cuff tear', 'herniated disc', 'spinal stenosis'],
    'Dermatology': ['eczema', 'psoriasis', 'acne', 'melanoma', 'basal cell carcinoma', 'dermatitis', 'rosacea']
  };
  
  const treatments = {
    'Cardiology': ['medication adjustment', 'cardiac catheterization', 'echocardiogram', 'stress test', 'Holter monitor', 'pacemaker evaluation'],
    'Neurology': ['MRI brain', 'EEG', 'medication management', 'lumbar puncture', 'EMG/NCS', 'cognitive assessment'],
    'Pediatrics': ['antibiotics', 'inhaler therapy', 'developmental assessment', 'behavioral therapy', 'nutritional counseling'],
    'Oncology': ['chemotherapy evaluation', 'radiation oncology consult', 'surgical oncology consult', 'immunotherapy', 'clinical trial eligibility'],
    'Orthopedics': ['physical therapy', 'joint injection', 'surgical evaluation', 'bracing', 'MRI', 'X-ray interpretation'],
    'Dermatology': ['biopsy', 'topical treatment', 'phototherapy', 'excision', 'cryotherapy', 'systemic medication']
  };
  
  const duration = randomNumber(1, 10);
  const symptomList = symptoms[specialty] || symptoms['Cardiology'];
  const diagnosisList = diagnoses[specialty] || diagnoses['Cardiology'];
  const treatmentList = treatments[specialty] || treatments['Cardiology'];
  
  const patientSymptoms = [];
  const numSymptoms = randomNumber(1, 3);
  for (let i = 0; i < numSymptoms; i++) {
    patientSymptoms.push(randomItem(symptomList));
  }
  
  const diagnosis = randomItem(diagnosisList);
  const treatment = randomItem(treatmentList);
  
  return `
PATIENT REFERRAL NOTE:

CHIEF COMPLAINT: Patient presents with ${patientSymptoms.join(', ')} for the past ${duration} ${duration === 1 ? 'month' : 'months'}.

HISTORY OF PRESENT ILLNESS: Patient reports ${duration > 1 ? 'progressive' : 'sudden onset of'} symptoms. ${Math.random() > 0.5 ? 'Previous treatments have provided minimal relief.' : 'No previous treatments have been attempted.'} ${Math.random() > 0.7 ? 'Family history is significant for similar conditions.' : 'No significant family history.'}

ASSESSMENT: Clinical presentation is consistent with ${diagnosis}. ${Math.random() > 0.5 ? 'Condition appears to be stable.' : 'Condition appears to be worsening despite current management.'}

PLAN: Referring to ${specialty} for ${treatment}. Please evaluate and advise on further management. ${Math.random() > 0.6 ? 'Patient is anxious to receive specialist care.' : 'Patient understands the referral process.'}

Thank you for seeing this patient.
`;
};

/**
 * Generate mock referral data
 * 
 * @param {number} count - Number of referrals to generate
 * @param {Array} patients - Array of patient objects
 * @param {Array} users - Array of user objects
 * @returns {Array} Array of referral objects
 */
export const generateReferrals = (count = 10, patients = [], users = []) => {
  const statuses = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
  const specialties = ['Cardiology', 'Neurology', 'Pediatrics', 'Oncology', 'Orthopedics', 'Dermatology'];
  const priorities = ['normal', 'urgent', 'emergency'];
  
  // Generate mock patients and users if not provided
  const mockPatients = patients.length > 0 ? patients : generatePatients(10);
  
  // Ensure we have enough users with doctor roles
  let mockUsers = users.length > 0 ? users : generateUsers(10, true);
  let doctors = mockUsers.filter(user => user.role === 'Doctor' || user.role === 'Specialist');
  
   
  return Array.from({ length: count }, () => {
    const id = generateId();
    const status = randomItem(statuses);
    const createdAt = randomDate(-30, -1);
    const patient = randomItem(mockPatients);
    const referringDoctor = randomItem(doctors);
    
    // Make sure we have at least two different doctors
    let receivingDoctor;
    const availableDoctors = doctors.filter(doc => doc.id !== referringDoctor.id);
    receivingDoctor = randomItem(availableDoctors);
    
    return {
      id,
      patientId: patient.id,
      patient,
      referringDoctorId: referringDoctor.id,
      referringDoctor,
      receivingDoctorId: receivingDoctor.id,
      receivingDoctor,
      specialty: randomItem(specialties),
      reason: `Patient requires specialized ${randomItem(specialties)} consultation.`,
      notes: generateMedicalNotes(specialties),
      status,
      priority: randomItem(priorities),
      urgency: randomItem(priorities),
      appointmentDate: randomDate(10, 50).toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: status !== 'pending' ? randomDate(-15, 0).toISOString() : createdAt.toISOString(),
      completedAt: status === 'completed' ? randomDate(-7, 0).toISOString() : null,
      blockchainId: generateMockTransactionId(),
      attachments: [
        { id: generateId(), name: 'Medical_Report.pdf', type: 'application/pdf', size: randomNumber(100000, 5000000) },
        { id: generateId(), name: 'Lab_Results.pdf', type: 'application/pdf', size: randomNumber(100000, 5000000) }
      ],
      attachementRecords:[
        { 
          id: generateId(), 
          name: 'Medical_Report.pdf', 
          type: 'application/pdf', 
          size: randomNumber(100000, 5000000),
          recordType: 'Medical Report',
          recordId: `MR-${randomNumber(10000, 99999)}`,
          dateAdded: randomDate(-30, -1).toISOString(),
          accessGranted: true,
          consentTransactionId: generateMockTransactionId(),
          provider: randomItem(['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Emily Rodriguez'])
        },
        { 
          id: generateId(), 
          name: 'Lab_Results.pdf', 
          type: 'application/pdf', 
          size: randomNumber(100000, 5000000),
          recordType: 'Lab Results',
          recordId: `LR-${randomNumber(10000, 99999)}`,
          dateAdded: randomDate(-20, -1).toISOString(),
          accessGranted: true,
          consentTransactionId: generateMockTransactionId(),
          provider: randomItem(['Quest Diagnostics', 'LabCorp', 'Mayo Clinic Labs'])
        },
        { 
          id: generateId(), 
          name: 'ECG_Report.pdf', 
          type: 'application/pdf', 
          size: randomNumber(100000, 3000000),
          recordType: 'ECG Report',
          recordId: `ECG-${randomNumber(10000, 99999)}`,
          dateAdded: randomDate(-15, -1).toISOString(),
          accessGranted: Math.random() > 0.2,
          consentTransactionId: Math.random() > 0.3 ? generateMockTransactionId() : null,
          provider: randomItem(['Cardiology Associates', 'Heart Center', 'University Medical Center'])
        }
      ],
      billing: {
        amount: randomNumber(100, 5000),
        currency: randomItem(['USD', 'EUR', 'GBP', 'CAD']),
        status: randomItem(['pending', 'processed', 'settled', 'disputed']),
        transactionId: generateMockTransactionId(),
        smartContractId: `SC-${generateId().substring(0, 8)}`,
        insuranceClaim: Math.random() > 0.3 ? {
          claimId: `INS-${randomNumber(10000, 99999)}`,
          status: randomItem(['pending', 'processed', 'settled', 'disputed']),
          amount: randomNumber(50, 4000),
          submissionDate: randomDate(-20, -1).toISOString()
        } : null
      }
    };
  });
};

/**
 * Generate mock analytics data
 * 
 * @param {number} count - Number of analytics reports to generate
 * @param {Array} users - Array of user objects
 * @returns {Array} Array of analytics report objects
 */
export const generateAnalytics = (count = 5, users = []) => {
  const types = ['patient-risk', 'referral-efficiency', 'treatment-outcomes', 'resource-utilization'];
  const statuses = ['completed', 'processing', 'failed'];
  
  // Generate mock users if not provided
  const mockUsers = users.length > 0 ? users : generateUsers(3);
  
  return Array.from({ length: count }, () => {
    const id = generateId();
    const type = randomItem(types);
    const status = randomItem(statuses);
    const createdAt = randomDate(-30, -1);
    const user = randomItem(mockUsers);
    
    return {
      id,
      title: `${type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Analysis`,
      type,
      description: `Analytics report for ${type.replace('-', ' ')}.`,
      status,
      createdAt: createdAt.toISOString(),
      completedAt: status === 'completed' ? (() => {
        // Ensure the completion date is valid and after creation date
        const completionDate = randomDate(-1, 0); // Use a recent date to avoid issues
        return completionDate.toISOString();
      })() : null,
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName
      },
      parameters: {
        dateRange: {
          // Use fixed date ranges to avoid potential invalid dates
          start: (() => {
            const date = new Date();
            date.setDate(date.getDate() - 90);
            return date.toISOString();
          })(),
          end: (() => {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            return date.toISOString();
          })()
        },
        filters: {
          departments: ['Cardiology', 'Neurology'],
          includeArchived: false
        }
      },
      results: status === 'completed' ? {
        summary: {
          totalRecords: randomNumber(100, 1000),
          averageScore: randomNumber(50, 95) / 100,
          trend: randomItem(['increasing', 'decreasing', 'stable'])
        },
        data: Array.from({ length: 5 }, (_, i) => ({
          category: `Category ${i + 1}`,
          value: randomNumber(10, 100),
          change: randomNumber(-20, 20)
        }))
      } : null,
      blockchainId: status === 'completed' ? generateMockTransactionId() : null
    };
  });
};

/**
 * Generate mock token transaction data
 * 
 * @param {number} count - Number of transactions to generate
 * @param {Array} users - Array of user objects
 * @returns {Array} Array of token transaction objects
 */
export const generateTokenTransactions = (count = 20, users = []) => {
  const types = ['reward', 'transfer', 'redemption', 'system'];
  const statuses = ['completed', 'pending', 'failed'];
  const services = ['Premium Analytics Report', 'Priority Referral Processing', 'Extended Data Storage', 'AI Consultation Assistant', 'Network Membership Upgrade', 'Blockchain Certification'];
  
  // Generate mock users if not provided
  const mockUsers = users.length > 0 ? users : generateUsers(5);
  
  return Array.from({ length: count }, () => {
    const id = generateId();
    const type = randomItem(types);
    const status = randomItem(statuses);
    const amount = type === 'reward' ? randomNumber(10, 100) : type === 'redemption' ? -randomNumber(50, 200) : randomNumber(-100, 100);
    const user = randomItem(mockUsers);
    let toUser = null;
    
    if (type === 'transfer') {
      toUser = randomItem(mockUsers.filter(u => u.id !== user.id));
    }
    
    return {
      id,
      type,
      amount,
      balance: randomNumber(100, 5000),
      description: type === 'reward' 
        ? 'Reward for data sharing'
        : type === 'transfer'
          ? `Transfer to ${toUser.firstName} ${toUser.lastName}`
          : type === 'redemption'
            ? `Redemption for ${randomItem(services)}`
            : 'System adjustment',
      status,
      timestamp: randomDate(-30, 0).toISOString(),
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName
      },
      toUserId: toUser ? toUser.id : null,
      toUser: toUser ? {
        id: toUser.id,
        firstName: toUser.firstName,
        lastName: toUser.lastName
      } : null,
      service: type === 'redemption' ? randomItem(services) : null,
      blockchainId: status === 'completed' ? generateMockTransactionId() : null
    };
  });
};

// ============================================================================
// ADMIN TOKEN MANAGEMENT MOCK DATA
// ============================================================================

/**
 * Generate mock provider data for token management
 * 
 * @param {number} count - Number of providers to generate
 * @returns {Array} Array of provider objects
 */
export const generateProviders = (count = 10) => {
  const statuses = ['active', 'inactive'];
  return Array.from({ length: count }, (_, index) => {
    const id = `provider-${index + 1}`;
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const name = `Dr. ${firstName} ${lastName}`;
    const organization = randomItem(organizations);
    const specialty = randomItem(specialties);
    const tokenBalance = randomNumber(50, 500);
    const lastTransaction = randomDate(-30, -1).toISOString();
    const status = randomItem(statuses);
    const tokenActivity = tokenBalance > 300 ? 'high' : (tokenBalance > 150 ? 'medium' : 'low');
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${organization.toLowerCase().replace(/ /g, '')}.com`;
    const phoneNumber = `(${100 + Math.floor(Math.random() * 900)}) ${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}`;
    
    return {
      id,
      firstName,
      lastName,
      name,
      organization,
      tokenBalance,
      lastTransaction,
      specialty,
      status,
      tokenActivity,
      email,
      phoneNumber
    };
  });
};

// For backward compatibility
export const mockProviders = generateProviders();

// Mock provider token history
export const mockProviderTokenHistory = [
  {
    id: 'tx-1',
    type: 'mint',
    amount: 50,
    reason: 'Initial allocation',
    timestamp: new Date(2023, 6, 1).toISOString(),
    status: 'completed'
  },
  {
    id: 'tx-2',
    type: 'earn',
    amount: 25,
    reason: 'Referral bonus',
    timestamp: new Date(2023, 6, 15).toISOString(),
    status: 'completed'
  },
  {
    id: 'tx-3',
    type: 'spend',
    amount: -15,
    reason: 'Premium report redemption',
    timestamp: new Date(2023, 7, 5).toISOString(),
    status: 'completed'
  },
  {
    id: 'tx-4',
    type: 'bonus',
    amount: 40,
    reason: 'Performance bonus',
    timestamp: new Date(2023, 7, 10).toISOString(),
    status: 'completed'
  }
];

// Mock token redemption catalog items
export const mockCatalogItems = [
  {
    id: 'catalog-1',
    name: 'Premium AI Analysis Report',
    description: 'Comprehensive AI analysis report with advanced insights',
    category: 'report',
    tokenCost: 25
  },
  {
    id: 'catalog-2',
    name: 'Priority Referral Processing',
    description: 'Fast-track referral processing with priority handling',
    category: 'service',
    tokenCost: 10
  },
  {
    id: 'catalog-3',
    name: 'Extended Data Access',
    description: 'Access to extended historical data and analytics',
    category: 'data',
    tokenCost: 50
  },
  {
    id: 'catalog-4',
    name: 'AI Consultation Assistant',
    description: 'AI-powered assistant for patient consultations',
    category: 'tool',
    tokenCost: 75
  }
];

// Mock token conversion rules
export const mockConversionRules = [
  {
    id: 'rule-1',
    service: 'Basic AI Analysis',
    tokenAmount: 10,
    description: '10 tokens for basic AI analysis of patient data'
  },
  {
    id: 'rule-2',
    service: 'Advanced AI Analysis',
    tokenAmount: 25,
    description: '25 tokens for advanced AI analysis with recommendations'
  },
  {
    id: 'rule-3',
    service: 'Priority Referral',
    tokenAmount: 5,
    description: '5 tokens for priority referral processing'
  },
  {
    id: 'rule-4',
    service: 'Extended Data Access',
    tokenAmount: 50,
    description: '50 tokens for extended network data access'
  }
];

// ============================================================================
// DASHBOARD CHARTS AND TABS MOCK DATA
// ============================================================================

// Patient Risk Analysis Chart Data
export const mockPatientRiskData = [
  { name: 'High Risk', value: 24, color: '#FF8042' },
  { name: 'Medium Risk', value: 45, color: '#FFBB28' },
  { name: 'Low Risk', value: 87, color: '#00C49F' },
  { name: 'Minimal Risk', value: 120, color: '#0088FE' }
];

// Clinical Metrics Chart Data (Care Quality Trends)
export const mockClinicalMetricsData = [
  { month: 'Jan', actual: 72, average: 68 },
  { month: 'Feb', actual: 75, average: 68 },
  { month: 'Mar', actual: 78, average: 69 },
  { month: 'Apr', actual: 74, average: 69 },
  { month: 'May', actual: 80, average: 70 },
  { month: 'Jun', actual: 83, average: 71 },
  { month: 'Jul', actual: 85, average: 72 },
  { month: 'Aug', actual: 86, average: 72 }
];

// Referral Efficiency Chart Data
export const mockReferralEfficiencyData = [
  { name: 'Response Time', current: 24, target: 18 },
  { name: 'Acceptance Rate', current: 85, target: 90 },
  { name: 'Completion Rate', current: 78, target: 85 },
  { name: 'Patient Satisfaction', current: 92, target: 95 },
  { name: 'Documentation Quality', current: 88, target: 90 }
];

// AI Performance Metrics Data
export const mockAIPerformanceMetrics = {
  riskAssessment: 92,
  summaryGeneration: 88,
  recommendations: 85,
  overall: 89
};

// AI Insights Data
export const mockAIInsights = [
  {
    id: 'insight-1',
    title: 'High-Risk Patient Alert',
    insight: '24 patients identified as high-risk. Consider scheduling follow-up appointments.',
    severity: 'high',
    actionText: 'View Patients',
    actionPath: '/app/patients?risk=high'
  },
  {
    id: 'insight-2',
    title: 'Referral Efficiency Improvement',
    insight: 'Response time has decreased by 15% this month. Continue the trend by implementing suggested workflow improvements.',
    severity: 'positive',
    actionText: 'View Details',
    actionPath: '/app/analytics/referrals'
  },
  {
    id: 'insight-3',
    title: 'Care Quality Opportunity',
    insight: 'Care quality index for diabetic patients is 5% below target. Consider reviewing treatment protocols.',
    severity: 'medium',
    actionText: 'Review Protocols',
    actionPath: '/app/analytics/care-quality'
  },
  {
    id: 'insight-4',
    title: 'Token Economy Alert',
    insight: 'Token redemption rate is unusually low this month. Consider promoting available services to providers.',
    severity: 'low',
    actionText: 'View Token Economy',
    actionPath: '/app/tokens/economy'
  },
  {
    id: 'insight-5',
    title: 'Documentation Improvement Needed',
    insight: 'Clinical documentation completeness score is 82%, below the target of 90%. Focus on improving discharge summaries.',
    severity: 'medium',
    actionText: 'View Documentation Metrics',
    actionPath: '/app/analytics/documentation'
  }
];

// Patient Analytics Tab Data
export const mockPatientAnalyticsData = {
  demographics: [
    { ageGroup: '0-17', count: 45, percentage: 16 },
    { ageGroup: '18-34', count: 62, percentage: 22 },
    { ageGroup: '35-50', count: 78, percentage: 28 },
    { ageGroup: '51-65', count: 56, percentage: 20 },
    { ageGroup: '65+', count: 35, percentage: 14 }
  ],
  conditions: [
    { name: 'Hypertension', count: 68, percentage: 24 },
    { name: 'Diabetes', count: 52, percentage: 19 },
    { name: 'Asthma', count: 34, percentage: 12 },
    { name: 'Arthritis', count: 28, percentage: 10 },
    { name: 'Heart Disease', count: 25, percentage: 9 },
    { name: 'Other', count: 73, percentage: 26 }
  ],
  riskFactors: [
    { factor: 'Smoking', count: 42, percentage: 15 },
    { factor: 'Obesity', count: 56, percentage: 20 },
    { factor: 'Physical Inactivity', count: 78, percentage: 28 },
    { factor: 'Poor Diet', count: 65, percentage: 23 },
    { factor: 'Excessive Alcohol', count: 28, percentage: 10 },
    { factor: 'Other', count: 12, percentage: 4 }
  ],
  careGaps: [
    { gap: 'Missed Follow-ups', count: 34, percentage: 12 },
    { gap: 'Incomplete Screenings', count: 28, percentage: 10 },
    { gap: 'Medication Non-adherence', count: 45, percentage: 16 },
    { gap: 'Missing Vaccinations', count: 22, percentage: 8 },
    { gap: 'No Care Plan', count: 18, percentage: 6 }
  ],
  trends: [
    { month: 'Jan', newPatients: 12, discharges: 8, activePatients: 245 },
    { month: 'Feb', newPatients: 15, discharges: 10, activePatients: 250 },
    { month: 'Mar', newPatients: 18, discharges: 12, activePatients: 256 },
    { month: 'Apr', newPatients: 14, discharges: 15, activePatients: 255 },
    { month: 'May', newPatients: 20, discharges: 13, activePatients: 262 },
    { month: 'Jun', newPatients: 22, discharges: 14, activePatients: 270 },
    { month: 'Jul', newPatients: 19, discharges: 16, activePatients: 273 },
    { month: 'Aug', newPatients: 24, discharges: 18, activePatients: 279 }
  ]
};

// Referral Metrics Tab Data
export const mockReferralMetricsData = {
  bySpecialty: [
    { specialty: 'Cardiology', count: 45, percentage: 22, avgResponseTime: 18 },
    { specialty: 'Neurology', count: 32, percentage: 16, avgResponseTime: 24 },
    { specialty: 'Orthopedics', count: 38, percentage: 19, avgResponseTime: 20 },
    { specialty: 'Gastroenterology', count: 28, percentage: 14, avgResponseTime: 22 },
    { specialty: 'Dermatology', count: 22, percentage: 11, avgResponseTime: 16 },
    { specialty: 'Other', count: 36, percentage: 18, avgResponseTime: 26 }
  ],
  statusDistribution: [
    { status: 'Pending', count: 42, percentage: 21 },
    { status: 'Accepted', count: 85, percentage: 43 },
    { status: 'Completed', count: 58, percentage: 29 },
    { status: 'Declined', count: 12, percentage: 6 },
    { status: 'Cancelled', count: 4, percentage: 2 }
  ],
  trends: [
    { month: 'Jan', sent: 38, accepted: 32, completed: 28 },
    { month: 'Feb', sent: 42, accepted: 36, completed: 30 },
    { month: 'Mar', sent: 45, accepted: 40, completed: 35 },
    { month: 'Apr', sent: 40, accepted: 35, completed: 32 },
    { month: 'May', sent: 48, accepted: 42, completed: 38 },
    { month: 'Jun', sent: 52, accepted: 46, completed: 40 },
    { month: 'Jul', sent: 50, accepted: 44, completed: 38 },
    { month: 'Aug', sent: 56, accepted: 48, completed: 42 }
  ],
  conversionRates: [
    { provider: 'Dr. Johnson', sent: 24, accepted: 22, completed: 20, rate: 83 },
    { provider: 'Dr. Smith', sent: 18, accepted: 16, completed: 14, rate: 78 },
    { provider: 'Dr. Williams', sent: 22, accepted: 20, completed: 18, rate: 82 },
    { provider: 'Dr. Brown', sent: 16, accepted: 14, completed: 12, rate: 75 },
    { provider: 'Dr. Jones', sent: 20, accepted: 19, completed: 17, rate: 85 }
  ]
};

// Clinical Outcomes Tab Data
export const mockClinicalOutcomesData = {
  treatmentEffectiveness: [
    { condition: 'Hypertension', improved: 75, unchanged: 18, worsened: 7 },
    { condition: 'Diabetes', improved: 68, unchanged: 22, worsened: 10 },
    { condition: 'Asthma', improved: 82, unchanged: 12, worsened: 6 },
    { condition: 'Arthritis', improved: 65, unchanged: 25, worsened: 10 },
    { condition: 'Heart Disease', improved: 70, unchanged: 20, worsened: 10 }
  ],
  readmissionRates: [
    { month: 'Jan', rate: 12, benchmark: 15 },
    { month: 'Feb', rate: 11, benchmark: 15 },
    { month: 'Mar', rate: 10, benchmark: 14 },
    { month: 'Apr', rate: 9, benchmark: 14 },
    { month: 'May', rate: 8, benchmark: 14 },
    { month: 'Jun', rate: 7, benchmark: 13 },
    { month: 'Jul', rate: 8, benchmark: 13 },
    { month: 'Aug', rate: 7, benchmark: 13 }
  ],
  patientSatisfaction: [
    { category: 'Communication', score: 4.2, benchmark: 4.0 },
    { category: 'Care Quality', score: 4.5, benchmark: 4.2 },
    { category: 'Timeliness', score: 3.8, benchmark: 3.9 },
    { category: 'Facility', score: 4.3, benchmark: 4.1 },
    { category: 'Staff', score: 4.6, benchmark: 4.3 }
  ],
  qualityMetrics: [
    { metric: 'Care Plan Adherence', score: 82, target: 90 },
    { metric: 'Medication Reconciliation', score: 88, target: 95 },
    { metric: 'Preventive Screening', score: 76, target: 85 },
    { metric: 'Follow-up Completion', score: 84, target: 90 },
    { metric: 'Documentation Quality', score: 90, target: 95 }
  ],
  trends: [
    { quarter: 'Q1 2024', careQuality: 78, readmission: 12, satisfaction: 4.1 },
    { quarter: 'Q2 2024', careQuality: 80, readmission: 10, satisfaction: 4.2 },
    { quarter: 'Q3 2024', careQuality: 83, readmission: 9, satisfaction: 4.3 },
    { quarter: 'Q4 2024', careQuality: 85, readmission: 8, satisfaction: 4.4 },
    { quarter: 'Q1 2025', careQuality: 86, readmission: 7, satisfaction: 4.5 },
    { quarter: 'Q2 2025', careQuality: 88, readmission: 7, satisfaction: 4.6 }
  ]
};

// AI Performance Tab Data
export const mockAIPerformanceData = {
  accuracyTrends: [
    { month: 'Jan', riskAssessment: 85, summaryGeneration: 82, recommendations: 80 },
    { month: 'Feb', riskAssessment: 86, summaryGeneration: 83, recommendations: 81 },
    { month: 'Mar', riskAssessment: 88, summaryGeneration: 84, recommendations: 82 },
    { month: 'Apr', riskAssessment: 89, summaryGeneration: 85, recommendations: 83 },
    { month: 'May', riskAssessment: 90, summaryGeneration: 86, recommendations: 84 },
    { month: 'Jun', riskAssessment: 91, summaryGeneration: 87, recommendations: 84 },
    { month: 'Jul', riskAssessment: 92, summaryGeneration: 88, recommendations: 85 },
    { month: 'Aug', riskAssessment: 92, summaryGeneration: 88, recommendations: 85 }
  ],
  usageStatistics: [
    { feature: 'Risk Assessment', usageCount: 1245, uniqueUsers: 42, avgTimeSpent: 3.5 },
    { feature: 'Clinical Summaries', usageCount: 982, uniqueUsers: 38, avgTimeSpent: 2.8 },
    { feature: 'Treatment Recommendations', usageCount: 876, uniqueUsers: 35, avgTimeSpent: 4.2 },
    { feature: 'Documentation Assistance', usageCount: 1432, uniqueUsers: 45, avgTimeSpent: 5.1 },
    { feature: 'Patient Education', usageCount: 654, uniqueUsers: 28, avgTimeSpent: 3.2 }
  ],
  errorAnalysis: [
    { category: 'False Positives', count: 42, percentage: 2.8, trend: 'decreasing' },
    { category: 'False Negatives', count: 28, percentage: 1.9, trend: 'decreasing' },
    { category: 'Classification Errors', count: 35, percentage: 2.3, trend: 'stable' },
    { category: 'Incomplete Analysis', count: 18, percentage: 1.2, trend: 'decreasing' },
    { category: 'Data Quality Issues', count: 24, percentage: 1.6, trend: 'increasing' }
  ],
  feedbackMetrics: [
    { category: 'Accuracy', score: 4.2, previousScore: 4.0 },
    { category: 'Usefulness', score: 4.5, previousScore: 4.3 },
    { category: 'Clarity', score: 4.3, previousScore: 4.1 },
    { category: 'Timeliness', score: 4.6, previousScore: 4.5 },
    { category: 'Overall Satisfaction', score: 4.4, previousScore: 4.2 }
  ],
  modelPerformance: [
    { model: 'Risk Prediction v2.1', accuracy: 92, precision: 90, recall: 88, f1Score: 89 },
    { model: 'Clinical Summary v1.8', accuracy: 88, precision: 86, recall: 85, f1Score: 85.5 },
    { model: 'Recommendation Engine v3.0', accuracy: 85, precision: 84, recall: 82, f1Score: 83 },
    { model: 'Documentation Assistant v2.5', accuracy: 90, precision: 89, recall: 87, f1Score: 88 },
    { model: 'Patient Risk Stratification v1.5', accuracy: 91, precision: 89, recall: 88, f1Score: 88.5 }
  ]
};

// ============================================================================
// ADMIN ANALYTICS MOCK DATA
// ============================================================================

// Mock data for provider performance
export const mockProviderPerformance = [
  { id: 1, name: 'Dr. Sarah Johnson', referrals: 45, acceptanceRate: 0.89, avgResponseTime: 8.2, patientSatisfaction: 4.8 },
  { id: 2, name: 'Dr. Michael Chen', referrals: 37, acceptanceRate: 0.92, avgResponseTime: 6.5, patientSatisfaction: 4.9 },
  { id: 3, name: 'Dr. Emily Rodriguez', referrals: 29, acceptanceRate: 0.78, avgResponseTime: 12.1, patientSatisfaction: 4.5 },
  { id: 4, name: 'Dr. David Kim', referrals: 52, acceptanceRate: 0.85, avgResponseTime: 9.3, patientSatisfaction: 4.7 },
  { id: 5, name: 'Dr. Lisa Patel', referrals: 41, acceptanceRate: 0.90, avgResponseTime: 7.8, patientSatisfaction: 4.6 }
];

// Mock data for referral conversion rates
export const mockReferralConversionData = [
  { month: 'Jan', sent: 120, accepted: 98, completed: 87 },
  { month: 'Feb', sent: 145, accepted: 125, completed: 110 },
  { month: 'Mar', sent: 132, accepted: 118, completed: 102 },
  { month: 'Apr', sent: 158, accepted: 140, completed: 125 },
  { month: 'May', sent: 175, accepted: 155, completed: 140 },
  { month: 'Jun', sent: 162, accepted: 148, completed: 130 }
];

// Mock data for token economy trends
export const mockTokenEconomyData = [
  { month: 'Jan', issued: 1200, redeemed: 850, circulation: 3500 },
  { month: 'Feb', issued: 1350, redeemed: 920, circulation: 3930 },
  { month: 'Mar', issued: 1420, redeemed: 980, circulation: 4370 },
  { month: 'Apr', issued: 1550, redeemed: 1050, circulation: 4870 },
  { month: 'May', issued: 1680, redeemed: 1120, circulation: 5430 },
  { month: 'Jun', issued: 1750, redeemed: 1280, circulation: 5900 }
];

// Mock data for AI analytics
export const mockAIAnalyticsData = {
  usage: [
    { month: 'Jan', riskAssessment: 320, summaryGeneration: 180, recommendationEngine: 150 },
    { month: 'Feb', riskAssessment: 350, summaryGeneration: 210, recommendationEngine: 175 },
    { month: 'Mar', riskAssessment: 370, summaryGeneration: 230, recommendationEngine: 190 },
    { month: 'Apr', riskAssessment: 410, summaryGeneration: 250, recommendationEngine: 210 },
    { month: 'May', riskAssessment: 440, summaryGeneration: 270, recommendationEngine: 230 },
    { month: 'Jun', riskAssessment: 460, summaryGeneration: 290, recommendationEngine: 250 }
  ],
  accuracy: {
    riskAssessment: 0.92,
    summaryGeneration: 0.88,
    recommendationEngine: 0.85
  },
  falsePositives: 42,
  falseNegatives: 28,
  improvementRate: 0.05
};

// Mock scheduled reports
export const mockScheduledReports = [
  { id: 1, name: 'Weekly Provider Performance', frequency: 'weekly', recipients: ['admin@clinictrust.com', 'ceo@clinictrust.com'], lastSent: '2025-07-29T10:00:00Z', nextScheduled: '2025-08-05T10:00:00Z' },
  { id: 2, name: 'Monthly Token Economy Report', frequency: 'monthly', recipients: ['finance@clinictrust.com', 'admin@clinictrust.com'], lastSent: '2025-07-01T10:00:00Z', nextScheduled: '2025-08-01T10:00:00Z' },
  { id: 3, name: 'Quarterly AI Performance', frequency: 'quarterly', recipients: ['tech@clinictrust.com', 'admin@clinictrust.com'], lastSent: '2025-06-01T10:00:00Z', nextScheduled: '2025-09-01T10:00:00Z' }
];

// Mock data for admin dashboard analytics
export const mockTokenEconomyTrends = {
  periods: {
    '3m': {
      labels: ['Jun', 'Jul', 'Aug'],
      issued: [120, 180, 150],
      redeemed: [40, 60, 75],
      inCirculation: [80, 200, 275]
    },
    '6m': {
      labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      issued: [90, 110, 130, 120, 180, 150],
      redeemed: [30, 35, 45, 40, 60, 75],
      inCirculation: [60, 135, 220, 300, 420, 495]
    },
    '1y': {
      labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      issued: [50, 70, 85, 95, 100, 110, 90, 110, 130, 120, 180, 150],
      redeemed: [10, 20, 25, 30, 35, 40, 30, 35, 45, 40, 60, 75],
      inCirculation: [40, 90, 150, 215, 280, 350, 410, 485, 570, 650, 770, 845]
    }
  },
  summary: {
    totalIssued: 1290,
    totalRedeemed: 445,
    currentCirculation: 845
  }
};

// Mock AI analytics data
export const mockAIAnalytics = {
  accuracy: {
    riskAssessment: 92.5,
    summaryGeneration: 89.8,
    recommendations: 87.3
  },
  usageTrends: {
    labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    riskAssessment: [120, 145, 165, 180, 210, 235],
    summaryGeneration: [95, 110, 125, 140, 160, 185],
    recommendations: [75, 90, 105, 115, 130, 150]
  },
  feedback: {
    falsePositives: 24,
    falseNegatives: 18,
    improvementRate: 8.5
  }
};

// Mock scheduled reports data from mockdata.js
export const mockScheduledReportsExtended = [
  {
    id: 'report-1',
    name: 'Monthly Provider Performance',
    type: 'provider',
    frequency: 'monthly',
    recipients: ['admin@clinictrust.com', 'management@clinictrust.com'],
    nextScheduled: new Date(2023, 8, 1).toISOString(),
    lastSent: new Date(2023, 7, 1).toISOString()
  },
  {
    id: 'report-2',
    name: 'Weekly Referral Summary',
    type: 'referral',
    frequency: 'weekly',
    recipients: ['referrals@clinictrust.com'],
    nextScheduled: new Date(2023, 7, 22).toISOString(),
    lastSent: new Date(2023, 7, 15).toISOString()
  },
  {
    id: 'report-3',
    name: 'Quarterly Token Economy Report',
    type: 'token',
    frequency: 'quarterly',
    recipients: ['finance@clinictrust.com', 'admin@clinictrust.com'],
    nextScheduled: new Date(2023, 9, 1).toISOString(),
    lastSent: new Date(2023, 6, 1).toISOString()
  },
  {
    id: 'report-4',
    name: 'AI Performance Analysis',
    type: 'ai',
    frequency: 'monthly',
    recipients: ['tech@clinictrust.com', 'ai-team@clinictrust.com'],
    nextScheduled: new Date(2023, 8, 1).toISOString(),
    lastSent: new Date(2023, 7, 1).toISOString()
  }
];

/**
 * Generate mock medical record data
 * 
 * @param {number} count - Number of records to generate
 * @param {Array} patients - Array of patient objects
 * @param {Array} users - Array of user objects
 * @returns {Array} Array of medical record objects
 */
export const generateMedicalRecords = (count = 30, patients = [], users = []) => {
  const types = ['visit', 'lab', 'prescription', 'procedure', 'note'];
  const visitTypes = ['routine', 'follow-up', 'emergency', 'specialist'];
  const medications = ['Aspirin', 'Lisinopril', 'Metformin', 'Atorvastatin', 'Albuterol', 'Levothyroxine'];
  
  // Generate mock patients and users if not provided
  const mockPatients = patients.length > 0 ? patients : generatePatients(10);
  const mockUsers = users.length > 0 ? users : generateUsers(5);
  const doctors = mockUsers.filter(user => user.role === 'Doctor' || user.role === 'Specialist');
  
  return Array.from({ length: count }, () => {
    const id = generateId();
    const type = randomItem(types);
    const patient = randomItem(mockPatients);
    const doctor = randomItem(doctors);
    const date = randomDate(-365, 0);
    
    const baseRecord = {
      id,
      type,
      patientId: patient.id,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName
      },
      doctorId: doctor.id,
      doctor: {
        id: doctor.id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialty: doctor.specialty
      },
      date: date.toISOString(),
      createdAt: date.toISOString(),
      updatedAt: Math.random() > 0.7 ? randomDate(date, new Date()).toISOString() : date.toISOString(),
      blockchainId: generateMockTransactionId()
    };
    
    // Add type-specific fields
    switch (type) {
      case 'visit':
        return {
          ...baseRecord,
          visitType: randomItem(visitTypes),
          chiefComplaint: 'Patient presented with symptoms of...',
          diagnosis: 'Preliminary diagnosis...',
          treatment: 'Recommended treatment...',
          followUp: Math.random() > 0.5 ? randomDate(1, 30).toISOString() : null
        };
      case 'lab':
        return {
          ...baseRecord,
          labType: randomItem(['blood', 'urine', 'imaging', 'pathology']),
          results: 'Lab results show...',
          normalRange: '70-120',
          value: `${randomNumber(60, 130)}`,
          interpretation: randomItem(['normal', 'abnormal', 'inconclusive']),
          recommendations: 'Based on these results...'
        };
      case 'prescription':
        return {
          ...baseRecord,
          medication: randomItem(medications),
          dosage: `${randomNumber(5, 500)}mg`,
          frequency: randomItem(['once daily', 'twice daily', 'three times daily', 'as needed']),
          duration: `${randomNumber(1, 30)} days`,
          refills: randomNumber(0, 3),
          instructions: 'Take with food...'
        };
      case 'procedure':
        return {
          ...baseRecord,
          procedureType: randomItem(['surgery', 'diagnostic', 'therapeutic']),
          procedureName: 'Procedure description...',
          outcome: 'Procedure outcome...',
          complications: Math.random() > 0.8 ? 'Complications during procedure...' : 'None',
          anesthesia: Math.random() > 0.5 ? randomItem(['local', 'general', 'regional']) : 'None'
        };
      case 'note':
        return {
          ...baseRecord,
          noteType: randomItem(['progress', 'consultation', 'discharge']),
          content: 'Patient progress notes...',
          assessment: 'Clinical assessment...',
          plan: 'Treatment plan...'
        };
      default:
        return baseRecord;
    }
  });
};

/**
 * Generate mock consent record data
 * 
 * @param {number} count - Number of records to generate
 * @param {Array} patients - Array of patient objects
 * @returns {Array} Array of consent record objects
 */
export const generateConsentRecords = (count = 15, patients = []) => {
  const types = ['data-sharing', 'treatment', 'research', 'disclosure'];
  const statuses = ['granted', 'revoked', 'expired', 'pending'];
  
  // Generate mock patients if not provided
  const mockPatients = patients.length > 0 ? patients : generatePatients(10);
  
  return Array.from({ length: count }, () => {
    const id = generateId();
    const type = randomItem(types);
    const status = randomItem(statuses);
    const patient = randomItem(mockPatients);
    const grantedAt = randomDate(-365, -30);
    
    return {
      id,
      type,
      status,
      patientId: patient.id,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName
      },
      description: `Consent for ${type.replace('-', ' ')} purposes.`,
      grantedAt: status !== 'pending' ? grantedAt.toISOString() : null,
      expiresAt: status !== 'pending' ? randomDate(30, 365).toISOString() : null,
      revokedAt: status === 'revoked' ? randomDate(-30, -1).toISOString() : null,
      scope: ['view', 'edit', 'share'].slice(0, randomNumber(1, 3)),
      blockchainId: status !== 'pending' ? generateMockTransactionId() : null
    };
  });
};

// Admin mock data
export const adminMockData = {
  // AI Management mock data
  aiStatistics: {
    totalReports: 1245,
    averageConfidence: 0.87,
    approvalRate: 0.92,
    totalFeedback: 328,
    reportTypeDistribution: [
      { name: 'Readmission', value: 423 },
      { name: 'Diagnosis', value: 356 },
      { name: 'Treatment', value: 287 },
      { name: 'Summary', value: 124 },
      { name: 'Custom', value: 55 }
    ],
    statusDistribution: [
      { name: 'Approved', value: 876 },
      { name: 'Pending', value: 214 },
      { name: 'Rejected', value: 98 },
      { name: 'Draft', value: 57 }
    ],
    confidenceTrends: [
      { month: 'Mar', readmission: 0.82, diagnosis: 0.88, treatment: 0.79 },
      { month: 'Apr', readmission: 0.84, diagnosis: 0.87, treatment: 0.81 },
      { month: 'May', readmission: 0.85, diagnosis: 0.89, treatment: 0.83 },
      { month: 'Jun', readmission: 0.87, diagnosis: 0.91, treatment: 0.85 },
      { month: 'Jul', readmission: 0.89, diagnosis: 0.92, treatment: 0.86 },
      { month: 'Aug', readmission: 0.91, diagnosis: 0.93, treatment: 0.88 }
    ],
    feedbackDistribution: [
      { name: 'Accurate', value: 187 },
      { name: 'False Positive', value: 76 },
      { name: 'False Negative', value: 42 },
      { name: 'Other', value: 23 }
    ],
    topInsights: [
      {
        title: 'Medication Adherence Impact',
        description: 'Patients with medication adherence issues show 3.2x higher readmission rates within 30 days.',
        confidence: 0.94,
        impact: 'High'
      },
      {
        title: 'Early Intervention Effectiveness',
        description: 'Early follow-up within 72 hours reduces readmission risk by 42% for high-risk cardiac patients.',
        confidence: 0.91,
        impact: 'High'
      },
      {
        title: 'Diagnostic Pattern Recognition',
        description: 'AI model identifies subtle patterns in lab results that predict sepsis onset 6 hours earlier than traditional methods.',
        confidence: 0.87,
        impact: 'Critical'
      },
      {
        title: 'Treatment Protocol Optimization',
        description: 'Modified antibiotic protocol based on AI recommendations reduced average treatment time by 1.8 days.',
        confidence: 0.89,
        impact: 'Medium'
      },
      {
        title: 'Social Determinants Correlation',
        description: 'Transportation barriers strongly correlate with missed appointments and poorer outcomes for chronic disease patients.',
        confidence: 0.85,
        impact: 'Medium'
      }
    ]
  },
  aiReports: [
    {
      id: 'ai-report-1',
      title: 'Patient Readmission Risk Analysis',
      description: 'AI-generated analysis of readmission risk factors across patient population',
      type: 'readmission',
      status: 'approved',
      data: {
        summary: 'Analysis of 1,245 patient records shows 18% have high readmission risk',
        highRiskCount: 223,
        mediumRiskCount: 412,
        lowRiskCount: 610,
        topFactors: [
          'Previous readmissions within 30 days',
          'Multiple chronic conditions',
          'Medication adherence issues',
          'Limited post-discharge support'
        ],
        recommendations: [
          'Implement targeted follow-up for high-risk patients',
          'Enhance medication reconciliation process',
          'Strengthen discharge planning protocols'
        ]
      },
      confidenceScore: 0.89,
      thresholds: {
        readmissionRisk: 0.7,
        diagnosisConfidence: 0.85,
        treatmentRecommendation: 0.8
      },
      feedback: [
        {
          type: 'accurate',
          comment: 'Analysis aligns with our clinical observations',
          submittedBy: 'user-1',
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ai-report-2',
      title: 'Diagnostic Accuracy Assessment',
      description: 'Analysis of AI diagnostic suggestions compared to final physician diagnoses',
      type: 'diagnosis',
      status: 'pending_review',
      data: {
        totalCases: 532,
        correctDiagnoses: 478,
        partialMatches: 42,
        incorrectDiagnoses: 12,
        accuracyRate: 0.898,
        confusionMatrix: {
          truePositives: 412,
          falsePositives: 8,
          trueNegatives: 66,
          falseNegatives: 4
        },
        challengingConditions: [
          'Rare autoimmune disorders',
          'Atypical presentation of common conditions',
          'Multiple co-occurring conditions'
        ]
      },
      confidenceScore: 0.92,
      thresholds: {
        diagnosisConfidence: 0.85
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ai-report-3',
      title: 'Treatment Recommendation Analysis',
      description: 'Evaluation of AI treatment recommendations and their adoption by providers',
      type: 'treatment',
      status: 'rejected',
      data: {
        totalRecommendations: 845,
        adoptedRecommendations: 623,
        modifiedRecommendations: 178,
        rejectedRecommendations: 44,
        adoptionRate: 0.737,
        topAdoptedCategories: [
          'Medication adjustments',
          'Preventive care measures',
          'Lifestyle modifications'
        ],
        commonRejectionReasons: [
          'Patient-specific contraindications',
          'Recent research not yet incorporated in model',
          'Provider clinical judgment'
        ]
      },
      confidenceScore: 0.78,
      thresholds: {
        treatmentRecommendation: 0.8
      },
      feedback: [
        {
          type: 'false_positive',
          comment: 'Several recommendations didn\'t account for patient-specific contraindications',
          submittedBy: 'user-2',
          submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          type: 'other',
          comment: 'Model needs to be updated with latest clinical guidelines',
          submittedBy: 'user-3',
          submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ai-report-4',
      title: 'Clinical Pathway Optimization',
      description: 'AI analysis of clinical pathways and recommendations for optimization',
      type: 'custom',
      status: 'draft',
      data: {
        pathwaysAnalyzed: 12,
        potentialOptimizations: 28,
        estimatedTimeReduction: '18%',
        estimatedCostSavings: '12%',
        highImpactRecommendations: [
          'Streamline pre-surgical assessment workflow',
          'Optimize lab testing sequences',
          'Enhance care coordination for complex cases'
        ]
      },
      confidenceScore: 0.83,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ai-report-5',
      title: 'Patient Outcome Prediction',
      description: 'Predictive analysis of patient outcomes based on treatment plans and patient characteristics',
      type: 'summary',
      status: 'pending_review',
      data: {
        patientsAnalyzed: 1876,
        predictiveAccuracy: 0.86,
        keyPredictiveFactors: [
          'Treatment adherence',
          'Social support network',
          'Comorbidities',
          'Age and functional status'
        ],
        outcomeCategories: {
          excellent: 423,
          good: 892,
          fair: 412,
          poor: 149
        },
        interventionOpportunities: [
          'Enhanced support for medication adherence',
          'Earlier physical therapy intervention',
          'Proactive mental health screening'
        ]
      },
      confidenceScore: 0.86,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  referrals: [
    {
      id: 'ref-1',
      patientId: 'P10045',
      patientName: 'John D.',
      referringProviderId: 'provider-1',
      referringProviderName: 'Dr. Emily Chen',
      referringProviderSpecialty: 'General Practitioner',
      targetProviderId: 'provider-2',
      targetProviderName: 'Dr. Robert Williams',
      targetProviderSpecialty: 'Cardiologist',
      reason: 'Suspected coronary artery disease, requires specialist evaluation',
      status: 'Completed',
      priority: 'High',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Patient was seen and diagnosed with mild CAD. Treatment plan initiated.',
      paymentStatus: 'Paid',
      paymentAmount: 150,
      paymentTxHash: '0x7a8d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34k67',
      hasDispute: false
    },
    {
      id: 'ref-2',
      patientId: 'P10046',
      patientName: 'Sarah M.',
      referringProviderId: 'provider-2',
      referringProviderName: 'Dr. Robert Williams',
      referringProviderSpecialty: 'Cardiologist',
      targetProviderId: 'provider-3',
      targetProviderName: 'Dr. Maria Garcia',
      targetProviderSpecialty: 'Endocrinologist',
      reason: 'Diabetes management for cardiac patient',
      status: 'Pending',
      priority: 'Medium',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Patient requires specialized diabetes management to reduce cardiac risk factors.',
      paymentStatus: 'Pending',
      paymentAmount: 120,
      hasDispute: false
    },
    {
      id: 'ref-3',
      patientId: 'P10047',
      patientName: 'Michael T.',
      referringProviderId: 'provider-1',
      referringProviderName: 'Dr. Emily Chen',
      referringProviderSpecialty: 'General Practitioner',
      targetProviderId: 'provider-4',
      targetProviderName: 'Dr. James Wilson',
      targetProviderSpecialty: 'Neurologist',
      reason: 'Recurring migraines with visual aura',
      status: 'Approved',
      priority: 'Medium',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Appointment scheduled for next week.',
      paymentStatus: 'Pending',
      paymentAmount: 135,
      hasDispute: false
    },
    {
      id: 'ref-4',
      patientId: 'P10048',
      patientName: 'Emma K.',
      referringProviderId: 'provider-3',
      referringProviderName: 'Dr. Maria Garcia',
      referringProviderSpecialty: 'Endocrinologist',
      targetProviderId: 'provider-5',
      targetProviderName: 'Dr. David Lee',
      targetProviderSpecialty: 'Nephrologist',
      reason: 'Diabetic nephropathy evaluation',
      status: 'Cancelled',
      priority: 'High',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      cancelledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Patient decided to seek second opinion elsewhere.',
      paymentStatus: 'Cancelled',
      hasDispute: true,
      dispute: {
        id: 'disp-1',
        initiatedBy: 'provider-3',
        initiatorName: 'Dr. Maria Garcia',
        reason: 'Referral was processed but patient cancelled after initial work was done',
        requestedAmount: 50,
        status: 'Pending',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Requesting partial payment for initial consultation and paperwork'
      }
    },
    {
      id: 'ref-5',
      patientId: 'P10049',
      patientName: 'Robert J.',
      referringProviderId: 'provider-2',
      referringProviderName: 'Dr. Robert Williams',
      referringProviderSpecialty: 'Cardiologist',
      targetProviderId: 'provider-6',
      targetProviderName: 'Dr. Susan Taylor',
      targetProviderSpecialty: 'Cardiac Surgeon',
      reason: 'Evaluation for potential bypass surgery',
      status: 'Completed',
      priority: 'Critical',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Surgery successfully performed, patient in recovery.',
      paymentStatus: 'Disputed',
      paymentAmount: 300,
      hasDispute: true,
      dispute: {
        id: 'disp-2',
        initiatedBy: 'provider-6',
        initiatorName: 'Dr. Susan Taylor',
        reason: 'Complex case required additional consultation time',
        requestedAmount: 450,
        status: 'Resolved',
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        resolution: 'Approved additional payment',
        finalAmount: 400,
        paymentTxHash: '0x9b8d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34l78',
        notes: 'Additional payment approved due to case complexity'
      }
    }
  ],
  
  referralTransactions: [
    {
      id: 'tx-1',
      referralId: 'ref-1',
      amount: 150,
      fromProvider: 'Insurance Network',
      toProvider: 'Dr. Emily Chen',
      timestamp: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
      txHash: '0x7a8d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34k67',
      blockNumber: 14578932,
      status: 'Confirmed',
      notes: 'Standard referral payment'
    },
    {
      id: 'tx-2',
      referralId: 'ref-5',
      amount: 300,
      fromProvider: 'Insurance Network',
      toProvider: 'Dr. Robert Williams',
      timestamp: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      txHash: '0x8b8d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34m89',
      blockNumber: 14575647,
      status: 'Confirmed',
      notes: 'Initial referral payment'
    },
    {
      id: 'tx-3',
      referralId: 'ref-5',
      amount: 100,
      fromProvider: 'Insurance Network',
      toProvider: 'Dr. Robert Williams',
      timestamp: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
      txHash: '0x9b8d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34l78',
      blockNumber: 14578945,
      status: 'Confirmed',
      notes: 'Additional payment after dispute resolution'
    }
  ],
  
  referralStats: {
    totalReferrals: 156,
    pendingReferrals: 42,
    approvedReferrals: 28,
    completedReferrals: 78,
    cancelledReferrals: 8,
    activeDisputes: 3,
    averageCompletionTime: 8.5, // days
    topReferrers: [
      { providerId: 'provider-1', providerName: 'Dr. Emily Chen', count: 45 },
      { providerId: 'provider-2', providerName: 'Dr. Robert Williams', count: 32 },
      { providerId: 'provider-3', providerName: 'Dr. Maria Garcia', count: 21 }
    ],
    topReceivers: [
      { providerId: 'provider-2', providerName: 'Dr. Robert Williams', count: 38 },
      { providerId: 'provider-4', providerName: 'Dr. James Wilson', count: 27 },
      { providerId: 'provider-6', providerName: 'Dr. Susan Taylor', count: 19 }
    ],
    monthlyTrends: [
      { month: 'Jan', count: 12 },
      { month: 'Feb', count: 15 },
      { month: 'Mar', count: 18 },
      { month: 'Apr', count: 14 },
      { month: 'May', count: 21 },
      { month: 'Jun', count: 19 },
      { month: 'Jul', count: 24 },
      { month: 'Aug', count: 33 }
    ]
  },
  patientRecords: [
    {
      id: 'patient-1',
      patientId: 'P10045',
      age: 45,
      gender: 'Male',
      bloodType: 'O+',
      condition: 'Hypertension',
      lastVisit: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Active',
      completeness: 95,
      flagged: false,
      consentVerified: true,
      consentTimestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      consentTxHash: '0x8a7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34b23',
      provider: 'Dr. Emily Chen',
      providerId: 'provider-1'
    },
    {
      id: 'patient-2',
      patientId: 'P10046',
      age: 32,
      gender: 'Female',
      bloodType: 'A-',
      condition: 'Diabetes Type 2',
      lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Active',
      completeness: 85,
      flagged: true,
      flagReason: 'Missing family history',
      consentVerified: true,
      consentTimestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      consentTxHash: '0x3f7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34c78',
      provider: 'Dr. Robert Williams',
      providerId: 'provider-2'
    },
    {
      id: 'patient-3',
      patientId: 'P10047',
      age: 67,
      gender: 'Male',
      bloodType: 'B+',
      condition: 'Coronary Artery Disease',
      lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Critical',
      completeness: 100,
      flagged: false,
      consentVerified: true,
      consentTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      consentTxHash: '0x5e7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34d92',
      provider: 'Dr. Emily Chen',
      providerId: 'provider-1'
    },
    {
      id: 'patient-4',
      patientId: 'P10048',
      age: 28,
      gender: 'Female',
      bloodType: 'AB+',
      condition: 'Asthma',
      lastVisit: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Stable',
      completeness: 75,
      flagged: true,
      flagReason: 'Incomplete medication history',
      consentVerified: false,
      provider: 'Dr. Maria Garcia',
      providerId: 'provider-3'
    },
    {
      id: 'patient-5',
      patientId: 'P10049',
      age: 52,
      gender: 'Male',
      bloodType: 'A+',
      condition: 'Rheumatoid Arthritis',
      lastVisit: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Improving',
      completeness: 90,
      flagged: false,
      consentVerified: true,
      consentTimestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      consentTxHash: '0x9c7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34e56',
      provider: 'Dr. Robert Williams',
      providerId: 'provider-2'
    }
  ],
  
  recordModifications: [
    {
      id: 'mod-1',
      patientId: 'P10045',
      patientRecordId: 'patient-1',
      modifiedBy: 'Dr. Emily Chen',
      modifierId: 'provider-1',
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      field: 'condition',
      oldValue: 'Pre-hypertension',
      newValue: 'Hypertension',
      reason: 'Updated diagnosis after follow-up tests',
      ipAddress: '192.168.1.4',
      txHash: '0x1a7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34f78'
    },
    {
      id: 'mod-2',
      patientId: 'P10046',
      patientRecordId: 'patient-2',
      modifiedBy: 'Dr. Robert Williams',
      modifierId: 'provider-2',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      field: 'medication',
      oldValue: 'Metformin 500mg',
      newValue: 'Metformin 1000mg',
      reason: 'Increased dosage due to insufficient glucose control',
      ipAddress: '192.168.1.5',
      txHash: '0x2b7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34g89'
    },
    {
      id: 'mod-3',
      patientId: 'P10047',
      patientRecordId: 'patient-3',
      modifiedBy: 'Dr. Emily Chen',
      modifierId: 'provider-1',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      field: 'status',
      oldValue: 'Stable',
      newValue: 'Critical',
      reason: 'Patient admitted to ICU after cardiac event',
      ipAddress: '192.168.1.4',
      txHash: '0x3c7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34h12'
    },
    {
      id: 'mod-4',
      patientId: 'P10048',
      patientRecordId: 'patient-4',
      modifiedBy: 'Admin User',
      modifierId: 'user-1',
      timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      field: 'allergies',
      oldValue: 'None',
      newValue: 'Penicillin',
      reason: 'Updated based on patient report',
      ipAddress: '192.168.1.1',
      txHash: '0x4d7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34i34'
    },
    {
      id: 'mod-5',
      patientId: 'P10049',
      patientRecordId: 'patient-5',
      modifiedBy: 'Dr. Robert Williams',
      modifierId: 'provider-2',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      field: 'status',
      oldValue: 'Stable',
      newValue: 'Improving',
      reason: 'Positive response to new treatment regimen',
      ipAddress: '192.168.1.5',
      txHash: '0x5e7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34j56'
    }
  ],
  
  consentLogs: [
    {
      id: 'consent-1',
      patientId: 'P10045',
      patientRecordId: 'patient-1',
      timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Consent Given',
      details: 'Full access to medical records',
      verifiedBy: 'Blockchain',
      txHash: '0x8a7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34b23',
      blockNumber: 14567823,
      verified: true
    },
    {
      id: 'consent-2',
      patientId: 'P10046',
      patientRecordId: 'patient-2',
      timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Consent Given',
      details: 'Limited access - research only',
      verifiedBy: 'Blockchain',
      txHash: '0x3f7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34c78',
      blockNumber: 14568934,
      verified: true
    },
    {
      id: 'consent-3',
      patientId: 'P10047',
      patientRecordId: 'patient-3',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Consent Updated',
      details: 'Added access for specialist consultation',
      verifiedBy: 'Blockchain',
      txHash: '0x5e7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34d92',
      blockNumber: 14572045,
      verified: true
    },
    {
      id: 'consent-4',
      patientId: 'P10048',
      patientRecordId: 'patient-4',
      timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Consent Requested',
      details: 'Awaiting patient approval',
      verifiedBy: 'System',
      verified: false
    },
    {
      id: 'consent-5',
      patientId: 'P10049',
      patientRecordId: 'patient-5',
      timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Consent Given',
      details: 'Full access to medical records',
      verifiedBy: 'Blockchain',
      txHash: '0x9c7d953f45d5d88ad6f9c573dcfcf5c0390c9ff39c49029d182b5ba962f34e56',
      blockNumber: 14569278,
      verified: true
    }
  ],
  systemStatus: {
    database: {
      status: 'healthy',
      connections: 12,
      latency: '5ms'
    },
    ai: {
      status: 'healthy',
      models: ['risk-assessment', 'diagnosis-helper', 'treatment-recommender'],
      lastUpdated: new Date()
    },
    blockchain: {
      status: 'healthy',
      lastBlock: 12345678,
      syncStatus: '100%'
    },
    storage: {
      status: 'healthy',
      usedSpace: '45GB',
      totalSpace: '500GB'
    }
  },
  settings: {
    general: [
      {
        key: 'general.clinicName',
        value: 'ClinicTrust AI',
        category: 'general',
        description: 'Clinic name displayed in the platform',
        isActive: true,
        lastModifiedAt: new Date()
      },
      {
        key: 'general.supportEmail',
        value: 'support@clinictrustai.com',
        category: 'general',
        description: 'Support email address',
        isActive: true,
        lastModifiedAt: new Date()
      }
    ],
    security: [
      {
        key: 'security.passwordPolicy.minLength',
        value: 8,
        category: 'security',
        description: 'Minimum password length',
        isActive: true,
        lastModifiedAt: new Date()
      },
      {
        key: 'security.passwordPolicy.requireSpecialChars',
        value: true,
        category: 'security',
        description: 'Require special characters in passwords',
        isActive: true,
        lastModifiedAt: new Date()
      },
      {
        key: 'security.sessionTimeout',
        value: 30,
        category: 'security',
        description: 'Session timeout in minutes',
        isActive: true,
        lastModifiedAt: new Date()
      }
    ],
    ai: [
      {
        key: 'ai.riskAssessment.threshold',
        value: 0.75,
        category: 'ai',
        description: 'Risk assessment threshold for alerts',
        isActive: true,
        lastModifiedAt: new Date()
      },
      {
        key: 'ai.diagnosisHelper.enabled',
        value: true,
        category: 'ai',
        description: 'Enable AI diagnosis helper',
        isActive: true,
        lastModifiedAt: new Date()
      },
      {
        key: 'ai.treatmentRecommender.enabled',
        value: true,
        category: 'ai',
        description: 'Enable AI treatment recommender',
        isActive: true,
        lastModifiedAt: new Date()
      }
    ],
    blockchain: [
      {
        key: 'blockchain.verificationRequired',
        value: true,
        category: 'blockchain',
        description: 'Require blockchain verification for critical operations',
        isActive: true,
        lastModifiedAt: new Date()
      },
      {
        key: 'blockchain.autoSync',
        value: true,
        category: 'blockchain',
        description: 'Automatically sync blockchain data',
        isActive: true,
        lastModifiedAt: new Date()
      }
    ],
    notifications: [
      {
        key: 'notifications.email.enabled',
        value: true,
        category: 'notifications',
        description: 'Enable email notifications',
        isActive: true,
        lastModifiedAt: new Date()
      },
      {
        key: 'notifications.sms.enabled',
        value: false,
        category: 'notifications',
        description: 'Enable SMS notifications',
        isActive: false,
        lastModifiedAt: new Date()
      }
    ]
  },
  users: [
    {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@clinictrustai.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user-2',
      name: 'Dr. John Smith',
      email: 'john.smith@clinictrustai.com',
      role: 'doctor',
      isActive: true,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user-3',
      name: 'Nurse Sarah Johnson',
      email: 'sarah.johnson@clinictrustai.com',
      role: 'nurse',
      isActive: true,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user-4',
      name: 'Mike Wilson',
      email: 'mike.wilson@clinictrustai.com',
      role: 'receptionist',
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user-5',
      name: 'Patient User',
      email: 'patient@example.com',
      role: 'patient',
      isActive: false,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  providers: [
    {
      id: 'provider-1',
      name: 'Dr. Emily Chen',
      email: 'emily.chen@provider.com',
      role: 'provider',
      organization: 'Chen Medical Group',
      specialty: 'Cardiology',
      isActive: true,
      status: 'approved',
      accountStatus: 'approved',
      onboardingStatus: 'verified',
      kycVerified: true,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      kycDocuments: {
        licenseNumber: 'MD12345678',
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        verifiedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'provider-2',
      name: 'Dr. Robert Williams',
      email: 'robert.williams@provider.com',
      role: 'provider',
      organization: 'Williams Clinic',
      specialty: 'Neurology',
      isActive: true,
      status: 'approved',
      accountStatus: 'approved',
      onboardingStatus: 'verified',
      kycVerified: true,
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      kycDocuments: {
        licenseNumber: 'MD87654321',
        licenseExpiry: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
        verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'provider-3',
      name: 'Dr. Maria Garcia',
      email: 'maria.garcia@provider.com',
      role: 'provider',
      organization: 'Garcia Health Partners',
      specialty: 'Pediatrics',
      isActive: false,
      status: 'suspended',
      accountStatus: 'suspended',
      onboardingStatus: 'under_review',
      kycVerified: true,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      suspensionReason: 'License verification issue',
      kycDocuments: {
        licenseNumber: 'MD55555555',
        licenseExpiry: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        verifiedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'provider-4',
      name: 'Dr. James Wilson',
      email: 'james.wilson@provider.com',
      role: 'provider',
      organization: 'Wilson Medical Associates',
      specialty: 'Orthopedics',
      isActive: true,
      status: 'pending',
      accountStatus: 'pending',
      onboardingStatus: 'pending_docs',
      kycVerified: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      kycDocuments: {
        licenseNumber: 'MD99999999',
        licenseExpiry: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'provider-5',
      name: 'Dr. Sarah Thompson',
      email: 'sarah.thompson@provider.com',
      role: 'provider',
      organization: 'Thompson Family Practice',
      specialty: 'Family Medicine',
      isActive: true,
      status: 'pending',
      accountStatus: 'pending',
      onboardingStatus: 'pending_email',
      kycVerified: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      kycDocuments: {
        licenseNumber: 'MD77777777',
        licenseExpiry: new Date(Date.now() + 450 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'provider-6',
      name: 'Dr. Michael Brown',
      email: 'michael.brown@provider.com',
      role: 'provider',
      organization: 'Brown Medical Center',
      specialty: 'Dermatology',
      isActive: true,
      status: 'rejected',
      accountStatus: 'rejected',
      onboardingStatus: 'rejected',
      kycVerified: false,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      rejectionReason: 'Incomplete documentation',
      kycDocuments: {
        licenseNumber: 'MD33333333',
        licenseExpiry: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  ],
  auditLogs: [
    {
      userId: 'user-1',
      userName: 'Admin User',
      userEmail: 'admin@clinictrustai.com',
      userRole: 'admin',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      successful: true
    },
    {
      userId: 'user-2',
      userName: 'Dr. John Smith',
      userEmail: 'john.smith@clinictrustai.com',
      userRole: 'doctor',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      successful: true
    },
    {
      userId: 'user-3',
      userName: 'Nurse Sarah Johnson',
      userEmail: 'sarah.johnson@clinictrustai.com',
      userRole: 'nurse',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.3',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)',
      successful: true
    },
    {
      userId: 'unknown',
      userName: 'Unknown',
      userEmail: 'hacker@example.com',
      userRole: 'unknown',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (Linux; Android 10)',
      successful: false
    },
    {
      userId: 'provider-1',
      userName: 'Dr. Emily Chen',
      userEmail: 'emily.chen@provider.com',
      userRole: 'provider',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.4',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      successful: true
    },
    {
      userId: 'provider-3',
      userName: 'Dr. Maria Garcia',
      userEmail: 'maria.garcia@provider.com',
      userRole: 'provider',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.6',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1)',
      successful: false
    }
  ],
};

// Token dashboard mock data
export const tokenMockData = {
  balance: 175,
  lifetimeEarned: 250,
  lifetimeSpent: 75,
  walletAddress: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
  blockchainNetwork: 'Hyperledger Fabric - ClinicTrust Network'
};

// Token transactions mock data
export const tokenTransactionsMockData = [
  {
    id: 'tx-1',
    type: 'earned',
    amount: 15,
    description: 'Reward for Patient Risk Analysis',
    timestamp: new Date(2023, 6, 15).toISOString(),
    transactionId: 'tx_a1b2c3d4e5f6'
  },
  {
    id: 'tx-2',
    type: 'earned',
    amount: 20,
    description: 'Reward for Data Contribution',
    timestamp: new Date(2023, 5, 21).toISOString(),
    transactionId: 'tx_g7h8i9j0k1l2'
  },
  {
    id: 'tx-3',
    type: 'spent',
    amount: 25,
    description: 'Redeemed for Premium Analytics Report',
    timestamp: new Date(2023, 5, 10).toISOString(),
    transactionId: 'tx_m3n4o5p6q7r8'
  },
  {
    id: 'tx-4',
    type: 'transfer',
    amount: 10,
    description: 'Transferred to Dr. Robert Chen',
    recipient: 'Dr. Robert Chen',
    timestamp: new Date(2023, 4, 25).toISOString(),
    transactionId: 'tx_s9t8u7v6w5x4y3z2'
  },
  {
    id: 'tx-5',
    type: 'earned',
    amount: 15,
    description: 'Reward for Patient Outcomes Analysis',
    timestamp: new Date(2023, 4, 11).toISOString(),
    transactionId: 'tx_a2b3c4d5e6f7g8h9'
  }
];

// Token services mock data
export const tokenServicesMockData = [
  {
    id: 'svc-1',
    name: 'Premium Analytics Report',
    description: 'Access to advanced analytics reports with detailed insights and recommendations',
    tokenCost: 25,
    category: 'analytics',
    available: true,
    benefits: [
      'Detailed patient risk stratification',
      'Operational efficiency insights',
      'Custom report generation'
    ]
  },
  {
    id: 'svc-2',
    name: 'Priority Referral Processing',
    description: 'Expedited processing of patient referrals',
    tokenCost: 15,
    category: 'referrals',
    available: true,
    benefits: [
      'Faster referral completion',
      'Automated documentation',
      'Priority queue placement'
    ]
  },
  {
    id: 'svc-3',
    name: 'Extended Data Storage',
    description: 'Additional secure storage for patient records and analytics data',
    tokenCost: 30,
    category: 'storage',
    available: true,
    benefits: [
      'Increased storage capacity',
      'Enhanced backup frequency',
      'Extended retention period'
    ]
  },
  {
    id: 'svc-4',
    name: 'AI Consultation Assistant',
    description: 'AI-powered assistant for patient consultations with real-time insights',
    tokenCost: 50,
    category: 'ai',
    available: true,
    benefits: [
      'Real-time clinical decision support',
      'Automated documentation',
      'Treatment recommendation engine'
    ]
  }
];

// Token earn sources mock data
export const tokenEarnSourcesMockData = [
  {
    id: 'earn-analytics-risk',
    name: 'Risk Analysis Report',
    description: 'Create and share a patient risk analysis report',
    type: 'analytics',
    tokenAmount: 15,
    frequency: 'per report',
    requirements: 'Report must include at least 10 patients and have a confidence score of 80% or higher'
  },
  {
    id: 'earn-data-contribution',
    name: 'Data Contribution',
    description: 'Contribute anonymized patient data to the network',
    type: 'data',
    tokenAmount: 20,
    frequency: 'per 100 records',
    requirements: 'Data must be properly anonymized and include complete medical history'
  },
  {
    id: 'earn-referral-completion',
    name: 'Referral Completion',
    description: 'Successfully complete a patient referral workflow',
    type: 'referral',
    tokenAmount: 10,
    frequency: 'per referral',
    requirements: 'Referral must be completed within 48 hours with all required documentation'
  },
  {
    id: 'earn-clinical-outcome',
    name: 'Clinical Outcome Reporting',
    description: 'Report clinical outcomes for treated patients',
    type: 'clinical',
    tokenAmount: 25,
    frequency: 'per 20 outcomes',
    requirements: 'Outcomes must include treatment efficacy data and follow-up information'
  }
];

// Dashboard mock data
export const dashboardMockData = {
  patients: {
    total: 248,
    highRisk: 37
  },
  referrals: {
    pending: 14,
    completed: 86
  },
  analytics: {
    recent: [
      {
        id: 'ar-001',
        name: 'Q2 Patient Outcome Analysis',
        type: 'Outcome Analysis',
        status: 'completed',
        createdAt: new Date(2023, 6, 28).toISOString(),
        updatedAt: new Date(2023, 6, 30).toISOString(),
        author: 'Dr. Sarah Johnson',
        insights: 5,
        recommendations: 3
      },
      {
        id: 'ar-002',
        name: 'Diabetes Risk Stratification',
        type: 'Risk Analysis',
        status: 'completed',
        createdAt: new Date(2023, 6, 25).toISOString(),
        updatedAt: new Date(2023, 6, 26).toISOString(),
        author: 'Dr. Michael Chen',
        insights: 7,
        recommendations: 4
      },
      {
        id: 'ar-003',
        name: 'Cardiology Department Efficiency',
        type: 'Operational Analysis',
        status: 'in-progress',
        createdAt: new Date(2023, 7, 1).toISOString(),
        updatedAt: new Date(2023, 7, 1).toISOString(),
        author: 'Dr. Robert Williams',
        insights: 0,
        recommendations: 0
      }
    ]
  },
  recentActivity: [
    {
      id: 'act-001',
      type: 'referral',
      title: 'Referral completed',
      description: 'Cardiology referral for James Wilson',
      timestamp: new Date(2023, 7, 3, 14, 25).toISOString()
    },
    {
      id: 'act-002',
      type: 'analytics',
      title: 'Analytics report completed',
      description: 'Q2 Patient Outcome Analysis',
      timestamp: new Date(2023, 6, 30, 16, 45).toISOString()
    },
    {
      id: 'act-003',
      type: 'patient',
      title: 'Patient added',
      description: 'New patient: Emily Rodriguez',
      timestamp: new Date(2023, 6, 29, 11, 15).toISOString()
    },
    {
      id: 'act-004',
      type: 'referral',
      title: 'Referral created',
      description: 'Neurology referral for Thomas Brown',
      timestamp: new Date(2023, 6, 28, 9, 30).toISOString()
    },
    {
      id: 'act-005',
      type: 'token',
      title: 'Tokens earned',
      description: 'Earned 25 tokens for Risk Analysis Report',
      timestamp: new Date(2023, 6, 27, 15, 10).toISOString()
    }
  ]
};

// Blockchain transaction history mock data
export const blockchainTransactionsMockData = [
  {
    hash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
    blockNumber: 12345678,
    from: "0xA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
    to: "0xB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1",
    timestamp: new Date(2023, 7, 15, 10, 30).toISOString(),
    status: "Confirmed",
    event: "ReferralCreated"
  },
  {
    hash: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u",
    blockNumber: 12345679,
    from: "0xB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1",
    to: "0xC3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2",
    timestamp: new Date(2023, 7, 15, 11, 45).toISOString(),
    status: "Confirmed",
    event: "TokenTransfer"
  },
  {
    hash: "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v",
    blockNumber: 12345680,
    from: "0xD4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3",
    to: "0xE5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4",
    timestamp: new Date(2023, 7, 15, 14, 20).toISOString(),
    status: "Confirmed",
    event: "ReferralAccepted"
  },
  {
    hash: "0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w",
    blockNumber: 12345681,
    from: "0xF6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5",
    to: "0xG7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6",
    timestamp: new Date(2023, 7, 16, 9, 15).toISOString(),
    status: "Confirmed",
    event: "TokenReward"
  },
  {
    hash: "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x",
    blockNumber: 12345682,
    from: "0xH8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6G7",
    to: "0xI9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6G7H8",
    timestamp: new Date(2023, 7, 16, 10, 30).toISOString(),
    status: "Pending",
    event: "ReferralCreated"
  }
];

// Blockchain transaction details mock data
export const blockchainTransactionDetailsMockData = {
  "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t": {
    hash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
    blockNumber: 12345678,
    from: "0xA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
    to: "0xB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1",
    timestamp: new Date(2023, 7, 15, 10, 30).toISOString(),
    status: "Confirmed",
    event: "ReferralCreated",
    confirmations: 152,
    gasUsed: "21000",
    gasPrice: "20 Gwei",
    value: "0 ETH",
    logs: [
      {
        address: "0xCONTRACT1234567890ABCDEF1234567890ABCDEF",
        topics: [
          "0xDDF252AD1BE2C89B69C2B068FC378DAA952BA7F163C4A11628F55A4DF523B3EF",
          "0x000000000000000000000000A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
          "0x000000000000000000000000B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000000001"
      }
    ],
    decodedData: {
      referralId: "REF-12345",
      patientId: "PT-67890",
      referringProviderId: "PROV-54321",
      specialistId: "SPEC-98765",
      specialty: "Cardiology",
      reason: "Abnormal ECG findings",
      priority: "high",
      timestamp: new Date(2023, 7, 15, 10, 30).toISOString()
    }
  },
  "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u": {
    hash: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u",
    blockNumber: 12345679,
    from: "0xB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1",
    to: "0xC3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2",
    timestamp: new Date(2023, 7, 15, 11, 45).toISOString(),
    status: "Confirmed",
    event: "TokenTransfer",
    confirmations: 143,
    gasUsed: "35000",
    gasPrice: "22 Gwei",
    value: "0 ETH",
    logs: [
      {
        address: "0xTOKENCONTRACT1234567890ABCDEF1234567890",
        topics: [
          "0xDDF252AD1BE2C89B69C2B068FC378DAA952BA7F163C4A11628F55A4DF523B3EF",
          "0x000000000000000000000000B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1",
          "0x000000000000000000000000C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2"
        ],
        data: "0x000000000000000000000000000000000000000000000000000000000000000A" // 10 tokens
      }
    ],
    decodedData: {
      from: "Dr. John Smith",
      to: "Dr. Sarah Johnson",
      amount: 10,
      reason: "Consultation fee",
      timestamp: new Date(2023, 7, 15, 11, 45).toISOString()
    }
  },
  "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v": {
    hash: "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v",
    blockNumber: 12345680,
    from: "0xD4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3",
    to: "0xE5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4",
    timestamp: new Date(2023, 7, 15, 14, 20).toISOString(),
    status: "Confirmed",
    event: "ReferralAccepted",
    confirmations: 132,
    gasUsed: "42000",
    gasPrice: "18 Gwei",
    value: "0 ETH",
    logs: [
      {
        address: "0xCONTRACT1234567890ABCDEF1234567890ABCDEF",
        topics: [
          "0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890",
          "0x000000000000000000000000D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3",
          "0x000000000000000000000000E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000003039"
      }
    ],
    decodedData: {
      referralId: "REF-12345",
      acceptedBy: "Dr. Michael Chen",
      acceptedDate: new Date(2023, 7, 15, 14, 20).toISOString(),
      notes: "Will schedule appointment within 48 hours"
    }
  },
  "0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w": {
    hash: "0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w",
    blockNumber: 12345681,
    from: "0xF6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5",
    to: "0xG7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6",
    timestamp: new Date(2023, 7, 16, 9, 15).toISOString(),
    status: "Confirmed",
    event: "TokenReward",
    confirmations: 98,
    gasUsed: "38000",
    gasPrice: "25 Gwei",
    value: "0 ETH",
    logs: [
      {
        address: "0xTOKENCONTRACT1234567890ABCDEF1234567890",
        topics: [
          "0xFFFFFFAD1BE2C89B69C2B068FC378DAA952BA7F163C4A11628F55A4DF523B3EF",
          "0x000000000000000000000000F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5",
          "0x000000000000000000000000G7H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000000019" // 25 tokens
      }
    ],
    decodedData: {
      recipient: "Dr. Robert Williams",
      amount: 25,
      reason: "Risk Analysis Report",
      timestamp: new Date(2023, 7, 16, 9, 15).toISOString()
    }
  },
  "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x": {
    hash: "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x",
    blockNumber: 12345682,
    from: "0xH8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6G7",
    to: "0xI9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6G7H8",
    timestamp: new Date(2023, 7, 16, 10, 30).toISOString(),
    status: "Pending",
    event: "ReferralCreated",
    confirmations: 2,
    gasUsed: "21000",
    gasPrice: "20 Gwei",
    value: "0 ETH",
    logs: [
      {
        address: "0xCONTRACT1234567890ABCDEF1234567890ABCDEF",
        topics: [
          "0xDDF252AD1BE2C89B69C2B068FC378DAA952BA7F163C4A11628F55A4DF523B3EF",
          "0x000000000000000000000000H8I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6G7",
          "0x000000000000000000000000I9J0K1L2M3N4O5P6Q7R8S9T0A1B2C3D4E5F6G7H8"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000000001"
      }
    ],
    decodedData: {
      referralId: "REF-67890",
      patientId: "PT-12345",
      referringProviderId: "PROV-98765",
      specialistId: "SPEC-54321",
      specialty: "Neurology",
      reason: "Recurring headaches and dizziness",
      priority: "medium",
      timestamp: new Date(2023, 7, 16, 10, 30).toISOString()
    }
  }
};

// ============================================================================
// ADMIN MESSAGING AND ALERTS MOCK DATA
// ============================================================================

// Mock broadcast messages
export const mockBroadcastMessages = [
  {
    id: 'broadcast-1',
    title: 'System Maintenance Notification',
    content: 'The system will be undergoing scheduled maintenance on August 15th from 2:00 AM to 4:00 AM EST. During this time, the platform may experience brief periods of unavailability.',
    sender: 'System Administrator',
    sentAt: new Date(2025, 7, 10, 9, 0).toISOString(),
    status: 'sent',
    priority: 'medium',
    recipientCount: 156,
    readCount: 89,
    category: 'maintenance'
  },
  {
    id: 'broadcast-2',
    title: 'New Feature Release: Enhanced Analytics Dashboard',
    content: 'We are excited to announce the release of our enhanced analytics dashboard. The new features include customizable charts, improved filtering options, and the ability to export data in multiple formats.',
    sender: 'Product Team',
    sentAt: new Date(2025, 7, 5, 11, 30).toISOString(),
    status: 'sent',
    priority: 'low',
    recipientCount: 156,
    readCount: 124,
    category: 'feature'
  },
  {
    id: 'broadcast-3',
    title: 'Important: Security Protocol Update',
    content: 'To enhance the security of our platform, we have updated our authentication protocols. All users are required to reset their passwords within the next 7 days. Please follow the instructions sent to your email.',
    sender: 'Security Team',
    sentAt: new Date(2025, 7, 1, 14, 15).toISOString(),
    status: 'sent',
    priority: 'high',
    recipientCount: 156,
    readCount: 142,
    category: 'security'
  },
  {
    id: 'broadcast-4',
    title: 'Upcoming Training Session: AI-Assisted Diagnosis',
    content: 'We will be hosting a training session on AI-Assisted Diagnosis on August 20th at 1:00 PM EST. This session will cover how to effectively use our AI tools to improve diagnostic accuracy and efficiency.',
    sender: 'Training Coordinator',
    sentAt: new Date(2025, 7, 12, 10, 0).toISOString(),
    status: 'draft',
    priority: 'medium',
    recipientCount: 0,
    readCount: 0,
    category: 'training'
  }
];

// Mock targeted alerts
export const mockTargetedAlerts = [
  {
    id: 'alert-1',
    title: 'Referral Approved: Patient John Doe',
    content: 'Your referral for patient John Doe (ID: PT-12345) to Cardiology has been approved. The appointment has been scheduled for August 18th at 10:30 AM.',
    sender: 'Referral Management System',
    sentAt: new Date(2025, 7, 12, 15, 45).toISOString(),
    status: 'sent',
    priority: 'medium',
    recipients: [
      {
        id: 'user-1',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@clinictrust.ai',
        readAt: new Date(2025, 7, 12, 16, 30).toISOString()
      }
    ],
    category: 'referral',
    relatedEntityId: 'REF-67890',
    relatedEntityType: 'referral'
  },
  {
    id: 'alert-2',
    title: 'Policy Update: New Referral Guidelines',
    content: 'The referral guidelines for Neurology have been updated. Please review the new guidelines before submitting new referrals. The changes include updated documentation requirements and preferred communication channels.',
    sender: 'Policy Management',
    sentAt: new Date(2025, 7, 8, 9, 0).toISOString(),
    status: 'sent',
    priority: 'high',
    recipients: [
      {
        id: 'user-1',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@clinictrust.ai',
        readAt: new Date(2025, 7, 8, 10, 15).toISOString()
      },
      {
        id: 'user-2',
        name: 'Dr. Michael Chen',
        email: 'michael.chen@clinictrust.ai',
        readAt: null
      },
      {
        id: 'user-3',
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@clinictrust.ai',
        readAt: new Date(2025, 7, 8, 14, 20).toISOString()
      }
    ],
    category: 'policy',
    relatedEntityId: 'POL-12345',
    relatedEntityType: 'policy'
  },
  {
    id: 'alert-3',
    title: 'Token Reward: Quality Reporting',
    content: 'You have been awarded 50 tokens for your consistent high-quality reporting and documentation. These tokens have been added to your account and can be used for various services within the platform.',
    sender: 'Token Management System',
    sentAt: new Date(2025, 7, 10, 11, 30).toISOString(),
    status: 'sent',
    priority: 'low',
    recipients: [
      {
        id: 'user-2',
        name: 'Dr. Michael Chen',
        email: 'michael.chen@clinictrust.ai',
        readAt: new Date(2025, 7, 10, 13, 45).toISOString()
      }
    ],
    category: 'token',
    relatedEntityId: 'TRX-54321',
    relatedEntityType: 'transaction'
  },
  {
    id: 'alert-4',
    title: 'Upcoming Maintenance: Provider Portal',
    content: 'The provider portal will be undergoing maintenance on August 16th from 1:00 AM to 3:00 AM EST. During this time, you may experience limited functionality. Please plan accordingly.',
    sender: 'System Administrator',
    sentAt: new Date(2025, 7, 14, 8, 0).toISOString(),
    status: 'draft',
    priority: 'medium',
    recipients: [
      {
        id: 'user-1',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@clinictrust.ai',
        readAt: null
      },
      {
        id: 'user-2',
        name: 'Dr. Michael Chen',
        email: 'michael.chen@clinictrust.ai',
        readAt: null
      },
      {
        id: 'user-3',
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@clinictrust.ai',
        readAt: null
      },
      {
        id: 'user-4',
        name: 'Dr. Robert Davis',
        email: 'robert.davis@clinictrust.ai',
        readAt: null
      }
    ],
    category: 'maintenance',
    relatedEntityId: null,
    relatedEntityType: null
  }
];

// Mock escalation workflows
export const mockEscalationWorkflows = [
  {
    id: 'escalation-1',
    title: 'High Readmission Risk - Patient Jane Smith',
    patientId: 'PT-54321',
    patientName: 'Jane Smith',
    aiRiskScore: 0.89,
    flaggedAt: new Date(2025, 7, 11, 14, 30).toISOString(),
    status: 'pending_review',
    priority: 'high',
    category: 'readmission',
    assignedTo: {
      id: 'user-1',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@clinictrust.ai'
    },
    details: {
      riskFactors: [
        'Recent hospitalization within 30 days',
        'Multiple chronic conditions',
        'Medication adherence issues',
        'Limited social support'
      ],
      aiRecommendations: [
        'Schedule follow-up appointment within 7 days',
        'Arrange home care services',
        'Medication reconciliation',
        'Social worker consultation'
      ],
      notes: 'Patient has history of multiple readmissions. AI system flagged high probability of readmission based on recent lab results and medication changes.'
    },
    timeline: [
      {
        action: 'Flagged by AI',
        timestamp: new Date(2025, 7, 11, 14, 30).toISOString(),
        user: 'AI System'
      },
      {
        action: 'Assigned to Dr. Sarah Johnson',
        timestamp: new Date(2025, 7, 11, 14, 35).toISOString(),
        user: 'Workflow Manager'
      }
    ]
  },
  {
    id: 'escalation-2',
    title: 'Critical Lab Result - Patient Robert Brown',
    patientId: 'PT-67890',
    patientName: 'Robert Brown',
    aiRiskScore: 0.95,
    flaggedAt: new Date(2025, 7, 12, 9, 15).toISOString(),
    status: 'in_progress',
    priority: 'critical',
    category: 'lab_result',
    assignedTo: {
      id: 'user-2',
      name: 'Dr. Michael Chen',
      email: 'michael.chen@clinictrust.ai'
    },
    details: {
      riskFactors: [
        'Abnormal potassium levels',
        'Recent medication change',
        'History of cardiac issues'
      ],
      aiRecommendations: [
        'Immediate provider notification',
        'Repeat lab test',
        'Medication adjustment',
        'Possible hospital admission'
      ],
      notes: 'Critical lab value detected. Potassium level at 6.8 mEq/L. AI system flagged as requiring immediate attention.'
    },
    timeline: [
      {
        action: 'Flagged by AI',
        timestamp: new Date(2025, 7, 12, 9, 15).toISOString(),
        user: 'AI System'
      },
      {
        action: 'Assigned to Dr. Michael Chen',
        timestamp: new Date(2025, 7, 12, 9, 16).toISOString(),
        user: 'Workflow Manager'
      },
      {
        action: 'Reviewed by Dr. Michael Chen',
        timestamp: new Date(2025, 7, 12, 9, 45).toISOString(),
        user: 'Dr. Michael Chen'
      },
      {
        action: 'Patient contacted for immediate follow-up',
        timestamp: new Date(2025, 7, 12, 10, 0).toISOString(),
        user: 'Dr. Michael Chen'
      }
    ]
  },
  {
    id: 'escalation-3',
    title: 'Medication Interaction Alert - Patient Maria Garcia',
    patientId: 'PT-24680',
    patientName: 'Maria Garcia',
    aiRiskScore: 0.82,
    flaggedAt: new Date(2025, 7, 10, 16, 45).toISOString(),
    status: 'resolved',
    priority: 'medium',
    category: 'medication',
    assignedTo: {
      id: 'user-3',
      name: 'Dr. Emily Rodriguez',
      email: 'emily.rodriguez@clinictrust.ai'
    },
    details: {
      riskFactors: [
        'Potential drug-drug interaction',
        'Multiple prescribers',
        'Complex medication regimen'
      ],
      aiRecommendations: [
        'Medication reconciliation',
        'Consider alternative medication',
        'Patient education on medication safety'
      ],
      notes: 'AI system detected potential interaction between newly prescribed antibiotic and existing medication.'
    },
    timeline: [
      {
        action: 'Flagged by AI',
        timestamp: new Date(2025, 7, 10, 16, 45).toISOString(),
        user: 'AI System'
      },
      {
        action: 'Assigned to Dr. Emily Rodriguez',
        timestamp: new Date(2025, 7, 10, 16, 50).toISOString(),
        user: 'Workflow Manager'
      },
      {
        action: 'Reviewed by Dr. Emily Rodriguez',
        timestamp: new Date(2025, 7, 10, 17, 30).toISOString(),
        user: 'Dr. Emily Rodriguez'
      },
      {
        action: 'Medication changed to alternative',
        timestamp: new Date(2025, 7, 10, 17, 45).toISOString(),
        user: 'Dr. Emily Rodriguez'
      },
      {
        action: 'Patient notified of medication change',
        timestamp: new Date(2025, 7, 10, 18, 0).toISOString(),
        user: 'Dr. Emily Rodriguez'
      },
      {
        action: 'Case resolved',
        timestamp: new Date(2025, 7, 10, 18, 5).toISOString(),
        user: 'Dr. Emily Rodriguez'
      }
    ],
    resolution: {
      action: 'Medication changed',
      notes: 'Prescribed alternative antibiotic with no interaction risk. Patient educated on medication safety.',
      timestamp: new Date(2025, 7, 10, 18, 5).toISOString(),
      resolvedBy: {
        id: 'user-3',
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@clinictrust.ai'
      }
    }
  },
  {
    id: 'escalation-4',
    title: 'Missed Appointment Pattern - Patient William Johnson',
    patientId: 'PT-13579',
    patientName: 'William Johnson',
    aiRiskScore: 0.76,
    flaggedAt: new Date(2025, 7, 9, 10, 0).toISOString(),
    status: 'pending_review',
    priority: 'low',
    category: 'appointment',
    assignedTo: null,
    details: {
      riskFactors: [
        'Multiple missed appointments',
        'Chronic condition requiring regular monitoring',
        'Transportation barriers identified in previous visits'
      ],
      aiRecommendations: [
        'Outreach to patient',
        'Assess barriers to care',
        'Consider telehealth options',
        'Social services referral for transportation assistance'
      ],
      notes: 'Patient has missed 3 consecutive appointments. AI system identified pattern and potential risk to care continuity.'
    },
    timeline: [
      {
        action: 'Flagged by AI',
        timestamp: new Date(2025, 7, 9, 10, 0).toISOString(),
        user: 'AI System'
      }
    ]
  }
];

// Mock natural language summaries
export const mockNaturalLanguageSummaries = {
  month: "This month, your clinic has shown a 12% increase in patient visits compared to last month, with notable growth in cardiology (↑18%) and pediatrics (↑15%). Patient satisfaction scores have improved to 4.7/5 (↑0.3), with particularly positive feedback about reduced wait times. The AI risk assessment system has identified 5 patients at high risk for readmission, all of whom have been flagged for follow-up. Referral efficiency has improved with 87% of referrals processed within 24 hours (↑7%). Token utilization is up 23%, primarily for premium analytics reports and priority referrals. Areas for potential improvement include geriatric care scheduling efficiency (↓5%) and slight decrease in new patient acquisition (↓3%) compared to the previous month.",
  
  week: "This week, your clinic processed 127 patient visits, a 5% increase from last week. Waiting times averaged 12 minutes, down 18% from the previous week. The AI system flagged 3 high-priority cases requiring immediate attention, all of which were addressed within 4 hours. Referral completion rate was 92%, with an average processing time of 18 hours. The most common diagnoses were respiratory infections (23%), followed by routine check-ups (18%). Staff efficiency metrics show improved performance in appointment scheduling (↑8%) but slight delays in lab result processing (↓4%). Token rewards distributed this week totaled 245, a 15% increase from the weekly average.",
  
  quarter: "In Q2 2023, your clinic has demonstrated significant operational improvements across multiple metrics. Patient volume increased by 15% quarter-over-quarter, while maintaining high quality of care with a 96% positive outcome rate. The AI-powered risk assessment system has successfully predicted 87% of readmission cases, allowing for proactive intervention that reduced actual readmissions by 23%. Referral management efficiency improved with 94% of referrals processed within the target timeframe, up from 82% in Q1. Token economy participation increased by 32%, with 78% of patients now actively engaged. Cost per patient decreased by 7% while treatment effectiveness metrics improved by 9%. Areas for focus in Q3 include improving the no-show rate (currently 8%, target is 5%) and increasing utilization of preventive care services, which remains 12% below target despite a 5% improvement from Q1."
};

// Mock patient risk analytics
export const mockPatientRiskAnalytics = {
  summary: {
    totalPatients: 1250,
    highRiskCount: 187,
    mediumRiskCount: 432,
    lowRiskCount: 631,
    averageRiskScore: 0.38
  },
  distribution: {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    data: [631, 432, 187],
    colors: ['#4caf50', '#ff9800', '#f44336']
  },
  trends: {
    // Labels will be generated by generateTrendLabels function
    datasets: [
      {
        label: 'High Risk',
        // Data will be generated by generateRandomTrendData function
        color: '#f44336'
      },
      {
        label: 'Medium Risk',
        // Data will be generated by generateRandomTrendData function
        color: '#ff9800'
      },
      {
        label: 'Low Risk',
        // Data will be generated by generateRandomTrendData function
        color: '#4caf50'
      }
    ]
  },
  topRiskFactors: [
    { name: 'Age > 65', count: 342, percentage: 27.4 },
    { name: 'Hypertension', count: 287, percentage: 23.0 },
    { name: 'Diabetes', count: 215, percentage: 17.2 },
    { name: 'Smoking', count: 198, percentage: 15.8 },
    { name: 'Obesity', count: 176, percentage: 14.1 }
  ],
  departmentBreakdown: [
    { name: 'Cardiology', highRisk: 78, mediumRisk: 145, lowRisk: 102 },
    { name: 'Neurology', highRisk: 45, mediumRisk: 87, lowRisk: 134 },
    { name: 'Oncology', highRisk: 64, mediumRisk: 92, lowRisk: 75 },
    { name: 'General Practice', highRisk: 0, mediumRisk: 108, lowRisk: 320 }
  ]
};

// Mock referral analytics
export const mockReferralAnalytics = {
  summary: {
    totalReferrals: 845,
    completedCount: 512,
    pendingCount: 187,
    rejectedCount: 98,
    cancelledCount: 48,
    averageCompletionTime: 3.2 // days
  },
  statusDistribution: {
    labels: ['Completed', 'Pending', 'Rejected', 'Cancelled'],
    data: [512, 187, 98, 48],
    colors: ['#4caf50', '#2196f3', '#f44336', '#9e9e9e']
  },
  trends: {
    // Labels will be generated by generateTrendLabels function
    datasets: [
      {
        label: 'Referrals',
        // Data will be generated by generateRandomTrendData function
        color: '#3f51b5'
      }
    ]
  },
  specialtyBreakdown: [
    { name: 'Cardiology', count: 187, percentage: 22.1 },
    { name: 'Neurology', count: 156, percentage: 18.5 },
    { name: 'Orthopedics', count: 142, percentage: 16.8 },
    { name: 'Oncology', count: 124, percentage: 14.7 },
    { name: 'Dermatology', count: 98, percentage: 11.6 },
    { name: 'Other', count: 138, percentage: 16.3 }
  ],
  priorityDistribution: {
    labels: ['Normal', 'Urgent', 'Emergency'],
    data: [624, 176, 45],
    colors: ['#2196f3', '#ff9800', '#f44336']
  },
  completionTimeBySpecialty: [
    { name: 'Cardiology', averageTime: 2.8 },
    { name: 'Neurology', averageTime: 3.5 },
    { name: 'Orthopedics', averageTime: 2.5 },
    { name: 'Oncology', averageTime: 1.9 },
    { name: 'Dermatology', averageTime: 4.2 }
  ]
};

// Mock token analytics
export const mockTokenAnalytics = {
  summary: {
    totalTokens: 125000,
    tokensEarned: 45000,
    tokensSpent: 32000,
    activeUsers: 875,
    averageUserBalance: 142.9
  },
  trends: {
    // Labels will be generated by generateTrendLabels function
    datasets: [
      {
        label: 'Tokens Earned',
        // Data will be generated by generateRandomTrendData function
        color: '#4caf50'
      },
      {
        label: 'Tokens Spent',
        // Data will be generated by generateRandomTrendData function
        color: '#f44336'
      }
    ]
  },
  transactionTypeDistribution: {
    labels: ['Reward', 'Transfer', 'Redemption', 'System'],
    data: [45000, 28000, 32000, 20000],
    colors: ['#4caf50', '#2196f3', '#f44336', '#9e9e9e']
  },
  serviceRedemptionBreakdown: [
    { name: 'Premium Analytics Report', count: 187, percentage: 28.3 },
    { name: 'Priority Referral Processing', count: 156, percentage: 23.6 },
    { name: 'Extended Data Storage', count: 142, percentage: 21.5 },
    { name: 'AI Consultation Assistant', count: 98, percentage: 14.8 },
    { name: 'Network Membership Upgrade', count: 45, percentage: 6.8 },
    { name: 'Blockchain Certification', count: 33, percentage: 5.0 }
  ],
  userBalanceDistribution: {
    labels: ['0-50', '51-100', '101-200', '201-500', '500+'],
    data: [124, 256, 312, 145, 38],
    colors: ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3']
  }
};

// Mock predictive alerts
export const mockPredictiveAlerts = [
  {
    id: 'pa-1',
    type: 'readmission',
    title: '5 patients flagged as high risk for readmission',
    description: 'AI analysis indicates these patients may require additional follow-up based on their recent discharge data and medical history.',
    severity: 'High',
    timeframe: 'This Week',
    patients: [
      { id: 'p-123', name: 'John Smith', risk: 0.87, lastVisit: '2023-07-28' },
      { id: 'p-456', name: 'Mary Johnson', risk: 0.82, lastVisit: '2023-07-25' },
      { id: 'p-789', name: 'Robert Davis', risk: 0.79, lastVisit: '2023-07-27' },
      { id: 'p-101', name: 'Patricia Wilson', risk: 0.76, lastVisit: '2023-07-26' },
      { id: 'p-112', name: 'Michael Brown', risk: 0.75, lastVisit: '2023-07-29' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pa-2',
    type: 'trend',
    title: 'Increasing trend in respiratory conditions',
    description: 'There has been a 23% increase in respiratory-related visits over the past two weeks compared to the monthly average.',
    severity: 'Medium',
    timeframe: 'Past 2 Weeks',
    data: {
      current: 123,
      previous: 100,
      percentageChange: 23
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'pa-3',
    type: 'schedule',
    title: '8 high-risk patients due for follow-up',
    description: 'These patients have missed their scheduled follow-up appointments and are flagged as high-risk based on their treatment plans.',
    severity: 'Medium',
    timeframe: 'Next Week',
    patients: [
      { id: 'p-213', name: 'Sarah Thompson', risk: 0.72, lastVisit: '2023-06-15' },
      { id: 'p-214', name: 'James Wilson', risk: 0.68, lastVisit: '2023-06-18' }
      // Additional patients would be listed here
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pa-4',
    type: 'readmission',
    title: '3 cardiac patients at risk of complications',
    description: 'Recent lab results indicate potential complications for these cardiac patients who were discharged in the last 30 days.',
    severity: 'High',
    timeframe: 'Immediate Attention',
    patients: [
      { id: 'p-315', name: 'William Harris', risk: 0.91, lastVisit: '2023-07-10' },
      { id: 'p-316', name: 'Elizabeth Clark', risk: 0.88, lastVisit: '2023-07-12' },
      { id: 'p-317', name: 'Richard Martinez', risk: 0.85, lastVisit: '2023-07-15' }
    ],
    createdAt: new Date().toISOString()
  }
];

// Mock provider benchmarking data
export const mockProviderBenchmarkingData = [
  {
    id: 'metric-1',
    name: 'Patient Satisfaction',
    description: 'Average patient satisfaction score (1-5 scale)',
    clinicValue: 4.7,
    networkAverage: 4.2,
    maxValue: 5,
    comparisonPercentage: 12,
    unit: '',
    trend: 'increasing'
  },
  {
    id: 'metric-2',
    name: 'Wait Time',
    description: 'Average patient wait time in minutes',
    clinicValue: 12,
    networkAverage: 18,
    maxValue: 30,
    comparisonPercentage: 33,
    unit: ' min',
    trend: 'decreasing'
  },
  {
    id: 'metric-3',
    name: 'Readmission Rate',
    description: 'Percentage of patients readmitted within 30 days',
    clinicValue: 4.2,
    networkAverage: 6.8,
    maxValue: 15,
    comparisonPercentage: 38,
    unit: '%',
    trend: 'decreasing'
  },
  {
    id: 'metric-4',
    name: 'Referral Completion',
    description: 'Percentage of referrals completed within target timeframe',
    clinicValue: 87,
    networkAverage: 72,
    maxValue: 100,
    comparisonPercentage: 21,
    unit: '%',
    trend: 'increasing'
  },
  {
    id: 'metric-5',
    name: 'Cost per Patient',
    description: 'Average cost per patient visit',
    clinicValue: 142,
    networkAverage: 165,
    maxValue: 250,
    comparisonPercentage: 14,
    unit: '$',
    trend: 'decreasing'
  },
  {
    id: 'metric-6',
    name: 'Preventive Care',
    description: 'Percentage of eligible patients receiving preventive care',
    clinicValue: 68,
    networkAverage: 72,
    maxValue: 100,
    comparisonPercentage: -6,
    unit: '%',
    trend: 'stable'
  }
];

// Mock token transactions
export const mockTokenTransactions = [
  {
    id: 'tx-1',
    type: 'earned',
    amount: 15,
    description: 'Reward for Patient Risk Analysis',
    timestamp: new Date(2023, 6, 15).toISOString(),
    transactionId: 'tx_a1b2c3d4e5f6'
  },
  {
    id: 'tx-2',
    type: 'earned',
    amount: 20,
    description: 'Reward for Data Contribution',
    timestamp: new Date(2023, 5, 21).toISOString(),
    transactionId: 'tx_g7h8i9j0k1l2'
  },
  {
    id: 'tx-3',
    type: 'spent',
    amount: 25,
    description: 'Redeemed for Premium Analytics Report',
    timestamp: new Date(2023, 5, 10).toISOString(),
    transactionId: 'tx_m3n4o5p6q7r8'
  },
  {
    id: 'tx-4',
    type: 'transfer',
    amount: 10,
    description: 'Transferred to Dr. Robert Chen',
    recipient: 'Dr. Robert Chen',
    timestamp: new Date(2023, 4, 25).toISOString(),
    transactionId: 'tx_s9t8u7v6w5x4y3z2'
  },
  {
    id: 'tx-5',
    type: 'earned',
    amount: 15,
    description: 'Reward for Patient Outcomes Analysis',
    timestamp: new Date(2023, 4, 11).toISOString(),
    transactionId: 'tx_a2b3c4d5e6f7g8h9'
  },
  {
    id: 'tx-6',
    type: 'earned',
    amount: 30,
    description: 'Reward for Operational Efficiency Analysis',
    timestamp: new Date(2023, 3, 28).toISOString(),
    transactionId: 'tx_b3c4d5e6f7g8h9i0'
  },
  {
    id: 'tx-7',
    type: 'spent',
    amount: 50,
    description: 'Redeemed for AI Consultation Assistant',
    timestamp: new Date(2023, 3, 15).toISOString(),
    transactionId: 'tx_c4d5e6f7g8h9i0j1'
  }
];

// Mock redemption services
export const mockRedemptionServices = [
  {
    id: 'analytics-premium',
    name: 'Premium Analytics Report',
    description: 'Access advanced analytics and insights for your practice.',
    category: 'Analytics',
    price: 200,
    icon: '/analytics-icon.svg',
    parameters: {
      reportType: ['patient-risk', 'referral-efficiency', 'treatment-outcomes'],
      dateRange: 'custom',
      format: ['pdf', 'interactive']
    }
  },
  {
    id: 'referral-priority',
    name: 'Priority Referral Processing',
    description: 'Expedite referral processing for urgent cases.',
    category: 'Referrals',
    price: 150,
    icon: '/referral-icon.svg',
    parameters: {
      duration: 30, // days
      referralCount: 10
    }
  },
  {
    id: 'storage-extended',
    name: 'Extended Data Storage',
    description: 'Increase your secure blockchain storage allocation.',
    category: 'Storage',
    price: 300,
    icon: '/storage-icon.svg',
    parameters: {
      storageSize: '10GB',
      duration: 365 // days
    }
  },
  {
    id: 'ai-consultation',
    name: 'AI Consultation Assistant',
    description: 'AI-powered consultation assistant for complex cases.',
    category: 'AI Tools',
    price: 250,
    icon: '/ai-icon.svg',
    parameters: {
      consultationCount: 5,
      specialties: ['cardiology', 'neurology', 'oncology']
    }
  },
  {
    id: 'membership-upgrade',
    name: 'Network Membership Upgrade',
    description: 'Upgrade to premium network membership with additional benefits.',
    category: 'Membership',
    price: 500,
    icon: '/membership-icon.svg',
    parameters: {
      level: 'premium',
      duration: 365 // days
    }
  },
  {
    id: 'blockchain-certification',
    name: 'Blockchain Certification',
    description: 'Certify your medical credentials on the blockchain.',
    category: 'Certification',
    price: 350,
    icon: '/certification-icon.svg',
    parameters: {
      certificationType: ['medical-license', 'specialty-board', 'continuing-education'],
      validityPeriod: 730 // days
    }
  }
];

// Mock token earn sources
export const mockTokenEarnSources = [
  {
    id: 'earn-analytics-risk',
    name: 'Risk Analysis Report',
    description: 'Create and share a patient risk analysis report',
    type: 'analytics',
    tokenAmount: 15,
    frequency: 'per report',
    requirements: 'Report must include at least 10 patients and have a confidence score of 80% or higher'
  },
  {
    id: 'earn-data-contribution',
    name: 'Data Contribution',
    description: 'Contribute anonymized patient data to the network',
    type: 'data',
    tokenAmount: 20,
    frequency: 'per 100 records',
    requirements: 'Data must be properly anonymized and include complete medical history'
  },
  {
    id: 'earn-referral-completion',
    name: 'Referral Completion',
    description: 'Successfully complete a patient referral workflow',
    type: 'referral',
    tokenAmount: 10,
    frequency: 'per referral',
    requirements: 'Referral must be completed within 48 hours with all required documentation'
  },
  {
    id: 'earn-clinical-outcome',
    name: 'Clinical Outcome Reporting',
    description: 'Report clinical outcomes for treated patients',
    type: 'clinical',
    tokenAmount: 25,
    frequency: 'per 20 outcomes',
    requirements: 'Outcomes must include treatment efficacy data and follow-up information'
  },
  {
    id: 'earn-education-module',
    name: 'Education Module Completion',
    description: 'Complete continuing education modules on the platform',
    type: 'education',
    tokenAmount: 15,
    frequency: 'per module',
    requirements: 'Must pass the module assessment with a score of 80% or higher'
  },
  {
    id: 'earn-operational-efficiency',
    name: 'Operational Efficiency Analysis',
    description: 'Create and share an operational efficiency analysis',
    type: 'analytics',
    tokenAmount: 30,
    frequency: 'per quarter',
    requirements: 'Analysis must include resource utilization metrics and improvement recommendations'
  }
];

/**
 * Generate a mock token transfer transaction
 * 
 * @param {Object} transferData - Transfer data
 * @param {Object} userData - User data
 * @returns {Object} Mock transaction
 */
export const generateMockTokenTransfer = (transferData, userData) => {
  return {
    id: Math.random().toString(36).substring(2, 15),
    type: 'transfer',
    amount: -transferData.amount,
    balance: userData ? userData.tokenBalance - transferData.amount : 1000 - transferData.amount,
    description: transferData.description || `Transfer to user ${transferData.recipientId}`,
    status: 'completed',
    timestamp: new Date().toISOString(),
    userId: userData?.id || '123456',
    toUserId: transferData.recipientId,
    blockchainId: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  };
};

/**
 * Generate a mock token redemption transaction
 * 
 * @param {Object} redemptionData - Redemption data
 * @param {Object} userData - User data
 * @returns {Object} Mock transaction
 */
export const generateMockTokenRedemption = (redemptionData, userData) => {
  return {
    id: Math.random().toString(36).substring(2, 15),
    type: 'redemption',
    amount: -redemptionData.amount,
    balance: userData ? userData.tokenBalance - redemptionData.amount : 1000 - redemptionData.amount,
    description: `Redemption for ${redemptionData.serviceName || 'service'}`,
    status: 'completed',
    timestamp: new Date().toISOString(),
    userId: userData?.id || '123456',
    service: redemptionData.serviceName,
    serviceId: redemptionData.serviceId,
    parameters: redemptionData.parameters,
    blockchainId: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  };
};

// The mockTokenEarnSources array is already defined above

// Export all mock data generators as named exports

// Add default export for backward compatibility
const mockData = {
  generateUsers,
  generatePatients,
  generateTokenTransactions,
  generateMockTokenTransfer,
  generateMockTokenRedemption,
  generateMedicalRecords,
  mockTokenEarnSources,
  mockRedemptionServices};

export default mockData;
