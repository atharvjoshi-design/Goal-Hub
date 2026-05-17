/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export type UoMType = 'MIN' | 'MAX' | 'TIMELINE' | 'ZERO';

export type GoalStatus = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED';

export type ApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REWORK';

export interface Goal {
  id: string;
  thrustArea: string;
  title: string;
  description: string;
  uom: UoMType;
  target: string | number;
  weightage: number;
  actual?: number | string;
  status: GoalStatus;
  isShared?: boolean;
  parentGoalId?: string;
}

export interface CheckInComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface GoalSheet {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  period: string; // e.g., "Phase 1 - 2024"
  goals: Goal[];
  approvalStatus: ApprovalStatus;
  managerComments?: string;
  checkInComments?: CheckInComment[];
  lastUpdated: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string;
}

export interface CompanySettings {
  name: string;
  logoColor: string;
  thrustAreas: string[];
  activePeriod: string;
  maxGoals: number;
  minWeightage: number;
  escalationRules: {
    submissionDays: number;
    approvalDays: number;
    checkInDays: number;
  };
  entraIdConnected: boolean;
  lastEntraSync?: string;
}

export interface Escalation {
  id: string;
  type: 'SUBMISSION' | 'APPROVAL' | 'CHECKIN';
  targetUserId: string;
  targetUserName: string;
  managerId: string;
  daysOverdue: number;
  status: 'OPEN' | 'RESOLVED' | 'ESCALATED_TO_HR';
  timestamp: string;
}

export interface TeamsMessage {
  id: string;
  recipientId: string;
  title: string;
  content: string;
  link: string;
  sentAt: string;
}

export const DEFAULT_THRUST_AREAS = [
  'Customer Experience',
  'Operational Excellence',
  'Innovation & R&D',
  'Product Quality',
  'Sales Growth',
  'Employee Engagement'
];

export const UOM_OPTIONS: { value: UoMType; label: string }[] = [
  { value: 'MIN', label: 'Numeric/ % (Higher is Better)' },
  { value: 'MAX', label: 'Numeric/ % (Lower is Better)' },
  { value: 'TIMELINE', label: 'Timeline (Date-based)' },
  { value: 'ZERO', label: 'Zero (Success = 0)' }
];
