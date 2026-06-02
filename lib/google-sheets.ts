export interface AppSettings {
  churchName: string;
  fiscalYear: string;
  startingBalance: number;
  currency: string;
}

export interface ExpenseCategoryBudget {
  category: string;
  annualBudget: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  fund: string;
  type: 'Income' | 'Expense';
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'Mobile Money' | 'Cheque';
  referenceNumber: string;
  notes: string;
}

export interface FundDefinition {
  id: string;
  name: string;
  isRestricted: boolean;
}

export interface ReconciliationRecord {
  date: string;
  bookBalance: number;
  bankBalance: number;
  notes?: string;
}

export interface AppState {
  settings: AppSettings;
  incomeCategories: string[];
  expenseCategories: string[];
  funds: FundDefinition[];
  transactions: Transaction[];
  budgets: ExpenseCategoryBudget[];
  reconciliations: ReconciliationRecord[];
}

/**
 * Searches for an existing "Grace Community Church Financials" spreadsheet.
 * Returns file metadata object or null.
 */
export async function searchSpreadsheet(accessToken: string, title: string): Promise<any | null> {
  const query = `name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Failed to query Google Drive: ${errorMsg}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (error) {
    console.error('Error searching spreadsheet:', error);
    throw error;
  }
}

/**
 * Creates a brand-new Spreadsheet in Google Drive.
 */
export async function createSpreadsheet(accessToken: string, title: string): Promise<{ id: string; webViewLink?: string }> {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
      }),
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Failed to create spreadsheet: ${errorMsg}`);
    }

    const data = await res.json();
    return { id: data.id, webViewLink: data.webViewLink };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

/**
 * Grabs details about the sheets in a spreadsheet.
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<string[]> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Failed to read spreadsheet tabs: ${errorMsg}`);
    }

    const data = await res.json();
    const sheetTitles = data.sheets?.map((s: any) => s.properties.title) || [];
    return sheetTitles;
  } catch (error) {
    console.error('Error fetching spreadsheet details:', error);
    throw error;
  }
}

/**
 * Sets up tabs if they are missing.
 */
export async function configureWorkbookTabs(
  accessToken: string,
  spreadsheetId: string,
  existingTabs: string[],
  requiredTabs: string[]
): Promise<void> {
  const missingTabs = requiredTabs.filter(tab => !existingTabs.includes(tab));
  if (missingTabs.length === 0) return;

  const requests = missingTabs.map(tab => ({
    addSheet: {
      properties: {
        title: tab,
      },
    },
  }));

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Failed to add sheets tabs: ${errorMsg}`);
    }
  } catch (error) {
    console.error('Error configuring workbook tabs:', error);
    throw error;
  }
}

/**
 * Clears and uploads values to a given tab range.
 */
export async function updateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Error updating tab ${range}: ${errorMsg}`);
    }
  } catch (error) {
    console.error(`Error write values to ${range}:`, error);
    throw error;
  }
}

/**
 * Clears out specified range sheet values to avoid leftover dirty rows.
 */
export async function clearSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<void> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }
    );

    if (!res.ok) {
      const errorMsg = await res.text();
      console.warn(`Could not clear range ${range}: ${errorMsg}`);
    }
  } catch (error) {
    console.warn(`Error in clearSheetValues for ${range}:`, error);
  }
}

/**
 * Pushes the complete local state to Google Sheets.
 */
export async function pushFullStateToSheets(
  accessToken: string,
  spreadsheetId: string,
  state: AppState
): Promise<void> {
  // 1. Settings values
  const settingsValues: any[][] = [
    ['Field', 'Value', 'Description'],
    ['Church Name', state.settings.churchName, 'Official Name of the Congregation'],
    ['Fiscal Year', state.settings.fiscalYear, 'Active Accounting Year'],
    ['Starting Balance', state.settings.startingBalance, 'Beginning Balance of the Year'],
    ['Currency', state.settings.currency, 'Currency Code (e.g. ETB, USD)'],
  ];

  // 2. Categories values (Income Categories left, Expense Categories right)
  const maxCatRows = Math.max(state.incomeCategories.length, state.expenseCategories.length);
  const categoriesValues: any[][] = [['Income Categories', 'Expense Categories']];
  for (let i = 0; i < maxCatRows; i++) {
    const inc = state.incomeCategories[i] || '';
    const exp = state.expenseCategories[i] || '';
    categoriesValues.push([inc, exp]);
  }

  // 3. Funds values
  const fundsValues: any[][] = [['Fund ID', 'Fund Name', 'Type']];
  state.funds.forEach(fund => {
    fundsValues.push([fund.id, fund.name, fund.isRestricted ? 'Restricted' : 'Unrestricted']);
  });

  // 4. Transactions value matrix
  const txnValues: any[][] = [
    ['Transaction ID', 'Date', 'Description', 'Category', 'Fund', 'Type', 'Amount', 'Payment Method', 'Reference Number', 'Notes'],
  ];
  state.transactions.forEach(t => {
    txnValues.push([
      t.id,
      t.date,
      t.description,
      t.category,
      t.fund,
      t.type,
      t.amount,
      t.paymentMethod,
      t.referenceNumber || '',
      t.notes || '',
    ]);
  });

  // 5. Budget values
  const budgetValues: any[][] = [['Category', 'Annual Budget']];
  state.budgets.forEach(b => {
    budgetValues.push([b.category, b.annualBudget]);
  });

  // 6. Bank Reconciliation values
  const reconciliationValues: any[][] = [['Reconciliation Date', 'Book Balance', 'Bank Balance', 'Difference', 'Notes']];
  state.reconciliations.forEach(r => {
    const diff = r.bookBalance - r.bankBalance;
    reconciliationValues.push([
      r.date,
      r.bookBalance,
      r.bankBalance,
      diff,
      r.notes || '',
    ]);
  });

  // 7. Write to each tab. Clear them first to avoid leftover lines
  await clearSheetValues(accessToken, spreadsheetId, 'Settings!A1:C100');
  await updateSheetValues(accessToken, spreadsheetId, 'Settings!A1', settingsValues);

  await clearSheetValues(accessToken, spreadsheetId, 'Categories!A1:B150');
  await updateSheetValues(accessToken, spreadsheetId, 'Categories!A1', categoriesValues);

  await clearSheetValues(accessToken, spreadsheetId, 'Funds!A1:C100');
  await updateSheetValues(accessToken, spreadsheetId, 'Funds!A1', fundsValues);

  await clearSheetValues(accessToken, spreadsheetId, 'Transactions!A1:J2000');
  await updateSheetValues(accessToken, spreadsheetId, 'Transactions!A1', txnValues);

  await clearSheetValues(accessToken, spreadsheetId, 'Budget!A1:B100');
  await updateSheetValues(accessToken, spreadsheetId, 'Budget!A1', budgetValues);

  await clearSheetValues(accessToken, spreadsheetId, 'Bank Reconciliation!A1:E200');
  await updateSheetValues(accessToken, spreadsheetId, 'Bank Reconciliation!A1', reconciliationValues);
}

/**
 * Read the entire sheets data and convert back to AppState.
 */
export async function pullFullStateFromSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<AppState> {
  const fetchValues = async (range: string): Promise<any[][]> => {
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.values || [];
    } catch {
      return [];
    }
  };

  // Pull individual sheets
  const [
    settingsRows,
    categoriesRows,
    fundsRows,
    transactionsRows,
    budgetRows,
    reconciliationRows,
  ] = await Promise.all([
    fetchValues('Settings!A1:C20'),
    fetchValues('Categories!A1:B150'),
    fetchValues('Funds!A1:C100'),
    fetchValues('Transactions!A1:J2000'),
    fetchValues('Budget!A1:C100'),
    fetchValues('Bank Reconciliation!A1:E200'),
  ]);

  // Parse Settings
  const settings: AppSettings = {
    churchName: 'Grace Community Church',
    fiscalYear: '2026',
    startingBalance: 25000,
    currency: 'ETB',
  };

  settingsRows.forEach(row => {
    if (!row || row.length < 2) return;
    const key = String(row[0]).trim().toLowerCase();
    const val = row[1];
    if (key === 'church name') settings.churchName = String(val);
    else if (key === 'fiscal year') settings.fiscalYear = String(val);
    else if (key === 'starting balance') settings.startingBalance = Number(val) || 0;
    else if (key === 'currency') settings.currency = String(val);
  });

  // Parse Categories
  const incomeCategories: string[] = [];
  const expenseCategories: string[] = [];
  if (categoriesRows.length > 1) {
    // Row 0 is header: "Income Categories", "Expense Categories"
    for (let i = 1; i < categoriesRows.length; i++) {
      const row = categoriesRows[i];
      if (!row) continue;
      if (row[0]) incomeCategories.push(String(row[0]).trim());
      if (row[1]) expenseCategories.push(String(row[1]).trim());
    }
  }

  // Parse Funds
  const funds: FundDefinition[] = [];
  if (fundsRows.length > 1) {
    for (let i = 1; i < fundsRows.length; i++) {
      const row = fundsRows[i];
      if (!row || row.length < 2) continue;
      funds.push({
        id: String(row[0]).trim(),
        name: String(row[1]).trim(),
        isRestricted: row[2] === 'Restricted',
      });
    }
  }

  // Parse Transactions
  const transactions: Transaction[] = [];
  if (transactionsRows.length > 1) {
    for (let i = 1; i < transactionsRows.length; i++) {
      const row = transactionsRows[i];
      if (!row || row.length < 7) continue; // Min columns needed
      transactions.push({
        id: String(row[0] || '').trim(),
        date: String(row[1] || '').trim(),
        description: String(row[2] || '').trim(),
        category: String(row[3] || '').trim(),
        fund: String(row[4] || '').trim(),
        type: (row[5] === 'Expense' ? 'Expense' : 'Income') as 'Income' | 'Expense',
        amount: Number(row[6]) || 0,
        paymentMethod: (row[7] || 'Cash') as any,
        referenceNumber: String(row[8] || '').trim(),
        notes: String(row[9] || '').trim(),
      });
    }
  }

  // Parse Budgets
  const budgets: ExpenseCategoryBudget[] = [];
  if (budgetRows.length > 1) {
    for (let i = 1; i < budgetRows.length; i++) {
      const row = budgetRows[i];
      if (!row || row.length < 2) continue;
      budgets.push({
        category: String(row[0]).trim(),
        annualBudget: Number(row[1]) || 0,
      });
    }
  }

  // Parse Reconciliations
  const reconciliations: ReconciliationRecord[] = [];
  if (reconciliationRows.length > 1) {
    for (let i = 1; i < reconciliationRows.length; i++) {
      const row = reconciliationRows[i];
      if (!row || row.length < 3) continue;
      reconciliations.push({
        date: String(row[0]).trim(),
        bookBalance: Number(row[1]) || 0,
        bankBalance: Number(row[2]) || 0,
        notes: row[4] ? String(row[4]).trim() : '',
      });
    }
  }

  return {
    settings,
    incomeCategories: incomeCategories.length > 0 ? incomeCategories : ['Tithes', 'Offerings', 'Donations', 'Fundraising', 'Rental Income', 'Grants'],
    expenseCategories: expenseCategories.length > 0 ? expenseCategories : ['Utilities', 'Salaries', 'Maintenance', 'Missions', 'Youth Ministry', 'Equipment', 'Transportation', 'Office Supplies'],
    funds: funds.length > 0 ? funds : [
      { id: 'F001', name: 'General Fund', isRestricted: false },
      { id: 'F002', name: 'Building Fund', isRestricted: true },
      { id: 'F003', name: 'Missions Fund', isRestricted: true },
      { id: 'F004', name: 'Youth Fund', isRestricted: true },
    ],
    transactions,
    budgets,
    reconciliations,
  };
}
