const schemeCategoryNames = {
  HOUSING: 'Housing',
  AGRICULTURE: 'Agriculture',
  HEALTH_INSURANCE: 'Health',
  EDUCATION: 'Education',
  SOCIAL_WELFARE: 'Social welfare',
  PENSION: 'Pensions',
  WATER_SANITATION: 'Water',
  SKILL_EMPLOYMENT: 'Employment',
};

const schemeVisuals = {
  HOUSING: ['⌂', 'peach'],
  AGRICULTURE: ['❋', 'sage'],
  HEALTH_INSURANCE: ['✳', 'blue'],
  EDUCATION: ['⌂', 'lavender'],
  SOCIAL_WELFARE: ['♡', 'peach'],
  PENSION: ['♡', 'lavender'],
  WATER_SANITATION: ['◉', 'blue'],
  SKILL_EMPLOYMENT: ['✳', 'sage'],
};

export function adaptScheme(record) {
  const category = record.category || 'OTHER';
  const [icon, color] = schemeVisuals[category] || ['◎', 'sage'];
  return {
    title: record.title || record.name || 'Untitled scheme',
    hindi: record.ministry || record.scheme_code || '',
    category: schemeCategoryNames[category] || 'Other',
    description: record.description || record.benefits_summary || '',
    eligibility: 'Review the published criteria and document checklist. Confirm current rules with the official scheme source or Panchayat.',
    icon,
    color,
    sourceUrl: record.application_url || '',
    sourceStatus: 'Backend catalogue; eligibility still requires official confirmation.',
  };
}

const projectTypeNames = {
  ROAD_CONCRETING: 'Roads',
  DRAINAGE_CONSTRUCTION: 'Drainage',
  WATER_SUPPLY_NETWORK: 'Water & sanitation',
  COMMUNITY_BUILDING: 'Community facilities',
  SOLAR_LIGHTING: 'Energy',
  SANITATION_FACILITY: 'Sanitation',
  OTHER: 'Public works',
};

const projectStatusNames = {
  SANCTIONED: 'Sanctioned',
  TENDERING: 'Tendering',
  IN_PROGRESS: 'In progress',
  PHYSICALLY_COMPLETED: 'Physical work complete',
  COMPLETED_PENDING_AUDIT: 'Pending audit',
  AUDITED_AND_CLOSED: 'Completed',
  DELAYED_ALERT: 'Delayed',
};

const fundingSourceNames = {
  FIFTEENTH_FINANCE_COMMISSION: '15th Finance Commission',
  STATE_FINANCE_COMMISSION: 'State Finance Commission',
  MGNREGS: 'MGNREGS',
  SWACHH_BHARAT_MISSION: 'Swachh Bharat Mission',
  JAL_JEEVAN_MISSION: 'Jal Jeevan Mission',
  OWN_SOURCE_REVENUE: 'Panchayat own-source revenue',
};

function formatRupees(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  if (!value) return 'Schedule not supplied';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Schedule not supplied' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function adaptProject(record) {
  const workType = record.work_type || record.workType || 'OTHER';
  const status = record.status || 'SANCTIONED';
  const budget = record.sanctioned_budget ?? record.sanctionedBudget ?? record.budget;
  const spent = record.total_disbursed ?? record.totalDisbursed ?? record.spent ?? 0;
  const numericProgress = Number(record.progress);
  const projectCode = record.project_code || record.projectCode;
  const formatShortDate = (value) => {
    if (!value) return 'Not supplied';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not supplied' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return {
    id: projectCode || record.id,
    apiId: record.id,
    projectCode: projectCode || record.id,
    title: record.title || 'Untitled project',
    category: projectTypeNames[workType] || 'Public works',
    budget: formatRupees(budget),
    budgetAmount: Number(budget || 0),
    spent: Number(spent),
    progress: Number.isFinite(numericProgress) && record.progress !== null && record.progress !== undefined ? numericProgress : null,
    status: projectStatusNames[status] || status.replaceAll('_', ' ').toLowerCase(),
    date: formatDate(record.target_completion_date || record.targetCompletionDate),
    sanctionDate: formatShortDate(record.sanction_date || record.sanctionDate),
    startDate: formatShortDate(record.target_start_date || record.targetStartDate),
    completionDate: formatShortDate(record.target_completion_date || record.targetCompletionDate),
    fundingSource: fundingSourceNames[record.funding_source || record.fundingSource] || 'Not supplied',
    sanctionOrderNumber: record.sanction_order_number || record.sanctionOrderNumber || 'Not supplied',
    ward: record.ward_name || record.wardName || 'Panchayat-wide',
    isDemoRecord: String(projectCode || '').startsWith('DEMO-'),
    source: String(projectCode || '').startsWith('DEMO-') ? 'Illustrative backend seed' : 'Connected backend record',
  };
}
