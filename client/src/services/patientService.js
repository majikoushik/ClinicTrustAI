import { get, post, put, del } from '../utils/apiUtils';

export const getPatients = async (options = {}) => {
  try {
    const params = {
      page: Math.max(0, (options.page ?? 1) - 1), // Redux is 1-indexed; server expects 0-indexed
      limit: options.limit ?? 10,
      search: options.search ?? '',
      sortBy: options.sortBy ?? 'name',
      sortOrder: options.sortOrder ?? 'asc',
    };
    if (options.riskLevel && options.riskLevel !== 'all') params.riskLevel = options.riskLevel;
    if (options.gender && options.gender !== 'all') params.gender = options.gender;
    return await get('/patients', params);
  } catch (error) {
    console.error('Get patients error:', error);
    throw error;
  }
};

export const getPatientById = async (patientId) => {
  try {
    return await get(`/patients/${patientId}`);
  } catch (error) {
    console.error('Get patient by ID error:', error);
    throw error;
  }
};

export const createPatient = async (patientData) => {
  try {
    return await post('/patients', patientData);
  } catch (error) {
    console.error('Create patient error:', error);
    throw error;
  }
};

export const updatePatient = async (patientId, patientData) => {
  try {
    return await put(`/patients/${patientId}`, patientData);
  } catch (error) {
    console.error('Update patient error:', error);
    throw error;
  }
};

export const deletePatient = async (patientId) => {
  try {
    return await del(`/patients/${patientId}`);
  } catch (error) {
    console.error('Delete patient error:', error);
    throw error;
  }
};

export const getPatientMedicalRecords = async (patientId, options = {}) => {
  try {
    return await get(`/patients/${patientId}/medical-records`, options);
  } catch (error) {
    console.error('Get patient medical records error:', error);
    throw error;
  }
};

export const getPatientConsentRecords = async (patientId, options = {}) => {
  try {
    return await get(`/patients/${patientId}/consent-records`, options);
  } catch (error) {
    console.error('Get patient consent records error:', error);
    throw error;
  }
};

export const createConsentRecord = async (patientId, consentData) => {
  try {
    return await post(`/patients/${patientId}/consent`, consentData);
  } catch (error) {
    console.error('Create consent record error:', error);
    throw error;
  }
};

export const exportPatientEHI = async (patientId) => {
  try {
    return await get(`/patients/${patientId}/export`);
  } catch (error) {
    console.error('EHI export error:', error);
    throw error;
  }
};

export const revokeConsentRecord = async (patientId, consentId) => {
  try {
    return await put(`/patients/${patientId}/consent-records/${consentId}/revoke`);
  } catch (error) {
    console.error('Revoke consent record error:', error);
    throw error;
  }
};

const patientService = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientMedicalRecords,
  getPatientConsentRecords,
  createConsentRecord,
  revokeConsentRecord,
  exportPatientEHI,
};

export default patientService;
