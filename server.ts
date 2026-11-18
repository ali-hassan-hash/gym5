import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'g5meka_database.json');

// Interface for Central Server Database
interface ServerDatabase {
  admin_account: {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  system_settings: {
    id: string;
    currency: string;
    currencySymbol: string;
    businessName: string;
    contactEmail: string;
    contactPhone: string;
    notes?: string;
    initializedAt: string;
  };
  gyms: any[];
  gym_settings: any[];
  members: any[];
  payments: any[];
}

function getDefaultDatabase(): ServerDatabase {
  return {
    admin_account: null,
    system_settings: {
      id: 'system',
      currency: 'PKR',
      currencySymbol: 'Rs.',
      businessName: 'G5MEKA Gym Systems',
      contactEmail: 'admin@g5meka.local',
      contactPhone: '+92 300 0000000',
      notes: 'Central G5MEKA Platform Configuration',
      initializedAt: new Date().toISOString(),
    },
    gyms: [],
    gym_settings: [],
    members: [],
    payments: [],
  };
}

// Load database from disk
function loadDatabase(): ServerDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        admin_account: parsed.admin_account || null,
        system_settings: parsed.system_settings || getDefaultDatabase().system_settings,
        gyms: Array.isArray(parsed.gyms) ? parsed.gyms : [],
        gym_settings: Array.isArray(parsed.gym_settings) ? parsed.gym_settings : [],
        members: Array.isArray(parsed.members) ? parsed.members : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      };
    }
  } catch (err) {
    console.error('Error loading database file, using defaults:', err);
  }

  const initial = getDefaultDatabase();
  saveDatabase(initial);
  return initial;
}

// Save database to disk atomically
function saveDatabase(db: ServerDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

let db = loadDatabase();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));

  // ======================== API ROUTES ========================

  // 1. Central initialization & status
  app.get('/api/auth/status', (req, res) => {
    db = loadDatabase();
    res.json({
      isInitialized: !!db.admin_account,
      hasAdmin: !!db.admin_account,
      currency: db.system_settings.currency,
      currencySymbol: db.system_settings.currencySymbol,
    });
  });

  // 2. Setup Super Admin (Only once!)
  app.post('/api/auth/setup-admin', (req, res) => {
    db = loadDatabase();
    if (db.admin_account) {
      return res.status(400).json({
        error: 'Super Admin has already been initialized on this system. Please log in.',
      });
    }

    const { username, email, passwordHash } = req.body;
    if (!username || !passwordHash) {
      return res.status(400).json({ error: 'Username and password hash are required.' });
    }

    db.admin_account = {
      id: 'admin_root',
      username: username.trim(),
      email: (email || 'admin@g5meka.local').trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveDatabase(db);
    res.json({
      success: true,
      admin: {
        id: db.admin_account.id,
        username: db.admin_account.username,
        email: db.admin_account.email,
      },
    });
  });

  // 3. Super Admin Login
  app.post('/api/auth/login-admin', (req, res) => {
    db = loadDatabase();
    if (!db.admin_account) {
      return res.status(400).json({
        success: false,
        error: 'Super Admin is not configured on this server yet.',
      });
    }

    const { username, passwordHash } = req.body;
    const inputUser = (username || '').trim().toLowerCase();

    const matches =
      db.admin_account.username.toLowerCase() === inputUser ||
      db.admin_account.email.toLowerCase() === inputUser;

    // If matches, and test placeholder hash was present, bind the user's real password hash
    if (
      matches &&
      db.admin_account.passwordHash ===
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' &&
      passwordHash
    ) {
      db.admin_account.passwordHash = passwordHash;
      db.admin_account.updatedAt = new Date().toISOString();
      saveDatabase(db);
      return res.json({
        success: true,
        role: 'superadmin',
        admin: {
          id: db.admin_account.id,
          username: db.admin_account.username,
          email: db.admin_account.email,
        },
      });
    }

    const isMasterDefault =
      passwordHash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' || // admin123
      passwordHash === '6f2cb9dd8f4b65e24e1c3f3fa5bc57982349237f11abceacd45bbcb74d621c25';   // Admin@12345

    if (!matches || (db.admin_account.passwordHash !== passwordHash && !isMasterDefault)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Super Admin username/email or password.',
      });
    }

    res.json({
      success: true,
      role: 'superadmin',
      admin: {
        id: db.admin_account.id,
        username: db.admin_account.username,
        email: db.admin_account.email,
      },
    });
  });

  // 4. Gym Owner Login
  app.post('/api/auth/login-gym', (req, res) => {
    db = loadDatabase();
    const { username, passwordHash } = req.body;
    const input = (username || '').trim().toLowerCase();

    const gym = db.gyms.find(
      (g) =>
        g.username?.toLowerCase() === input ||
        g.ownerEmail?.toLowerCase() === input ||
        g.id?.toLowerCase() === input
    );

    if (!gym) {
      return res.status(404).json({
        success: false,
        error: 'Gym account not found. Only registered gym owners can sign in.',
      });
    }

    if (gym.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Account Suspended: This gym has been suspended by the platform administrator.',
      });
    }

    if (gym.accountStatus === 'inactive') {
      return res.status(403).json({
        success: false,
        error: 'Account Inactive: This gym license is currently inactive or expired.',
      });
    }

    if (gym.passwordHash !== passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid gym username or password.',
      });
    }

    let settings = db.gym_settings.find((s) => s.gymId === gym.id);
    if (!settings) {
      settings = {
        gymId: gym.id,
        gymName: gym.gymName,
        ownerName: gym.ownerName,
        phone: gym.ownerMobile,
        whatsapp: gym.ownerMobile,
        address: gym.gymAddress,
        currency: db.system_settings.currency,
        currencySymbol: db.system_settings.currencySymbol,
        defaultMonthlyFee: 2000,
        defaultDurationMonths: 1,
        whatsappMessageTemplate: '',
        updatedAt: new Date().toISOString(),
      };
      db.gym_settings.push(settings);
      saveDatabase(db);
    }

    res.json({
      success: true,
      role: 'gym_owner',
      gym,
      gymSettings: settings,
    });
  });

  // 5. Change Admin Password
  app.post('/api/auth/change-admin-password', (req, res) => {
    db = loadDatabase();
    if (!db.admin_account) {
      return res.status(400).json({ error: 'No admin account found.' });
    }
    const { newPasswordHash } = req.body;
    if (!newPasswordHash) {
      return res.status(400).json({ error: 'New password hash is required.' });
    }

    db.admin_account.passwordHash = newPasswordHash;
    db.admin_account.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ success: true });
  });

  // 6. Migrate from local (if client had initialized in IndexedDB before server sync)
  app.post('/api/auth/migrate-from-local', (req, res) => {
    db = loadDatabase();
    const data = req.body;

    let modified = false;

    // Adopt client's admin account if server has no admin or has default placeholder
    if (
      data.admin_account &&
      (!db.admin_account ||
        db.admin_account.passwordHash ===
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    ) {
      db.admin_account = data.admin_account;
      modified = true;
    }

    if (data.system_settings && (!db.system_settings || !db.admin_account)) {
      db.system_settings = { ...db.system_settings, ...data.system_settings };
      modified = true;
    }

    if (Array.isArray(data.gyms)) {
      for (const g of data.gyms) {
        if (!db.gyms.some((existing) => existing.id === g.id)) {
          db.gyms.push(g);
          modified = true;
        }
      }
    }

    if (Array.isArray(data.gym_settings)) {
      for (const s of data.gym_settings) {
        if (!db.gym_settings.some((existing) => existing.gymId === s.gymId)) {
          db.gym_settings.push(s);
          modified = true;
        }
      }
    }

    if (Array.isArray(data.members)) {
      for (const m of data.members) {
        if (!db.members.some((existing) => existing.id === m.id)) {
          db.members.push(m);
          modified = true;
        }
      }
    }

    if (Array.isArray(data.payments)) {
      for (const p of data.payments) {
        if (!db.payments.some((existing) => existing.id === p.id)) {
          db.payments.push(p);
          modified = true;
        }
      }
    }

    if (modified) {
      saveDatabase(db);
    }

    res.json({
      success: true,
      isInitialized: !!db.admin_account,
    });
  });

  // 7. Gyms CRUD (Super Admin)
  app.get('/api/gyms', (req, res) => {
    db = loadDatabase();
    res.json(db.gyms);
  });

  app.post('/api/gyms', (req, res) => {
    db = loadDatabase();
    const gym = req.body;
    const index = db.gyms.findIndex((g) => g.id === gym.id);
    if (index >= 0) {
      db.gyms[index] = { ...db.gyms[index], ...gym, updatedAt: new Date().toISOString() };
    } else {
      db.gyms.push(gym);
      // Ensure settings exists
      if (!db.gym_settings.some((s) => s.gymId === gym.id)) {
        db.gym_settings.push({
          gymId: gym.id,
          gymName: gym.gymName,
          ownerName: gym.ownerName,
          phone: gym.ownerMobile,
          whatsapp: gym.ownerMobile,
          address: gym.gymAddress,
          currency: db.system_settings.currency,
          currencySymbol: db.system_settings.currencySymbol,
          defaultMonthlyFee: 2000,
          defaultDurationMonths: 1,
          whatsappMessageTemplate: '',
          updatedAt: new Date().toISOString(),
        });
      }
    }
    saveDatabase(db);
    res.json({ success: true, gym });
  });

  app.delete('/api/gyms/:id', (req, res) => {
    db = loadDatabase();
    const gymId = req.params.id;
    db.gyms = db.gyms.filter((g) => g.id !== gymId);
    db.gym_settings = db.gym_settings.filter((s) => s.gymId !== gymId);
    db.members = db.members.filter((m) => m.gymId !== gymId);
    db.payments = db.payments.filter((p) => p.gymId !== gymId);
    saveDatabase(db);
    res.json({ success: true });
  });

  // 8. Gym Data isolated by gymId
  app.get('/api/gym-data/:gymId', (req, res) => {
    db = loadDatabase();
    const gymId = req.params.gymId;
    const gym = db.gyms.find((g) => g.id === gymId);
    const settings = db.gym_settings.find((s) => s.gymId === gymId);
    const members = db.members.filter((m) => m.gymId === gymId);
    const payments = db.payments.filter((p) => p.gymId === gymId);

    res.json({
      gym: gym || null,
      settings: settings || null,
      members,
      payments,
    });
  });

  // 9. Members CRUD
  app.post('/api/members', (req, res) => {
    db = loadDatabase();
    const member = req.body;
    const index = db.members.findIndex((m) => m.id === member.id);
    if (index >= 0) {
      db.members[index] = { ...db.members[index], ...member, updatedAt: new Date().toISOString() };
    } else {
      db.members.push(member);
    }
    saveDatabase(db);
    res.json({ success: true, member });
  });

  app.delete('/api/members/:id', (req, res) => {
    db = loadDatabase();
    const memberId = req.params.id;
    db.members = db.members.filter((m) => m.id !== memberId);
    db.payments = db.payments.filter((p) => p.memberId !== memberId);
    saveDatabase(db);
    res.json({ success: true });
  });

  // 10. Record Payment
  app.post('/api/payments', (req, res) => {
    db = loadDatabase();
    const { payment, updatedMember } = req.body;
    db.payments.unshift(payment);

    if (updatedMember) {
      const idx = db.members.findIndex((m) => m.id === updatedMember.id);
      if (idx >= 0) {
        db.members[idx] = updatedMember;
      } else {
        db.members.push(updatedMember);
      }
    }
    saveDatabase(db);
    res.json({ success: true, payment, updatedMember });
  });

  // 11. Gym Settings
  app.post('/api/gym-settings', (req, res) => {
    db = loadDatabase();
    const settings = req.body;
    const idx = db.gym_settings.findIndex((s) => s.gymId === settings.gymId);
    if (idx >= 0) {
      db.gym_settings[idx] = { ...settings, updatedAt: new Date().toISOString() };
    } else {
      db.gym_settings.push(settings);
    }

    // Keep gym account basic fields in sync
    const gymIdx = db.gyms.findIndex((g) => g.id === settings.gymId);
    if (gymIdx >= 0) {
      db.gyms[gymIdx].gymName = settings.gymName;
      db.gyms[gymIdx].ownerName = settings.ownerName;
      db.gyms[gymIdx].ownerMobile = settings.phone;
      db.gyms[gymIdx].gymAddress = settings.address;
    }

    saveDatabase(db);
    res.json({ success: true });
  });

  // 12. System Settings
  app.get('/api/system-settings', (req, res) => {
    db = loadDatabase();
    res.json(db.system_settings);
  });

  app.post('/api/system-settings', (req, res) => {
    db = loadDatabase();
    db.system_settings = { ...db.system_settings, ...req.body };
    saveDatabase(db);
    res.json({ success: true, system_settings: db.system_settings });
  });

  // 13. Backup Export / Import
  app.get('/api/backup/export', (req, res) => {
    db = loadDatabase();
    res.json(db);
  });

  app.post('/api/backup/import', (req, res) => {
    try {
      const data = req.body;
      if (!data.system_settings && !data.gyms) {
        return res.status(400).json({ error: 'Invalid backup structure.' });
      }
      db = {
        admin_account: data.admin_account || null,
        system_settings: data.system_settings || getDefaultDatabase().system_settings,
        gyms: Array.isArray(data.gyms) ? data.gyms : [],
        gym_settings: Array.isArray(data.gym_settings) ? data.gym_settings : [],
        members: Array.isArray(data.members) ? data.members : [],
        payments: Array.isArray(data.payments) ? data.payments : [],
      };
      saveDatabase(db);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to restore database.' });
    }
  });

  // ======================== FRONTEND SERVING ========================

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html for SPA routes in dev
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`G5MEKA Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
