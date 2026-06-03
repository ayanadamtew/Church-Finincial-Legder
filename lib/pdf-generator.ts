import { AppState, Transaction } from './google-sheets';

/**
 * Universal safe monetary currency formatting.
 */
function formatCurrency(amount: number, currency: string = 'ETB'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'ETB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Adds standard footer to a page.
 */
function drawFooter(doc: any, state: AppState, pageNumber: number, totalPages?: number) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
  doc.line(15, height - 15, width - 15, height - 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  
  // Left footer
  doc.text(
    `${state.settings.churchName} — Audit Ledger Control (FY ${state.settings.fiscalYear})`, 
    15, 
    height - 10
  );
  
  // Right footer
  const pageStr = totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`;
  doc.text(pageStr, width - 15, height - 10, { align: 'right' });
}

/**
 * Draws the elegant top branding header on a report page.
 */
function drawBrandingHeader(
  doc: any, 
  state: AppState, 
  title: string, 
  subtitle: string
) {
  // Accent brand line at the very top (Indigo)
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 3, 'F');
  
  // Logo placeholder graphic
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(15, 12, 10, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('GCC', 17, 18.5);
  
  // Metadata / Right aligned info
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Fiscal Year: ${state.settings.fiscalYear}`, 195, 15, { align: 'right' });
  doc.text(`Currency: ${state.settings.currency || 'ETB'}`, 195, 20, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 195, 25, { align: 'right' });
  
  // Header text left
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(state.settings.churchName.toUpperCase(), 30, 17);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`${title} • ${subtitle}`, 30, 22);
  
  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 30, 195, 30);
}

/**
 * 1. MONTHLY FINANCIAL REPORT GENERATOR (.PDF)
 */
export async function generateMonthlyPDFReport(state: AppState, monthNum: number, monthName: string) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const currency = state.settings.currency || 'ETB';
  
  // Filter monthly transactions
  const monthTxns = state.transactions.filter(t => {
    const parts = t.date.split('-');
    if (parts.length < 2) return false;
    return parseInt(parts[1], 10) === monthNum;
  }).sort((a, b) => a.date.localeCompare(b.date));
  
  const incomeX = monthTxns.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const expenseX = monthTxns.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const surplusX = incomeX - expenseX;
  
  // Draw layout header
  drawBrandingHeader(doc, state, 'MONTHLY FINANCIAL REPORT STATEMENT', `${monthName} Statement`);
  
  let currentY = 38;
  
  // Executive Summary Card Section
  doc.setFillColor(248, 250, 252); // slate-50 background
  doc.rect(15, currentY, 180, 26, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200 border
  doc.setLineWidth(0.3);
  doc.rect(15, currentY, 180, 26, 'S');
  
  // Card Titles & Figures
  // Total Income
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL INCOME', 25, currentY + 8);
  doc.setFontSize(12);
  doc.setTextColor(16, 124, 65); // green
  doc.text(`+${formatCurrency(incomeX, currency)}`, 25, currentY + 16);
  
  // Vertical line 1
  doc.setDrawColor(226, 232, 240);
  doc.line(75, currentY + 4, 75, currentY + 22);
  
  // Total Expense
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL OPERATION COSTS', 82, currentY + 8);
  doc.setFontSize(12);
  doc.setTextColor(220, 38, 38); // rose
  doc.text(`-${formatCurrency(expenseX, currency)}`, 82, currentY + 16);
  
  // Vertical line 2
  doc.line(135, currentY + 4, 135, currentY + 22);
  
  // Net Balance Change
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('NET MONTH SURPLUS', 142, currentY + 8);
  doc.setFontSize(12);
  doc.setTextColor(surplusX >= 0 ? 30 : 220, surplusX >= 0 ? 110 : 38, surplusX >= 0 ? 30 : 38);
  doc.text(`${surplusX >= 0 ? '+' : ''}${formatCurrency(surplusX, currency)}`, 142, currentY + 16);
  
  currentY += 34;
  
  // Restricted vs Unrestricted Fund impact grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('CAPITAL FUNDS SUMMARY IMPACT FOR THE PERIOD', 15, currentY);
  
  currentY += 4;
  
  const fundsPerformance: any[][] = [];
  state.funds.forEach(fund => {
    const fIn = monthTxns
      .filter(t => t.fund === fund.name && t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    const fOut = monthTxns
      .filter(t => t.fund === fund.name && t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Accumulate history for overall fund balance
    const priorIn = state.transactions
      .filter(t => t.fund === fund.name && t.type === 'Income' && t.date < `${state.settings.fiscalYear}-${String(monthNum).padStart(2, '0')}-01`)
      .reduce((sum, t) => sum + t.amount, 0);
    const priorOut = state.transactions
      .filter(t => t.fund === fund.name && t.type === 'Expense' && t.date < `${state.settings.fiscalYear}-${String(monthNum).padStart(2, '0')}-01`)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const startingFundBase = fund.id === 'F001' ? state.settings.startingBalance : 0;
    const openingBalance = startingFundBase + priorIn - priorOut;
    const netPeriod = fIn - fOut;
    const endBalance = openingBalance + netPeriod;
    
    fundsPerformance.push([
      fund.id,
      fund.name,
      fund.isRestricted ? 'Restricted' : 'Unrestricted',
      formatCurrency(openingBalance, currency),
      `+${formatCurrency(fIn, currency)}`,
      `-${formatCurrency(fOut, currency)}`,
      formatCurrency(endBalance, currency),
    ]);
  });
  
  autoTable(doc, {
    head: [['ID', 'Fund Target Account', 'Type', 'Opening Balance', 'Period Inflows', 'Period Spent', 'Period Close Balance']],
    body: fundsPerformance,
    startY: currentY,
    margin: { left: 15, right: 15 },
    theme: 'striped',
    headStyles: { fillColor: [47, 54, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
  });
  
  // Adjust Y based on auto-table execution
  currentY = (doc as any).lastAutoTable.finalY + 12;
  
  // Category Metrics Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('INCOME & EXPENSE CATEGORY ACCOUNTING STATISTICS', 15, currentY);
  
  currentY += 4;
  
  // Category Lists Mapping
  const incomeCategoryBreakdown: any[][] = [];
  state.incomeCategories.forEach(cat => {
    const total = monthTxns.filter(t => t.category === cat && t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const percent = incomeX > 0 ? (total / incomeX) * 100 : 0;
    if (total > 0) {
      incomeCategoryBreakdown.push([cat, 'Income Account', formatCurrency(total, currency), `${percent.toFixed(1)}%`]);
    }
  });
  
  state.expenseCategories.forEach(cat => {
    const total = monthTxns.filter(t => t.category === cat && t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    const percent = expenseX > 0 ? (total / expenseX) * 100 : 0;
    
    // Check monthly/annual budgets for categorization
    const bMatch = state.budgets.find(b => b.category === cat);
    const annualB = bMatch ? bMatch.annualBudget : 0;
    const monthlyBudget = annualB / 12;
    const variance = monthlyBudget > 0 ? monthlyBudget - total : 0;
    
    if (total > 0) {
      incomeCategoryBreakdown.push([
        cat,
        'Expense Account',
        `-${formatCurrency(total, currency)}`,
        `${percent.toFixed(1)}%`,
        monthlyBudget > 0 ? `${formatCurrency(monthlyBudget, currency)}` : 'N/A',
        monthlyBudget > 0 ? (variance >= 0 ? '+' : '-') + formatCurrency(Math.abs(variance), currency) : 'N/A'
      ]);
    }
  });
  
  autoTable(doc, {
    head: [['Category Class Identifier', 'Account Stream Type', 'Incurred Amount', 'Category Ratio', 'Monthly Allocated Budget', 'Period Variance']],
    body: incomeCategoryBreakdown.length > 0 ? incomeCategoryBreakdown : [['No dynamic activities in this accounting period.', '', '', '', '', '']],
    startY: currentY,
    margin: { left: 15, right: 15 },
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, font: 'helvetica' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });
  
  // Go to next page for Ledger details
  doc.addPage();
  drawBrandingHeader(doc, state, 'MONTHLY TRANSACTIONS JOURNAL LEDGER', `${monthName} Statement - Continued`);
  
  currentY = 38;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('CHURCH BOOK-LEDGER TRANSACTIONS LOG RECORD', 15, currentY);
  
  currentY += 4;
  
  const ledgerRows: any[][] = [];
  monthTxns.forEach(t => {
    ledgerRows.push([
      t.date,
      t.referenceNumber || 'N/A',
      t.description,
      t.category,
      t.fund,
      t.type === 'Income' ? 'INFLOW' : 'OUTFLOW',
      t.type === 'Income' ? `+${formatCurrency(t.amount, currency)}` : `-${formatCurrency(t.amount, currency)}`,
      t.paymentMethod
    ]);
  });
  
  autoTable(doc, {
    head: [['Entry Date', 'Ref code', 'Payee / Particulars Description', 'Category Unit', 'Target Fund', 'Allocation', 'Voucher Amount', 'Method']],
    body: ledgerRows.length > 0 ? ledgerRows : [['No formal bookkeeping entries found for this calendar month.', '', '', '', '', '', '', '']],
    startY: currentY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 16 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 16, fontStyle: 'bold', halign: 'center' },
      6: { cellWidth: 24, fontStyle: 'bold', halign: 'right' },
      7: { cellWidth: 16, halign: 'center' },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Audits & Sign-Off Block
  if (currentY > 230) {
    doc.addPage();
    drawBrandingHeader(doc, state, 'REPORT COMPLIANCE CONFIRMATION', `${monthName} Statement`);
    currentY = 40;
  }
  
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 180, 42, 'F');
  doc.rect(15, currentY, 180, 42, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('STATEMENT COMPLIANCE SIGN-OFF ATTESTATION', 20, currentY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('This monthly financial review reflects an accurate reconciliation log of bank assets, restricted funds inflows, and cash vouchers.', 20, currentY + 12);
  doc.text('All transactions conform with church accounting standards and general board-approved fiscal provisions.', 20, currentY + 16);
  
  // Drawing signature underlines
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.5);
  
  // Signer 1
  doc.line(25, currentY + 31, 85, currentY + 31);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED BY (TREASURER)', 25, currentY + 35);
  doc.setFont('helvetica', 'normal');
  doc.text('Date: _________________', 25, currentY + 39);
  
  // Signer 2
  doc.line(125, currentY + 31, 185, currentY + 31);
  doc.setFont('helvetica', 'bold');
  doc.text('APPROVED BY (BOARD CHAIR / PASTOR)', 125, currentY + 35);
  doc.setFont('helvetica', 'normal');
  doc.text('Date: _________________', 125, currentY + 39);
  
  // Append standard Footers
  const totalPagesCount = doc.internal.pages.length - 1; // 1-based, minus empty index 0
  for (let page = 1; page <= totalPagesCount; page++) {
    doc.setPage(page);
    drawFooter(doc, state, page, totalPagesCount);
  }
  
  const cleanTitle = state.settings.churchName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanTitle}_Report_${monthName}_${state.settings.fiscalYear}.pdf`);
}

/**
 * 2. FISCAL ANNUAL FINANCIAL STATEMENT GENERATOR (.PDF)
 */
export async function generateAnnualPDFReport(state: AppState) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const currency = state.settings.currency || 'ETB';
  const startBal = state.settings.startingBalance || 0;
  
  // Calculations
  const allTxns = state.transactions;
  const totalIn = allTxns.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = allTxns.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const netSuplus = totalIn - totalOut;
  const endingSystemBalance = startBal + netSuplus;
  
  // Page 1: COVER REPORT
  drawBrandingHeader(doc, state, 'ANNUAL FINANCIAL COMPLIANCE REPORT', `ANNUAL FISCAL STATEMENT WRAP-UP`);
  
  let currentY = 38;
  
  // Large decorative title block
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(15, currentY, 180, 24, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`FISCAL YEAR ${state.settings.fiscalYear} COMPREHENSIVE COMPLIANCE AUDIT`, 22, currentY + 10);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Official balance verification statement, capital ledger reserve analysis, and annual budget compliance assessment.`, 22, currentY + 16);
  
  currentY += 32;
  
  // KPI Core grid
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, currentY, 180, 36, 'FD');
  
  doc.setFont('helvetica', 'bold');
  
  // Asset Reserve Opening
  doc.setFontSize(7.5);
  doc.setTextColor(115, 115, 115);
  doc.text('TREASURY START BALANCE', 22, currentY + 9);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(startBal, currency), 22, currentY + 17);
  
  // + Current Period Income
  doc.setFontSize(7.5);
  doc.setTextColor(115, 115, 115);
  doc.text('ACCUMULATED REVENUE In', 75, currentY + 9);
  doc.setFontSize(10.5);
  doc.setTextColor(16, 124, 65);
  doc.text(`+${formatCurrency(totalIn, currency)}`, 75, currentY + 17);
  
  // - Current Period Outflow
  doc.setFontSize(7.5);
  doc.setTextColor(115, 115, 115);
  doc.text('ACCUMULATED EXPENSES Out', 135, currentY + 9);
  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`-${formatCurrency(totalOut, currency)}`, 135, currentY + 17);
  
  // Horizontal divider
  doc.line(15, currentY + 22, 195, currentY + 22);
  
  // Closing Cash balance & overall health ratios
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ANNUAL COMPLIANCE RATIO STATUS:', 22, currentY + 30);
  
  const savingsRate = totalIn > 0 ? (netSuplus / totalIn) * 100 : 0;
  doc.setFontSize(9);
  if (netSuplus >= 0) {
    doc.setTextColor(16, 124, 65);
    doc.text(`SURPLUS ACQUIRED: ${savingsRate.toFixed(1)}% Ratio Incremental Savings`, 80, currentY + 30);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(`DEFICIT INCURRED: Net reserves decreased this fiscal year.`, 80, currentY + 30);
  }
  
  currentY += 46;
  
  // Month by Month comparison layout
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MONTH-BY-MONTH REVENUE VS OPERATIONAL OUTFLOW STATS', 15, currentY);
  
  currentY += 4;
  
  const mNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthlyMetrics: any[][] = [];
  mNames.forEach((monthName, index) => {
    const mNum = index + 1;
    const items = allTxns.filter(t => {
      const p = t.date.split('-');
      if (p.length < 2) return false;
      return parseInt(p[1], 10) === mNum;
    });
    const inc = items.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const exp = items.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    const net = inc - exp;
    
    monthlyMetrics.push([
      monthName,
      `+${formatCurrency(inc, currency)}`,
      `-${formatCurrency(exp, currency)}`,
      `${net >= 0 ? '+' : ''}${formatCurrency(net, currency)}`,
      inc === 0 && exp === 0 ? 'N/A' : (net >= 0 ? `${((net/inc)*100).toFixed(0)}% Surplus` : 'Deficit Drawdown')
    ]);
  });
  
  autoTable(doc, {
    head: [['Calendar Period Month', 'Gross Monthly Inflows', 'Gross Monthly Expenditures', 'Net Month Margin', 'Savings/Reserves Margin Ratio']],
    body: monthlyMetrics,
    startY: currentY,
    margin: { left: 15, right: 15 },
    theme: 'striped',
    headStyles: { fillColor: [47, 54, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, font: 'helvetica' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center' },
    },
  });
  
  // Go to page 2: Budgets compliance & Bank Reconciliations verification
  doc.addPage();
  drawBrandingHeader(doc, state, 'ANNUAL BUDGET COMPLIANCE MONITOR', 'Annual Performance vs Budgets');
  
  currentY = 38;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ANNUAL DEPARTMENT BUDGET VS ACTUAL SPENDING CONTROLS', 15, currentY);
  
  currentY += 4;
  
  const budgetRows: any[][] = [];
  state.budgets.forEach(b => {
    const actual = allTxns
      .filter(t => t.category === b.category && t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const variance = b.annualBudget - actual;
    const usage = b.annualBudget > 0 ? (actual / b.annualBudget) * 100 : 0;
    
    budgetRows.push([
      b.category,
      formatCurrency(b.annualBudget, currency),
      formatCurrency(actual, currency),
      `${usage.toFixed(1)}%`,
      variance >= 0 ? `+${formatCurrency(variance, currency)} (Under)` : `-${formatCurrency(Math.abs(variance), currency)} (Over)`
    ]);
  });
  
  autoTable(doc, {
    head: [['Disbursement Expense Department Column', 'Allocated Annual Budget', 'Actual Year-To-Date Spend', 'Budget Utilization Rate', 'Fiscal Variance']],
    body: budgetRows.length > 0 ? budgetRows : [['No core ministries budget allocation schemes established in Settings.', '', '', '', '']],
    startY: currentY,
    margin: { left: 15, right: 15 },
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, font: 'helvetica' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 12;
  
  // Audited Ledger Bank Reconciliation Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TREASURY RECONCILIATION VERIFICATION DIRECTIVE', 15, currentY);
  
  currentY += 4;
  
  const reconciliationRows: any[][] = [];
  state.reconciliations.forEach(r => {
    const diff = r.bookBalance - r.bankBalance;
    reconciliationRows.push([
      r.date,
      formatCurrency(r.bookBalance, currency),
      formatCurrency(r.bankBalance, currency),
      diff === 0 ? '0.00 (Perfect Match)' : formatCurrency(diff, currency),
      r.notes || 'Routine Statement Audit Verified'
    ]);
  });
  
  autoTable(doc, {
    head: [['Audit Reconcile Date', 'Ledger System Balance Book', 'Confirmed Bank Statement Balance', 'Verification Net Discrepancy', 'Verification Auditing Comments']],
    body: reconciliationRows.length > 0 ? reconciliationRows : [['No formal bank reconciliation audits have been conducted for this year.', '', '', '', '']],
    startY: currentY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 34, halign: 'right' },
      2: { cellWidth: 34, halign: 'right' },
      3: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 12;
  
  // Add professional sign-off fields
  if (currentY > 220) {
    doc.addPage();
    drawBrandingHeader(doc, state, 'REPORT SIGN-OFF AND ISSUANCE', 'Fiscal Certification');
    currentY = 40;
  }
  
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 180, 48, 'F');
  doc.rect(15, currentY, 180, 48, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICATE OF COMPLIANCE AND TRUTH ASSURANCE STATUS', 20, currentY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`We, the authorized elders and bookkeepers of ${state.settings.churchName}, hereby certify that the comprehensive report above`, 20, currentY + 14);
  doc.text(`accurately represents the entire financial ledger transactions log and bank holdings for fiscal year ${state.settings.fiscalYear}.`, 20, currentY + 18);
  doc.text('No secret accounts or off-ledger transactions exist. The restricted funds were put to use strictly under legal requirements.', 20, currentY + 22);
  
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.5);
  
  // Sign-off 1
  doc.line(25, currentY + 36, 85, currentY + 36);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED BY (TREASURER)', 25, currentY + 40);
  doc.setFont('helvetica', 'normal');
  doc.text('Sign: __________________________', 25, currentY + 44);
  
  // Sign-off 2
  doc.line(125, currentY + 36, 185, currentY + 36);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFIED BY (CHURCH BOARD SECRETARY / PASTOR)', 125, currentY + 40);
  doc.setFont('helvetica', 'normal');
  doc.text('Sign: __________________________', 125, currentY + 44);
  
  // General Footers loop
  const totalPagesCount = doc.internal.pages.length - 1;
  for (let page = 1; page <= totalPagesCount; page++) {
    doc.setPage(page);
    drawFooter(doc, state, page, totalPagesCount);
  }
  
  const cleanTitle = state.settings.churchName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanTitle}_Annual_Statement_FY_${state.settings.fiscalYear}.pdf`);
}
