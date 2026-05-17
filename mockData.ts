import { Role, User, GoalSheet, CompanySettings, DEFAULT_THRUST_AREAS } from './types';

export const DEFAULT_SETTINGS: CompanySettings = {
  name: 'Global Corp',
  logoColor: 'bg-brand-accent',
  thrustAreas: DEFAULT_THRUST_AREAS,
  activePeriod: 'HY1 - 2024 Performance Cycle',
  maxGoals: 8,
  minWeightage: 10,
  escalationRules: {
    submissionDays: 14,
    approvalDays: 7,
    checkInDays: 30
  },
  entraIdConnected: true,
  lastEntraSync: new Date().toISOString()
};

export const MOCK_USERS: (User & { password?: string })[] = [
  { id: 'emp1', name: 'Alex Rivera', email: 'employee@gmail.com', password: 'employee321', role: 'EMPLOYEE', managerId: 'mgr1' },
  { id: 'mgr1', name: 'Morgan Lee', email: 'manager@gmail.com', password: 'manager321', role: 'MANAGER', managerId: 'adm1' },
  { id: 'adm1', name: 'System Admin', email: 'admin@gmail.com', password: 'admin321', role: 'ADMIN' },
];

export const MOCK_GOAL_SHEETS: GoalSheet[] = [
  {
    id: 'gs1',
    employeeId: 'emp1',
    employeeName: 'Alex Rivera',
    managerId: 'mgr1',
    period: DEFAULT_SETTINGS.activePeriod,
    approvalStatus: 'DRAFT',
    lastUpdated: new Date().toISOString(),
    goals: []
  }
];
