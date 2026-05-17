import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  CheckCircle2, 
  Settings, 
  Users, 
  Plus, 
  Trash2, 
  Send, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shield,
  TrendingUp,
  AlertCircle,
  FileText,
  UserCircle,
  LogOut,
  AppWindow,
  ArrowRight,
  BarChart3,
  Calendar,
  Layers,
  CircleDot,
  Lock,
  Bell,
  Activity,
  Zap,
  Clock,
  ExternalLink,
  ShieldAlert,
  Mail,
  MessageSquareShare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Role, 
  Goal, 
  GoalSheet, 
  ApprovalStatus, 
  CompanySettings, 
  UOM_OPTIONS,
  GoalStatus,
  User,
  Escalation
} from './types';
import { apiService } from './services/apiService';

// --- Components ---

const ProgressBar = ({ value, color = 'bg-brand-accent' }: { value: number; color?: string }) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${clampedValue}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-2 rounded-full ${color}`} 
      />
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<Role>('EMPLOYEE');
  const [goalSheets, setGoalSheets] = useState<GoalSheet[]>([]);
  const [settings, setSettings] = useState<CompanySettings>({
    name: "Goal Hub",
    activePeriod: "Q1 2024",
    maxGoals: 8,
    thrustAreas: ["Sales", "Product"],
    minWeightage: 10
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [notifications, setNotifications] = useState<{id: string, title: string, message: string, time: string, type: 'info' | 'alert' | 'success'}[]>([]);
  const [auditLog, setAuditLog] = useState<{id: string, action: string, user: string, timestamp: string}[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [sheets, config, logs, notifs, escs] = await Promise.all([
          apiService.getGoalSheets(),
          apiService.getSettings(),
          apiService.getAuditLog(),
          apiService.getNotifications(),
          apiService.getEscalations()
        ]);
        setGoalSheets(sheets);
        setSettings(config);
        setAuditLog(logs);
        setNotifications(notifs);
        setEscalations(escs);
        
        // Restore session from localStorage if exists
        const savedUser = localStorage.getItem('goal_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setCurrentRole(user.role);
          setIsLoggedIn(true);
          setAuthEmail(user.email);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    };
    loadData();
  }, []);

  // Sync GoalSheets to Backend
  useEffect(() => {
    if (isLoggedIn && goalSheets.length > 0) {
      const timer = setTimeout(() => {
        apiService.saveGoalSheets(goalSheets);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [goalSheets, isLoggedIn]);

  // Sync Settings to Backend
  useEffect(() => {
    if (isLoggedIn && settings.name !== "Goal Hub") { // Simple check to avoid initial sync
      apiService.saveSettings(settings);
    }
  }, [settings, isLoggedIn]);

  const addAuditEntry = (action: string) => {
    const entry = {
      id: Date.now().toString(),
      action,
      user: currentUser?.name || 'System',
      timestamp: new Date().toISOString()
    };
    setAuditLog(prev => [entry, ...prev].slice(0, 50));
    apiService.addAuditEntry(entry);
  };

  const handleLogin = async (email: string, pass: string) => {
    try {
      const data = await apiService.login(email, pass);
      setCurrentUser(data.user);
      setAuthEmail(data.user.email);
      setCurrentRole(data.user.role);
      setIsLoggedIn(true);
      setLoginError('');
      setActiveTab('dashboard');
      addAuditEntry(`User logged in: ${data.user.name} (${data.user.role})`);
      localStorage.setItem('goal_user', JSON.stringify(data.user));
    } catch (err) {
      setLoginError('Invalid credentials. Please check your email and password.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthEmail('');
    setCurrentUser(null);
    setLoginError('');
    localStorage.removeItem('goal_user');
  };

  const activeSheet = useMemo(() => 
    goalSheets.find(gs => gs.id === selectedSheetId) || goalSheets[0] || { goals: [], approvalStatus: 'DRAFT' as ApprovalStatus },
  [goalSheets, selectedSheetId]);

  const teamSheets = useMemo(() => 
    currentUser ? goalSheets.filter(gs => gs.managerId === currentUser.id) : [],
  [goalSheets, currentUser]);

  // If role changes to employee, auto-select their sheet
  useEffect(() => {
    if (currentRole === 'EMPLOYEE' && currentUser) {
      const mySheet = goalSheets.find(gs => gs.employeeId === currentUser.id);
      if (mySheet) setSelectedSheetId(mySheet.id);
    }
  }, [currentRole, currentUser, goalSheets]);

  // Validation for the ACTIVE sheet
  const totalWeightage = activeSheet.goals.reduce((acc, g) => acc + g.weightage, 0);
  const isValidWeightage = totalWeightage === 100;
  const hasMinGoals = activeSheet.goals.length > 0;
  const hasMaxGoalsExceeded = activeSheet.goals.length > settings.maxGoals;
  const hasInvalidIndividualWeightage = activeSheet.goals.some(g => g.weightage < settings.minWeightage);

  const canSubmit = isValidWeightage && !hasMaxGoalsExceeded && !hasInvalidIndividualWeightage && hasMinGoals;

  const handleAddGoal = () => {
    const newGoal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      thrustArea: settings.thrustAreas[0],
      title: '',
      description: '',
      uom: 'MIN',
      target: '',
      weightage: 0,
      status: 'NOT_STARTED'
    };
    setGoalSheets(prev => prev.map(gs => gs.id === activeSheet.id ? {
      ...gs,
      goals: [...gs.goals, newGoal]
    } : gs));
  };

  const handleUpdateGoal = (sheetId: string, goalId: string, updates: Partial<Goal>) => {
    setGoalSheets(prev => {
      const sheet = prev.find(s => s.id === sheetId);
      const goal = sheet?.goals.find(g => g.id === goalId);
      
      if (goal && updates.actual !== undefined && goal.actual !== updates.actual) {
        addAuditEntry(`Achievement Update: ${sheet?.employeeName} updated "${goal.title}" actual to ${updates.actual}`);
      }

      const updatedSheets = prev.map(gs => gs.id === sheetId ? {
        ...gs,
        lastUpdated: new Date().toISOString(),
        goals: gs.goals.map(g => g.id === goalId ? { ...g, ...updates } : g)
      } : gs);

      // Simple sync simulation: if this was a shared goal and achievement updated, sync to all instances
      if (updates.actual !== undefined) {
        const sourceSheet = updatedSheets.find(s => s.id === sheetId);
        const sourceGoal = sourceSheet?.goals.find(g => g.id === goalId);
        if (sourceGoal?.isShared && sourceGoal.parentGoalId) {
          return updatedSheets.map(gs => ({
            ...gs,
            goals: gs.goals.map(g => g.parentGoalId === sourceGoal.parentGoalId ? { ...g, actual: updates.actual } : g)
          }));
        }
      }
      return updatedSheets;
    });
  };

  const handleExportReport = () => {
    const headers = ['Employee', 'Strategic Area', 'Goal Title', 'UOM', 'Target', 'Actual', 'Status', 'Completion %'];
    const rows = goalSheets.flatMap(sheet => 
      sheet.goals.map(goal => [
        sheet.employeeName,
        goal.thrustArea,
        goal.title,
        goal.uom,
        goal.target,
        goal.actual || 0,
        goal.status,
        `${calculateProgressValue(goal)}%`
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const downloadLink = document.createElement('a');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.setAttribute('download', `Achievement_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    addAuditEntry('Achievement Report Exported (CSV)');
  };

  const handleDeleteGoal = (sheetId: string, goalId: string) => {
    setGoalSheets(prev => prev.map(gs => gs.id === sheetId ? {
      ...gs,
      lastUpdated: new Date().toISOString(),
      goals: gs.goals.filter(g => g.id !== goalId)
    } : gs));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setGoalSheets(prev => prev.map(gs => gs.id === activeSheet.id ? {
      ...gs,
      approvalStatus: 'SUBMITTED',
      lastUpdated: new Date().toISOString()
    } : gs));
    setActiveTab('dashboard');
  };

  const handleApprove = () => {
    addAuditEntry(`Approved goal sheet for ${activeSheet.employeeName}`);
    setGoalSheets(prev => prev.map(gs => gs.id === activeSheet.id ? {
      ...gs,
      approvalStatus: 'APPROVED',
      lastUpdated: new Date().toISOString()
    } : gs));
  };

  const handleRework = () => {
    setGoalSheets(prev => prev.map(gs => gs.id === activeSheet.id ? {
      ...gs,
      approvalStatus: 'REWORK',
      lastUpdated: new Date().toISOString()
    } : gs));
  };

  const handleAddCheckInComment = () => {
    if (!commentText.trim() || !currentUser) return;
    const newComment = {
      id: Date.now().toString(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      text: commentText,
      timestamp: new Date().toISOString()
    };
    setGoalSheets(prev => prev.map(gs => gs.id === activeSheet.id ? {
      ...gs,
      checkInComments: [...(gs.checkInComments || []), newComment]
    } : gs));
    setCommentText('');
  };

  const handleUnlock = () => {
    addAuditEntry(`Unlocked sheet for ${activeSheet.employeeName} (Exception Handling)`);
    setGoalSheets(prev => prev.map(gs => gs.id === activeSheet.id ? {
      ...gs,
      approvalStatus: 'REWORK',
      lastUpdated: new Date().toISOString()
    } : gs));
  };

  const handleEntraSync = async () => {
    setIsSyncing(true);
    try {
      const result = await apiService.syncEntraId();
      setSettings(prev => ({ ...prev, lastEntraSync: result.syncedAt }));
      addAuditEntry('Microsoft Entra ID Hierarchy Sync Triggered');
      
      // Simulate refetching users/sheets if they changed
      const sheets = await apiService.getGoalSheets();
      setGoalSheets(sheets);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEscalationCheck = async () => {
    try {
      const newEsc = await apiService.runEscalationCheck();
      setEscalations(prev => [newEsc, ...prev]);
      addAuditEntry(`Automated Escalation Rule Triggered for ${newEsc.targetUserName}`);
    } catch (err) {
      console.error(err);
    }
  };

  const isStructurallyLocked = useMemo(() => {
    if (currentRole === 'ADMIN') return false; // Admin has full power
    if (currentRole === 'EMPLOYEE') return false; // Per user request: employees can keep editing/deleting goals even if approved/completed
    if (activeSheet.approvalStatus === 'APPROVED' && currentRole === 'MANAGER') return true; // Manager shouldn't edit after they approved it (unless they unlock or admin does)
    if (activeSheet.approvalStatus === 'SUBMITTED' && currentRole === 'MANAGER') return false; // Manager can inline edit during approval
    return false; // Default: allow editing for the employee
  }, [currentRole, activeSheet.approvalStatus]);

  const calculateProgressValue = (goal: Goal) => {
    if (goal.status === 'COMPLETED') return 100;
    if (!goal.actual) return 0;
    const actual = Number(goal.actual);
    const target = Number(goal.target);
    if (isNaN(actual) || isNaN(target) || target === 0) return 0;
    
    if (goal.uom === 'MIN') return (actual / target) * 100;
    if (goal.uom === 'MAX') return (target / actual) * 100;
    if (goal.uom === 'ZERO') return actual === 0 ? 100 : 0;
    return 0;
  };

  const teamStats = useMemo(() => {
    const totalGoals = teamSheets.reduce((acc, s) => acc + s.goals.length, 0);
    const completedGoals = teamSheets.reduce((acc, s) => acc + s.goals.filter(g => calculateProgressValue(g) >= 100).length, 0);
    const avgProgress = teamSheets.length > 0 
      ? teamSheets.reduce((acc, s) => acc + (s.goals.reduce((ga, g) => ga + calculateProgressValue(g), 0) / (s.goals.length || 1)), 0) / teamSheets.length 
      : 0;
    const pendingReviews = teamSheets.filter(s => s.approvalStatus === 'SUBMITTED').length;
    
    return {
      avgProgress: Math.round(avgProgress),
      pendingReviews,
      totalEmployees: teamSheets.length,
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }, [teamSheets]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-brand-bg overflow-hidden relative">
      {/* Mobile Header */}
      <div className="lg:hidden bg-brand-dark text-white p-4 flex justify-between items-center z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${settings.logoColor || 'bg-brand-accent'} rounded-lg flex items-center justify-center`}>
            <AppWindow className="text-white" size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tighter font-serif">{settings.name}</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <Plus size={24} className="rotate-45" /> : <Layers size={24} />}
        </button>
      </div>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 bg-brand-dark text-white flex flex-col shadow-2xl z-50 
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${settings.logoColor || 'bg-brand-accent'} rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20`}>
              <AppWindow className="text-white" size={28} />
            </div>
            <div>
              <h1 className="font-bold text-2xl tracking-tighter leading-none font-serif">{settings.name}</h1>
              <p className="text-[11px] text-brand-accent/80 font-bold tracking-[0.2em] uppercase mt-1">Goal Hub</p>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden ml-auto p-2 hover:bg-white/10 rounded-lg text-white/50"
            >
              <Plus size={24} className="rotate-45" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-8 space-y-3 overflow-y-auto custom-scrollbar">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
          />
          
          {/* Employee Tabs */}
          {currentRole === 'EMPLOYEE' && (
            <NavItem 
              icon={<Target size={20} />} 
              label="My Goals" 
              active={activeTab === 'goals'} 
              onClick={() => { setActiveTab('goals'); setIsMobileMenuOpen(false); }} 
            />
          )}

          {/* Manager Tabs */}
          {currentRole === 'MANAGER' && (
            <>
              <NavItem 
                icon={<Target size={20} />} 
                label="Team Goals" 
                active={activeTab === 'goals'} 
                onClick={() => { setActiveTab('goals'); setIsMobileMenuOpen(false); }} 
              />
              <NavItem 
                icon={<CircleDot size={20} />} 
                label="Review Submissions" 
                active={activeTab === 'approvals'} 
                onClick={() => { setActiveTab('approvals'); setIsMobileMenuOpen(false); }} 
                badge={teamSheets.filter(s => s.approvalStatus === 'SUBMITTED').length || undefined}
              />
              <NavItem 
                icon={<BarChart3 size={20} />} 
                label="Team Reports" 
                active={activeTab === 'reports'} 
                onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} 
              />
            </>
          )}

          {/* Admin Tabs */}
          {currentRole === 'ADMIN' && (
            <>
              <NavItem 
                icon={<Target size={20} />} 
                label="Strategic Goals" 
                active={activeTab === 'goals'} 
                onClick={() => { setActiveTab('goals'); setIsMobileMenuOpen(false); }} 
              />
              <NavItem 
                icon={<BarChart3 size={20} />} 
                label="Org Analytics" 
                active={activeTab === 'reports'} 
                onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} 
              />
              <NavItem 
                icon={<Layers size={20} />} 
                label="System Hierarchy" 
                active={activeTab === 'org'} 
                onClick={() => { setActiveTab('org'); setIsMobileMenuOpen(false); }} 
              />
              <NavItem 
                icon={<Settings size={20} />} 
                label="Global Config" 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} 
              />
            </>
          )}
        </nav>

        <div className="p-6">
          <div className="p-5 rounded-[24px] bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent/10 rounded-full flex items-center justify-center border border-brand-accent/20">
                <UserCircle size={24} className="text-brand-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest">{currentRole}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full py-2.5 text-xs font-bold text-brand-muted hover:text-white border border-white/10 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-white/5"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-bg relative flex flex-col">
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 w-1/2 h-64 bg-gradient-to-b from-brand-accent/5 to-transparent pointer-events-none -z-10" />

        <div className="max-w-7xl w-full mx-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 md:mb-16">
            <div>
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">
                <Calendar size={14} /> {settings.activePeriod}
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-brand-dark italic">
                {activeTab === 'dashboard' ? `Good morning, ${currentUser?.name.split(' ')[0]}` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Notification Center */}
              <div className="relative">
                <button 
                  className="p-3 md:p-4 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm text-brand-dark transition-all relative group"
                >
                   <Bell size={18} className="group-hover:rotate-12 transition-transform" />
                   {notifications.length > 0 && (
                     <span className="absolute top-2 right-2 md:top-3 md:right-3 w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                       {notifications.length}
                     </span>
                   )}
                </button>
              </div>

               <div className="flex-1 md:flex-initial flex items-center gap-3 px-4 md:px-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <span className="shrink-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-brand-accent rounded-full border-2 border-white shadow-[0_0_10px_rgba(138,154,91,0.5)]" />
                  <span className="text-[12px] md:text-sm font-bold text-brand-muted tracking-tight truncate">Active Cycle: Q1 Growth</span>
               </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Stats Section */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {currentRole === 'EMPLOYEE' ? (
                    <>
                      <StatCard 
                        title="Submission State" 
                        value={activeSheet.approvalStatus} 
                        icon={<FileText className="text-brand-accent" />}
                        color={activeSheet.approvalStatus === 'APPROVED' ? 'text-brand-accent' : 'text-brand-dark'}
                      />
                      <StatCard 
                        title="Form Compliance" 
                        value={canSubmit || activeSheet.approvalStatus === 'APPROVED' ? "Ready" : "Pending"} 
                        icon={<AlertCircle className={canSubmit ? "text-brand-accent" : "text-brand-muted"} />}
                        description="Weightage must be 100%"
                      />
                      <StatCard 
                        title="Overall Completion" 
                        value={`${Math.round(activeSheet.goals.reduce((acc, g) => acc + calculateProgressValue(g), 0) / (activeSheet.goals.length || 1))}%`} 
                        icon={<BarChart3 className="text-blue-500" />}
                        description="Computed from actuals"
                      />
                    </>
                  ) : (
                    <>
                      <StatCard 
                        title="Team Engagement" 
                        value={`${teamStats.totalEmployees} Members`} 
                        icon={<Users className="text-brand-accent" />}
                        description={`${teamStats.pendingReviews} pending your review`}
                      />
                      <StatCard 
                        title="Team Avg. Progress" 
                        value={`${teamStats.avgProgress}%`} 
                        icon={<TrendingUp className="text-blue-500" />}
                        description="Across all strategic areas"
                      />
                      <StatCard 
                        title="Target Hit Rate" 
                        value={`${teamStats.completionRate}%`} 
                        icon={<CheckCircle2 className="text-brand-accent" />}
                        description="Full target achievement"
                      />
                    </>
                  )}
                </div>

                {/* Goals Overview */}
                <div className="lg:col-span-2 space-y-8">
                  {currentRole === 'EMPLOYEE' && activeSheet.goals.length === 0 && (
                    <div className="bg-brand-accent/5 border border-brand-accent/20 p-8 rounded-[40px] relative overflow-hidden group">
                       <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-4">
                             <div className="p-3 bg-brand-accent text-white rounded-2xl">
                                <Zap size={20} />
                             </div>
                             <h3 className="text-xl font-bold font-serif italic">Kickstart Your Quarter</h3>
                          </div>
                          <p className="text-sm text-brand-dark max-w-md leading-relaxed mb-6">
                             Ready to define your success? Start by adding your first strategic goal. We recommend 3-5 high-impact objectives to stay aligned with team vision.
                          </p>
                          <button 
                            onClick={() => setActiveTab('goals')}
                            className="px-8 py-4 bg-brand-dark text-white rounded-2xl font-bold flex items-center gap-3 hover:shadow-xl transition-all"
                          >
                             Open Goal Editor <Plus size={18} />
                          </button>
                       </div>
                       <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    </div>
                  )}

                  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-bold font-serif">Goal Alignment Progress</h3>
                      <p className="text-sm text-brand-muted font-medium">Real-time status of your Phase 1 objectives</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('goals')} 
                      className="group p-3 bg-brand-bg rounded-2xl hover:bg-brand-accent hover:text-white transition-all"
                    >
                      <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-8">
                    {activeSheet.goals.map((goal, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-end mb-3">
                          <div className="space-y-1">
                             <span className="px-2 py-0.5 bg-brand-bg text-[9px] font-bold uppercase tracking-wider rounded text-brand-muted">{goal.thrustArea}</span>
                             <p className="text-sm font-bold text-brand-dark">{goal.title || 'Untitled Goal'}</p>
                          </div>
                          <div className="text-right">
                             <span className="text-lg font-black">{Math.round(calculateProgressValue(goal))}%</span>
                             <p className="text-[10px] text-brand-muted font-bold uppercase tracking-tighter">Achievement</p>
                          </div>
                        </div>
                        <ProgressBar 
                          value={calculateProgressValue(goal)} 
                          color={calculateProgressValue(goal) >= 100 ? 'bg-brand-accent' : 'bg-brand-accent/60'}
                        />
                      </div>
                    ))}
                    {activeSheet.goals.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 gap-4 border-2 border-dashed border-brand-bg rounded-[32px]">
                        <Target className="text-brand-bg" size={48} />
                        <p className="text-brand-muted font-bold">Your goal sheet is empty.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
                <div className="space-y-8">
                  <div className="bg-brand-dark text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="mb-8">
                        <Calendar className="text-brand-accent mb-4" size={32} />
                        <h3 className="text-2xl font-bold font-serif tracking-tight">Timeline Check</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <ScheduleItem 
                          label="Phase 1: Goal Setting" 
                          date="Starts May 1st" 
                          description="Creation, Submission & Approval"
                          completed 
                        />
                        <ScheduleItem 
                          label="Q1 Progress Check-in" 
                          date="July Window" 
                          description="Planned vs. Actual Review"
                          active 
                        />
                        <ScheduleItem 
                          label="Q2 Progress Check-in" 
                          date="October Window" 
                          description="Mid-year alignment sync"
                        />
                        <ScheduleItem 
                          label="Q3 Progress Check-in" 
                          date="January Window" 
                          description="Quarterly milestone tracking"
                        />
                        <ScheduleItem 
                          label="Q4 / Annual Review" 
                          date="March / April" 
                          description="Final Achievement Capture"
                        />
                      </div>
                      
                      <button className="w-full mt-10 py-5 bg-brand-accent text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-accent/20">
                        View Detailed Policy
                      </button>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-brand-accent/10 rounded-full blur-[80px]" />
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                    <h4 className="font-bold mb-4 flex items-center gap-2 font-serif">
                       <AlertCircle size={18} className="text-brand-accent" />
                       Action Required
                    </h4>
                    <p className="text-sm text-brand-muted mb-6 leading-relaxed">
                       {activeSheet.goals.length < 3 ? "We recommend setting at least 3-5 goals for meaningful quarterly tracking." : "Ensure all targets correspond to the approved Unit of Measurement."}
                    </p>
                    <button onClick={() => setActiveTab('goals')} className="text-xs font-bold text-brand-dark flex items-center gap-1 group">
                       Go to editor <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div 
                key="goals"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="space-y-10"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-1">
                    <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto overflow-x-auto no-scrollbar">
                       <FilterButton label="Active Goals" active />
                       <FilterButton label="Archive" />
                       <FilterButton label="Shared KPIs" />
                    </div>
                    <div className="flex items-center gap-2 px-2 text-[10px] text-brand-muted font-bold">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                       All changes are saved automatically to your workspace
                    </div>
                  </div>
                  
                  {currentRole === 'EMPLOYEE' && (
                    <button 
                      onClick={handleAddGoal}
                      disabled={hasMaxGoalsExceeded}
                      className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-brand-dark text-white rounded-2xl font-bold hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                      <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
                      Create Strategic Goal
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {currentRole === 'MANAGER' && activeTab === 'goals' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      {teamSheets.map(sheet => (
                        <button
                          key={sheet.id}
                          onClick={() => setSelectedSheetId(sheet.id)}
                          className={`p-6 rounded-[32px] border text-left transition-all ${
                            selectedSheetId === sheet.id 
                              ? 'bg-brand-accent text-white border-brand-accent shadow-lg' 
                              : 'bg-white border-gray-100 hover:border-brand-accent/50'
                          }`}
                        >
                          <p className="text-[10px] font-black uppercase opacity-60 mb-1">{sheet.approvalStatus}</p>
                          <p className="font-bold text-lg">{sheet.employeeName}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeSheet.goals.filter(g => g.status !== 'COMPLETED').map((goal) => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal} 
                      thrustAreas={settings.thrustAreas}
                      isLocked={isStructurallyLocked}
                      approvalStatus={activeSheet.approvalStatus}
                      onUpdate={(upd) => handleUpdateGoal(activeSheet.id, goal.id, upd)}
                      onDelete={() => handleDeleteGoal(activeSheet.id, goal.id)}
                    />
                  ))}

                  {activeSheet.goals.some(g => g.status === 'COMPLETED') && (
                    <div className="mt-12 space-y-6">
                      <div className="flex items-center gap-3 px-4">
                        <CheckCircle2 className="text-brand-accent" size={20} />
                        <h3 className="text-xl font-bold font-serif italic">Completed Objectives</h3>
                      </div>
                      <div className="space-y-6">
                        {activeSheet.goals.filter(g => g.status === 'COMPLETED').map((goal) => (
                          <GoalCard 
                            key={goal.id} 
                            goal={goal} 
                            thrustAreas={settings.thrustAreas}
                            isLocked={isStructurallyLocked}
                            approvalStatus={activeSheet.approvalStatus}
                            onUpdate={(upd) => handleUpdateGoal(activeSheet.id, goal.id, upd)}
                            onDelete={() => handleDeleteGoal(activeSheet.id, goal.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSheet.goals.length === 0 && (
                    <div className="p-20 text-center bg-white rounded-[40px] border-4 border-dashed border-gray-100">
                       <Target size={64} className="mx-auto text-gray-100 mb-6" />
                       <h4 className="text-xl font-bold text-gray-300">No goals defined for this sheet.</h4>
                    </div>
                  )}
                </div>

                 {currentRole === 'EMPLOYEE' && (
                  <div className="p-10 bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden relative">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                       <div className="max-w-md">
                        <h4 className="text-2xl font-bold tracking-tight font-serif italic text-brand-dark">Ready for Review?</h4>
                        <p className="text-brand-muted mt-2 leading-relaxed">Once submitted, your goal sheet will be locked for editing until your manager provides feedback.</p>
                      </div>

                      <div className="flex flex-col items-end gap-6 min-w-[300px]">
                        <div className="grid grid-cols-1 gap-4 w-full">
                           <ValidationCheck 
                             label="Total weightage is 100%" 
                             valid={isValidWeightage} 
                             error={`Currently ${totalWeightage}%`}
                           />
                           <ValidationCheck 
                             label="Min weightage (10%)" 
                             valid={!hasInvalidIndividualWeightage} 
                             error="Ensure every goal is ≥ 10%"
                           />
                           <ValidationCheck 
                             label="Goal count (Max 8)" 
                             valid={!hasMaxGoalsExceeded} 
                             error="Too many goals defined"
                           />
                        </div>                         {activeSheet.approvalStatus === 'DRAFT' || activeSheet.approvalStatus === 'REWORK' ? (
                          <button 
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all ${
                              canSubmit ? 'bg-brand-accent text-white shadow-2xl hover:scale-[1.02]' : 'bg-brand-bg text-brand-muted cursor-not-allowed'
                            }`}
                          >
                            <Send size={18} /> Send Goal Sheet To Manager
                          </button>
                        ) : (
                          <div className="w-full space-y-4">
                            <div className="w-full py-5 bg-brand-bg text-brand-accent rounded-2xl font-bold flex items-center justify-center gap-3 border border-brand-accent/20">
                              <CheckCircle2 size={20} /> {activeSheet.approvalStatus === 'APPROVED' ? 'Cycle Approved' : 'Submitted for Approval'}
                            </div>
                            {currentRole === 'ADMIN' && activeSheet.approvalStatus === 'APPROVED' && (
                              <button 
                                onClick={handleUnlock}
                                className="w-full py-4 text-xs font-black uppercase tracking-widest text-red-500 border-2 border-red-100 rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                              >
                                <Lock className="text-red-300" size={14} /> Unlock for Exceptions
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16" />
                  </div>
                )}

                {(currentRole === 'MANAGER' || currentRole === 'ADMIN') && activeSheet.approvalStatus === 'SUBMITTED' && (
                  <div className="p-10 bg-brand-accent text-white rounded-[40px] shadow-2xl">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-8 text-center lg:text-left">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg">
                           <CheckCircle2 size={32} className="text-brand-accent" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-black uppercase tracking-tight font-serif italic">Pending Approval</h4>
                          <p className="font-bold opacity-80">{activeSheet.employeeName} is waiting for your feedback on this sheet.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full lg:w-auto">
                        <button 
                          onClick={handleRework}
                          className="flex-1 lg:flex-none px-10 py-5 bg-white/20 hover:bg-white/40 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all"
                        >
                          Request Rework
                        </button>
                        <button 
                          onClick={handleApprove}
                          className="flex-1 lg:flex-none px-12 py-5 bg-white text-brand-accent font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:translate-y-[-4px] transition-all"
                        >
                          Approve Goals
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Check-ins Section */}
                {activeSheet.approvalStatus === 'APPROVED' && (
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                           <h3 className="text-xl font-bold font-serif mb-6">Check-in History</h3>
                           <div className="space-y-6">
                              {(activeSheet.checkInComments || []).map(comment => (
                                <div key={comment.id} className="p-6 bg-brand-bg rounded-[32px] border border-gray-100">
                                   <div className="flex justify-between items-center mb-3">
                                      <p className="font-bold text-sm">{comment.authorName}</p>
                                      <p className="text-[10px] text-brand-muted font-bold">{new Date(comment.timestamp).toLocaleDateString()}</p>
                                   </div>
                                   <p className="text-sm text-brand-dark leading-relaxed">{comment.text}</p>
                                </div>
                              ))}
                              {(activeSheet.checkInComments || []).length === 0 && (
                                <p className="text-center text-brand-muted py-8 font-medium">No check-in discussions recorded yet.</p>
                              )}
                           </div>
                        </div>

                        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                           <h3 className="text-xl font-bold font-serif mb-4">Add Check-in Comment</h3>
                           <textarea
                             value={commentText}
                             onChange={(e) => setCommentText(e.target.value)}
                             rows={4}
                             placeholder="Document the discussion points, coaching feedback, or achievement notes..."
                             className="w-full bg-brand-bg border border-gray-100 rounded-2xl text-sm font-bold p-6 focus:ring-2 focus:ring-brand-accent outline-none resize-none mb-4"
                           />
                           <button 
                             onClick={handleAddCheckInComment}
                             className="px-8 py-4 bg-brand-dark text-white rounded-2xl font-bold hover:shadow-lg transition-all"
                           >
                             Save Discussion Point
                           </button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-brand-dark text-white p-8 rounded-[40px] shadow-xl">
                           <TrendingUp className="text-brand-accent mb-6" size={32} />
                           <h4 className="text-lg font-bold font-serif mb-4">Quarterly Recap</h4>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center text-sm">
                                 <span className="opacity-60">Total Score</span>
                                 <span className="font-bold">{Math.round(activeSheet.goals.reduce((acc, g) => acc + calculateProgressValue(g), 0) / (activeSheet.goals.length || 1))}%</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                 <span className="opacity-60">Goals Met</span>
                                 <span className="font-bold">{activeSheet.goals.filter(g => calculateProgressValue(g) >= 100).length} / {activeSheet.goals.length}</span>
                              </div>
                           </div>
                        </div>
                      </div>
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'approvals' && (
              <motion.div 
                key="approvals"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                      <h3 className="text-2xl font-bold font-serif mb-2">Pending Approvals</h3>
                      <p className="text-brand-muted mb-8 italic">Review goals submitted by your direct reports.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {teamSheets.filter(s => s.approvalStatus === 'SUBMITTED').map(sheet => (
                           <div key={sheet.id} className="p-8 rounded-[40px] border border-gray-100 bg-brand-bg/50 hover:border-brand-accent transition-all flex flex-col justify-between group">
                              <div>
                                 <div className="flex justify-between items-start mb-4">
                                    <p className="text-sm font-bold text-brand-dark">{sheet.employeeName}</p>
                                    <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent text-[9px] font-black uppercase rounded">Action Required</span>
                                 </div>
                                 <div className="flex gap-4 items-center mb-6">
                                    <div className="flex -space-x-2">
                                       {sheet.goals.slice(0, 3).map((g, i) => (
                                         <div key={i} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-black shadow-sm">
                                           {g.thrustArea.charAt(0)}
                                         </div>
                                       ))}
                                    </div>
                                    <span className="text-xs font-medium text-brand-muted">{sheet.goals.length} Strategic Goals</span>
                                 </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedSheetId(sheet.id);
                                  setActiveTab('goals');
                                }}
                                className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold text-xs uppercase tracking-widest group-hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                              >
                                Review Sheet <ArrowRight size={14} />
                              </button>
                           </div>
                         ))}
                         {teamSheets.filter(s => s.approvalStatus === 'SUBMITTED').length === 0 && (
                           <div className="col-span-full py-20 text-center">
                              <CheckCircle2 size={48} className="mx-auto text-brand-accent/20 mb-4" />
                              <p className="text-brand-muted font-bold text-lg italic">All set! No pending approvals at the moment.</p>
                           </div>
                         )}
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="bg-brand-dark text-white p-10 rounded-[40px] shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                           <MessageSquareShare className="text-brand-accent mb-6" size={32} />
                           <h4 className="text-xl font-bold font-serif mb-4 italic">Manager's Coaching Playbook</h4>
                           <div className="space-y-4">
                              <TipItem icon={<Zap size={14} />} text="Ensure goals are outcome-oriented, not task lists." />
                              <TipItem icon={<Shield size={14} />} text="Check if weightages reflect true business priority." />
                              <TipItem icon={<Activity size={14} />} text="Verify if metrics (UOM) are measurable via actuals." />
                           </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl -mr-16 -mt-16" />
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'reports' && currentRole !== 'EMPLOYEE' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-10"
              >
                {/* Reports Header & Actions */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden gap-6">
                   <div className="relative z-10">
                      <h3 className="text-xl md:text-2xl font-bold font-serif italic text-brand-dark">Enterprise Intelligence</h3>
                      <p className="text-xs md:text-sm text-brand-muted mt-1 italic">Real-time QoQ trends, heatmaps, and strategic alignment analysis.</p>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full lg:w-auto">
                      <button 
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-bg text-brand-dark border border-gray-100 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
                      >
                        <ExternalLink size={14} /> Azure AD Sync
                      </button>
                      <button 
                        onClick={handleExportReport}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-brand-accent text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:shadow-2xl hover:shadow-brand-accent/30 transition-all active:scale-95"
                      >
                        <FileText size={18} /> Export data
                      </button>
                   </div>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl -mr-16 -mt-16" />
                </div>

                {/* Analytics Grid (Bonus 5.4) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-8">
                         <h4 className="text-lg font-bold font-serif italic flex items-center gap-2">
                           <Activity className="text-brand-accent" size={20} /> Quarter-on-Quarter Achievement Trends
                         </h4>
                         <select className="bg-brand-bg border-none text-[10px] font-bold uppercase tracking-widest p-2 rounded-lg outline-none">
                            <option>Department: All</option>
                            <option>Department: Engineering</option>
                            <option>Department: Sales</option>
                         </select>
                      </div>
                      <div className="h-[300px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                              { name: 'Q1 23', target: 80, actual: 72 },
                              { name: 'Q2 23', target: 85, actual: 88 },
                              { name: 'Q3 23', target: 90, actual: 82 },
                              { name: 'Q4 23', target: 95, actual: 91 },
                              { name: 'Q1 24', target: 90, actual: 85 },
                            ]}>
                              <defs>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#FB7185" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#FB7185" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                              <Area type="monotone" dataKey="actual" stroke="#FB7185" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                              <Area type="monotone" dataKey="target" stroke="#e2e8f0" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col">
                      <h4 className="text-lg font-bold font-serif italic mb-8 flex items-center gap-2">
                        <Zap className="text-amber-500" size={20} /> Fulfillment Heatmap
                      </h4>
                      <div className="flex-1 flex flex-col justify-center gap-6">
                         {[
                           { label: 'Innovation', pct: 92, color: 'bg-brand-accent' },
                           { label: 'Operations', pct: 78, color: 'bg-blue-500' },
                           { label: 'Customer', pct: 64, color: 'bg-amber-500' },
                           { label: 'People', pct: 85, color: 'bg-indigo-500' },
                         ].map(item => (
                           <div key={item.label} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                 <span className="text-brand-dark">{item.label}</span>
                                 <span className="text-brand-muted">{item.pct}%</span>
                              </div>
                              <div className="h-3 bg-brand-bg rounded-full overflow-hidden p-0.5">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${item.pct}%` }}
                                   className={`h-full rounded-full ${item.color} shadow-sm`}
                                 />
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Governance & Escalation Module (Bonus 5.3) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                           <div className="p-4 bg-red-50 rounded-2xl text-red-500">
                             <ShieldAlert size={24} />
                           </div>
                           <h4 className="text-xl font-bold font-serif italic">Escalation Module</h4>
                        </div>
                        <button className="text-[10px] font-bold uppercase tracking-widest text-brand-accent hover:underline">Notification Chain Rules</button>
                      </div>
                      <div className="space-y-4">
                         {escalations.length > 0 ? escalations.map((item, i) => (
                           <div key={item.id} className="p-5 bg-red-50/30 rounded-3xl border border-red-100 flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-red-100 flex items-center justify-center font-bold text-red-400">
                                    {item.targetUserName.charAt(0)}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-sm font-bold text-brand-dark truncate">{item.targetUserName}</p>
                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{item.type} Rule Triggered</p>
                                 </div>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                 <p className="text-xs font-black text-red-600 mb-1">{item.daysOverdue}d Overdue</p>
                                 <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">{item.status}</p>
                              </div>
                           </div>
                         )) : (
                           <p className="text-center py-8 text-brand-muted text-sm italic">No active escalations detected by governance engine.</p>
                         )}
                      </div>
                      <div className="mt-8 p-6 bg-brand-bg rounded-3xl text-center">
                         <p className="text-xs text-brand-muted italic">Automated escalation emails are dispatched to skip-levels after 15 days of inactivity.</p>
                      </div>
                   </div>

                   <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col">
                      <div className="flex items-center gap-4 mb-8">
                         <div className="p-4 bg-blue-50 rounded-2xl text-blue-500">
                            <CheckCircle2 size={24} />
                         </div>
                         <h4 className="text-xl font-bold font-serif italic">Check-in Completion Status</h4>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2">
                         {goalSheets.map(sheet => (
                           <div key={sheet.id} className="flex items-center justify-between p-5 bg-brand-bg rounded-3xl border border-gray-50 hover:border-brand-accent/20 transition-all group">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-xs uppercase text-brand-muted group-hover:bg-brand-accent group-hover:text-white transition-colors">
                                    {sheet.employeeName.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-brand-dark">{sheet.employeeName}</p>
                                    <p className="text-[10px] text-brand-muted uppercase tracking-wider font-medium">{sheet.period}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                                    sheet.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    sheet.approvalStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                                    'bg-amber-100 text-amber-700'
                                 }`}>
                                    {sheet.approvalStatus}
                                 </span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Audit Logs */}
                <div className="bg-brand-dark text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center gap-4">
                           <div className="p-4 bg-white/10 rounded-2xl">
                             <Lock size={24} className="text-brand-accent" />
                           </div>
                           <div>
                             <h3 className="text-xl font-bold font-serif">Governance Audit Trail</h3>
                             <p className="text-sm text-white/50 italic">Capturing policy exceptions and achievement updates after lock date.</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-white/40">
                              <Clock size={10} /> Live Monitoring Active
                            </span>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {auditLog.slice(0, 10).map(entry => (
                              <div key={entry.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                                 <div className="w-12 text-[10px] font-bold text-white/30 uppercase flex flex-col">
                                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">{new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                 </div>
                                 <div className="flex-1 border-l border-white/10 pl-4">
                                    <p className="text-sm font-medium text-white/90">{entry.action}</p>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5 font-bold">By {entry.user}</p>
                                 </div>
                              </div>
                           ))}
                      </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl -mr-32 -mb-32" />
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm overflow-hidden relative">
                   <div className="relative z-10">
                     <h3 className="text-2xl font-bold font-serif mb-2">Organization Configuration</h3>
                     <p className="text-brand-muted mb-10 italic">Global settings for your company performance framework.</p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           <h4 className="text-sm font-black uppercase tracking-widest text-brand-dark flex items-center gap-2">
                             <CircleDot className="text-brand-accent" size={16} /> Basic Branding
                           </h4>
                           <div className="space-y-4">
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-brand-muted mb-1 block">Company Name</label>
                                 <input 
                                   type="text" 
                                   value={settings.name}
                                   onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                                   className="w-full bg-brand-bg border border-gray-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-brand-accent outline-none"
                                 />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-brand-muted mb-1 block">Active Period Label</label>
                                 <input 
                                   type="text" 
                                   value={settings.activePeriod}
                                   onChange={(e) => setSettings(prev => ({ ...prev, activePeriod: e.target.value }))}
                                   className="w-full bg-brand-bg border border-gray-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-brand-accent outline-none"
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <h4 className="text-sm font-black uppercase tracking-widest text-brand-dark flex items-center gap-2">
                             <TrendingUp className="text-brand-accent" size={16} /> System Guards
                           </h4>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-brand-muted mb-1 block">Max Goals</label>
                                 <input 
                                   type="number" 
                                   value={settings.maxGoals}
                                   onChange={(e) => setSettings(prev => ({ ...prev, maxGoals: parseInt(e.target.value) || 0 }))}
                                   className="w-full bg-brand-bg border border-gray-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-brand-accent outline-none"
                                 />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-brand-muted mb-1 block">Min Goal Wt. (%)</label>
                                 <input 
                                   type="number" 
                                   value={settings.minWeightage}
                                   onChange={(e) => setSettings(prev => ({ ...prev, minWeightage: parseInt(e.target.value) || 0 }))}
                                   className="w-full bg-brand-bg border border-gray-100 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-brand-accent outline-none"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="mt-12 space-y-6">
                        <h4 className="text-sm font-black uppercase tracking-widest text-brand-dark flex items-center gap-2">
                           <Layers className="text-brand-accent" size={16} /> Strategic Thrust Areas
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                           {settings.thrustAreas.map((area, idx) => (
                             <div key={idx} className="flex gap-2">
                               <input 
                                 type="text" 
                                 value={area}
                                 onChange={(e) => {
                                   const newAreas = [...settings.thrustAreas];
                                   newAreas[idx] = e.target.value;
                                   setSettings(prev => ({ ...prev, thrustAreas: newAreas }));
                                 }}
                                 className="flex-1 bg-brand-bg border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-accent outline-none"
                               />
                               <button 
                                 onClick={() => {
                                   setSettings(prev => ({ ...prev, thrustAreas: prev.thrustAreas.filter((_, i) => i !== idx) }));
                                 }}
                                 className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                           ))}
                           <button 
                             onClick={() => setSettings(prev => ({ ...prev, thrustAreas: [...prev.thrustAreas, 'New Strategic Area'] }))}
                             className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-100 rounded-xl p-3 text-xs font-bold text-brand-muted hover:border-brand-accent hover:text-brand-accent transition-all"
                           >
                             <Plus size={16} /> Add Area
                           </button>
                        </div>
                     </div>

                     <div className="mt-12 p-8 bg-brand-bg rounded-[32px] border border-gray-100 flex flex-col items-center text-center">
                        <Shield className="text-brand-accent mb-4" size={32} />
                        <h4 className="font-bold mb-2 italic">Generalizing your Corporate Performance Portal</h4>
                        <p className="text-xs text-brand-muted max-w-lg">Changes made here affect the goal creation constraints and strategy alignment categories for all employees.</p>
                     </div>
                   </div>
                   <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl -mr-32 -mt-32" />
                </div>
              </motion.div>
            )}

            {activeTab === 'org' && (
              <motion.div 
                key="org"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
              >
                <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                      <div className="relative z-10">
                         <h3 className="text-xl md:text-2xl font-bold font-serif italic text-brand-dark">Organizational Backbone</h3>
                         <p className="text-xs md:text-sm text-brand-muted mt-1 italic">Mapping reporting lines and syncing role identifiers from Microsoft Entra ID.</p>
                      </div>
                      <button 
                        onClick={handleEntraSync}
                        disabled={isSyncing}
                        className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-brand-accent text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:shadow-2xl transition-all disabled:opacity-50"
                      >
                         <Zap size={18} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Force Hierarchy Sync'}
                      </button>
                   </div>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl -mr-16 -mt-16" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-8">
                         <div className="p-3 md:p-4 bg-indigo-50 rounded-2xl text-indigo-500">
                            <MessageSquareShare size={24} />
                         </div>
                         <h4 className="text-lg font-bold font-serif italic">Azure AD Integration</h4>
                      </div>
                      
                      <div className="space-y-6">
                         <div className="p-5 md:p-6 bg-brand-bg rounded-2xl md:rounded-3xl border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                               <p className="text-[10px] font-black uppercase text-brand-muted tracking-widest">Connection State</p>
                               <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold uppercase rounded">Operational</span>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center border border-gray-50 shadow-sm shrink-0">
                                  <Mail className="text-brand-accent" size={20} />
                               </div>
                               <div className="min-w-0">
                                  <p className="text-sm font-bold text-brand-dark truncate">ad-sync@company.com</p>
                                  <p className="text-[9px] md:text-[10px] text-brand-muted">Last sync: 14 mins ago</p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase text-brand-muted tracking-widest">Mapped Attributes</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               {[
                                 { source: 'jobTitle', target: 'Role Mapping' },
                                 { source: 'manager', target: 'Org Reporting' },
                                 { source: 'department', target: 'Cost Center' },
                                 { source: 'memberOf', target: 'Access' }
                               ].map(attr => (
                                 <div key={attr.source} className="p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-brand-dark">{attr.source}</span>
                                    <ChevronRight size={10} className="text-brand-muted" />
                                    <span className="text-[10px] font-bold text-brand-accent">{attr.target}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-8">
                         <div className="p-4 bg-brand-accent/10 rounded-2xl text-brand-accent">
                            <Layers size={24} />
                         </div>
                         <h4 className="text-lg font-bold font-serif italic">Reporting Hierarchy</h4>
                      </div>
                      
                      <div className="space-y-4">
                         {/* Visual Tree mock */}
                         <div className="relative pl-8 border-l-2 border-brand-accent/10 space-y-8 mt-4">
                            <div className="relative">
                               <div className="absolute -left-[37px] top-4 w-4 h-0.5 bg-brand-accent/10" />
                               <div className="p-4 bg-brand-bg rounded-2xl border border-gray-100">
                                  <p className="text-xs font-bold text-brand-dark">Executive Office (CEO)</p>
                                  <p className="text-[10px] text-brand-muted uppercase">3 Verticals Linked</p>
                               </div>
                               <div className="mt-4 pl-12 border-l-2 border-brand-accent/10 space-y-4">
                                  <div className="relative">
                                     <div className="absolute -left-[45px] top-4 w-6 h-0.5 bg-brand-accent/10" />
                                     <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                        <p className="text-xs font-bold text-brand-dark italic">Product & Tech Vertical</p>
                                        <p className="text-[9px] text-brand-muted">L1-L4 Mapping Active</p>
                                     </div>
                                  </div>
                                  <div className="relative">
                                     <div className="absolute -left-[45px] top-4 w-6 h-0.5 bg-brand-accent/10" />
                                     <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                        <p className="text-xs font-bold text-brand-dark italic">People Operations</p>
                                        <p className="text-[9px] text-brand-muted">HR Policy Sync Enabled</p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-dark border-t border-white/5 px-4 py-3 flex justify-around items-center z-40 safe-area-bottom">
           <MobileNavAction 
             icon={<LayoutDashboard size={22} />} 
             active={activeTab === 'dashboard'} 
             onClick={() => setActiveTab('dashboard')} 
           />
           <MobileNavAction 
             icon={<Target size={22} />} 
             active={activeTab === 'goals'} 
             onClick={() => setActiveTab('goals')} 
           />
           {currentRole === 'MANAGER' && (
             <MobileNavAction 
               icon={<CircleDot size={22} />} 
               active={activeTab === 'approvals'} 
               onClick={() => setActiveTab('approvals')} 
               badge={teamSheets.filter(s => s.approvalStatus === 'SUBMITTED').length || undefined}
             />
           )}
           {currentRole !== 'EMPLOYEE' && (
             <MobileNavAction 
               icon={<BarChart3 size={22} />} 
               active={activeTab === 'reports'} 
               onClick={() => setActiveTab('reports')} 
             />
           )}
           <MobileNavAction 
             icon={<Plus size={24} className={isMobileMenuOpen ? 'rotate-45 transition-transform' : ''} />} 
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
             special
           />
        </div>
      </main>
    </div>
  );
}

// --- Internal Helper Components ---

function LoginPage({ onLogin, error }: { onLogin: (email: string, pass: string) => void; error?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/20 rounded-full blur-[120px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-[120px] -ml-48 -mb-48" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 md:p-12">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
              <AppWindow className="text-white" size={28} />
            </div>
            <div>
              <h1 className="font-bold text-2xl tracking-tighter leading-none font-serif text-brand-dark">Goal Hub</h1>
              <p className="text-[11px] text-brand-accent font-black uppercase tracking-[0.2em] mt-1">Performance Portal</p>
            </div>
          </div>

          <div className="mb-10">
             <h2 className="text-3xl font-black font-serif italic text-brand-dark mb-2">Welcome Back</h2>
             <p className="text-brand-muted text-sm font-medium italic">Sign in to access your organization dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@gmail.com"
                  className="w-full bg-brand-bg border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-brand-accent outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Security Key (Password)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-brand-bg border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-brand-accent outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"
              >
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-[11px] font-bold leading-tight">{error}</p>
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-brand-dark text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-brand-accent hover:shadow-brand-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              Authenticate Portal <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100">
             <div className="flex items-center gap-3 text-brand-muted">
                <Shield size={20} className="text-brand-accent/30" />
                <p className="text-[10px] font-bold leading-relaxed">
                   Protected by enterprise-grade encryption. Your access is logged for governance and audit purposes.
                </p>
             </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-6">
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Demo Sandbox v2.4</p>
        </div>
      </motion.div>
    </div>
  );
}

function MobileNavAction({ icon, active, onClick, badge, special }: { icon: React.ReactNode; active?: boolean; onClick: () => void, badge?: number, special?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`relative p-3 flex items-center justify-center transition-all ${
        special 
          ? 'bg-brand-accent text-white rounded-2xl shadow-lg -mt-8' 
          : active ? 'text-brand-accent' : 'text-brand-muted hover:text-white'
      }`}
    >
      {icon}
      {badge && !special && (
        <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-brand-dark">
          {badge}
        </span>
      )}
      {active && !special && <div className="absolute -bottom-3 w-1.5 h-1.5 bg-brand-accent rounded-full" />}
    </button>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all relative group ${
        active 
          ? 'bg-brand-accent text-white font-bold shadow-xl shadow-brand-accent/10' 
          : 'text-brand-muted hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={active ? 'text-white' : 'group-hover:text-white'}>
        {icon}
      </div>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
      {badge && (
        <span className="ml-auto bg-brand-accent/20 text-brand-accent text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-lg shadow-lg">
          {badge}
        </span>
      )}
      {active && <div className="absolute left-0 w-1.5 h-6 bg-white rounded-r-full" />}
    </button>
  );
}

function TipItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
       <div className="mt-1 text-brand-accent shrink-0">{icon}</div>
       <p className="text-xs font-medium opacity-80 leading-relaxed">{text}</p>
    </div>
  );
}

function StatCard({ title, value, icon, description, color = 'text-brand-dark' }: { title: string; value: string | number; icon: React.ReactNode; description?: string, color?: string }) {
  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 hover:shadow-xl hover:translate-y-[-4px] transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 md:p-4 bg-brand-bg rounded-2xl group-hover:bg-brand-accent/10 transition-colors">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] text-brand-muted font-black uppercase tracking-[0.2em] mb-2">{title}</p>
        <p className={`text-2xl md:text-3xl lg:text-4xl font-black font-serif transition-all ${color}`}>{value}</p>
        {description && (
          <p className="text-[10px] md:text-xs text-brand-muted font-medium mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function ScheduleItem({ label, date, description, active, completed }: { label: string; date: string; description?: string; active?: boolean; completed?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      active ? 'bg-brand-accent/5 border-brand-accent/30 shadow-sm' : 'bg-gray-50 border-gray-100'
    }`}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${completed ? 'bg-brand-accent' : active ? 'bg-brand-accent animate-pulse' : 'bg-gray-200'}`} />
          <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-brand-accent' : 'text-brand-muted'}`}>{label}</p>
        </div>
        {completed && <CheckCircle2 size={12} className="text-brand-accent" />}
      </div>
      <div className="pl-4">
        <p className={`text-sm font-bold ${completed ? 'text-gray-400' : 'text-brand-dark'}`}>{date}</p>
        {description && <p className="text-[10px] text-brand-muted font-medium mt-1 italic">{description}</p>}
      </div>
    </div>
  );
}

function GoalCard({ goal, thrustAreas, isLocked, approvalStatus, onUpdate, onDelete }: { goal: Goal; thrustAreas: string[]; isLocked: boolean; approvalStatus: ApprovalStatus; onUpdate: (u: Partial<Goal>) => void; onDelete: () => void; key?: any }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-6 md:p-8 lg:p-10 rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm group hover:border-brand-accent/50 transition-all overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-accent/10 group-hover:bg-brand-accent transition-colors" />
      
      <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-start">
        <div className="flex-1 w-full space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest flex items-center gap-2 mb-2">
                   <Shield size={12} className="text-brand-accent" /> Thrust Area
                </label>
                <select 
                  disabled={isLocked}
                  value={goal.thrustArea}
                  onChange={(e) => onUpdate({ thrustArea: e.target.value })}
                  className="w-full bg-brand-bg border border-gray-100 rounded-2xl text-sm font-bold p-3 md:p-4 focus:ring-2 focus:ring-brand-accent outline-none disabled:opacity-60 transition-all appearance-none"
                >
                  {thrustAreas.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
                <p className="text-[9px] text-brand-muted mt-2 px-1">Which business pillar does this objective support?</p>
              </div>
               <div>
                  <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest flex items-center gap-2 mb-2">
                     <Target size={12} className="text-brand-accent" /> Goal Definition
                  </label>
                  <input 
                    disabled={isLocked || goal.isShared}
                    value={goal.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="Objective title..."
                    className="w-full bg-brand-bg border border-gray-100 rounded-2xl text-sm font-bold p-3 md:p-4 focus:ring-2 focus:ring-brand-accent outline-none disabled:opacity-60 placeholder:text-gray-300 transition-all"
                  />
                  <p className="text-[9px] text-brand-muted mt-2 px-1">Describe the specific outcome you want to achieve.</p>
               </div>
            </div>
            
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest flex items-center gap-2 mb-2">
                     <Activity size={12} className="text-brand-accent" /> Metric & Measurement
                  </label>
                  <select 
                    disabled={isLocked || goal.isShared}
                    value={goal.uom}
                    onChange={(e) => onUpdate({ uom: e.target.value as any })}
                    className="w-full bg-brand-bg border border-gray-100 rounded-2xl text-sm font-bold p-3 md:p-4 focus:ring-2 focus:ring-brand-accent outline-none disabled:opacity-60 appearance-none transition-all"
                  >
                    {UOM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <p className="text-[9px] text-brand-muted mt-2 px-1">Select logic for achievement (e.g. Higher is better).</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest flex items-center gap-2 mb-2">
                       <Zap size={12} className="text-brand-accent" /> Target
                    </label>
                    <input 
                      disabled={isLocked || goal.isShared}
                      type={goal.uom === 'TIMELINE' ? 'date' : 'text'}
                      value={goal.target}
                      onChange={(e) => onUpdate({ target: e.target.value })}
                      placeholder={goal.uom === 'TIMELINE' ? '' : 'Goal value'}
                      className="w-full bg-brand-bg border border-gray-100 rounded-2xl text-sm font-bold p-3 md:p-4 focus:ring-2 focus:ring-brand-accent outline-none disabled:opacity-60 transition-all"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest flex items-center gap-2 mb-2">
                       <Layers size={12} className="text-brand-accent" /> Weight (%)
                    </label>
                    <input 
                      type="number"
                      disabled={isLocked}
                      value={goal.weightage || ''}
                      onChange={(e) => onUpdate({ weightage: parseInt(e.target.value) || 0 })}
                      placeholder="10 min"
                      className="w-full bg-brand-bg border border-gray-100 rounded-2xl text-sm font-bold p-3 md:p-4 focus:ring-2 focus:ring-brand-accent outline-none disabled:opacity-60 transition-all"
                    />
                 </div>
               </div>
               <p className="text-[9px] text-brand-muted px-1">Target value and its relative importance (total must be 100%).</p>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest flex items-center gap-2 mb-2">
               <FileText size={12} className="text-brand-accent" /> Success Criteria
            </label>
            <textarea 
              disabled={isLocked}
              value={goal.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              placeholder="Provide context..."
              className="w-full bg-brand-bg border border-gray-100 rounded-2xl text-sm font-bold p-3 md:p-4 focus:ring-2 focus:ring-brand-accent outline-none disabled:opacity-60 resize-none transition-all"
            />
            <p className="text-[9px] text-brand-muted mt-2 px-1">Contextual details and evidence required for completion.</p>
          </div>
          
          {(approvalStatus === 'APPROVED' || goal.status === 'COMPLETED') && (
            <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-8 items-end">
               <div className="flex-1 w-full">
                  <label className="text-[10px] font-black uppercase text-brand-accent tracking-[0.2em] block mb-3">Achievement Tracking</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="bg-brand-bg p-4 rounded-2xl border border-gray-200">
                        <p className="text-[10px] font-bold text-brand-muted uppercase mb-1">Actual</p>
                        <input 
                          type="number"
                          value={goal.actual || ''}
                          onChange={(e) => onUpdate({ actual: parseFloat(e.target.value) || 0 })}
                          placeholder="Current..."
                          className="w-full bg-transparent border-none text-lg font-black focus:ring-0 outline-none p-0"
                        />
                     </div>
                     <div className="bg-brand-bg p-4 rounded-2xl border border-gray-200">
                        <p className="text-[10px] font-bold text-brand-muted uppercase mb-1">Status</p>
                        <select 
                          value={goal.status}
                          onChange={(e) => onUpdate({ status: e.target.value as any })}
                          className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 outline-none p-0 appearance-none"
                        >
                           <option value="NOT_STARTED">Not Started</option>
                           <option value="ON_TRACK">On Track</option>
                           <option value="COMPLETED">Completed</option>
                        </select>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="flex flex-row lg:flex-col gap-4 py-4 md:py-8 w-full lg:w-auto justify-between lg:justify-start items-center">
           <div className={`w-24 h-24 md:w-28 md:h-28 rounded-[32px] md:rounded-[38px] flex flex-col items-center justify-center gap-1 transition-all shadow-inner shrink-0 ${goal.weightage >= 10 ? 'bg-brand-bg' : 'bg-red-50'}`}>
              <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tighter ${goal.weightage >= 10 ? 'text-brand-accent' : 'text-red-400'}`}>Score Share</span>
              <span className={`text-2xl md:text-3xl font-black font-serif ${goal.weightage >= 10 ? 'text-brand-accent' : 'text-red-600'}`}>{goal.weightage}%</span>
           </div>
           {!isLocked && (
             <button 
               onClick={onDelete}
               className="p-3 md:p-4 bg-brand-bg text-brand-muted hover:bg-red-500 hover:text-white rounded-2xl transition-all flex items-center justify-center shadow-sm shrink-0"
             >
               <Trash2 size={20} md:size={24} />
             </button>
           )}
        </div>
      </div>
    </motion.div>
  );
}

function FilterButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <button className={`px-6 md:px-10 py-3 md:py-3.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
      active ? 'bg-brand-dark text-white shadow-xl' : 'bg-transparent text-brand-muted hover:text-brand-dark'
    }`}>
      {label}
    </button>
  );
}

function ValidationCheck({ label, valid, error }: { label: string; valid: boolean; error: string }) {
  return (
    <div className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${valid ? 'bg-brand-accent/5 border-brand-accent/20' : 'bg-red-50 border-red-100 animate-pulse'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all ${valid ? 'bg-brand-accent text-white' : 'bg-red-500 text-white'}`}>
        {valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      </div>
      <div className="min-w-0">
         <p className={`text-[11px] font-bold truncate ${valid ? 'text-brand-dark' : 'text-red-900'}`}>{label}</p>
         {!valid && <p className="text-[10px] text-red-500 font-black uppercase tracking-tighter">{error}</p>}
         {valid && <p className="text-[9px] text-brand-accent font-bold uppercase tracking-widest">Requirement Met</p>}
      </div>
    </div>
  );
}
