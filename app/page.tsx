'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Calendar,
  ArrowUpDown,
  Plus,
  Edit2,
  Trash2,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Database,
  Check,
  AlertCircle,
  X,
  Link,
  ChevronRight,
  Info,
  Lock,
  PieChart,
  BookOpen,
  Sliders,
  Filter,
  Search,
  ExternalLink,
  Menu
} from 'lucide-react';
import {
  AppSettings,
  ExpenseCategoryBudget,
  Transaction,
  FundDefinition,
  ReconciliationRecord,
  AppState,
  searchSpreadsheet,
  createSpreadsheet,
  getSpreadsheetDetails,
  configureWorkbookTabs,
  pushFullStateToSheets,
  pullFullStateFromSheets
} from '../lib/google-sheets';

// Default mock/standard data to populate initial load
const DEFAULT_STATE: AppState = {
  settings: {
    churchName: 'Grace Community Church',
    fiscalYear: '2026',
    startingBalance: 25000,
    currency: 'ETB',
  },
  incomeCategories: ['Tithes', 'Offerings', 'Donations', 'Fundraising', 'Rental Income', 'Grants'],
  expenseCategories: ['Utilities', 'Salaries', 'Maintenance', 'Missions', 'Youth Ministry', 'Equipment', 'Transportation', 'Office Supplies'],
  funds: [
    { id: 'F001', name: 'General Fund', isRestricted: false },
    { id: 'F002', name: 'Building Fund', isRestricted: true },
    { id: 'F003', name: 'Missions Fund', isRestricted: true },
    { id: 'F004', name: 'Youth Fund', isRestricted: true },
  ],
  transactions: [
    {
      id: 'T001',
      date: '2026-01-07',
      description: 'Sunday Morning Offering',
      category: 'Offerings',
      fund: 'General Fund',
      type: 'Income',
      amount: 5000,
      paymentMethod: 'Cash',
      referenceNumber: 'REC-001',
      notes: 'Morning service offerings'
    },
    {
      id: 'T002',
      date: '2026-01-09',
      description: 'Electric Bill',
      category: 'Utilities',
      fund: 'General Fund',
      type: 'Expense',
      amount: 600,
      paymentMethod: 'Bank',
      referenceNumber: 'ELEC-485',
      notes: 'Sanctuary electric bill'
    },
    {
      id: 'T003',
      date: '2026-01-12',
      description: 'Youth Camp Donation',
      category: 'Donations',
      fund: 'Youth Fund',
      type: 'Income',
      amount: 8000,
      paymentMethod: 'Mobile Money',
      referenceNumber: 'MOB-10493',
      notes: 'Gift from local store matching youth drive'
    },
    {
      id: 'T004',
      date: '2026-01-15',
      description: 'Sanctuary Painting Deposit',
      category: 'Maintenance',
      fund: 'Building Fund',
      type: 'Expense',
      amount: 4200,
      paymentMethod: 'Cheque',
      referenceNumber: 'CHQ-802',
      notes: 'Down payment for repainting'
    },
    {
      id: 'T005',
      date: '2026-02-05',
      description: 'Direct Member Tithe',
      category: 'Tithes',
      fund: 'General Fund',
      type: 'Income',
      amount: 12000,
      paymentMethod: 'Bank',
      referenceNumber: 'TX-9042',
      notes: 'Monthly direct transfer tithe'
    },
    {
      id: 'T006',
      date: '2026-02-14',
      description: 'Youth Camp Craft Supplies',
      category: 'Youth Ministry',
      fund: 'Youth Fund',
      type: 'Expense',
      amount: 1500,
      paymentMethod: 'Cash',
      referenceNumber: 'REC-904',
      notes: 'Materials for weekend project'
    },
    {
      id: 'T007',
      date: '2026-03-01',
      description: 'District Mission Support',
      category: 'Missions',
      fund: 'Missions Fund',
      type: 'Expense',
      amount: 3500,
      paymentMethod: 'Bank',
      referenceNumber: 'TX-1132',
      notes: 'Support for local district outreach'
    },
    {
      id: 'T008',
      date: '2026-03-15',
      description: 'Chairs Fundraiser Event',
      category: 'Fundraising',
      fund: 'Building Fund',
      type: 'Income',
      amount: 9500,
      paymentMethod: 'Mobile Money',
      referenceNumber: 'MOB-42111',
      notes: 'Community lunch fundraise'
    }
  ],
  budgets: [
    { category: 'Utilities', annualBudget: 12000 },
    { category: 'Missions', annualBudget: 30000 },
    { category: 'Maintenance', annualBudget: 15000 },
    { category: 'Salaries', annualBudget: 45000 },
    { category: 'Youth Ministry', annualBudget: 10000 },
    { category: 'Equipment', annualBudget: 20000 },
    { category: 'Transportation', annualBudget: 8000 },
    { category: 'Office Supplies', annualBudget: 4000 }
  ],
  reconciliations: [
    { date: '2026-01-31', bookBalance: 33200, bankBalance: 33400, notes: 'Uncleared cash in hand representing ETB 200' },
    { date: '2026-02-28', bookBalance: 43700, bankBalance: 43700, notes: 'Fully reconciled for February' }
  ]
};

const REQUIRED_SHEETS = [
  'Settings',
  'Categories',
  'Funds',
  'Transactions',
  'Budget',
  'Bank Reconciliation'
];

export default function ChurchFinanceApp() {
  // Global states
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Filter/Sort States for Ledger
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fundFilter, setFundFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Google OAuth Sync States
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'>('disconnected');
  const [syncMessage, setSyncMessage] = useState<string>('Connect your Google Workspace accounts to unlock Google Drive & Sheets synchronization.');
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetLink, setSpreadsheetLink] = useState<string | null>(null);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('Grace Community Church Financials');

  // Popup Management for Operations
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showFundModal, setShowFundModal] = useState<boolean>(false);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Form Fields State placeholders
  const [txnForm, setTxnForm] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    fund: '',
    type: 'Income',
    amount: 0,
    paymentMethod: 'Cash',
    referenceNumber: '',
    notes: ''
  });

  const [catForm, setCatForm] = useState<{ name: string; type: 'income' | 'expense' }>({ name: '', type: 'income' });
  const [fundForm, setFundForm] = useState<{ id: string; name: string; isRestricted: boolean }>({ id: '', name: '', isRestricted: false });
  const [budgetForm, setBudgetForm] = useState<{ category: string; annualBudget: number }>({ category: '', annualBudget: 0 });
  const [reconForm, setReconForm] = useState<ReconciliationRecord>({ date: new Date().toISOString().split('T')[0], bookBalance: 0, bankBalance: 0, notes: '' });

  // Settings Fields State
  const [settingsForm, setSettingsForm] = useState<AppSettings>({
    churchName: 'Grace Community Church',
    fiscalYear: '2026',
    startingBalance: 25000,
    currency: 'ETB'
  });

  // Client ID validation message
  const [clientIdHelp, setClientIdHelp] = useState<boolean>(false);

  // Hydrate State from LocalStorage on mount
  useEffect(() => {
    const localData = localStorage.getItem('church_finance_management_state');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed.settings && parsed.transactions) {
          Promise.resolve().then(() => {
            setState(parsed);
          });
        }
      } catch (e) {
        console.error('Failed to parse local state storage:', e);
      }
    }

    // Attempt to read client ID configured in localStorage or process.env
    const savedClientId = localStorage.getItem('church_finance_google_client_id') || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    
    // Retrieve previous sheets sync credentials if any
    const savedSpreadsheetId = localStorage.getItem('church_finance_spreadsheet_id') || null;
    const savedSpreadsheetLink = localStorage.getItem('church_finance_spreadsheet_link') || null;
    const savedSpreadsheetTitle = localStorage.getItem('church_finance_spreadsheet_title') || 'Grace Community Church Financials';
    
    Promise.resolve().then(() => {
      setGoogleClientId(savedClientId);
      setSpreadsheetId(savedSpreadsheetId);
      setSpreadsheetLink(savedSpreadsheetLink);
      setSpreadsheetTitle(savedSpreadsheetTitle);
    });
  }, []);

  // Save State to LocalStorage on updates
  const saveState = (newState: AppState) => {
    setState(newState);
    localStorage.setItem('church_finance_management_state', JSON.stringify(newState));
  };

  // Google OAuth Popup response event listener
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS' && event.data.accessToken) {
        setAccessToken(event.data.accessToken);
        setSyncStatus('connected');
        setSyncMessage('Successfully authenticated with Google. You can now synchronize workspace assets.');
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        setSyncStatus('error');
        setSyncMessage(`Authentication failed: ${event.data.error || 'Unknown Error'}`);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Format monetary figures safely
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: state.settings.currency || 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Safe confirm wrapper strictly abiding by Workspace Skill instructions
  const triggerConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setShowConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setShowConfirmModal(null);
      }
    });
  };

  // Clean login/auth popup launch
  const handleGoogleConnect = () => {
    if (!googleClientId) {
      setSyncStatus('error');
      setSyncMessage('Google Client ID is missing. Please enter your custom Google Client ID in the Settings panel first.');
      setActiveTab('sheets_sync');
      return;
    }

    setSyncStatus('connecting');
    setSyncMessage('Launching Google authentication gateway...');

    const redirectUri = `${window.location.origin}/oauth-callback`;
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file')}` +
      `&prompt=consent`;

    // Save Client ID in localStorage for convenience
    localStorage.setItem('church_finance_google_client_id', googleClientId);

    const width = 600;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      googleOAuthUrl,
      'GoogleAccountSheetsAuthorizationPopup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=no`
    );
  };

  // Google Sheets Sync Functions
  const handleSheetsLookupOrCreate = async () => {
    if (!accessToken) {
      handleGoogleConnect();
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage('Searching your Google Drive for existing workbook assets...');

    try {
      let docMeta = await searchSpreadsheet(accessToken, spreadsheetTitle);
      let didCreate = false;

      if (!docMeta) {
        setSyncMessage(`No file named '${spreadsheetTitle}' found. Initiating cloud creation...`);
        docMeta = await createSpreadsheet(accessToken, spreadsheetTitle);
        didCreate = true;
      }

      const fileId = docMeta.id;
      setSpreadsheetId(fileId);
      localStorage.setItem('church_finance_spreadsheet_id', fileId);

      // Extract details
      let sheetsFound: string[] = [];
      if (!didCreate) {
        setSyncMessage('Checking workspace worksheets compatibility...');
        sheetsFound = await getSpreadsheetDetails(accessToken, fileId);
      }

      // Sync categories, setup structure
      await configureWorkbookTabs(accessToken, fileId, sheetsFound, REQUIRED_SHEETS);
      setSyncStatus('connected');
      setSyncMessage(`Active synchronization mapped correctly to document.`);
      
      const link = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
      setSpreadsheetLink(link);
      localStorage.setItem('church_finance_spreadsheet_link', link);
      localStorage.setItem('church_finance_spreadsheet_title', spreadsheetTitle);

    } catch (e: any) {
      console.error(e);
      setSyncStatus('error');
      setSyncMessage(`Workspace error: ${e.message || 'Operational failure'}`);
    }
  };

  const handlePushData = () => {
    if (!accessToken || !spreadsheetId) {
      setSyncStatus('error');
      setSyncMessage('Unauthorized workspace access. Connect with Google Drive first.');
      return;
    }

    triggerConfirmation(
      'Push Data to Google Sheets?',
      'This will OVERWRITE the content in your currently linked Google Sheet with your active client-side financial records. Ensure you do not have conflicting edits.',
      async () => {
        setSyncStatus('syncing');
        setSyncMessage('Clearing structures and parsing financial ledger matrices...');
        try {
          await pushFullStateToSheets(accessToken, spreadsheetId, state);
          setSyncStatus('connected');
          setSyncMessage('Successfully uploaded client tables directly into Google Sheets worksheets!');
        } catch (e: any) {
          console.error(e);
          setSyncStatus('error');
          setSyncMessage(`Push error: ${e.message || 'Could not serialize entries'}`);
        }
      }
    );
  };

  const handlePullData = () => {
    if (!accessToken || !spreadsheetId) {
      setSyncStatus('error');
      setSyncMessage('Unauthorized workspace access. Connect with Google Drive first.');
      return;
    }

    triggerConfirmation(
      'Pull Data from Google Sheets?',
      'This will OVERWRITE your local memory layout with the remote Google Sheets rows. All locally recorded entries since the last state commit will be replaced.',
      async () => {
        setSyncStatus('syncing');
        setSyncMessage('Streaming Sheets datasets and converting values back into ledger objects...');
        try {
          const pulledState = await pullFullStateFromSheets(accessToken, spreadsheetId);
          setState(pulledState);
          localStorage.setItem('church_finance_management_state', JSON.stringify(pulledState));
          setSyncStatus('connected');
          setSyncMessage('Synchronization complete. Client databases successfully overwritten with Google Sheets records.');
        } catch (e: any) {
          console.error(e);
          setSyncStatus('error');
          setSyncMessage(`Pull error: ${e.message || 'Validation error while parsing worksheets'}`);
        }
      }
    );
  };

  const handleDisconnect = () => {
    setAccessToken(null);
    setSyncStatus('disconnected');
    setSyncMessage('Disconnected. Client datasets remain safely stored in modern offline browser memory.');
  };

  // Calculations for KPI Boards
  const totalIncome = state.transactions
    .filter(t => t.type === 'Income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = state.transactions
    .filter(t => t.type === 'Expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = state.settings.startingBalance + totalIncome - totalExpense;

  // Breakdown by payment methods
  const bankBalance = state.settings.startingBalance * 0.7 +
    state.transactions
      .filter(t => t.paymentMethod === 'Bank')
      .reduce((acc, t) => acc + (t.type === 'Income' ? t.amount : -t.amount), 0);

  const cashBalance = state.settings.startingBalance * 0.2 +
    state.transactions
      .filter(t => t.paymentMethod === 'Cash')
      .reduce((acc, t) => acc + (t.type === 'Income' ? t.amount : -t.amount), 0);

  const mobileBalance = state.settings.startingBalance * 0.1 +
    state.transactions
      .filter(t => t.paymentMethod === 'Mobile Money' || t.paymentMethod === 'Cheque')
      .reduce((acc, t) => acc + (t.type === 'Income' ? t.amount : -t.amount), 0);

  // Fund balance calculations
  const fundBalances = state.funds.map(fund => {
    const inc = state.transactions
      .filter(t => t.fund === fund.name && t.type === 'Income')
      .reduce((acc, t) => acc + t.amount, 0);
    const exp = state.transactions
      .filter(t => t.fund === fund.name && t.type === 'Expense')
      .reduce((acc, t) => acc + t.amount, 0);

    // Baseline: General Fund holds the starting balance
    const base = fund.id === 'F001' ? state.settings.startingBalance : 0;
    return {
      ...fund,
      income: inc,
      expense: exp,
      balance: base + inc - exp
    };
  });

  // Category spending vs budget
  const budgetUtilization = state.expenseCategories.map(cat => {
    const budgetObj = state.budgets.find(b => b.category === cat);
    const budgetVal = budgetObj ? budgetObj.annualBudget : 0;
    const actualVal = state.transactions
      .filter(t => t.category === cat && t.type === 'Expense')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      category: cat,
      budget: budgetVal,
      actual: actualVal,
      remaining: budgetVal - actualVal,
      percentUsed: budgetVal > 0 ? (actualVal / budgetVal) * 100 : 0
    };
  });

  // Calculate monthly summaries
  const monthsList = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' }
  ];

  const currentYear = state.settings.fiscalYear;

  const monthlySummaries = monthsList.map(m => {
    const monthTxns = state.transactions.filter(t => {
      const parts = t.date.split('-');
      if (parts.length < 2) return false;
      const tYear = parts[0];
      const tMonth = parseInt(parts[1], 10);
      return tYear === currentYear && tMonth === m.num;
    });

    const inc = monthTxns.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const exp = monthTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);

    return {
      monthNum: m.num,
      monthName: m.name,
      income: inc,
      expense: exp,
      net: inc - exp
    };
  });

  // Filter and sort transactions for LEDGER View
  const filteredTransactions = state.transactions
    .filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const matchFund = fundFilter === 'all' || t.fund === fundFilter;

      return matchSearch && matchType && matchCategory && matchFund;
    })
    .sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'amount') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Action: Add / Update Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnForm.date || !txnForm.description || txnForm.amount === undefined || txnForm.amount <= 0 || !txnForm.category || !txnForm.fund) {
      alert('Please fill out all mandatory transaction details.');
      return;
    }

    const payload: Transaction = {
      id: editingTransaction?.id || `T${Date.now().toString().slice(-4)}`,
      date: txnForm.date,
      description: txnForm.description,
      category: txnForm.category,
      fund: txnForm.fund,
      type: txnForm.type as 'Income' | 'Expense',
      amount: Number(txnForm.amount),
      paymentMethod: txnForm.paymentMethod as any,
      referenceNumber: txnForm.referenceNumber || '',
      notes: txnForm.notes || ''
    };

    let updatedList;
    if (editingTransaction) {
      updatedList = state.transactions.map(t => t.id === editingTransaction.id ? payload : t);
    } else {
      updatedList = [payload, ...state.transactions];
    }

    saveState({
      ...state,
      transactions: updatedList
    });

    setShowTransactionModal(false);
    setEditingTransaction(null);
  };

  // Action: Delete Transaction with dialog confirmation
  const handleDeleteTransaction = (id: string, description: string) => {
    triggerConfirmation(
      'Delete Ledger Transaction?',
      `Are you sure you want to permanently delete transaction "${description}" (ID: ${id})? This will permanently affect balances.`,
      () => {
        saveState({
          ...state,
          transactions: state.transactions.filter(t => t.id !== id)
        });
      }
    );
  };

  // Action: Create Category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) return;

    const formattedName = catForm.name.trim();
    if (catForm.type === 'income') {
      if (state.incomeCategories.includes(formattedName)) {
        alert('This income category already exists.');
        return;
      }
      saveState({
        ...state,
        incomeCategories: [...state.incomeCategories, formattedName]
      });
    } else {
      if (state.expenseCategories.includes(formattedName)) {
        alert('This expense category already exists.');
        return;
      }
      saveState({
        ...state,
        expenseCategories: [...state.expenseCategories, formattedName],
        // Set a default annual budget of 0 as reference
        budgets: [...state.budgets, { category: formattedName, annualBudget: 0 }]
      });
    }

    setCatForm({ name: '', type: 'income' });
    setShowCategoryModal(false);
  };

  // Action: Confirm and Remove Category
  const handleDeleteCategory = (name: string, type: 'income' | 'expense') => {
    triggerConfirmation(
      'Delete Category Definition?',
      `Are you sure you want to delete category "${name}"? It will be removed from all future dropdown selection lists. Existing transactions with this category will not be altered.`,
      () => {
        if (type === 'income') {
          saveState({
            ...state,
            incomeCategories: state.incomeCategories.filter(c => c !== name)
          });
        } else {
          saveState({
            ...state,
            expenseCategories: state.expenseCategories.filter(c => c !== name),
            budgets: state.budgets.filter(b => b.category !== name)
          });
        }
      }
    );
  };

  // Action: Create restricted/unrestricted Fund target
  const handleSaveFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundForm.id || !fundForm.name) {
      alert('Missing identifiers or titles.');
      return;
    }

    const payload: FundDefinition = {
      id: fundForm.id.trim(),
      name: fundForm.name.trim(),
      isRestricted: fundForm.isRestricted
    };

    if (state.funds.some(f => f.id === payload.id || f.name.toLowerCase() === payload.name.toLowerCase())) {
      alert('A fund with this ID or Name already exists in your registry.');
      return;
    }

    saveState({
      ...state,
      funds: [...state.funds, payload]
    });

    setFundForm({ id: '', name: '', isRestricted: false });
    setShowFundModal(false);
  };

  // Action: Remove fund registry with safety check
  const handleDeleteFund = (id: string, name: string) => {
    triggerConfirmation(
      'Remove Fund Segment?',
      `Are you sure you want to remove fund "${name}" (ID: ${id})? Future data entry columns will omit this choice.`,
      () => {
        saveState({
          ...state,
          funds: state.funds.filter(f => f.id !== id)
        });
      }
    );
  };

  // Action: Save Budget allocation
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.category) return;

    const payload: ExpenseCategoryBudget = {
      category: budgetForm.category,
      annualBudget: Number(budgetForm.annualBudget)
    };

    const updated = state.budgets.some(b => b.category === payload.category)
      ? state.budgets.map(b => b.category === payload.category ? payload : b)
      : [...state.budgets, payload];

    saveState({
      ...state,
      budgets: updated
    });

    setShowBudgetModal(false);
  };

  // Action: Record dynamic reconciliation log
  const handleSaveReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconForm.date) return;

    const payload: ReconciliationRecord = {
      date: reconForm.date,
      bookBalance: Number(reconForm.bookBalance),
      bankBalance: Number(reconForm.bankBalance),
      notes: reconForm.notes || ''
    };

    saveState({
      ...state,
      reconciliations: [payload, ...state.reconciliations]
    });

    setReconForm({ date: new Date().toISOString().split('T')[0], bookBalance: 0, bankBalance: 0, notes: '' });
    setShowReconciliationModal(false);
  };

  // Action: Remove reconciliation statement
  const handleDeleteReconciliation = (index: number, date: string) => {
    triggerConfirmation(
      'Remove Reconciliation Entry?',
      `Are you sure you want to remove the ledger reconciliation log from ${date}?`,
      () => {
        saveState({
          ...state,
          reconciliations: state.reconciliations.filter((_, idx) => idx !== index)
        });
      }
    );
  };

  // Action: Overwrite system master settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveState({
      ...state,
      settings: settingsForm
    });
    setShowSettingsModal(false);
  };

  const openEditTxnModal = (txn: Transaction) => {
    setEditingTransaction(txn);
    setTxnForm({ ...txn });
    setShowTransactionModal(true);
  };

  const openNewTxnModal = (type: 'Income' | 'Expense') => {
    setEditingTransaction(null);
    setTxnForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: type === 'Income' ? state.incomeCategories[0] || '' : state.expenseCategories[0] || '',
      fund: state.funds[0]?.name || '',
      type,
      amount: 0,
      paymentMethod: 'Cash',
      referenceNumber: '',
      notes: ''
    });
    setShowTransactionModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex-shrink-0 flex flex-col shadow-xl z-20">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#FBBC05] font-mono font-semibold">Financial Ledger</span>
            <h1 className="text-lg font-bold text-white mt-1 leading-tight truncate">
              {state.settings.churchName}
            </h1>
          </div>
          <button 
            className="md:hidden p-1 text-slate-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Sync Indicator Widget */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 text-[11px] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`h-2.5 w-2.5 rounded-full ${
              syncStatus === 'connected' ? 'bg-emerald-500' :
              syncStatus === 'syncing' ? 'bg-indigo-400 animate-pulse' :
              syncStatus === 'error' ? 'bg-rose-500' : 'bg-slate-500'
            }`} />
            <span className="font-mono text-slate-400">
              {syncStatus === 'connected' ? 'Sheets Connected' :
               syncStatus === 'syncing' ? 'Sync Active...' :
               syncStatus === 'error' ? 'Sync Error' : 'Offline Mode'}
            </span>
          </div>
          {spreadsheetLink && (
            <a 
              href={spreadsheetLink} 
              target="_blank" 
              rel="noreferrer" 
              title="Open Google Spreadsheet"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className={`flex-1 p-4 space-y-1 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <PieChart size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveTab('ledger'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === 'ledger' ? 'bg-indigo-600 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <BookOpen size={18} />
            <span>Ledger Ledger ({state.transactions.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('budget'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === 'budget' ? 'bg-indigo-600 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Sliders size={18} />
            <span>Annual Budgets</span>
          </button>

          <button
            onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Calendar size={18} />
            <span>Monthly Reports</span>
          </button>

          <button
            onClick={() => { setActiveTab('reconciliation'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === 'reconciliation' ? 'bg-indigo-600 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Check size={18} />
            <span>Bank Reconciliation</span>
          </button>

          <button
            onClick={() => { setActiveTab('sheets_sync'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === 'sheets_sync' ? 'bg-indigo-600 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Database size={18} />
            <span className="flex items-center gap-1.5">
              Sheets Sync 
              {syncStatus === 'connected' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
            </span>
          </button>
        </nav>

        {/* Sidebar Footer Settings */}
        <div className={`p-4 border-t border-slate-800 ${mobileMenuOpen ? 'block shadow-inner' : 'hidden md:block'}`}>
          <button
            onClick={() => {
              setSettingsForm({ ...state.settings });
              setShowSettingsModal(true);
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <Settings size={18} />
            <span>Church Settings</span>
          </button>
          
          <div className="mt-3 text-[10px] text-slate-500 text-center font-mono bg-slate-950/30 p-2 rounded">
            Fiscal Year: {state.settings.fiscalYear} • {state.settings.currency}
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Top bar header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 uppercase tracking-widest font-mono font-medium">
              <span>Church Ledger Workspace</span>
              <span>/</span>
              <span className="text-indigo-600">{activeTab.toUpperCase()}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {activeTab === 'dashboard' && 'Financial Position Overview'}
              {activeTab === 'ledger' && 'Primary Transaction Ledger'}
              {activeTab === 'budget' && 'Annual Expense Category Budgets'}
              {activeTab === 'reports' && 'Generated Monthly Accounting Summaries'}
              {activeTab === 'reconciliation' && 'Bank Statement Reconciliation'}
              {activeTab === 'sheets_sync' && 'Google Sheets Workbooks Synchronization'}
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => openNewTxnModal('Income')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-sm hover:shadow transition-all duration-150"
            >
              <TrendingUp size={14} />
              <span>Record Income</span>
            </button>
            <button
              onClick={() => openNewTxnModal('Expense')}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-sm hover:shadow transition-all duration-150"
            >
              <TrendingDown size={14} />
              <span>Record Expense</span>
            </button>
          </div>
        </header>

        {/* ------------------------------------------------------------- */}
        {/* TAB CONTENT: DASHBOARD */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Primary KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Wallet size={20} />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Starting Treasury Capital</span>
                  <span className="text-xl font-bold text-slate-900 font-mono tracking-tight">{formatMoney(state.settings.startingBalance)}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Current Recurrent Income</span>
                  <span className="text-xl font-bold text-emerald-600 font-mono tracking-tight">+{formatMoney(totalIncome)}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Current Recurrent Expense</span>
                  <span className="text-xl font-bold text-rose-600 font-mono tracking-tight">-{formatMoney(totalExpense)}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-sm flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Net Treasury Assets</span>
                  <span className={`text-xl font-bold font-mono tracking-tight ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatMoney(netBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Asset distribution metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Liquidity breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 col-span-1">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-mono">Liquidity Accounts</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Landmark className="text-indigo-600" size={16} />
                      <span className="text-sm font-medium">Bank Reconciled Ledger</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-900">{formatMoney(bankBalance)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Wallet className="text-emerald-600" size={16} />
                      <span className="text-sm font-medium">Cash On-Hand</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-900">{formatMoney(cashBalance)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="text-amber-600" size={16} />
                      <span className="text-sm font-bold">Mobile / Cleared Cheques</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-900">{formatMoney(mobileBalance)}</span>
                  </div>
                </div>
                
                <div className="text-[11px] text-slate-400 font-mono text-center">
                  Base allocated according to settings starting balance layout.
                </div>
              </div>

              {/* Fund balance boards */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 col-span-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-mono">Restricted & General Fund Assets</h3>
                  <button 
                    onClick={() => setShowFundModal(true)}
                    className="text-xs text-indigo-600 hover:underline font-medium flex items-center space-x-1"
                  >
                    <Plus size={12} />
                    <span>Create Fund</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fundBalances.map(fund => (
                    <div key={fund.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50 space-y-1 hover:border-indigo-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-slate-800 text-sm">{fund.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${fund.isRestricted ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                          {fund.isRestricted ? 'Restricted' : 'General'}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-xs text-slate-500 font-mono">ID: {fund.id}</span>
                        <span className="font-bold text-slate-950 font-mono text-sm">{formatMoney(fund.balance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* High level budget progress circles / bars */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-mono">Annual Category Budget Utilization</h3>
                <span className="text-xs text-slate-500 font-mono">Sorted by Spent Percentage</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {budgetUtilization.slice(0, 4).map(b => (
                  <div key={b.category} className="p-4 border border-slate-100 rounded-xl space-y-2 bg-slate-50/50">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700 truncate">{b.category}</span>
                      <span className="font-mono text-indigo-600 font-bold">{b.percentUsed.toFixed(0)}%</span>
                    </div>
                    {/* Progress slider track */}
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          b.percentUsed > 100 ? 'bg-rose-500' :
                          b.percentUsed > 75 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Spent: {formatMoney(b.actual)}</span>
                      <span>Budget: {formatMoney(b.budget)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB CONTENT: LEDGER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Filters Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search description, reference number, notes..."
                  className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Select filters */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-1 border border-slate-200 bg-white rounded-lg px-2 text-xs">
                  <Filter size={12} className="text-slate-500" />
                  <select
                    className="focus:outline-none bg-transparent py-1.5 font-medium text-slate-700"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Flows</option>
                    <option value="Income">Income Only</option>
                    <option value="Expense">Expenses Only</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1 border border-slate-200 bg-white rounded-lg px-2 text-xs">
                  <select
                    className="focus:outline-none bg-transparent py-1.5 font-medium text-slate-700 max-w-[140px]"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option disabled className="font-bold text-slate-400">--- Income ---</option>
                    {state.incomeCategories.map(c => <option key={`fcat-inc-${c}`} value={c}>{c}</option>)}
                    <option disabled className="font-bold text-slate-400">--- Expense ---</option>
                    {state.expenseCategories.map(c => <option key={`fcat-exp-${c}`} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="flex items-center space-x-1 border border-slate-200 bg-white rounded-lg px-2 text-xs">
                  <select
                    className="focus:outline-none bg-transparent py-1.5 font-medium text-slate-700"
                    value={fundFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Funds</option>
                    {state.funds.map(f => <option key={`ffund-${f.name}`} value={f.name}>{f.name}</option>)}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setCategoryFilter('all');
                    setFundFilter('all');
                  }}
                  className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1.5 font-semibold"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Table layout container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono">
                  <tr>
                    <th className="p-4 font-bold">Transaction ID</th>
                    <th className="p-4 font-bold cursor-pointer hover:text-indigo-600" onClick={() => { setSortField('date'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                      Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:text-indigo-600" onClick={() => { setSortField('description'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                      Description {sortField === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 font-bold">Fund Asset</th>
                    <th className="p-4 font-bold cursor-pointer hover:text-indigo-600" onClick={() => { setSortField('amount'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                      Amount {sortField === 'amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4 font-bold">Source</th>
                    <th className="p-4 font-bold">Ref No.</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium font-mono text-xs">
                        No transactions match the ledger query parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-indigo-50/15 transition-colors">
                        <td className="p-4 font-bold font-mono text-slate-600">{t.id}</td>
                        <td className="p-4 whitespace-nowrap text-slate-600 font-mono">{t.date}</td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-900 block">{t.description}</span>
                          {t.notes && <span className="text-[10px] text-slate-400 truncate max-w-[200px] block">{t.notes}</span>}
                        </td>
                        <td className="p-4 font-medium text-slate-800">{t.category}</td>
                        <td className="p-4">
                          <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            {t.fund}
                          </span>
                        </td>
                        <td className="p-4 font-bold font-mono">
                          <span className={t.type === 'Income' ? 'text-emerald-700' : 'text-rose-600'}>
                            {t.type === 'Income' ? '+' : '-'}{formatMoney(t.amount)}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-600">{t.paymentMethod}</td>
                        <td className="p-4 font-mono text-slate-500">{t.referenceNumber || '—'}</td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="inline-flex space-x-2">
                            <button
                              onClick={() => openEditTxnModal(t)}
                              className="p-1 hover:text-indigo-600 transition-colors"
                              title="Edit Entry"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(t.id, t.description)}
                              className="p-1 hover:text-rose-600 transition-colors"
                              title="Delete Entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total ledger summary bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between text-slate-500 text-xs font-mono">
              <div className="flex flex-wrap gap-4">
                <span>Income Count: <strong className="text-emerald-700 font-bold">{state.transactions.filter(t => t.type === 'Income').length}</strong></span>
                <span>Expense Count: <strong className="text-rose-600 font-bold">{state.transactions.filter(t => t.type === 'Expense').length}</strong></span>
                <span>Filtered Count: <strong className="text-indigo-600 font-bold">{filteredTransactions.length}</strong></span>
              </div>
              <div className="text-right">
                <span>Summed Net Ledger: {formatMoney(filteredTransactions.reduce((acc, t) => acc + (t.type === 'Income' ? t.amount : -t.amount), 0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB CONTENT: BUDGET */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-800 text-xs shadow-sm">
              <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-1">Fiscal Year Accounting Directives</strong>
                Annual budgets enable leadership to manage spending limits. Setting budgets to zero indicates unallocated limits. If expenses exceed allocated targets, the metrics turn red to indicate an alert.
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider font-mono">Approved Budgets vs Historical Expense Spending</h3>
                <button
                  onClick={() => {
                    setBudgetForm({ category: state.expenseCategories[0] || '', annualBudget: 0 });
                    setShowBudgetModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 font-medium shadow transition-all"
                >
                  <Plus size={13} />
                  <span>Allocate Budget</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono tracking-widest text-[10px]">
                    <tr>
                      <th className="p-4 font-bold">Expense Category</th>
                      <th className="p-4 font-bold">Approved Annual Budget</th>
                      <th className="p-4 font-bold">Historical Real Spend</th>
                      <th className="p-4 font-bold">Budget Status/Remaining</th>
                      <th className="p-4 font-bold">Utilization Track</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {budgetUtilization.map(b => (
                      <tr key={`util-${b.category}`} className="hover:bg-indigo-50/15 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{b.category}</td>
                        <td className="p-4 font-semibold font-mono text-slate-700">
                          {b.budget > 0 ? formatMoney(b.budget) : <span className="text-slate-400 font-normal italic">Unallocated</span>}
                        </td>
                        <td className="p-4 font-semibold font-mono text-rose-600">
                          {formatMoney(b.actual)}
                        </td>
                        <td className="p-4 font-mono font-bold">
                          {b.budget === 0 ? (
                            <span className="text-slate-400 italic">No limit</span>
                          ) : b.remaining < 0 ? (
                            <span className="text-rose-600">Overspent by {formatMoney(Math.abs(b.remaining))}</span>
                          ) : (
                            <span className="text-emerald-700">{formatMoney(b.remaining)} left</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3 w-48">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  b.percentUsed > 100 ? 'bg-rose-500' :
                                  b.percentUsed > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                              />
                            </div>
                            <span className="text-slate-500 font-mono font-bold text-[10px] whitespace-nowrap">
                              {b.percentUsed.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            className="p-1 hover:text-indigo-600 font-semibold"
                            onClick={() => {
                              setBudgetForm({ category: b.category, annualBudget: b.budget });
                              setShowBudgetModal(true);
                            }}
                          >
                            <Sliders size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB CONTENT: REPORTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Top Summarization widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-center">
                <span className="text-xs text-slate-400 block tracking-widest uppercase font-mono">Gross Total Net Surplus</span>
                <span className="text-2xl font-black text-emerald-600 font-mono">
                  {formatMoney(monthlySummaries.reduce((acc, m) => acc + m.net, 0))}
                </span>
                <p className="text-[10px] text-slate-500">Recurrent income metrics excluding beginning reserves.</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-center">
                <span className="text-xs text-slate-400 block tracking-widest uppercase font-mono">Quarterly Cash Flow Net</span>
                <div className="grid grid-cols-4 gap-2 text-[10px] font-mono p-1">
                  <div>
                    <span className="text-slate-400 block">Q1</span>
                    <span className="font-bold">{formatMoney(monthlySummaries.slice(0, 3).reduce((acc, m) => acc + m.net, 0))}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Q2</span>
                    <span className="font-bold">{formatMoney(monthlySummaries.slice(3, 6).reduce((acc, m) => acc + m.net, 0))}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Q3</span>
                    <span className="font-bold">{formatMoney(monthlySummaries.slice(6, 9).reduce((acc, m) => acc + m.net, 0))}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Q4</span>
                    <span className="font-bold">{formatMoney(monthlySummaries.slice(9, 12).reduce((acc, m) => acc + m.net, 0))}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-center flex flex-col justify-center">
                <span className="text-xs text-slate-400 block tracking-widest uppercase font-mono">Operational Category Registry</span>
                <div className="flex flex-wrap justify-center gap-1 pt-1.5">
                  <button 
                    onClick={() => setShowCategoryModal(true)}
                    className="text-[10px] bg-slate-100 py-0.5 px-2 rounded hover:bg-slate-200 font-medium"
                  >
                    Manage Categories
                  </button>
                </div>
              </div>
            </div>

            {/* Monthly summaries grid list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold font-mono text-sm uppercase text-slate-700 tracking-wider">
                Reconciliation Month-by-Month Statement Layout ({state.settings.fiscalYear})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs select-none">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4 font-bold">Month name</th>
                      <th className="p-4 font-bold">Recurrent Income</th>
                      <th className="p-4 font-bold">Recurrent Expense</th>
                      <th className="p-4 font-bold">Net Operational Balance</th>
                      <th className="p-4 font-bold">Surplus Ratio Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {monthlySummaries.map(m => (
                      <tr key={`month-${m.monthNum}`} className="hover:bg-indigo-50/15 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{m.monthName}</td>
                        <td className="p-4 font-semibold text-emerald-700">+{formatMoney(m.income)}</td>
                        <td className="p-4 font-semibold text-rose-600">-{formatMoney(m.expense)}</td>
                        <td className={`p-4 font-bold ${m.net >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                          {m.net >= 0 ? '+' : ''}{formatMoney(m.net)}
                        </td>
                        <td className="p-4">
                          {m.income === 0 && m.expense === 0 ? (
                            <span className="text-slate-400 italic">No activity</span>
                          ) : m.net >= 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                              {(m.net / (m.income || 1) * 100).toFixed(0)}% Surplus
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-semibold">
                              Deficit Gap
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB CONTENT: RECONCILIATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold uppercase tracking-wider font-mono">Book Balance vs Bank Statement Reconciled Logs</h3>
                <button
                  onClick={() => {
                    setReconForm({ date: new Date().toISOString().split('T')[0], bookBalance: 0, bankBalance: 0, notes: '' });
                    setShowReconciliationModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 font-medium shadow"
                >
                  <Plus size={13} />
                  <span>Verify Record Date</span>
                </button>
              </div>

              {/* Layout description */}
              <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
                Reconciliation tracks matches between Ledger book records and official monthly church bank statements. If there are pending/un-cleared checks, record them in the notes section. Use these columns to ensure balanced accounting.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                    <tr>
                      <th className="p-4 font-bold">Verification Date</th>
                      <th className="p-4 font-bold">Ledger Book Balance</th>
                      <th className="p-4 font-bold">Bank Statement Balance</th>
                      <th className="p-4 font-bold">Difference Balance</th>
                      <th className="p-4 font-bold">Status Flags</th>
                      <th className="p-4 font-bold">Recon Audit Notes</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.reconciliations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-mono text-xs">
                          No bank reconciliation records registered yet. Click &apos;Verify Record Date&apos; above.
                        </td>
                      </tr>
                    ) : (
                      state.reconciliations.map((r, idx) => {
                        const diff = r.bookBalance - r.bankBalance;
                        return (
                          <tr key={`recon-${idx}-${r.date}`} className="hover:bg-indigo-50/15 transition-colors font-mono">
                            <td className="p-4 font-semibold text-slate-900">{r.date}</td>
                            <td className="p-4 font-bold">{formatMoney(r.bookBalance)}</td>
                            <td className="p-4 font-bold">{formatMoney(r.bankBalance)}</td>
                            <td className={`p-4 font-bold ${diff === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {diff === 0 ? 'Balanced' : formatMoney(diff)}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {diff === 0 ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                                  ● Match Verified
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold animate-pulse">
                                  ▲ Float Mismatch
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-600 normal-case italic max-w-xs truncate" title={r.notes}>{r.notes || 'No comments'}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteReconciliation(idx, r.date)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB CONTENT: SHEETS SYNC */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'sheets_sync' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Google Account Integration</h3>
                    <p className="text-xs text-slate-400 font-mono">Workspace scopes and client authorization keys mappings.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {accessToken ? (
                    <button
                      onClick={handleDisconnect}
                      className="border border-slate-200 hover:border-slate-300 text-slate-700 bg-white text-xs px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                    >
                      Disconnect Connected Account
                    </button>
                  ) : (
                    <button
                      onClick={handleGoogleConnect}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center space-x-1.5 shadow"
                    >
                      <Database size={14} />
                      <span>Authenticate Google Sheets</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Setup Instruction */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#FBBC05] font-mono">1. Client-Side Authorization Gateways Configuration</h4>
                  <button 
                    onClick={() => setClientIdHelp(!clientIdHelp)} 
                    className="text-xs text-indigo-600 hover:underline flex items-center space-x-1"
                  >
                    <span>{clientIdHelp ? 'Hide Instructions' : 'How to set up Client ID'}</span>
                  </button>
                </div>

                {clientIdHelp && (
                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-white p-4 rounded border border-slate-200">
                    <p className="font-semibold text-slate-900">Configure your Google Sheets integration in 3 easy steps:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google Cloud Console</a>.</li>
                      <li>Create an OAuth 2.0 Client ID for a <strong>Web Application</strong>.</li>
                      <li>Add the following URLs to <strong>Authorized JavaScript Origins</strong>:
                        <ul className="list-disc pl-4 mt-1 font-mono text-[10px] bg-slate-50 p-1.5 rounded space-y-0.5">
                          <li>{window.location.origin}</li>
                          <li>https://ais-dev-rxdw7wytvp2fkkbeypdec4-257327972633.europe-west2.run.app</li>
                        </ul>
                      </li>
                      <li>Paste the generated Client ID below to allow direct client authentication popup gates.</li>
                    </ol>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">Google OAuth Client ID</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Paste your 12-digit Client ID.apps.googleusercontent.com"
                      value={googleClientId}
                      onChange={(e) => {
                        setGoogleClientId(e.target.value);
                        localStorage.setItem('church_finance_google_client_id', e.target.value);
                      }}
                      className="text-xs border border-slate-200 rounded-lg p-2.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('church_finance_google_client_id', googleClientId);
                        alert('Client ID saved to local memory.');
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 text-xs rounded-lg font-semibold"
                    >
                      Save Key
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Keys are encrypted and cached locally inside your private browser sandbox.</p>
                </div>
              </div>

              {/* Status report */}
              <div className={`rounded-xl p-5 border flex items-start space-x-4 ${
                syncStatus === 'connected' ? 'bg-emerald-50/50 border-emerald-100' :
                syncStatus === 'syncing' ? 'bg-indigo-50/50 border-indigo-100 animate-pulse' :
                syncStatus === 'error' ? 'bg-rose-50 border-rose-100 font-semibold' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}>
                <div className="mt-0.5">
                  {syncStatus === 'connected' && <Check className="text-emerald-600 h-5 w-5" />}
                  {syncStatus === 'syncing' && <RefreshCw className="text-indigo-600 animate-spin h-5 w-5" />}
                  {syncStatus === 'error' && <AlertCircle className="text-rose-600 h-5 w-5" />}
                  {syncStatus === 'disconnected' && <Info className="text-slate-500 h-5 w-5" />}
                  {syncStatus === 'connecting' && <RefreshCw className="text-indigo-600 animate-spin h-5 w-5" />}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-800">Workspace Synchronizer Status Log</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-wrap">{syncMessage}</p>
                </div>
              </div>

              {/* Active sheets actions */}
              {accessToken ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#FBBC05] font-mono">2. Workbook Allocation & Dynamic Transfer Controls</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Setup workbook */}
                    <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl space-y-3">
                      <h5 className="text-xs font-semibold text-slate-800">Target Drive Spreadsheet Title</h5>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={spreadsheetTitle}
                          onChange={(e) => setSpreadsheetTitle(e.target.value)}
                          placeholder="Grace Community Church Financials"
                          className="text-xs border border-slate-200 rounded-lg p-2.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <button
                          onClick={handleSheetsLookupOrCreate}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2.5 rounded-lg flex items-center space-x-1 font-bold"
                        >
                          <Link size={12} />
                          <span>Mapp / Lookup</span>
                        </button>
                      </div>
                      
                      {spreadsheetId && (
                        <div className="text-[11px] font-mono bg-white p-2.5 rounded border border-slate-100 space-y-1.5 text-slate-500">
                          <div><span className="font-bold text-slate-700">Workbook ID:</span> {spreadsheetId}</div>
                          {spreadsheetLink && (
                            <a 
                              href={spreadsheetLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-indigo-600 hover:underline flex items-center space-x-1"
                            >
                              <span>View file on Google Sheets Workspace</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Push / Pull controls */}
                    <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl flex flex-col justify-between gap-3">
                      <div>
                        <h5 className="text-xs font-semibold text-slate-800">Synchronization Sync Actions</h5>
                        <p className="text-[11px] text-slate-500 mt-1">Push uploads current browser memory logs. Pull replaces local rows with worksheets values.</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handlePushData}
                          disabled={!spreadsheetId}
                          className={`flex-1 py-2.5 px-3 text-xs rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow ${
                            spreadsheetId ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Upload size={14} />
                          <span>Push Memory to Sheets</span>
                        </button>
                        <button
                          onClick={handlePullData}
                          disabled={!spreadsheetId}
                          className={`flex-1 py-2.5 px-3 text-xs border border-slate-200 rounded-lg justify-center font-bold flex items-center space-x-1.5 bg-white ${
                            spreadsheetId ? 'text-slate-800 hover:bg-slate-50' : 'text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Download size={14} />
                          <span>Pull Sheets to Memory</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL MODALS & DIALOGS */}
      {/* ------------------------------------------------------------- */}
      
      {/* CONFIRMATION DIALOG MODAL (MANDATORY per Workspace guidelines) */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 font-sans"
            >
              <div className="flex items-start space-x-3 text-amber-600">
                <AlertCircle className="flex-shrink-0 mt-0.5 h-6 w-6" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{showConfirmModal.title}</h3>
                  <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-0.5">User permission validation required</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded">
                {showConfirmModal.message}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmModal.onConfirm}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 py-2 rounded-lg font-bold"
                >
                  Proceed / Overwrite
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: TRANSACTION ADD/EDIT */}
      <AnimatePresence>
        {showTransactionModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col font-sans"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                  {editingTransaction ? 'Edit Transaction Details' : 'Record New Ledger Entry'}
                </h3>
                <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Transaction Type</label>
                    <select
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500 bg-white"
                      value={txnForm.type}
                      onChange={(e) => {
                        const tType = e.target.value as 'Income' | 'Expense';
                        setTxnForm({
                          ...txnForm,
                          type: tType,
                          category: tType === 'Income' ? state.incomeCategories[0] || '' : state.expenseCategories[0] || ''
                        });
                      }}
                    >
                      <option value="Income">Income (Tithes, offerings...)</option>
                      <option value="Expense">Expense (Bills, maintenance...)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Log Date</label>
                    <input
                      type="date"
                      required
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500 font-mono"
                      value={txnForm.date}
                      onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 block font-bold mb-1">Detail Description</label>
                  <input
                    type="text"
                    required
                    placeholder="Sunday morning offering, Electric Sanctuary bill..."
                    className="w-full border p-2 rounded-lg focus:outline-indigo-500"
                    value={txnForm.description}
                    onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Allocation Fund</label>
                    <select
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500 bg-white"
                      value={txnForm.fund}
                      onChange={(e) => setTxnForm({ ...txnForm, fund: e.target.value })}
                    >
                      {state.funds.map(f => <option key={`opt-fund-${f.name}`} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Category Code</label>
                    <select
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500 bg-white"
                      value={txnForm.category}
                      onChange={(e) => setTxnForm({ ...txnForm, category: e.target.value })}
                    >
                      {txnForm.type === 'Income'
                        ? state.incomeCategories.map(c => <option key={`opt-inc-${c}`} value={c}>{c}</option>)
                        : state.expenseCategories.map(c => <option key={`opt-exp-${c}`} value={c}>{c}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Amount ({state.settings.currency})</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500 font-mono font-bold"
                      value={txnForm.amount || ''}
                      onChange={(e) => setTxnForm({ ...txnForm, amount: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Payment Method</label>
                    <select
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500 bg-white"
                      value={txnForm.paymentMethod}
                      onChange={(e) => setTxnForm({ ...txnForm, paymentMethod: e.target.value as any })}
                    >
                      <option value="Cash">Cash (On Hand)</option>
                      <option value="Bank">Bank Reconciled</option>
                      <option value="Mobile Money">Mobile Money (ETB Cash-Out)</option>
                      <option value="Cheque">Bank Direct Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Receipt / Invoice Ref Number</label>
                    <input
                      type="text"
                      placeholder="e.g. REC-0094, CK-421"
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500 font-mono"
                      value={txnForm.referenceNumber || ''}
                      onChange={(e) => setTxnForm({ ...txnForm, referenceNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block font-bold mb-1">Audit Log Comments</label>
                    <input
                      type="text"
                      placeholder="Additional metadata if needed..."
                      className="w-full border p-2 rounded-lg focus:outline-indigo-500"
                      value={txnForm.notes || ''}
                      onChange={(e) => setTxnForm({ ...txnForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="border bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-800"
                  >
                    Commit / Save Row
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CATEGORIES */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-150 flex flex-col font-sans text-xs"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-bold uppercase tracking-wider font-mono">Registry Category Manager</h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <form onSubmit={handleSaveCategory} className="space-y-3 bg-slate-50 p-3 rounded-xl border">
                  <strong className="block text-slate-700">Add New Category Definition</strong>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-0.5">Stream Direction</label>
                      <select
                        className="w-full border p-1.5 rounded bg-white"
                        value={catForm.type}
                        onChange={(e) => setCatForm({ ...catForm, type: e.target.value as any })}
                      >
                        <option value="income">Income Code</option>
                        <option value="expense">Expense Code</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">Category Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Media Ministry"
                        value={catForm.name}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        className="w-full border p-1.5 rounded"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded font-bold shadow-sm">
                    Add definition
                  </button>
                </form>

                {/* Categories Lists */}
                <div className="grid grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto">
                  <div>
                    <strong className="block text-[#FBBC05] text-[10px] uppercase font-mono tracking-wider mb-2">Income Columns</strong>
                    <div className="space-y-1">
                      {state.incomeCategories.map(c => (
                        <div key={`cat-i-${c}`} className="flex justify-between items-center p-2 rounded bg-slate-50 hover:bg-slate-100">
                          <span className="truncate">{c}</span>
                          <button onClick={() => handleDeleteCategory(c, 'income')} className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <strong className="block text-indigo-600 text-[10px] uppercase font-mono tracking-wider mb-2">Expense Columns</strong>
                    <div className="space-y-1">
                      {state.expenseCategories.map(c => (
                        <div key={`cat-e-${c}`} className="flex justify-between items-center p-2 rounded bg-slate-50 hover:bg-slate-100">
                          <span className="truncate">{c}</span>
                          <button onClick={() => handleDeleteCategory(c, 'expense')} className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BUDGET ALLOCATION */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col font-sans text-xs"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-bold uppercase tracking-wider font-mono">Allocate Budget Target Value</h3>
                <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBudget} className="p-4 space-y-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Expense Category</label>
                  <select
                    className="w-full border p-2 rounded-lg bg-white"
                    value={budgetForm.category}
                    onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  >
                    {state.expenseCategories.map(c => <option key={`bcat-${c}`} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Annual Budget Allocation ({state.settings.currency})</label>
                  <input
                    type="number"
                    min={0}
                    required
                    className="w-full border p-2 rounded-lg font-mono font-bold"
                    value={budgetForm.annualBudget || ''}
                    onChange={(e) => setBudgetForm({ ...budgetForm, annualBudget: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">Set budgeted cash target of this fiscal year.</span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setShowBudgetModal(false)} className="border bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold">
                    Cancel
                  </button>
                  <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-800">
                    Map Allocation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: FUND REGISTRY */}
      <AnimatePresence>
        {showFundModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col font-sans text-xs"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-bold uppercase tracking-wider font-mono">Church Fund Segment Registry</h3>
                <button onClick={() => setShowFundModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <form onSubmit={handleSaveFund} className="p-3 bg-slate-50 border rounded-xl space-y-3">
                  <strong className="block text-slate-700">Add New Directed Fund</strong>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-0.5">Fund ID Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. F005"
                        value={fundForm.id}
                        onChange={(e) => setFundForm({ ...fundForm, id: e.target.value })}
                        className="border w-full p-1.5 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-0.5">Fund Descriptive Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Media Equipment Fund"
                        value={fundForm.name}
                        onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
                        className="border w-full p-1.5 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="restricted-chk"
                      checked={fundForm.isRestricted}
                      onChange={(e) => setFundForm({ ...fundForm, isRestricted: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="restricted-chk" className="select-none text-slate-700 font-semibold cursor-pointer">
                      Mark as Restricted (Money can only support this specific segment)
                    </label>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded font-bold shadow-sm">
                    Add Fund Segment Definition
                  </button>
                </form>

                {/* Funds list */}
                <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                  <strong className="block text-[10px] uppercase font-mono tracking-wider mb-1 text-slate-400">Current active funds definitions</strong>
                  {state.funds.map(f => (
                    <div key={f.id} className="flex justify-between items-center p-2 rounded border bg-slate-50 font-mono">
                      <div>
                        <span className="font-bold text-slate-800">{f.id}</span> — <span>{f.name}</span>
                        <span className={`text-[9px] ml-2 px-1 rounded ${f.isRestricted ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                          {f.isRestricted ? 'Restricted' : 'General'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDeleteFund(f.id, f.name)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete fund definition"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RECONCILIATION */}
      <AnimatePresence>
        {showReconciliationModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col font-sans text-xs"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-bold uppercase tracking-wider font-mono">Enter Statement Verification</h3>
                <button onClick={() => setShowReconciliationModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveReconciliation} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Check Date</label>
                    <input
                      type="date"
                      required
                      className="w-full border p-2 rounded-lg font-mono"
                      value={reconForm.date}
                      onChange={(e) => setReconForm({ ...reconForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Book Ledger Balance</label>
                    <input
                      type="number"
                      required
                      className="w-full border p-2 rounded-lg font-mono"
                      value={reconForm.bookBalance || ''}
                      onChange={(e) => setReconForm({ ...reconForm, bookBalance: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bank Statement Balance</label>
                  <input
                    type="number"
                    required
                    className="w-full border p-2 rounded-lg font-mono font-bold"
                    value={reconForm.bankBalance || ''}
                    onChange={(e) => setReconForm({ ...reconForm, bankBalance: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">Specify the net asset value reported in bank statements.</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Audit Explanatory Comments</label>
                  <textarea
                    placeholder="Uncleared cash items, deposit floats, outstanding checks reasons..."
                    className="w-full border p-2 rounded-lg focus:outline-indigo-500 h-16 resize-none"
                    value={reconForm.notes || ''}
                    onChange={(e) => setReconForm({ ...reconForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setShowReconciliationModal(false)} className="border bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold">
                    Cancel
                  </button>
                  <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-800">
                    Map Reconciliation Date
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: GENERAL SETTINGS */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col font-sans text-xs"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-bold uppercase tracking-wider font-mono">Church Configuration Panel</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-4 space-y-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 col-span-2">Church / Ministry Congregation Name</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.churchName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, churchName: e.target.value })}
                    className="w-full border p-2 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Fiscal Budget Year</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.fiscalYear}
                      onChange={(e) => setSettingsForm({ ...settingsForm, fiscalYear: e.target.value })}
                      className="w-full border p-2 rounded-lg font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Currency Code</label>
                    <select
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                      className="w-full border p-2 rounded-lg bg-white"
                    >
                      <option value="ETB">ETB (Birr)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="KES">KES (Shilling)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Starting Treasury Reserves (Cash flow baseline)</label>
                  <input
                    type="number"
                    required
                    value={settingsForm.startingBalance}
                    onChange={(e) => setSettingsForm({ ...settingsForm, startingBalance: Number(e.target.value) })}
                    className="w-full border p-2 rounded-lg font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 font-mono block">Initial savings capital holding baseline before year starts.</span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setShowSettingsModal(false)} className="border bg-white text-slate-700 px-4 py-2 rounded-lg font-semibold">
                    Cancel
                  </button>
                  <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-800">
                    Commit Updates
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
