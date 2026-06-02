import * as XLSX from 'xlsx';
import { AppState, Transaction } from './google-sheets';

/**
 * Generates and downloads a formatted Microsoft Excel (.xlsx) workbook directly in the client.
 */
export function exportToExcel(state: AppState) {
  const wb = XLSX.utils.book_new();

  // 1. Settings Sheet
  const settingsData: any[][] = [
    ['Grace Community Church Financial Management System'],
    ['System Configuration & Book Details'],
    [],
    ['Field', 'Value', 'Description'],
    ['Church Name', state.settings.churchName, 'Official Name of the Congregation'],
    ['Fiscal Year', state.settings.fiscalYear, 'Active Accounting Year'],
    ['Starting Balance', state.settings.startingBalance, 'Beginning Balance/Treasury Reserve of the Year'],
    ['Currency', state.settings.currency, 'Currency Code (e.g. ETB, USD, EUR)'],
  ];
  const wsSettings = XLSX.utils.aoa_to_sheet(settingsData);
  XLSX.utils.book_append_sheet(wb, wsSettings, 'Settings');

  // 2. Categories Sheet
  const categoriesData: any[][] = [
    ['Income Categories', 'Expense Categories'],
  ];
  const maxCats = Math.max(state.incomeCategories.length, state.expenseCategories.length);
  for (let i = 0; i < maxCats; i++) {
    categoriesData.push([
      state.incomeCategories[i] || '',
      state.expenseCategories[i] || ''
    ]);
  }
  const wsCategories = XLSX.utils.aoa_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, wsCategories, 'Categories');

  // 3. Funds Sheet
  const fundsData: any[][] = [
    ['Fund ID', 'Fund Name', 'Type', 'Calculated Fund Balance'],
  ];
  state.funds.forEach(f => {
    const inc = state.transactions
      .filter(t => t.fund === f.name && t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    const exp = state.transactions
      .filter(t => t.fund === f.name && t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const base = f.id === 'F001' ? state.settings.startingBalance : 0;
    const balance = base + inc - exp;

    fundsData.push([
      f.id,
      f.name,
      f.isRestricted ? 'Restricted' : 'Unrestricted',
      balance
    ]);
  });
  const wsFunds = XLSX.utils.aoa_to_sheet(fundsData);
  XLSX.utils.book_append_sheet(wb, wsFunds, 'Funds');

  // 4. Transactions Sheet
  const txnData: any[][] = [
    ['Transaction ID', 'Date', 'Description', 'Category', 'Fund', 'Type', 'Amount', 'Payment Method', 'Reference Number', 'Notes'],
  ];
  state.transactions.forEach(t => {
    txnData.push([
      t.id,
      t.date,
      t.description,
      t.category,
      t.fund,
      t.type,
      t.amount,
      t.paymentMethod,
      t.referenceNumber || '',
      t.notes || ''
    ]);
  });
  const wsTxns = XLSX.utils.aoa_to_sheet(txnData);
  XLSX.utils.book_append_sheet(wb, wsTxns, 'Transactions');

  // 5. Budget Sheet
  const budgetData: any[][] = [
    ['Category', 'Annual Budget', 'Actual Spending', 'Remaining Budget', 'Usage %'],
  ];
  state.budgets.forEach(b => {
    const actual = state.transactions
      .filter(t => t.category === b.category && t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const remaining = b.annualBudget - actual;
    const usage = b.annualBudget > 0 ? (actual / b.annualBudget) * 100 : 0;
    budgetData.push([
      b.category,
      b.annualBudget,
      actual,
      remaining,
      `${usage.toFixed(1)}%`
    ]);
  });
  const wsBudget = XLSX.utils.aoa_to_sheet(budgetData);
  XLSX.utils.book_append_sheet(wb, wsBudget, 'Budget');

  // 6. Bank Reconciliation Sheet
  const reconData: any[][] = [
    ['Reconciliation Date', 'Book Balance', 'Bank Balance', 'Difference', 'Explanatory Comments'],
  ];
  state.reconciliations.forEach(r => {
    reconData.push([
      r.date,
      r.bookBalance,
      r.bankBalance,
      r.bookBalance - r.bankBalance,
      r.notes || ''
    ]);
  });
  const wsRecon = XLSX.utils.aoa_to_sheet(reconData);
  XLSX.utils.book_append_sheet(wb, wsRecon, 'Bank Reconciliation');

  // 7. Monthly Summary Report Sheet
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthlyData: any[][] = [
    ['Month', 'Income', 'Expense', 'Net Savings'],
  ];
  months.forEach((mName, index) => {
    const mNum = index + 1;
    const monthTxns = state.transactions.filter(t => {
      const parts = t.date.split('-');
      if (parts.length < 2) return false;
      return parseInt(parts[1], 10) === mNum;
    });
    const inc = monthTxns.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const exp = monthTxns.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    monthlyData.push([
      mName,
      inc,
      exp,
      inc - exp
    ]);
  });
  const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Summary Report');

  // Trigger browser download
  const cleanTitle = state.settings.churchName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${cleanTitle}_Financials_${state.settings.fiscalYear}.xlsx`);
}

/**
 * Parses uploaded Microsoft Excel binary workbook and rebuilds the matching AppState object.
 */
export function importFromExcel(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        if (!raw) {
          throw new Error('Could not read Excel file data stream.');
        }
        const data = new Uint8Array(raw as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const appState: AppState = {
          settings: {
            churchName: 'Grace Community Church',
            fiscalYear: '2026',
            startingBalance: 25000,
            currency: 'ETB',
          },
          incomeCategories: [],
          expenseCategories: [],
          funds: [],
          transactions: [],
          budgets: [],
          reconciliations: [],
        };

        // 1. Process Settings Sheet
        const settingsSheet = workbook.Sheets['Settings'];
        if (settingsSheet) {
          const rows: any[][] = XLSX.utils.sheet_to_json(settingsSheet, { header: 1 });
          rows.forEach((row) => {
            if (!row || row.length < 2) return;
            const key = String(row[0]).trim().toLowerCase();
            const val = row[1];
            if (key === 'church name') appState.settings.churchName = String(val);
            else if (key === 'fiscal year') appState.settings.fiscalYear = String(val);
            else if (key === 'starting balance') {
              // Extract numeric value from value field
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
              appState.settings.startingBalance = numVal || 0;
            }
            else if (key === 'currency') appState.settings.currency = String(val);
          });
        }

        // 2. Process Categories Sheet
        const categoriesSheet = workbook.Sheets['Categories'];
        if (categoriesSheet) {
          const rows: any[][] = XLSX.utils.sheet_to_json(categoriesSheet, { header: 1 });
          if (rows.length > 1) {
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row) continue;
              if (row[0]) appState.incomeCategories.push(String(row[0]).trim());
              if (row[1]) appState.expenseCategories.push(String(row[1]).trim());
            }
          }
        }

        // 3. Process Funds Sheet
        const fundsSheet = workbook.Sheets['Funds'];
        if (fundsSheet) {
          const rows: any[][] = XLSX.utils.sheet_to_json(fundsSheet, { header: 1 });
          if (rows.length > 1) {
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 2) continue;
              appState.funds.push({
                id: String(row[0]).trim(),
                name: String(row[1]).trim(),
                isRestricted: String(row[2]).toLowerCase() === 'restricted',
              });
            }
          }
        }

        // 4. Process Transactions Sheet
        const txnSheet = workbook.Sheets['Transactions'];
        if (txnSheet) {
          const rows: any[][] = XLSX.utils.sheet_to_json(txnSheet, { header: 1 });
          if (rows.length > 1) {
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 7) continue;
              
              // Skip header if matches text id
              if (String(row[0]).trim().toLowerCase() === 'transaction id') {
                continue;
              }

              appState.transactions.push({
                id: String(row[0] || '').trim(),
                date: String(row[1] || '').trim(),
                description: String(row[2] || '').trim(),
                category: String(row[3] || '').trim(),
                fund: String(row[4] || '').trim(),
                type: (String(row[5]).trim() === 'Expense' ? 'Expense' : 'Income') as any,
                amount: typeof row[6] === 'number' ? row[6] : parseFloat(String(row[6]).replace(/[^0-9.-]/g, '')) || 0,
                paymentMethod: (row[7] || 'Cash') as any,
                referenceNumber: row[8] ? String(row[8]).trim() : '',
                notes: row[9] ? String(row[9]).trim() : '',
              });
            }
          }
        }

        // 5. Process Budget Sheet
        const budgetSheet = workbook.Sheets['Budget'];
        if (budgetSheet) {
          const rows: any[][] = XLSX.utils.sheet_to_json(budgetSheet, { header: 1 });
          if (rows.length > 1) {
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 2) continue;
              if (String(row[0]).trim().toLowerCase() === 'category') {
                continue;
              }
              appState.budgets.push({
                category: String(row[0]).trim(),
                annualBudget: typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1]).replace(/[^0-9.-]/g, '')) || 0,
              });
            }
          }
        }

        // 6. Process Bank Reconciliation Sheet
        const reconciliationSheet = workbook.Sheets['Bank Reconciliation'];
        if (reconciliationSheet) {
          const rows: any[][] = XLSX.utils.sheet_to_json(reconciliationSheet, { header: 1 });
          if (rows.length > 1) {
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 3) continue;
              if (String(row[0]).trim().toLowerCase() === 'reconciliation date') {
                continue;
              }
              appState.reconciliations.push({
                date: String(row[0]).trim(),
                bookBalance: typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1]).replace(/[^0-9.-]/g, '')) || 0,
                bankBalance: typeof row[2] === 'number' ? row[2] : parseFloat(String(row[2]).replace(/[^0-9.-]/g, '')) || 0,
                notes: row[4] ? String(row[4]).trim() : '',
              });
            }
          }
        }

        // Provide defaults if sheets configuration is missing
        if (appState.incomeCategories.length === 0) {
          appState.incomeCategories = ['Tithes', 'Offerings', 'Donations', 'Fundraising', 'Rental Income', 'Grants'];
        }
        if (appState.expenseCategories.length === 0) {
          appState.expenseCategories = ['Utilities', 'Salaries', 'Maintenance', 'Missions', 'Youth Ministry', 'Equipment', 'Transportation', 'Office Supplies'];
        }
        if (appState.funds.length === 0) {
          appState.funds = [
            { id: 'F001', name: 'General Fund', isRestricted: false },
            { id: 'F002', name: 'Building Fund', isRestricted: true },
            { id: 'F003', name: 'Missions Fund', isRestricted: true },
            { id: 'F004', name: 'Youth Fund', isRestricted: true },
          ];
        }

        resolve(appState);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
