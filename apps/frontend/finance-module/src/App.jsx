
import { useState } from 'react'

import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'

import { financeNavigation } from './config/navigation'

import Dashboard from './features/dashboard/Dashboard'
import ChartOfAccounts from './features/chart-of-accounts/ChartOfAccounts'
import Journals from './features/journals/Journals'
import PaymentVouchers from './features/payables/PaymentVouchers'
import Receipts from './features/receivables/Receipts'
import CustomerInvoices from './features/receivables/CustomerInvoices'
import ProjectAccounting from './features/project-accounting/ProjectAccounting'
import ProjectProfitability from './features/project-accounting/ProjectProfitability'
import OutstandingReceivables from './features/receivables/OutstandingReceivables'
import AgingAnalysis from './features/receivables/AgingAnalysis'
import OutstandingPayables from './features/payables/OutstandingPayables'
import BankAccountsTreasury from './features/banking/BankAccountsTreasury'
import BankReconciliation from './features/banking/BankReconciliation'
import BankGuaranteesRegister from './features/banking/BankGuaranteesRegister'
import CreditFacilities from './features/banking/CreditFacilities'
import BudgetPlanning from './features/budgets/BudgetPlanning'
import BudgetVsActual from './features/budgets/BudgetVsActual'
import GSTDashboard from './features/tax-compliance/GSTDashboard'
import GSTReconciliation from './features/tax-compliance/GSTReconciliation'
import ProfitLoss from './features/reports/ProfitLoss'
import BalanceSheet from './features/reports/BalanceSheet'
import CashFlow from './features/reports/CashFlow'
import ConsolidatedGroupStatements from './features/reports/ConsolidatedStatements'
import ReportsMISCenter from './features/reports/ReportsMISCenter'

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const currentPage = financeNavigation
    .flatMap((group) => group.items)
    .find((item) => item.id === activePage)

  const pageTitle = currentPage?.label || 'Dashboard'

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />

      case 'chart-of-accounts':
        return <ChartOfAccounts />

      case 'journals':
        return <Journals />

      case 'payment-vouchers':
        return <PaymentVouchers />

      case 'receipts':
        return <Receipts />

      case 'invoices':
        return <CustomerInvoices />
      
      case 'project-accounting':
        return <ProjectAccounting />

      case 'project-profitability':
        return <ProjectProfitability />

      case 'receivables':
        return <OutstandingReceivables />

      case 'receivables-aging':
        return <AgingAnalysis />

      case 'payables':
        return <OutstandingPayables />

      case 'bank-accounts':
        return <BankAccountsTreasury />

      case 'bank-reconciliation':
        return <BankReconciliation />

      case 'bank-guarantees':
        return <BankGuaranteesRegister />

      case 'credit-facilities':
        return <CreditFacilities />

      case 'budget-planning':
        return <BudgetPlanning />

      case 'budget-vs-actual':
        return <BudgetVsActual />

      case 'gst-dashboard':
        return <GSTDashboard />

      case 'gst-reconciliation':
        return <GSTReconciliation />

      case 'profit-loss':
        return <ProfitLoss />

      case 'balance-sheet':
        return <BalanceSheet />

      case 'cash-flow':
        return <CashFlow />

      case 'consolidated-statements':
        return <ConsolidatedGroupStatements />

      case 'reports-mis':
        return <ReportsMISCenter />
      default:
        return (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8">
            <h2 className="text-lg font-semibold text-slate-800">
              {pageTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This Finance screen will be implemented next.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fb]">
      {sidebarOpen && (
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          pageTitle={pageTitle}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />

        <section className="finance-main-scroll min-h-0 flex-1 overflow-y-auto p-6">
          {renderPage()}
        </section>
      </main>
    </div>
  )
}

export default App
