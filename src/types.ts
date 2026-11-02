/** 数据模型类型（与 docs/DATA-MODEL.md v1 对齐）。 */

export type Grade = 'A' | 'B' | 'C' | 'D';
export type Stage = 'potential' | 'intent' | 'won' | 'dormant';

export interface TimelineEvent {
  date: string;
  content: string;
  method: string;
  result?: string;
  nextStep?: string;
}

export interface Client {
  id: string;
  name: string;
  country: string;
  contact: string;
  email: string;
  phone: string;
  grade: Grade;
  stage: Stage;
  source: string;
  product: string;
  tags: string[];
  notes: string;
  lastFollowUp: string | null;
  nextFollowUp: string | null;
  timeline: TimelineEvent[];
}

export interface Inquiry {
  id: string;
  receivedAt: string;
  name: string;
  email: string;
  company: string;
  country: string;
  phone: string;
  product: string;
  message: string;
  source: string;
  sourceDetail?: string;
  pageUrl?: string;
  status: 'new' | 'graded' | 'replied' | 'quoted' | 'won' | 'closed';
  grade: Grade | null;
  clientId: string | null;
  taskId: string | null;
}

export interface QuoteItem {
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
  currency: string;
}

export interface Quote {
  id: string;
  clientId: string | null;
  items: QuoteItem[];
  validUntil: string;
  status: 'draft' | 'sent' | 'confirmed' | 'expired';
  note: string;
  createdAt?: string;
}

export interface OrderStages {
  pi: string | null;
  deposit: string | null;
  production: string | null;
  inspection: string | null;
  shipment: string | null;
  balance: string | null;
  bl: string | null;
  received: string | null;
}

export interface Order {
  id: string;
  clientId: string | null;
  quoteId: string | null;
  amount: number;
  currency: string;
  depositPct: number;
  stages: OrderStages;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  clientId: string | null;
  due: string;
  execState: 'pending' | 'scheduled' | 'sent' | 'awaiting';
  done: boolean;
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  category: string;
  scene: string;
  title: string;
  body: string;
}

export interface Profile {
  yourName: string;
  company: string;
  products: string;
  market: string;
}

export interface SiteLink {
  url: string;
  apiKey: string;
  hasKey: boolean;
  autoSync: boolean;
  lastSyncAt: string | null;
}

export interface DashboardStats {
  todayTasks: number;
  overdueFollowUps: number;
  dueSoonClients: number;
  weekInquiries: number;
  weekQuotes: number;
  totalClients: number;
  defaultPassword: boolean;
}

export const STAGE_LABEL: Record<Stage, string> = {
  potential: '潜在', intent: '意向', won: '成交', dormant: '沉睡',
};
export const GRADE_CADENCE: Record<Grade, string> = { A: '+7天', B: '+14天', C: '+30天', D: '+45天' };
export const INQUIRY_STATUS_LABEL: Record<string, string> = {
  new: '新询盘', graded: '已分级', replied: '已回复', quoted: '已报价', won: '成交', closed: '关闭',
};
