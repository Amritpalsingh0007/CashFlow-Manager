/**
 * Deterministic mock data used when Spring Boot is not running.
 * Stored in module-level maps so mutations (POST/PATCH/DELETE) persist
 * within a single server process during development.
 */

export type TripStatus =
  | 'ORDER_RECEIVED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DOCS_SENT'
  | 'PAYMENT_PENDING'
  | 'COMPLETED'

export interface MockTrip {
  id: string
  orgId: string
  truckId: string
  brokerName: string
  ratePerTon: number
  agreedWeight: number
  actualWeight: number | null
  shortagePenalty: number
  brokeragePct: number
  status: TripStatus
  startDate: string
  endDate: string | null
  paymentReceived: boolean
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface MockPayment {
  id: string
  tripId: string
  amount: number
  type: 'ADVANCE' | 'FINAL'
  receivedDate: string
}

export interface MockExpense {
  id: string
  orgId: string
  tripId: string | null
  amount: number
  category: string
  expenseDate: string
  notes: string
  createdBy: string
}

let _tripCounter = 10

export const trips = new Map<string, MockTrip>([
  ['trip-1', {
    id: 'trip-1', orgId: 'org-1', truckId: 'truck-1',
    brokerName: 'Sharma Logistics', ratePerTon: 1200, agreedWeight: 22,
    actualWeight: 21.5, shortagePenalty: 600, brokeragePct: 5.5,
    status: 'COMPLETED', startDate: '2026-09-01', endDate: '2026-09-07',
    paymentReceived: true, createdBy: 'Raj', updatedBy: 'Raj',
    createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-07T18:00:00Z',
  }],
  ['trip-2', {
    id: 'trip-2', orgId: 'org-1', truckId: 'truck-1',
    brokerName: 'Gupta Freight', ratePerTon: 1350, agreedWeight: 18,
    actualWeight: null, shortagePenalty: 0, brokeragePct: 5.5,
    status: 'IN_TRANSIT', startDate: '2026-10-01', endDate: null,
    paymentReceived: false, createdBy: 'Raj', updatedBy: null,
    createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-01T09:00:00Z',
  }],
  ['trip-3', {
    id: 'trip-3', orgId: 'org-1', truckId: 'truck-1',
    brokerName: 'Patel Transport', ratePerTon: 1100, agreedWeight: 25,
    actualWeight: 24.8, shortagePenalty: 200, brokeragePct: 6,
    status: 'PAYMENT_PENDING', startDate: '2026-09-20', endDate: '2026-09-28',
    paymentReceived: false, createdBy: 'Raj', updatedBy: 'Raj',
    createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-28T15:00:00Z',
  }],
])

export const payments = new Map<string, MockPayment>([
  ['pay-1', { id: 'pay-1', tripId: 'trip-1', amount: 10000, type: 'ADVANCE', receivedDate: '2026-09-03' }],
  ['pay-2', { id: 'pay-2', tripId: 'trip-1', amount: 13800, type: 'FINAL',   receivedDate: '2026-09-10' }],
  ['pay-3', { id: 'pay-3', tripId: 'trip-3', amount: 8000,  type: 'ADVANCE', receivedDate: '2026-09-22' }],
])

export const expenses = new Map<string, MockExpense>([
  ['exp-1',  { id: 'exp-1',  orgId: 'org-1', tripId: 'trip-1', amount: 4500, category: 'FUEL',         expenseDate: '2026-09-01', notes: 'Diesel full tank',           createdBy: 'Father' }],
  ['exp-2',  { id: 'exp-2',  orgId: 'org-1', tripId: 'trip-1', amount: 320,  category: 'TOLL',         expenseDate: '2026-09-02', notes: 'NH-48 toll',                  createdBy: 'Father' }],
  ['exp-3',  { id: 'exp-3',  orgId: 'org-1', tripId: 'trip-1', amount: 150,  category: 'CLEANING',     expenseDate: '2026-09-07', notes: 'Unload cleaning',             createdBy: 'Father' }],
  ['exp-4',  { id: 'exp-4',  orgId: 'org-1', tripId: 'trip-2', amount: 3200, category: 'FUEL',         expenseDate: '2026-10-01', notes: '',                            createdBy: 'Father' }],
  ['exp-5',  { id: 'exp-5',  orgId: 'org-1', tripId: null,     amount: 8500, category: 'MAINTENANCE',  expenseDate: '2026-09-15', notes: 'Engine service',              createdBy: 'Raj'    }],
  ['exp-6',  { id: 'exp-6',  orgId: 'org-1', tripId: null,     amount: 2200, category: 'FASTAG',       expenseDate: '2026-10-01', notes: 'Monthly recharge',            createdBy: 'Raj'    }],
  ['exp-7',  { id: 'exp-7',  orgId: 'org-1', tripId: null,     amount: 6800, category: 'HOUSEHOLD',    expenseDate: '2026-10-01', notes: 'October house budget',        createdBy: 'Mom'    }],
  ['exp-8',  { id: 'exp-8',  orgId: 'org-1', tripId: null,     amount: 1200, category: 'GROCERY',      expenseDate: '2026-10-03', notes: 'Weekly groceries',            createdBy: 'Mom'    }],
  ['exp-9',  { id: 'exp-9',  orgId: 'org-1', tripId: null,     amount: 900,  category: 'MEDICAL',      expenseDate: '2026-10-05', notes: 'Doctor visit',               createdBy: 'Mom'    }],
  ['exp-10', { id: 'exp-10', orgId: 'org-1', tripId: 'trip-3', amount: 5100, category: 'FUEL',         expenseDate: '2026-09-20', notes: '',                            createdBy: 'Father' }],
])

export function nextId(prefix: string): string {
  return `${prefix}-${++_tripCounter}`
}

/** Compute summary for a trip */
export function computeSummary(trip: MockTrip) {
  const tripPayments = [...payments.values()].filter((p) => p.tripId === trip.id)
  const tripExpenses = [...expenses.values()].filter((e) => e.tripId === trip.id)

  const advance = tripPayments.filter((p) => p.type === 'ADVANCE').reduce((s, p) => s + p.amount, 0)
  const finalPmt = tripPayments.filter((p) => p.type === 'FINAL').reduce((s, p) => s + p.amount, 0)
  const totalRevenue = advance + finalPmt
  const totalExpenses = tripExpenses.reduce((s, e) => s + e.amount, 0)

  return {
    totalRevenue,
    totalExpenses,
    grossProfit: totalRevenue - totalExpenses,
  }
}

export function paginate<T>(items: T[], page: number, size: number) {
  const total = items.length
  const start = page * size
  return {
    content: items.slice(start, start + size),
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
  }
}
