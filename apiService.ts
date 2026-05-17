import { GoalSheet, CompanySettings, User } from '../types';

export const apiService = {
  async login(email: string, pass: string) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },

  async getGoalSheets(): Promise<GoalSheet[]> {
    const res = await fetch('/api/goal-sheets');
    return res.json();
  },

  async saveGoalSheets(sheets: GoalSheet[]) {
    await fetch('/api/goal-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheets),
    });
  },

  async getSettings(): Promise<CompanySettings> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async saveSettings(settings: CompanySettings) {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },

  async getAuditLog() {
    const res = await fetch('/api/audit-log');
    return res.json();
  },

  async addAuditEntry(entry: { id: string; action: string; user: string; timestamp: string }) {
    await fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  },

  async getNotifications() {
    const res = await fetch('/api/notifications');
    return res.json();
  },

  async getEscalations() {
    const res = await fetch('/api/escalations');
    return res.json();
  },

  async runEscalationCheck() {
    const res = await fetch('/api/escalate-check', { method: 'POST' });
    return res.json();
  },

  async syncEntraId() {
    const res = await fetch('/api/entra-sync', { method: 'POST' });
    return res.json();
  },

  async notifyTeams(payload: { recipientId: string; title: string; content: string; link: string }) {
    const res = await fetch('/api/teams/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
};
