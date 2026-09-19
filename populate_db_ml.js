/**
 * populate_db_ml.js — Enterprise ML Training Data Seed
 * =====================================================
 * Run AFTER populate_db.js. Adds ML-ready training data without dropping
 * any existing collections.
 *
 * Scale:
 *   patients            +1,000  (4 risk tiers, full clinical profiles)
 *   referrals           +2,000  (6-month spread, all statuses)
 *   referraloutcomes    +2,000  (outcomeScore + wasActionTaken labels)
 *   predictivealerts   ~10,000  (4 types, wasActionTaken feedback)
 *   matchsessions         +800  (selectedProviderId for learning-to-rank)
 *   priorauthorizations   +100  (aiRecommendation vs human decision labels)
 *   analyticssnapshots     +48  (monthly global + provider-scoped)
 *
 * New clinical features per patient:
 *   labValues[]         — 11 tests: HbA1c, eGFR, BNP, creatinine, LDL,
 *                         troponin, haemoglobin, sodium, potassium, glucose, WBC
 *                         2-4 panels over 12 months with ~20% realistic missingness
 *   vitalSigns[]        — BP series, weight, BMI, O2 sat, HR, temp, RR
 *                         3-6 readings per patient (temporal signal)
 *   riskTrajectory[]    — 6 monthly snapshots showing score drift
 *   readmissionCount    — ED/hospital admissions in last 12 months
 *   edVisitCount        — ED-only visits
 *   charlsonScore       — Charlson Comorbidity Index
 *   icd10 codes         — Proper diagnostic coding on medicalHistory
 *
 * Usage:
 *   node populate_db.js        <- run first
 *   node populate_db_ml.js     <- then this
 *   OR: npm run populate_db_all
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinictrustai';

// ── Seeded deterministic LCG ──────────────────────────────────────────────────
const SEED = 42;
let _s = SEED;
function rng()            { _s = (_s * 1664525 + 1013904223) & 0xffffffff; return ((_s >>> 0) / 0xffffffff); }
function rngInt(lo, hi)   { return lo + Math.floor(rng() * (hi - lo + 1)); }
function rngFloat(lo, hi) { return lo + rng() * (hi - lo); }
function rngPick(arr)     { return arr[rngInt(0, arr.length - 1)]; }
function rngBool(p = 0.5) { return rng() < p; }
function rngNull(p, val)  { return rng() < p ? null : val; }

// ── Date helpers ──────────────────────────────────────────────────────────────
const now = new Date();
function daysAgo(n)   { return new Date(now - n * 864e5); }
function yearsAgo(n)  { const d = new Date(now); d.setFullYear(d.getFullYear() - n); return d; }
function monthsAgo(n) { const d = new Date(now); d.setMonth(d.getMonth() - n); return d; }

// ── Reference tables ──────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'James','Mary','Robert','Patricia','John','Linda','Michael','Barbara','William','Elizabeth',
  'David','Jennifer','Richard','Maria','Joseph','Susan','Thomas','Margaret','Charles','Dorothy',
  'Christopher','Lisa','Daniel','Nancy','Matthew','Karen','Anthony','Betty','Mark','Helen',
  'Donald','Sandra','Steven','Donna','Paul','Carol','Andrew','Ruth','Kenneth','Sharon',
  'Joshua','Michelle','Kevin','Laura','Brian','Sarah','George','Kimberly','Timothy','Deborah',
  'Ronald','Jessica','Edward','Shirley','Jason','Cynthia','Jeffrey','Angela','Ryan','Melissa',
  'Jacob','Brenda','Gary','Amy','Nicholas','Anna','Eric','Rebecca','Jonathan','Virginia',
  'Aisha','Carlos','Priya','Wei','Fatima','Ahmed','Svetlana','Kenji','Amara','Diego',
  'Lakshmi','Yusuf','Ingrid','Takeshi','Nadia','Kwame','Mei','Olga','Ibrahim','Chloe',
];
const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
  'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes',
  'Okafor','Nakamura','Sharma','Petrov','Hassan','Osei','Chen','Popov','Singh','Patel',
];

const INSURANCE_PROVIDERS = [
  'Blue Cross Blue Shield','Aetna Health','UnitedHealthcare','Cigna Health',
  'Humana','Medicare','Medicaid','HealthPlus Insurance','MediCare Plus',
  'Kaiser Permanente','Anthem BlueCross','Centene','Molina Healthcare',
  'Tricare','WellCare','Oscar Health','Bright Health',
];

const CITIES = [
  ['New York, NY','10001'],['Los Angeles, CA','90001'],['Chicago, IL','60601'],
  ['Houston, TX','77001'],['Phoenix, AZ','85001'],['Philadelphia, PA','19101'],
  ['San Antonio, TX','78201'],['San Diego, CA','92101'],['Dallas, TX','75201'],
  ['San Jose, CA','95101'],['Austin, TX','73301'],['Jacksonville, FL','32201'],
  ['Columbus, OH','43201'],['Charlotte, NC','28201'],['Indianapolis, IN','46201'],
  ['San Francisco, CA','94101'],['Seattle, WA','98101'],['Denver, CO','80201'],
  ['Nashville, TN','37201'],['Boston, MA','02101'],
];
const STREET_NAMES = ['Oak','Maple','Pine','Cedar','Elm','Birch','Walnut','Chestnut','Willow','Ash'];
const STREET_TYPES = ['St','Ave','Blvd','Dr','Ln','Way','Rd','Ct'];

// Conditions with ICD-10 codes and Charlson weights
const CONDITIONS = {
  CRITICAL: [
    { c:'Metastatic Colorectal Cancer',        icd:'C18.9', notes:'Stage IV with liver metastases. On FOLFOX chemotherapy.',          charlson:6 },
    { c:'End-Stage Kidney Disease (ESRD)',      icd:'N18.6', notes:'Hemodialysis 3x/week. Evaluated for transplant.',                 charlson:2 },
    { c:'Advanced Heart Failure (EF <30%)',     icd:'I50.9', notes:'EF 22%. ICD implanted. NYHA Class III-IV.',                      charlson:1 },
    { c:'Metastatic Breast Cancer',             icd:'C50.9', notes:'Stage IV. On palbociclib + letrozole.',                          charlson:6 },
    { c:'Stage IV Non-Small Cell Lung Cancer',  icd:'C34.9', notes:'On pembrolizumab. Quarterly CT surveillance.',                   charlson:6 },
    { c:'Hepatocellular Carcinoma',             icd:'C22.0', notes:'BCLC Stage B. On sorafenib.',                                    charlson:6 },
    { c:'Gram-negative Sepsis (resolved)',      icd:'A41.5', notes:'Hospital admission 2 months ago. Recovered with IV antibiotics.', charlson:0 },
    { c:'ALS (Amyotrophic Lateral Sclerosis)',  icd:'G12.21',notes:'Riluzole therapy. Progressive functional decline.',              charlson:0 },
  ],
  HIGH: [
    { c:'Congestive Heart Failure',            icd:'I50.9', notes:'EF 40%. On ACE inhibitor, beta blocker, diuretic.',              charlson:1 },
    { c:'COPD — GOLD Stage III',               icd:'J44.1', notes:'FEV1 38% predicted. Triple inhaler therapy.',                    charlson:1 },
    { c:'Chronic Kidney Disease Stage 3',      icd:'N18.3', notes:'eGFR 38 mL/min. Nephrology referral placed.',                   charlson:2 },
    { c:'Ischemic Stroke (prior)',              icd:'I63.9', notes:'Left MCA territory. Residual right arm weakness.',              charlson:1 },
    { c:'Dementia — Alzheimer\'s Type',        icd:'G30.9', notes:'MoCA 18/30. Family caregiver involved.',                         charlson:1 },
    { c:'Liver Cirrhosis — Child-Pugh A',      icd:'K74.6', notes:'Secondary to NAFLD. Liver ultrasound q6 months.',               charlson:1 },
    { c:'Colorectal Cancer Stage II',          icd:'C18.9', notes:'Post-resection. Surveillance colonoscopy due.',                 charlson:2 },
    { c:'Peripheral Artery Disease',           icd:'I73.9', notes:'ABI 0.72. Supervised exercise programme.',                       charlson:1 },
    { c:'Pulmonary Hypertension',              icd:'I27.0', notes:'mPAP 42 mmHg. On sildenafil.',                                  charlson:0 },
    { c:'Chronic Heart Failure (CHF)',         icd:'I50.9', notes:'BNP 680 pg/mL. Weekly weight monitoring.',                       charlson:1 },
  ],
  MEDIUM: [
    { c:'Type 2 Diabetes Mellitus',            icd:'E11.9', notes:'HbA1c 7.8%. On metformin and glipizide.',                        charlson:1 },
    { c:'Hypertension Stage 2',                icd:'I10',   notes:'BP 158/96. On two antihypertensives.',                           charlson:0 },
    { c:'Coronary Artery Disease',             icd:'I25.1', notes:'Single vessel disease. On aspirin and statin.',                  charlson:1 },
    { c:'Atrial Fibrillation',                 icd:'I48.0', notes:'Paroxysmal. CHA2DS2-VASc 3. On anticoagulation.',               charlson:0 },
    { c:'Obstructive Sleep Apnea',             icd:'G47.33',notes:'Moderate-severe OSA. CPAP compliance 85%.',                     charlson:0 },
    { c:'Asthma — Moderate Persistent',        icd:'J45.4', notes:'ICS/LABA controller. 2 exacerbations last year.',               charlson:0 },
    { c:'Obesity (BMI 38)',                    icd:'E66.9', notes:'Weight management counselled. Dietician referral.',              charlson:0 },
    { c:'Hyperlipidemia',                      icd:'E78.5', notes:'LDL 145 mg/dL on statin. Target <70 mg/dL.',                    charlson:0 },
    { c:'Type 2 Diabetes with CKD',            icd:'E11.65',notes:'HbA1c 8.4%. eGFR 52. On empagliflozin.',                        charlson:2 },
    { c:'Non-alcoholic Fatty Liver Disease',   icd:'K76.0', notes:'Fibroscan F2. Weight management and monitoring.',               charlson:0 },
  ],
  LOW: [
    { c:'Hypothyroidism',                      icd:'E03.9', notes:'TSH 3.1 on Levothyroxine 75mcg.',                               charlson:0 },
    { c:'GERD',                                icd:'K21.9', notes:'Controlled on omeprazole 20mg OD.',                              charlson:0 },
    { c:'Seasonal Allergic Rhinitis',          icd:'J30.1', notes:'Managed with cetirizine PRN.',                                   charlson:0 },
    { c:'Mild Osteoporosis',                   icd:'M81.0', notes:'T-score -2.1. On calcium and Vitamin D.',                        charlson:0 },
    { c:'Anxiety Disorder',                    icd:'F41.9', notes:'Managed with sertraline 50mg and CBT.',                          charlson:0 },
    { c:'Iron Deficiency Anaemia',             icd:'D50.9', notes:'Hb 10.8 g/dL. On ferrous sulfate.',                             charlson:0 },
    { c:'Vitamin D Deficiency',                icd:'E55.9', notes:'Repleted with high-dose Vitamin D3.',                            charlson:0 },
    { c:'Benign Prostatic Hyperplasia',        icd:'N40.0', notes:'IPSS score 12. On tamsulosin.',                                  charlson:0 },
    { c:'Migraine without aura',               icd:'G43.9', notes:'Sumatriptan PRN. 3-4 episodes per month.',                      charlson:0 },
    { c:'Generalised Anxiety Disorder',        icd:'F41.1', notes:'SSRI and therapy. Stable for 8 months.',                        charlson:0 },
  ],
};

const MEDS = {
  ANTICOAGULANTS: [
    { name:'Warfarin',    dosage:'5mg',    frequency:'Once daily — INR-adjusted' },
    { name:'Apixaban',    dosage:'5mg',    frequency:'Twice daily' },
    { name:'Rivaroxaban', dosage:'20mg',   frequency:'Once daily with evening meal' },
    { name:'Dabigatran',  dosage:'150mg',  frequency:'Twice daily' },
  ],
  NSAIDS: [
    { name:'Ibuprofen',   dosage:'400mg',  frequency:'Three times daily with food' },
    { name:'Naproxen',    dosage:'500mg',  frequency:'Twice daily with food' },
    { name:'Diclofenac',  dosage:'50mg',   frequency:'Three times daily' },
    { name:'Celecoxib',   dosage:'200mg',  frequency:'Once daily' },
  ],
  COMMON: [
    { name:'Lisinopril',           dosage:'10mg',    frequency:'Once daily' },
    { name:'Metformin',            dosage:'500mg',   frequency:'Twice daily with meals' },
    { name:'Atorvastatin',         dosage:'40mg',    frequency:'Once daily at bedtime' },
    { name:'Amlodipine',           dosage:'5mg',     frequency:'Once daily' },
    { name:'Metoprolol',           dosage:'25mg',    frequency:'Twice daily' },
    { name:'Omeprazole',           dosage:'20mg',    frequency:'Once daily before breakfast' },
    { name:'Levothyroxine',        dosage:'75mcg',   frequency:'Once daily on empty stomach' },
    { name:'Sertraline',           dosage:'50mg',    frequency:'Once daily' },
    { name:'Albuterol',            dosage:'90mcg',   frequency:'As needed — up to 4x/day' },
    { name:'Fluticasone',          dosage:'100mcg',  frequency:'Twice daily via inhaler' },
    { name:'Furosemide',           dosage:'40mg',    frequency:'Once daily in morning' },
    { name:'Spironolactone',       dosage:'25mg',    frequency:'Once daily' },
    { name:'Gabapentin',           dosage:'300mg',   frequency:'Three times daily' },
    { name:'Tamsulosin',           dosage:'0.4mg',   frequency:'Once daily 30 mins after meal' },
    { name:'Losartan',             dosage:'50mg',    frequency:'Once daily' },
    { name:'Glipizide',            dosage:'5mg',     frequency:'Once daily before breakfast' },
    { name:'Carvedilol',           dosage:'6.25mg',  frequency:'Twice daily with food' },
    { name:'Sacubitril/Valsartan', dosage:'24/26mg', frequency:'Twice daily' },
    { name:'Empagliflozin',        dosage:'10mg',    frequency:'Once daily in morning' },
    { name:'Semaglutide',          dosage:'0.5mg',   frequency:'Once weekly subcutaneous' },
    { name:'Pregabalin',           dosage:'75mg',    frequency:'Twice daily' },
    { name:'Clopidogrel',          dosage:'75mg',    frequency:'Once daily' },
    { name:'Ezetimibe',            dosage:'10mg',    frequency:'Once daily' },
    { name:'Pantoprazole',         dosage:'40mg',    frequency:'Once daily before breakfast' },
    { name:'Cetirizine',           dosage:'10mg',    frequency:'Once daily at bedtime' },
    { name:'Montelukast',          dosage:'10mg',    frequency:'Once daily at bedtime' },
    { name:'Amiodarone',           dosage:'200mg',   frequency:'Once daily' },
    { name:'Digoxin',              dosage:'0.125mg', frequency:'Once daily' },
    { name:'Insulin Glargine',     dosage:'20 units',frequency:'Once daily at bedtime' },
    { name:'Insulin Aspart',       dosage:'8 units', frequency:'Three times daily with meals' },
    { name:'Dapagliflozin',        dosage:'10mg',    frequency:'Once daily' },
    { name:'Metolazone',           dosage:'2.5mg',   frequency:'As needed for diuresis' },
    { name:'Bumetanide',           dosage:'1mg',     frequency:'Twice daily' },
    { name:'Colchicine',           dosage:'0.6mg',   frequency:'Twice daily' },
    { name:'Allopurinol',          dosage:'300mg',   frequency:'Once daily' },
    { name:'Calcium Carbonate',    dosage:'500mg',   frequency:'Three times daily with meals' },
    { name:'Vitamin D3',           dosage:'2000 IU', frequency:'Once daily' },
    { name:'Ferrous Sulfate',      dosage:'325mg',   frequency:'Once daily on empty stomach' },
    { name:'Folic Acid',           dosage:'5mg',     frequency:'Once daily' },
    { name:'Prednisone',           dosage:'10mg',    frequency:'Once daily — tapering course' },
  ],
};

const ALLERGIES_POOL = [
  { allergen:'Penicillin',         reaction:'Rash and hives',            severity:'Moderate' },
  { allergen:'Sulfa drugs',        reaction:'Stevens-Johnson syndrome',  severity:'Severe' },
  { allergen:'Shellfish',          reaction:'Anaphylaxis',               severity:'Severe' },
  { allergen:'Peanuts',            reaction:'Anaphylaxis',               severity:'Severe' },
  { allergen:'NSAIDs (Ibuprofen)', reaction:'Bronchospasm',              severity:'Severe' },
  { allergen:'ACE Inhibitors',     reaction:'Angioedema',                severity:'Severe' },
  { allergen:'Latex',              reaction:'Contact dermatitis',        severity:'Mild' },
  { allergen:'Contrast dye',       reaction:'Nephrotoxicity',            severity:'Severe' },
  { allergen:'Codeine',            reaction:'Nausea and vomiting',       severity:'Moderate' },
  { allergen:'Tetracycline',       reaction:'Photosensitivity rash',     severity:'Mild' },
  { allergen:'Aspirin',            reaction:'GI bleeding',               severity:'Moderate' },
  { allergen:'Tree nuts',          reaction:'Urticaria',                 severity:'Moderate' },
  { allergen:'Erythromycin',       reaction:'Prolonged QT interval',     severity:'Severe' },
  { allergen:'Statins',            reaction:'Myopathy',                  severity:'Moderate' },
];

const VISIT_REASONS = [
  'Annual physical examination','Chronic disease follow-up','Hypertension review',
  'Diabetes management','Cardiology follow-up','COPD exacerbation','Medication review',
  'Post-hospitalisation follow-up','Chest pain evaluation','Shortness of breath',
  'Kidney function monitoring','Anticoagulation review','Weight management consultation',
  'Mental health check-in','Pain management review','Pre-operative assessment',
  'Respiratory function check','Thyroid function review','Anaemia follow-up',
  'Lipid management review','Heart failure decompensation','Falls assessment',
  'Cognitive function assessment','Palliative care discussion',
];

const SPECIALTIES = [
  'Cardiology','Neurology','Orthopedics','Dermatology','Gastroenterology',
  'Pulmonology','Nephrology','Endocrinology','Oncology','Rheumatology',
  'Ophthalmology','Psychiatry','General Practice','Urology','Vascular Surgery',
  'Geriatrics','Pain Management','Hematology','Infectious Disease','Palliative Care',
];

const PROVIDER_IDS = ['user-2','user-3','user-4','user-5'];

// ── Lab value generator ───────────────────────────────────────────────────────
function makeLabPanel(date, medHx, tier) {
  const lo = medHx.map(h => (h.condition||'').toLowerCase());
  const hasDiabetes  = lo.some(c => c.includes('diabetes'));
  const hasHF        = lo.some(c => c.includes('heart failure'));
  const hasCKD       = lo.some(c => c.includes('kidney') || c.includes('renal') || c.includes('esrd'));
  const hasAnaemia   = lo.some(c => c.includes('anaemia') || c.includes('anemia'));
  const hasLipid     = lo.some(c => c.includes('hyperlipid') || c.includes('cholesterol'));
  const hasCardiac   = lo.some(c => c.includes('coronary') || c.includes('cardiac') || c.includes('heart'));
  const hasCOPD      = lo.some(c => c.includes('copd') || c.includes('asthma'));

  // Missing data rate — sicker patients get more complete labs
  const miss = { LOW:0.30, MED:0.20, HIGH:0.12, CRIT:0.06 }[tier];

  const orderHba1c  = hasDiabetes || rngBool(tier === 'LOW' ? 0.15 : 0.70);
  const hba1c       = orderHba1c ? rngNull(miss, +(hasDiabetes ? rngFloat(6.8,11.2) : rngFloat(4.5,5.8)).toFixed(1)) : null;

  const orderEgfr   = hasCKD || rngBool(tier === 'LOW' ? 0.40 : 0.90);
  const egfr        = orderEgfr ? rngNull(miss, Math.round(hasCKD ? (tier==='CRIT' ? rngFloat(8,28) : rngFloat(28,52)) : (tier==='HIGH' ? rngFloat(52,72) : rngFloat(72,118)))) : null;

  const orderBnp    = hasHF || (tier === 'CRIT' && rngBool(0.60)) || (tier === 'HIGH' && rngBool(0.35));
  const bnp         = orderBnp ? rngNull(miss, Math.round(hasHF ? rngFloat(280,2200) : (tier==='CRIT' ? rngFloat(80,350) : rngFloat(15,95)))) : null;

  const orderCr     = hasCKD || rngBool(tier === 'LOW' ? 0.35 : 0.85);
  const creatinine  = orderCr ? rngNull(miss, +(hasCKD ? (tier==='CRIT' ? rngFloat(2.5,8.5) : rngFloat(1.4,3.0)) : rngFloat(0.6,1.2)).toFixed(2)) : null;

  const orderLdl    = hasLipid || rngBool(tier === 'LOW' ? 0.50 : 0.80);
  const ldl         = orderLdl ? rngNull(miss, Math.round(hasLipid ? rngFloat(118,245) : (tier==='CRIT' ? rngFloat(58,120) : rngFloat(72,130)))) : null;

  const orderTrop   = hasCardiac && rngBool(tier === 'CRIT' ? 0.45 : 0.20);
  const troponin    = orderTrop ? rngNull(miss, +((hasCardiac && tier==='CRIT') ? rngFloat(0.04,2.50) : rngFloat(0.00,0.03)).toFixed(3)) : null;

  const orderHb     = hasAnaemia || rngBool(0.75);
  const haemoglobin = orderHb ? rngNull(miss, +(hasAnaemia ? rngFloat(7.0,10.8) : (tier==='CRIT' ? rngFloat(9.5,12.0) : rngFloat(11.5,16.5))).toFixed(1)) : null;

  const orderBmp    = rngBool(tier === 'LOW' ? 0.55 : 0.88);
  const sodium      = orderBmp ? rngNull(miss, Math.round(tier==='CRIT' ? rngFloat(132,145) : rngFloat(136,144))) : null;
  const potassium   = orderBmp ? rngNull(miss, +(hasCKD ? rngFloat(4.2,5.8) : rngFloat(3.5,4.8)).toFixed(1)) : null;
  const glucose     = orderBmp ? rngNull(miss, Math.round(hasDiabetes ? rngFloat(120,280) : rngFloat(72,105))) : null;

  const orderWbc    = tier === 'CRIT' || rngBool(0.60);
  const wbc         = orderWbc ? rngNull(miss, +(tier==='CRIT' ? rngFloat(4.5,18.0) : rngFloat(4.5,10.5)).toFixed(1)) : null;

  return {
    date,
    orderedBy: rngPick(PROVIDER_IDS),
    hba1c, egfr, bnp, creatinine, ldl, troponin, haemoglobin,
    sodium, potassium, glucose, wbc,
    units: {
      hba1c:'%', egfr:'mL/min/1.73m2', bnp:'pg/mL', creatinine:'mg/dL',
      ldl:'mg/dL', troponin:'ng/mL', haemoglobin:'g/dL',
      sodium:'mEq/L', potassium:'mEq/L', glucose:'mg/dL', wbc:'K/uL',
    },
  };
}

// ── Vital sign generator ──────────────────────────────────────────────────────
function makeVitals(date, medHx, tier, baseWeight, baseHeight) {
  const lo = medHx.map(h => (h.condition||'').toLowerCase());
  const hasHtn    = lo.some(c => c.includes('hypertension'));
  const hasHF     = lo.some(c => c.includes('heart failure'));
  const hasCOPD   = lo.some(c => c.includes('copd') || c.includes('asthma'));

  const sys  = hasHtn ? rngInt(145,185) : (tier==='CRIT' ? rngInt(110,150) : rngInt(115,135));
  const dias = Math.round(sys * rngFloat(0.58,0.68));
  const hr   = hasHF ? rngInt(72,112) : rngInt(58,92);
  const wt   = baseWeight + rngFloat(-2.5,2.5);
  const bmi  = Math.round((wt / ((baseHeight/100)**2)) * 10) / 10;
  const o2   = hasCOPD ? rngInt(89,96) : (tier==='CRIT' ? rngInt(93,98) : rngInt(96,99));
  const temp = +rngFloat(36.3,37.4).toFixed(1);
  const rr   = hasCOPD ? rngInt(18,26) : rngInt(14,20);

  return {
    date,
    systolicBP: sys,
    diastolicBP: dias,
    heartRate: hr,
    weight: +wt.toFixed(1),
    height: +baseHeight.toFixed(1),
    bmi,
    o2Saturation: o2,
    temperature: temp,
    respiratoryRate: rr,
    recordedBy: rngPick(PROVIDER_IDS),
  };
}

// ── Charlson Comorbidity Index ────────────────────────────────────────────────
function computeCharlson(medHx, age) {
  let score = medHx.reduce((s, h) => s + (h.charlson || 0), 0);
  if      (age >= 80) score += 4;
  else if (age >= 70) score += 3;
  else if (age >= 60) score += 2;
  else if (age >= 50) score += 1;
  return score;
}

// ── Patient generator ─────────────────────────────────────────────────────────
function makePatient(index, tier) {
  const id        = `ml-patient-${index}`;
  const firstName = rngPick(FIRST_NAMES);
  const lastName  = rngPick(LAST_NAMES);
  const gender    = rngPick(['male','female','male','female','other']);
  const ageRange  = { LOW:[22,44], MED:[45,64], HIGH:[65,79], CRIT:[80,95] }[tier];
  const age       = rngInt(ageRange[0], ageRange[1]);
  const dob       = yearsAgo(age);
  const city      = rngPick(CITIES);

  // Medical history
  const nCondRange = { LOW:[0,1], MED:[1,3], HIGH:[2,4], CRIT:[3,6] }[tier];
  const nCond      = rngInt(nCondRange[0], nCondRange[1]);
  const pool       = {
    LOW:  [...CONDITIONS.LOW,  ...CONDITIONS.MEDIUM.slice(0,2)],
    MED:  [...CONDITIONS.MEDIUM,...CONDITIONS.LOW.slice(0,2)],
    HIGH: [...CONDITIONS.HIGH, ...CONDITIONS.MEDIUM.slice(0,4)],
    CRIT: [...CONDITIONS.CRITICAL,...CONDITIONS.HIGH.slice(0,4)],
  }[tier];

  const usedC = new Set();
  const medHx = [];
  for (let i = 0; i < nCond; i++) {
    let c; let t = 0;
    do { c = rngPick(pool); t++; } while (usedC.has(c.c) && t < 30);
    usedC.add(c.c);
    medHx.push({ condition:c.c, icd10:c.icd, diagnosedDate:daysAgo(rngInt(180,3650)), notes:c.notes, charlson:c.charlson });
  }

  // Medications
  const nMedRange  = { LOW:[0,2], MED:[1,5], HIGH:[4,9], CRIT:[8,14] }[tier];
  const nMeds      = rngInt(nMedRange[0], nMedRange[1]);
  const usedM      = new Set();
  const meds       = [];

  const addCombo   = (tier==='CRIT' && rngBool(0.35)) || (tier==='HIGH' && rngBool(0.15));
  if (addCombo && nMeds >= 2) {
    const ac = rngPick(MEDS.ANTICOAGULANTS);
    const ns = rngPick(MEDS.NSAIDS);
    meds.push({ ...ac, startDate:daysAgo(rngInt(30,730)), active:true });
    meds.push({ ...ns, startDate:daysAgo(rngInt(30,365)), active:true });
    usedM.add(ac.name); usedM.add(ns.name);
  } else if ((tier==='HIGH'||tier==='CRIT') && rngBool(0.28)) {
    const ac = rngPick(MEDS.ANTICOAGULANTS);
    meds.push({ ...ac, startDate:daysAgo(rngInt(60,730)), active:true });
    usedM.add(ac.name);
  }
  let rem = nMeds - meds.length;
  for (let i = 0; i < rem; i++) {
    let m; let t = 0;
    do { m = rngPick(MEDS.COMMON); t++; } while (usedM.has(m.name) && t < 40);
    usedM.add(m.name);
    const disc = rngBool(0.10);
    meds.push({ ...m, startDate:daysAgo(rngInt(30,1825)), active:!disc, ...(disc?{endDate:daysAgo(rngInt(30,365))}:{}) });
  }

  // Allergies
  const nAllMax   = { LOW:1, MED:2, HIGH:2, CRIT:3 }[tier];
  const nAllergies= rngInt(0, nAllMax);
  const usedAl    = new Set();
  const allergies = [];
  for (let i = 0; i < nAllergies; i++) {
    let a; let t = 0;
    do { a = rngPick(ALLERGIES_POOL); t++; } while (usedAl.has(a.allergen) && t < 20);
    usedAl.add(a.allergen);
    allergies.push({ ...a });
  }

  // Recent visits
  const vCfg = {
    LOW:  { lastGap:[3,45],   cnt:[2,5], between:[14,60] },
    MED:  { lastGap:[15,120], cnt:[1,4], between:[30,90] },
    HIGH: { lastGap:[60,280], cnt:[1,3], between:[60,150] },
    CRIT: { lastGap:[90,400], cnt:[0,2], between:[90,200] },
  }[tier];
  const nVisits = rngInt(vCfg.cnt[0], vCfg.cnt[1]);
  const lastGap = rngInt(vCfg.lastGap[0], vCfg.lastGap[1]);
  const visits  = [];
  if (nVisits > 0) {
    let vDate = daysAgo(lastGap);
    for (let v = 0; v < nVisits; v++) {
      const reason = rngPick(VISIT_REASONS);
      visits.unshift({ date:new Date(vDate), provider:rngPick(PROVIDER_IDS), reason, notes:`${reason} — reviewed and managed per protocol.` });
      vDate = new Date(vDate - rngInt(vCfg.between[0], vCfg.between[1]) * 864e5);
    }
  }

  // Lab values: 2-4 panels spread over last 12 months
  const nLabs  = rngInt(2, 4);
  const labVals= [];
  for (let l = 0; l < nLabs; l++) {
    const dBack = Math.round((12 - l * 12 / nLabs) * 30) + rngInt(-10, 10);
    labVals.push(makeLabPanel(daysAgo(Math.max(1, dBack)), medHx, tier));
  }

  // Vital signs: 3-6 readings
  const baseWeight = { LOW:rngFloat(60,95), MED:rngFloat(68,118), HIGH:rngFloat(65,110), CRIT:rngFloat(52,88) }[tier];
  const baseHeight = rngFloat(155, 192);
  const nVitals    = rngInt(3, 6);
  const vitalSigns = [];
  for (let v = 0; v < nVitals; v++) {
    const dBack = Math.round((nVitals - v) * (lastGap / nVitals)) + rngInt(-5, 5);
    vitalSigns.push(makeVitals(daysAgo(Math.max(1, dBack)), medHx, tier, baseWeight, baseHeight));
  }

  // Readmission / ED counts
  const readmissionCount = { LOW:0, MED:rngInt(0,1), HIGH:rngInt(0,2), CRIT:rngInt(1,4) }[tier];
  const edVisitCount     = readmissionCount + rngInt(0, tier==='CRIT'?3:1);
  const charlsonScore    = computeCharlson(medHx, age);

  // Risk score computation (mirrors analyticsCalculationService.js + lab boosts)
  let sc = 0;
  if (age>=75) sc+=25; else if (age>=65) sc+=20; else if (age>=55) sc+=12; else if (age>=45) sc+=6; else if (age>=35) sc+=2;

  let condSc = 0, hiCount = 0;
  for (const h of medHx) {
    const lc = h.condition.toLowerCase();
    if      (CONDITIONS.CRITICAL.some(x => x.c.toLowerCase()===lc)) { condSc+=24; hiCount++; }
    else if (CONDITIONS.HIGH.some(x => x.c.toLowerCase()===lc))     { condSc+=18; hiCount++; }
    else if (CONDITIONS.MEDIUM.some(x => x.c.toLowerCase()===lc))   { condSc+=12; }
    else condSc+=6;
  }
  if (hiCount>=2) condSc=Math.round(condSc*1.3); else if (medHx.length>=3) condSc=Math.round(condSc*1.15);
  sc += condSc;

  const activeMedCount = meds.filter(m => m.active !== false).length;
  if (activeMedCount>=10) sc+=20; else if (activeMedCount>=5) sc+=12;

  const acNames = meds.map(m => m.name.toLowerCase());
  if (MEDS.ANTICOAGULANTS.some(a=>acNames.includes(a.name.toLowerCase())) &&
      MEDS.NSAIDS.some(a=>acNames.includes(a.name.toLowerCase()))) sc+=5;

  sc += allergies.filter(a => a.severity==='Severe').length * 8;

  // Lab-driven score boosts (new: makes lab features predictive)
  const latest = labVals[labVals.length-1];
  if (latest) {
    if (latest.hba1c   !==null && latest.hba1c   > 9.0)  sc += 10;
    if (latest.egfr    !==null && latest.egfr    < 30)   sc += 15;
    else if (latest.egfr!==null && latest.egfr   < 45)   sc += 8;
    if (latest.bnp     !==null && latest.bnp     > 900)  sc += 12;
    else if (latest.bnp!==null && latest.bnp     > 300)  sc += 6;
    if (latest.troponin!==null && latest.troponin> 0.04) sc += 10;
    if (latest.haemoglobin!==null && latest.haemoglobin < 8.5) sc += 6;
  }

  sc += readmissionCount * 8;
  sc += Math.min(charlsonScore * 3, 18);

  if      (visits.length===0) sc += 18;
  else if (lastGap > 365)     sc += 22;
  else if (lastGap > 180)     sc += 14;
  else if (lastGap > 90)      sc += 6;
  else if (lastGap < 30)      sc -= 5;

  const riskScore = Math.max(0, Math.min(100, Math.round(sc)));
  const riskLevel = riskScore>=70 ? 'high' : riskScore>=30 ? 'medium' : 'low';

  // 6-month risk trajectory
  const riskTrajectory = [];
  let tsc = Math.max(0, riskScore - rngInt(8,25));
  for (let mo = 5; mo >= 0; mo--) {
    tsc = Math.max(0, Math.min(100, tsc + rngInt(-4,8)));
    riskTrajectory.push({ date:monthsAgo(mo), score:Math.round(tsc), level:tsc>=70?'high':tsc>=30?'medium':'low', computedBy:'rule-based' });
  }

  return {
    _id:          id,
    patientId:    `PT-ML-${String(index).padStart(4,'0')}`,
    name:         `${firstName} ${lastName}`,
    firstName, lastName,
    dateOfBirth:  dob,
    gender, age,
    contactInfo: {
      email:   `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
      phone:   `(555) ${rngInt(100,999)}-${rngInt(1000,9999)}`,
      address: `${rngInt(1,9999)} ${rngPick(STREET_NAMES)} ${rngPick(STREET_TYPES)}, ${city[0]} ${city[1]}`,
    },
    insuranceInfo: {
      provider:     rngPick(INSURANCE_PROVIDERS),
      policyNumber: `PL-${rngInt(100000000,999999999)}`,
      groupNumber:  `G-${rngInt(10000,99999)}`,
    },
    primaryProvider: rngPick(PROVIDER_IDS),
    riskScore, riskLevel, riskTier: tier,
    charlsonScore, readmissionCount, edVisitCount,
    medicalHistory: medHx,
    medications:    meds,
    allergies,
    recentVisits:   visits,
    labValues:      labVals,
    vitalSigns,
    riskTrajectory,
    activeMedCount,
    lastVisitDaysAgo: visits.length > 0 ? lastGap : null,
    createdAt: daysAgo(rngInt(30,730)),
    updatedAt: daysAgo(rngInt(0,30)),
  };
}

// ── Referral ──────────────────────────────────────────────────────────────────
function makeReferral(idx, patientId, patientName, from, to, daysBack) {
  const urgency  = rngPick(['routine','routine','routine','urgent','urgent','emergency']);
  const specialty= rngPick(SPECIALTIES);
  const r        = rng();
  const status   = r<0.55 ? 'completed' : r<0.70 ? 'accepted' : r<0.85 ? 'pending' : r<0.95 ? 'rejected' : 'cancelled';
  const created  = daysAgo(daysBack);
  return {
    _id:`ml-referral-${idx}`, patient:patientId, patientName,
    referringProvider:from, receivingProvider:to,
    reason:`${specialty} evaluation and management.`,
    urgency, status, specialty,
    createdAt:created, updatedAt:daysAgo(Math.max(0,daysBack-rngInt(3,30))),
    ...(status==='completed'||status==='accepted' ? { appointmentDate:daysAgo(Math.max(0,daysBack-rngInt(5,20))) } : {}),
    ...(status==='completed' ? { completionDate:daysAgo(Math.max(0,daysBack-rngInt(0,15))), diagnosis:`${specialty} condition assessed.`, treatment:'Management plan established.' } : {}),
    ...(status==='rejected' ? { rejectionReason:rngPick(['Does not meet specialty criteria','Insufficient documentation','Not accepting new referrals']) } : {}),
    billing:{ amount:rngInt(150,950), insuranceClaim:`CLM-${rngInt(100000,999999)}` },
  };
}

// ── Referral outcome ──────────────────────────────────────────────────────────
function makeOutcome(idx, ref) {
  const accepted  = ref.status==='completed' || ref.status==='accepted';
  const scheduled = accepted && rngBool(0.85);
  const attended  = scheduled && rngBool(0.78);
  const tta       = scheduled ? rngInt(1,21) : null;
  const rating    = attended ? rngInt(3,5) : (accepted ? rngInt(2,4) : 0);
  const sat       = attended ? rngInt(3,5) : (accepted ? rngInt(2,4) : 0);
  const readmit   = attended && rngBool(0.08);

  let os = 50;
  if (accepted)  os+=20; else os-=30;
  if (scheduled) os+=10;
  if (attended)  os+=15; else if (scheduled) os-=10;
  if (rating===5) os+=15; else if (rating===4) os+=8; else if (rating>0&&rating<3) os-=10;
  if (sat===5) os+=10; else if (sat===4) os+=5; else if (sat>0&&sat<=2) os-=8;
  if (readmit) os-=20;
  if (tta!==null) { if (tta<=3) os+=10; else if (tta<=7) os+=5; else if (tta>14) os-=5; }
  const outcomeScore   = Math.max(0, Math.min(100, Math.round(os)));
  const wasActionTaken = accepted && rngBool(outcomeScore>70?0.85:outcomeScore>40?0.65:0.35);

  return {
    _id:`ml-outcome-${idx}`, referralId:ref._id, providerId:ref.receivingProvider,
    patientId:ref.patient, specialty:ref.specialty, urgency:ref.urgency,
    accepted, acceptedAt:accepted?new Date(ref.createdAt.getTime()+rngInt(1,48)*3600000):null,
    rejectionReason:!accepted?rngPick(['Not medically necessary','Incomplete documentation','Capacity constraints']):null,
    appointmentScheduled:scheduled, appointmentDate:scheduled?new Date(ref.createdAt.getTime()+(tta||7)*864e5):null,
    appointmentAttended:attended, noShowReason:(scheduled&&!attended)?rngPick(['Cancelled same day','Transport issue','No contact']):null,
    outcomeRating:rating||null, patientSatisfaction:sat||null, timeToAppointmentDays:tta,
    readmissionWithin30Days:readmit, outcomeScore, wasActionTaken,
    createdAt:new Date(ref.createdAt.getTime()+rngInt(1,5)*864e5), updatedAt:new Date(),
  };
}

// ── Alert generator ───────────────────────────────────────────────────────────
function makeAlerts(pIdx, p) {
  const alerts     = [];
  const lastVisit  = p.lastVisitDaysAgo !== undefined ? (p.lastVisitDaysAgo ?? 999) : 999;
  const rs         = p.riskScore;
  let ai           = 0;

  const makeAlert = (type, extra={}) => {
    ai++;
    const baseRate = { readmission_risk:0.72, risk_score_increase:0.65, care_gap:0.58, medication_adherence:0.52 }[type];
    const sevMod   = { critical:0.12, high:0.06, medium:0, low:-0.08 }[extra.severity||'medium'];
    const taken    = rngBool(baseRate + sevMod);
    const status   = taken ? rngPick(['acknowledged','resolved']) : rngPick(['active','dismissed','active','active']);
    return {
      _id:`ml-alert-${pIdx}-${ai}`,
      patientId:p._id, patientName:p.name, providerId:p.primaryProvider,
      type, status, wasActionTaken:taken,
      outcomeNotes: taken ? rngPick([
        'Patient contacted — care plan updated.',
        'Urgent appointment scheduled within 48 hours.',
        'Medication reconciliation completed.',
        'Care coordinator assigned.',
        'Follow-up call completed — patient stable.',
      ]) : null,
      generatedAt:daysAgo(rngInt(1,28)), expiresAt:daysAgo(-30),
      createdAt:daysAgo(rngInt(1,28)), riskScore:rs, ...extra,
    };
  };

  if (rs>=85) alerts.push(makeAlert('readmission_risk',{ severity:'critical',
    title:`Critical Readmission Risk — ${p.name}`,
    description:`Risk score ${rs}/100. Charlson index ${p.charlsonScore}. Readmissions last 12mo: ${p.readmissionCount}.`,
    recommendation:'Urgent follow-up within 48 hours.',
    readmissionCount:p.readmissionCount, charlsonScore:p.charlsonScore }));
  else if (rs>=75) alerts.push(makeAlert('readmission_risk',{ severity:'high',
    title:`High Readmission Risk — ${p.name}`,
    description:`Risk score ${rs}/100. Elevated readmission probability.`,
    recommendation:'Schedule follow-up within 7 days.',
    readmissionCount:p.readmissionCount, charlsonScore:p.charlsonScore }));

  if (rs>=50 && rngBool(0.38)) {
    const delta = rngInt(12,30);
    alerts.push(makeAlert('risk_score_increase',{ severity:'high',
      title:`Risk Score Increase — ${p.name}`,
      description:`Score increased by ${delta} points (${rs-delta} to ${rs}).`,
      recommendation:'Review clinical notes. Comprehensive visit within 14 days.',
      previousRiskScore:rs-delta, deltaScore:delta }));
  }

  if (lastVisit>=60 && rs>=40) alerts.push(makeAlert('care_gap',{ severity:rs>=70?'high':'medium',
    title:`Care Gap — ${p.name}`,
    description:`Not seen in ${lastVisit} days. Risk score ${rs}/100.`,
    recommendation:'Reach out to schedule visit within 5 business days.',
    daysSinceLastVisit:lastVisit }));

  const activeMeds = (p.medications||[]).filter(m=>m.active!==false).length;
  if (activeMeds>0 && lastVisit>=120) alerts.push(makeAlert('medication_adherence',{ severity:'medium',
    title:`Medication Adherence Concern — ${p.name}`,
    description:`${activeMeds} active medications but no visit in ${lastVisit} days.`,
    recommendation:'Contact patient to verify compliance. Schedule review within 30 days.',
    activeMedCount:activeMeds, daysSinceLastVisit:lastVisit }));

  return alerts;
}

// ── Match session ─────────────────────────────────────────────────────────────
function makeMatchSession(idx, requestedBy, specialty, insurance, provPool) {
  const n = rngInt(3,8);
  const suggestions = Array.from({length:n},()=>{
    const prov = rngPick(provPool);
    const score = rngInt(38,98);
    return {
      providerId:   prov._id||prov.id||rngPick(PROVIDER_IDS),
      providerName: prov.providerName||prov.name||`Provider-${rngInt(1,20)}`,
      specialty:    prov.specialty||specialty,
      matchScore:   score,
      scoreBreakdown:{ specialty:rngInt(10,30),insurance:rngInt(5,20),acceptanceRate:rngInt(5,18),availability:rngInt(3,12),tokenStanding:rngInt(1,8),bonuses:rngInt(0,5),outcome:rngInt(0,12) },
    };
  }).sort((a,b)=>b.matchScore-a.matchScore);
  const selected = rngBool(0.70)?suggestions[rngInt(0,Math.min(2,n-1))]:null;
  return {
    _id:`ml-match-${idx}`, requestedBy, specialty, patientInsurance:insurance,
    urgency:rngPick(['routine','routine','urgent']),
    resultsCount:n, topMatchScore:suggestions[0].matchScore, suggestions,
    ...(selected?{ selectedProviderId:selected.providerId, selectedProviderName:selected.providerName, selectedMatchScore:selected.matchScore, selectedAt:daysAgo(rngInt(0,5)) }:{}),
    createdAt:daysAgo(rngInt(1,180)), updatedAt:daysAgo(rngInt(0,5)),
  };
}

// ── Prior auth ────────────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  'MRI Brain with contrast','CT Chest with contrast','Cardiac catheterisation',
  'Total knee arthroplasty','Total hip replacement','Spinal fusion L4-L5',
  'Colonoscopy screening','Echocardiogram with Doppler','PET scan oncology staging',
  'Bariatric surgery consultation','Polysomnography','Renal dialysis initiation',
  'Inpatient cardiac rehabilitation','Skilled nursing facility admission','Home health aide services',
];
function makePriorAuth(idx, patientId, providerId) {
  const ai     = rngInt(58,98);
  const aiRec  = ai>=88?'Approve':ai>=74?'Review':'Deny';
  const ov     = rngBool(0.12);
  let decision;
  if (!ov) decision = aiRec==='Approve'?'approved':aiRec==='Deny'?'denied':rngPick(['approved','denied','pending_review']);
  else     decision = aiRec==='Approve'?rngPick(['denied','pending_review']):'approved';
  const auto = ai>=92 && aiRec==='Approve' && !ov;
  return {
    _id:`ml-priorauth-${idx}`, patientId, providerId,
    serviceType:rngPick(SERVICE_TYPES),
    serviceCode:`CPT-${rngInt(70000,99999)}`,
    diagnosisCodes:[rngPick(['Z00.00','E11.9','I10','J44.1','N18.3','I48.0','M17.11','I50.9','G30.9'])],
    urgency:rngPick(['routine','routine','urgent']),
    status:decision, aiRecommendation:aiRec, aiConfidenceScore:ai,
    aiReasoning:`Request ${aiRec==='Approve'?'meets':'does not fully meet'} established clinical criteria.`,
    autoApproved:auto, reviewedBy:auto?null:'user-1', reviewedAt:auto?null:daysAgo(rngInt(1,10)),
    denialReasonCode:decision==='denied'?rngPick(['NOT_MEDICALLY_NECESSARY','INCOMPLETE_DOCUMENTATION','NEEDS_PRIOR_TREATMENT']):null,
    createdAt:daysAgo(rngInt(1,120)), updatedAt:daysAgo(rngInt(0,5)),
  };
}

// ── Analytics snapshot ────────────────────────────────────────────────────────
function makeSnapshot(idx, scope, scopeId, computedAt, n) {
  const hi=Math.round(n*rngInt(12,22)/100), me=Math.round(n*rngInt(28,45)/100), lo=n-hi-me;
  const eng=rngInt(60,88),adh=rngInt(54,82),mis=rngInt(8,28),refV=rngInt(20,80),acc=rngInt(62,92);
  return {
    _id:`ml-snapshot-${idx}`, snapshotId:`snap-ml-${idx}-${Math.random().toString(36).slice(2,8)}`,
    scope, scopeId:scopeId||null,
    period:{ from:new Date(computedAt.getTime()-90*864e5), to:computedAt },
    computedAt, computedBy:'ml-seed-job', durationMs:rngInt(800,5500),
    metrics:{
      patientEngagement:     { value:eng,  trend:rngInt(-8,14),  unit:'percent' },
      treatmentAdherence:    { value:adh,  trend:rngInt(-5,10),  unit:'percent' },
      missedAppointments:    { value:mis,  trend:rngInt(-3,8),   unit:'count' },
      riskDistribution:      { high:hi, medium:me, low:lo, total:n },
      referralVolume:        { value:refV, trend:rngInt(-12,18), unit:'count' },
      referralAcceptanceRate:{ value:acc,  trend:rngInt(-6,9),   unit:'percent' },
      totalPatients:         { value:n, unit:'count' },
    },
    errors:[], createdAt:computedAt,
  };
}

// ── Batch insert with progress ────────────────────────────────────────────────
async function insertInBatches(col, docs, batchSize=250) {
  let done = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    await col.insertMany(docs.slice(i, i+batchSize));
    done += Math.min(batchSize, docs.length - i);
    process.stdout.write(`\r    ${done}/${docs.length}`);
  }
  process.stdout.write('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log('Connected.\n');

  // ── 1. 1,000 patients (200 LOW / 400 MED / 250 HIGH / 150 CRIT) ───────────
  console.log('Generating 1,000 patients...');
  const TIERS = [{ tier:'LOW',count:200 },{ tier:'MED',count:400 },{ tier:'HIGH',count:250 },{ tier:'CRIT',count:150 }];
  const allPatients = [];
  let pIdx = 1;
  for (const {tier,count} of TIERS) for (let i=0;i<count;i++) allPatients.push(makePatient(pIdx++,tier));
  await insertInBatches(db.collection('patients'), allPatients);
  const rDist = allPatients.reduce((acc,p)=>{acc[p.riskLevel]++;return acc;},{low:0,medium:0,high:0});
  const avgRs = Math.round(allPatients.reduce((s,p)=>s+p.riskScore,0)/allPatients.length);
  const avgCh = (allPatients.reduce((s,p)=>s+p.charlsonScore,0)/allPatients.length).toFixed(1);
  const labCov= allPatients.filter(p=>p.labValues.length>0&&p.labValues[0].egfr!==null).length;
  console.log(`  Risk: low=${rDist.low} medium=${rDist.medium} high=${rDist.high}  avgScore=${avgRs}  avgCharlson=${avgCh}`);
  console.log(`  Lab coverage (eGFR): ${labCov}/${allPatients.length} patients`);
  console.log(`  Patients with readmissions: ${allPatients.filter(p=>p.readmissionCount>0).length}`);

  // ── 2. 2,000 referrals ────────────────────────────────────────────────────
  console.log('\nGenerating 2,000 referrals...');
  const allReferrals = [];
  for (let i=0;i<2000;i++) {
    const p=rngPick(allPatients), frm=rngPick(PROVIDER_IDS), to=rngPick(PROVIDER_IDS.filter(x=>x!==frm));
    allReferrals.push(makeReferral(i+1,p._id,p.name,frm,to,rngInt(1,180)));
  }
  await insertInBatches(db.collection('referrals'), allReferrals);
  const rStat=allReferrals.reduce((acc,r)=>{acc[r.status]=(acc[r.status]||0)+1;return acc;},{});
  console.log(`  Status distribution: ${JSON.stringify(rStat)}`);

  // ── 3. 2,000 referral outcomes ────────────────────────────────────────────
  console.log('\nGenerating 2,000 referral outcomes...');
  const eligible = allReferrals.filter(r=>r.status!=='pending');
  const allOutcomes = [];
  for (let i=0;i<Math.min(2000,eligible.length);i++) allOutcomes.push(makeOutcome(i+1,eligible[i]));
  await insertInBatches(db.collection('referraloutcomes'), allOutcomes);
  const oActed = allOutcomes.filter(o=>o.wasActionTaken).length;
  const avgOS  = Math.round(allOutcomes.reduce((s,o)=>s+o.outcomeScore,0)/allOutcomes.length);
  console.log(`  Action rate: ${((oActed/allOutcomes.length)*100).toFixed(1)}%  avgOutcomeScore=${avgOS}`);

  // ── 4. Predictive alerts ──────────────────────────────────────────────────
  console.log('\nGenerating predictive alerts...');
  const allAlerts = [];
  for (const p of allPatients) allAlerts.push(...makeAlerts(p._id.replace('ml-patient-',''),p));
  await insertInBatches(db.collection('predictivealerts'), allAlerts);
  const aTypes  = allAlerts.reduce((acc,a)=>{acc[a.type]=(acc[a.type]||0)+1;return acc;},{});
  const aActed  = allAlerts.filter(a=>a.wasActionTaken).length;
  console.log(`  Total: ${allAlerts.length}  Types: ${JSON.stringify(aTypes)}`);
  console.log(`  Overall action rate: ${((aActed/allAlerts.length)*100).toFixed(1)}%`);

  // ── 5. 800 match sessions ─────────────────────────────────────────────────
  console.log('\nGenerating 800 match sessions...');
  const provDocs = await db.collection('providermatchprofiles').find({}).toArray();
  const pool = provDocs.length>0 ? provDocs : PROVIDER_IDS.map(id=>({_id:id,id,providerName:'Provider '+id,specialty:rngPick(SPECIALTIES)}));
  const allSessions = [];
  for (let i=0;i<800;i++) allSessions.push(makeMatchSession(i+1,rngPick(PROVIDER_IDS),rngPick(SPECIALTIES),rngPick(INSURANCE_PROVIDERS),pool));
  await insertInBatches(db.collection('matchsessions'), allSessions);
  const withSel = allSessions.filter(s=>s.selectedProviderId).length;
  console.log(`  With provider selection: ${withSel}/${allSessions.length} (${Math.round(withSel/8)}%)`);

  // ── 6. 100 prior authorizations ───────────────────────────────────────────
  console.log('\nGenerating 100 prior authorizations...');
  const allAuths = [];
  for (let i=0;i<100;i++) { const p=rngPick(allPatients); allAuths.push(makePriorAuth(i+1,p._id,p.primaryProvider)); }
  await insertInBatches(db.collection('priorauthorizations'), allAuths);
  const aDec=allAuths.reduce((acc,a)=>{acc[a.status]=(acc[a.status]||0)+1;return acc;},{});
  console.log(`  Decisions: ${JSON.stringify(aDec)}`);

  // ── 7. Analytics snapshots (36 monthly global + 12 provider) ─────────────
  console.log('\nGenerating analytics snapshots...');
  const snaps = [];
  for (let mo=0;mo<36;mo++) snaps.push(makeSnapshot(mo+1,'global',null,monthsAgo(35-mo),rngInt(900,1200)));
  for (let p=0;p<4;p++) for (let mo=0;mo<3;mo++) snaps.push(makeSnapshot(37+p*3+mo,'provider',PROVIDER_IDS[p],monthsAgo(2-mo),rngInt(220,350)));
  await insertInBatches(db.collection('analyticssnapshots'), snaps);
  console.log(`  Inserted ${snaps.length} snapshots`);

  // ── Final report ──────────────────────────────────────────────────────────
  const cols    = ['patients','referrals','referraloutcomes','predictivealerts','matchsessions','priorauthorizations','analyticssnapshots'];
  const totals  = await Promise.all(cols.map(c=>db.collection(c).countDocuments()));

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  COLLECTION TOTALS (all data including pre-existing)');
  console.log('───────────────────────────────────────────────────────────────────');
  cols.forEach((c,i)=>console.log(`  ${c.padEnd(26)} ${totals[i].toString().padStart(6)} documents`));

  console.log('\n  ML FEATURE COVERAGE PER PATIENT');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('  labValues[]         11 tests  ·  2-4 panels  ·  ~20% missingness');
  console.log('  vitalSigns[]         9 vitals ·  3-6 readings ·  trending series');
  console.log('  riskTrajectory[]     6 months ·  temporal drift signal');
  console.log('  charlsonScore        validated comorbidity index');
  console.log('  readmissionCount     strongest single readmission predictor');
  console.log('  icd10 codes          on all medicalHistory entries');
  console.log('  ~45 engineered features total per patient row');

  console.log('\n  LABEL COVERAGE');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('  riskScore            regression label — risk model');
  console.log('  outcomeScore         regression label — referral outcome model');
  console.log('  wasActionTaken       binary label — alert action classifier');
  console.log('  selectedProviderId   ranking label — provider match model');
  console.log('  aiRec vs status      override label — prior auth model');

  console.log('\n  NEXT STEPS');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('  python ml/data/export_mongodb.py');
  console.log('  python ml/features/patient_features.py');
  console.log('  python ml/train/train_risk_model.py');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err=>{ console.error('populate_db_ml failed:', err.message); process.exit(1); });
