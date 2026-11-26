export interface EventPayloadMap {
  'ASSET_DAMAGED': {
    assetId: string;
    assetUid: string;
    assetCategory: string;
    wardId: string;
    reportedByUserId: string;
    description: string;
    geoCoordinates: { latitude: number; longitude: number };
    photoUrl?: string;
  };
  'CITIZEN_VERIFICATION_SUBMITTED': {
    verificationId: string;
    projectId: string;
    milestoneId?: string;
    verifiedByUserId: string;
    rating: 'SATISFACTORY' | 'DEFECTIVE' | 'INCOMPLETE' | 'FRAUD_SUSPECTED';
    auditVarianceFlag: boolean;
    photoUrls: string[];
    observations: string;
  };
  'GRAM_SABHA_RESOLUTION_PASSED': {
    meetingId: string;
    resolutionId: string;
    resolutionNumber: string;
    resolutionType: 'NEW_CIVIL_WORK' | 'MAINTENANCE_CIVIC_ACTION' | 'WELFARE_APPROVAL';
    title: string;
    estimatedBudget?: number;
    fundingStream?: string;
  };
  'COMPLAINT_CLUSTERED': {
    serviceType: 'DRINKING_WATER' | 'STREET_LIGHTING' | 'SANITATION_WASTE';
    wardId: string;
    clusterWindowHours: number;
    complaintCount: number;
    ticketIds: string[];
  };
  'ASSISTED_SUBMISSION_COMPLETED': {
    sessionId: string;
    operatorUserId: string;
    citizenName: string;
    targetModule: string;
    targetRecordId: string;
    trackingToken: string;
  };
}
