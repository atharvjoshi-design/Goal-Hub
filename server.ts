import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { MOCK_USERS, MOCK_GOAL_SHEETS, DEFAULT_SETTINGS } from './src/mockData';

const DB_FILE = path.join(process.cwd(), 'database.json');

async function ensureDB() {
  try {
    await fs.access(DB_FILE);
  } catch {
    const initialData = {
      users: MOCK_USERS,
      goalSheets: MOCK_GOAL_SHEETS,
      settings: DEFAULT_SETTINGS,
      escalations: [
        { 
          id: 'esc1', 
          type: 'SUBMISSION', 
          targetUserId: 'emp1', 
          targetUserName: 'Alex Rivera', 
          managerId: 'mgr1', 
          daysOverdue: 5, 
          status: 'OPEN', 
          timestamp: new Date().toISOString() 
        }
      ],
      teamsMessages: [],
      auditLog: [
        { id: '1', action: 'System Init', user: 'System', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: '2', action: 'Period Config Updated', user: 'Admin HR', timestamp: new Date(Date.now() - 43200000).toISOString() }
      ],
      notifications: [
        { id: 'n1', title: 'Action Required', message: 'Goal submission window for Q1 closes in 5 days.', time: '1h ago', type: 'alert' },
        { id: 'n2', title: 'System Notice', message: 'Entra ID Sync completed successfully: 242 profiles updated.', time: '4h ago', type: 'success' },
        { id: 'n3', title: 'Teams Update', message: 'New feedback logged for your Innovate Goal via MS Teams.', time: 'Yesterday', type: 'info' }
      ]
    };
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

async function getDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, re-initializing...', err);
    await ensureDB();
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  }
}

async function saveDB(data: any) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  await ensureDB();
  const app = express();
  app.use(express.json());

  // API Routes
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const db = await getDB();
    const user = db.users.find((u: any) => u.email === email && u.password === password);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.get('/api/goal-sheets', async (req, res) => {
    const db = await getDB();
    res.json(db.goalSheets);
  });

  app.post('/api/goal-sheets', async (req, res) => {
    const db = await getDB();
    db.goalSheets = req.body;
    await saveDB(db);
    res.json({ status: 'ok' });
  });

  app.get('/api/settings', async (req, res) => {
    const db = await getDB();
    res.json(db.settings);
  });

  app.post('/api/settings', async (req, res) => {
    const db = await getDB();
    db.settings = req.body;
    await saveDB(db);
    res.json({ status: 'ok' });
  });

  app.get('/api/audit-log', async (req, res) => {
    const db = await getDB();
    res.json(db.auditLog);
  });

  app.post('/api/audit-log', async (req, res) => {
    const db = await getDB();
    db.auditLog = [req.body, ...db.auditLog].slice(0, 100);
    await saveDB(db);
    res.json({ status: 'ok' });
  });

  app.get('/api/notifications', async (req, res) => {
    const db = await getDB();
    res.json(db.notifications);
  });

  app.post('/api/notifications', async (req, res) => {
    const db = await getDB();
    db.notifications = req.body;
    await saveDB(db);
    res.json({ status: 'ok' });
  });

  app.get('/api/escalations', async (req, res) => {
    const db = await getDB();
    res.json(db.escalations || []);
  });

  app.post('/api/escalate-check', async (req, res) => {
    const db = await getDB();
    // Simulate finding an escalation
    const newEscalation = {
      id: `esc-${Date.now()}`,
      type: 'CHECKIN',
      targetUserId: 'emp1',
      targetUserName: 'Alex Rivera',
      managerId: 'mgr1',
      daysOverdue: 2,
      status: 'OPEN',
      timestamp: new Date().toISOString()
    };
    db.escalations = [newEscalation, ...(db.escalations || [])];
    await saveDB(db);
    res.json(newEscalation);
  });

  app.post('/api/entra-sync', async (req, res) => {
    const db = await getDB();
    db.settings.lastEntraSync = new Date().toISOString();
    // Simulate updating a user name or role from "AD"
    const emp = db.users.find((u: any) => u.id === 'emp1');
    if (emp) emp.name = 'Alex Rivera (SSO Verified)';
    await saveDB(db);
    res.json({ status: 'success', syncedAt: db.settings.lastEntraSync });
  });

  app.post('/api/teams/notify', async (req, res) => {
    const db = await getDB();
    const message = {
      id: `tm-${Date.now()}`,
      ...req.body,
      sentAt: new Date().toISOString()
    };
    db.teamsMessages = [message, ...(db.teamsMessages || [])];
    await saveDB(db);
    res.json({ status: 'delivered', messageId: message.id });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
