'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, Store, CreditCard, Mail, Palette, Shield, Bell,
  Save, Upload, Eye, EyeOff, RefreshCw, Globe, Phone, MapPin,
  Clock, DollarSign, Check, AlertCircle, X, Image as ImageIcon,
  Zap, Webhook, ExternalLink, TestTube, Info, ChevronRight,
} from 'lucide-react';
import { useToast } from '../_components/CustomToast';
import { API_BASE_URL } from '@/lib/api-config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreSettingsDto {
  id: string;
  // General
  storeName: string;
  storeTagline: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  storeCity: string;
  storePostalCode: string;
  storeCountry: string;
  currency: string;
  timezone: string;
  adminPanelName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  // Stripe
  stripeEnabled: boolean;
  stripeTestMode: boolean;
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  // PayPal
  payPalEnabled: boolean;
  payPalSandboxMode: boolean;
  payPalClientId: string | null;
  payPalClientSecret: string | null;
  // Other payments
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  // Email
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string | null;
  emailFromName: string;
  emailFromAddress: string;
  adminEmail: string;
  supportEmail: string;
  smtpEnableSsl: boolean;
  // Appearance
  accentColor: string;
  showBreadcrumbs: boolean;
  compactMode: boolean;
  // Security
  sessionTimeoutMinutes: number;
  jwtExpiryMinutes: number;
  maxLoginAttempts: number;
  requireStrongPassword: boolean;
  twoFactorEnabled: boolean;
  ipWhitelist: string | null;
  // Notifications
  notifyNewOrder: boolean;
  notifyLowStock: boolean;
  lowStockThreshold: number;
  notifyNewReview: boolean;
  notifyCustomerRegistration: boolean;
  notifyRefundRequest: boolean;
  notifyDailyReport: boolean;
  // Audit
  updatedAt: string | null;
  updatedBy: string | null;
}

const DEFAULT: StoreSettingsDto = {
  id: '', storeName: 'Direct Care', storeTagline: 'Your trusted healthcare store',
  storeEmail: '', storePhone: '', storeAddress: '', storeCity: '', storePostalCode: '',
  storeCountry: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London',
  adminPanelName: 'EcomPanel', logoUrl: null, faviconUrl: null,
  stripeEnabled: false, stripeTestMode: true, stripePublishableKey: null,
  stripeSecretKey: null, stripeWebhookSecret: null,
  payPalEnabled: false, payPalSandboxMode: true, payPalClientId: null, payPalClientSecret: null,
  codEnabled: true, bankTransferEnabled: false,
  smtpServer: 'smtp.gmail.com', smtpPort: 587, smtpUsername: '', smtpPassword: null,
  emailFromName: 'Direct Care', emailFromAddress: '', adminEmail: '', supportEmail: '',
  smtpEnableSsl: true, accentColor: 'violet-cyan', showBreadcrumbs: true, compactMode: false,
  sessionTimeoutMinutes: 600, jwtExpiryMinutes: 600, maxLoginAttempts: 5,
  requireStrongPassword: true, twoFactorEnabled: false, ipWhitelist: null,
  notifyNewOrder: true, notifyLowStock: true, lowStockThreshold: 5,
  notifyNewReview: false, notifyCustomerRegistration: false,
  notifyRefundRequest: true, notifyDailyReport: false,
  updatedAt: null, updatedBy: null,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',       label: 'General',      icon: Store,      color: 'text-violet-400' },
  { id: 'payments',      label: 'Payments',      icon: CreditCard, color: 'text-emerald-400' },
  { id: 'email',         label: 'Email / SMTP',  icon: Mail,       color: 'text-blue-400' },
  { id: 'appearance',    label: 'Appearance',    icon: Palette,    color: 'text-pink-400' },
  { id: 'security',      label: 'Security',      icon: Shield,     color: 'text-yellow-400' },
  { id: 'notifications', label: 'Notifications', icon: Bell,       color: 'text-cyan-400' },
];

const CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD'];
const TIMEZONES  = ['UTC', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Karachi'];
const ACCENT_COLORS = [
  { label: 'Violet + Cyan', value: 'violet-cyan' },
  { label: 'Blue + Purple', value: 'blue-purple' },
  { label: 'Green + Teal',  value: 'green-teal' },
  { label: 'Pink + Rose',   value: 'pink-rose' },
  { label: 'Orange + Red',  value: 'orange-red' },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('authToken') ?? ''}`,
});

async function fetchSettings(): Promise<StoreSettingsDto> {
  const res = await fetch(`${API_BASE_URL}/api/storesettings`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

async function saveSettings(data: StoreSettingsDto): Promise<StoreSettingsDto> {
  const res = await fetch(`${API_BASE_URL}/api/storesettings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

// ─── Small UI components ──────────────────────────────────────────────────────

const SectionCard = ({ title, description, icon: Icon, children }: {
  title: string; description?: string; icon: any; children: React.ReactNode;
}) => (
  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-300 tracking-wide">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all ${props.className ?? ''}`} />
);

const SelectEl = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
);

const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-slate-300">{label}</span>
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none ${value ? 'bg-violet-500' : 'bg-slate-700'}`}>
      <span className={`inline-block w-4 h-4 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const PasswordInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
  const [show, setShow] = useState(false);
  const isMasked = value?.includes('*');
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={isMasked ? '(unchanged — enter new value to update)' : placeholder}
        className="w-full px-3 py-2 pr-10 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const InfoBanner = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-blue-300">{message}</p>
  </div>
);

// ─── Tab panels ───────────────────────────────────────────────────────────────

function GeneralTab({ s, set }: { s: StoreSettingsDto; set: (k: keyof StoreSettingsDto, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Store Identity" icon={Store} description="Basic information about your store">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Store Name"><Input value={s.storeName} onChange={e => set('storeName', e.target.value)} /></Field>
          <Field label="Tagline"><Input value={s.storeTagline} onChange={e => set('storeTagline', e.target.value)} /></Field>
          <Field label="Store Email"><Input type="email" value={s.storeEmail} onChange={e => set('storeEmail', e.target.value)} /></Field>
          <Field label="Store Phone"><Input value={s.storePhone} onChange={e => set('storePhone', e.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Admin Panel Branding" icon={Settings}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Admin Panel Name" hint="Shown in the sidebar logo area">
            <Input value={s.adminPanelName} onChange={e => set('adminPanelName', e.target.value)} />
          </Field>
          <Field label="Logo URL" hint="URL to your store logo">
            <div className="flex gap-2">
              <Input value={s.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} placeholder="/logo.png" className="flex-1" />
              {s.logoUrl && <a href={s.logoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"><ExternalLink className="w-4 h-4 text-slate-400" /></a>}
            </div>
          </Field>
          <Field label="Favicon URL"><Input value={s.faviconUrl ?? ''} onChange={e => set('faviconUrl', e.target.value)} placeholder="/favicon.ico" /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Store Address" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Street Address" className="sm:col-span-2"><Input value={s.storeAddress} onChange={e => set('storeAddress', e.target.value)} placeholder="123 High Street" /></Field>
          <Field label="City"><Input value={s.storeCity} onChange={e => set('storeCity', e.target.value)} /></Field>
          <Field label="Postal Code"><Input value={s.storePostalCode} onChange={e => set('storePostalCode', e.target.value)} /></Field>
          <Field label="Country">
            <SelectEl value={s.storeCountry} onChange={e => set('storeCountry', e.target.value)}>
              {['United Kingdom','United States','Canada','Australia','Pakistan'].map(c => <option key={c}>{c}</option>)}
            </SelectEl>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Regional Settings" icon={Globe}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Currency">
            <SelectEl value={s.currency} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </SelectEl>
          </Field>
          <Field label="Timezone">
            <SelectEl value={s.timezone} onChange={e => set('timezone', e.target.value)}>
              {TIMEZONES.map(t => <option key={t}>{t}</option>)}
            </SelectEl>
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

function PaymentsTab({ s, set }: { s: StoreSettingsDto; set: (k: keyof StoreSettingsDto, v: any) => void }) {
  return (
    <div className="space-y-4">
      <InfoBanner message="Secret keys are stored securely in the database and masked when displayed. Enter a new value only if you want to update the key." />

      <SectionCard title="Stripe" icon={CreditCard} description="Accept card payments via Stripe">
        <Toggle value={s.stripeEnabled} onChange={v => set('stripeEnabled', v)} label="Enable Stripe Payments" />
        {s.stripeEnabled && (
          <div className="space-y-3 pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.stripeTestMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                {s.stripeTestMode ? 'TEST MODE' : 'LIVE MODE'}
              </span>
              <Toggle value={s.stripeTestMode} onChange={v => set('stripeTestMode', v)} label="Test Mode" />
            </div>
            <Field label="Publishable Key" hint="Starts with pk_test_ or pk_live_">
              <Input value={s.stripePublishableKey ?? ''} onChange={e => set('stripePublishableKey', e.target.value)} placeholder="pk_test_..." />
            </Field>
            <Field label="Secret Key"><PasswordInput value={s.stripeSecretKey ?? ''} onChange={v => set('stripeSecretKey', v)} placeholder="sk_test_..." /></Field>
            <Field label="Webhook Secret"><PasswordInput value={s.stripeWebhookSecret ?? ''} onChange={v => set('stripeWebhookSecret', v)} placeholder="whsec_..." /></Field>
            <div className="flex gap-3 pt-1">
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300"><ExternalLink className="w-3 h-3" /> Stripe Dashboard</a>
              <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300"><Webhook className="w-3 h-3" /> Webhooks</a>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="PayPal" icon={CreditCard} description="Accept payments via PayPal">
        <Toggle value={s.payPalEnabled} onChange={v => set('payPalEnabled', v)} label="Enable PayPal Payments" />
        {s.payPalEnabled && (
          <div className="space-y-3 pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.payPalSandboxMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                {s.payPalSandboxMode ? 'SANDBOX' : 'PRODUCTION'}
              </span>
              <Toggle value={s.payPalSandboxMode} onChange={v => set('payPalSandboxMode', v)} label="Sandbox Mode" />
            </div>
            <Field label="Client ID"><Input value={s.payPalClientId ?? ''} onChange={e => set('payPalClientId', e.target.value)} /></Field>
            <Field label="Client Secret"><PasswordInput value={s.payPalClientSecret ?? ''} onChange={v => set('payPalClientSecret', v)} /></Field>
            <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300"><ExternalLink className="w-3 h-3" /> PayPal Developer Dashboard</a>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Other Methods" icon={DollarSign}>
        <Toggle value={s.codEnabled} onChange={v => set('codEnabled', v)} label="Cash on Delivery (COD)" />
        <Toggle value={s.bankTransferEnabled} onChange={v => set('bankTransferEnabled', v)} label="Bank Transfer" />
      </SectionCard>
    </div>
  );
}

function EmailTab({ s, set }: { s: StoreSettingsDto; set: (k: keyof StoreSettingsDto, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="SMTP Server" icon={Mail} description="Configure outgoing email server">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="SMTP Host"><Input value={s.smtpServer} onChange={e => set('smtpServer', e.target.value)} placeholder="smtp.gmail.com" /></Field>
          <Field label="Port" hint="587=TLS, 465=SSL"><Input type="number" value={s.smtpPort} onChange={e => set('smtpPort', Number(e.target.value))} /></Field>
          <Field label="Username"><Input value={s.smtpUsername} onChange={e => set('smtpUsername', e.target.value)} /></Field>
          <Field label="Password"><PasswordInput value={s.smtpPassword ?? ''} onChange={v => set('smtpPassword', v)} placeholder="App password" /></Field>
        </div>
        <Toggle value={s.smtpEnableSsl} onChange={v => set('smtpEnableSsl', v)} label="Enable SSL/TLS" />
      </SectionCard>

      <SectionCard title="Email Addresses" icon={Mail}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="From Name"><Input value={s.emailFromName} onChange={e => set('emailFromName', e.target.value)} /></Field>
          <Field label="From Email"><Input type="email" value={s.emailFromAddress} onChange={e => set('emailFromAddress', e.target.value)} /></Field>
          <Field label="Admin Email" hint="Receives order notifications"><Input type="email" value={s.adminEmail} onChange={e => set('adminEmail', e.target.value)} /></Field>
          <Field label="Support Email" hint="Shown to customers"><Input type="email" value={s.supportEmail} onChange={e => set('supportEmail', e.target.value)} /></Field>
        </div>
      </SectionCard>
    </div>
  );
}

function AppearanceTab({ s, set }: { s: StoreSettingsDto; set: (k: keyof StoreSettingsDto, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Accent Color" icon={Palette} description="Primary color scheme for the admin panel">
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map(c => (
            <button key={c.value} type="button" onClick={() => set('accentColor', c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${s.accentColor === c.value ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Layout Preferences" icon={Settings}>
        <Toggle value={s.showBreadcrumbs} onChange={v => set('showBreadcrumbs', v)} label="Show Breadcrumbs" />
        <Toggle value={s.compactMode} onChange={v => set('compactMode', v)} label="Compact Mode (smaller spacing)" />
      </SectionCard>
    </div>
  );
}

function SecurityTab({ s, set }: { s: StoreSettingsDto; set: (k: keyof StoreSettingsDto, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Session & Token" icon={Clock}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Session Timeout (minutes)" hint="0 = never"><Input type="number" value={s.sessionTimeoutMinutes} onChange={e => set('sessionTimeoutMinutes', Number(e.target.value))} min={0} /></Field>
          <Field label="JWT Expiry (minutes)"><Input type="number" value={s.jwtExpiryMinutes} onChange={e => set('jwtExpiryMinutes', Number(e.target.value))} min={5} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Login Security" icon={Shield}>
        <Field label="Max Login Attempts" hint="Account locked after this many failures">
          <Input type="number" value={s.maxLoginAttempts} onChange={e => set('maxLoginAttempts', Number(e.target.value))} min={3} max={20} />
        </Field>
        <Toggle value={s.requireStrongPassword} onChange={v => set('requireStrongPassword', v)} label="Require Strong Passwords" />
        <Toggle value={s.twoFactorEnabled} onChange={v => set('twoFactorEnabled', v)} label="Two-Factor Authentication (2FA)" />
      </SectionCard>

      <SectionCard title="IP Whitelist" icon={Shield} description="Restrict admin access (leave blank to allow all)">
        <textarea value={s.ipWhitelist ?? ''} onChange={e => set('ipWhitelist', e.target.value)}
          placeholder={"192.168.1.1\n10.0.0.1"} rows={4}
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none font-mono" />
      </SectionCard>
    </div>
  );
}

function NotificationsTab({ s, set }: { s: StoreSettingsDto; set: (k: keyof StoreSettingsDto, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Order Notifications" icon={Bell}>
        <Toggle value={s.notifyNewOrder} onChange={v => set('notifyNewOrder', v)} label="New Order Received" />
        <Toggle value={s.notifyRefundRequest} onChange={v => set('notifyRefundRequest', v)} label="Refund Request" />
        <Toggle value={s.notifyCustomerRegistration} onChange={v => set('notifyCustomerRegistration', v)} label="New Customer Registration" />
        <Toggle value={s.notifyNewReview} onChange={v => set('notifyNewReview', v)} label="New Product Review" />
      </SectionCard>

      <SectionCard title="Inventory Alerts" icon={AlertCircle}>
        <Toggle value={s.notifyLowStock} onChange={v => set('notifyLowStock', v)} label="Low Stock Alerts" />
        {s.notifyLowStock && (
          <Field label="Low Stock Threshold" hint="Alert when quantity falls below this number">
            <Input type="number" value={s.lowStockThreshold} onChange={e => set('lowStockThreshold', Number(e.target.value))} min={1} max={100} />
          </Field>
        )}
      </SectionCard>

      <SectionCard title="Reports" icon={Bell}>
        <Toggle value={s.notifyDailyReport} onChange={v => set('notifyDailyReport', v)} label="Daily Sales Report Email" />
      </SectionCard>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<StoreSettingsDto>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from API on mount
  useEffect(() => {
    fetchSettings()
      .then(data => { setSettings(data); setError(null); })
      .catch(err => setError('Failed to load settings. Check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  // Field updater
  const setField = useCallback((key: keyof StoreSettingsDto, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveSettings(settings);
      setSettings(updated);
      setSaved(true);
      toast.success('Settings saved successfully!', { position: 'top-right', autoClose: 2500 });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error('Failed to save settings. Please try again.', { position: 'top-right', autoClose: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const CurrentIcon = currentTab.icon;

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-xs text-slate-400">Configure your store, payments, and admin panel</p>
          </div>
        </div>
        {settings.updatedBy && (
          <p className="text-xs text-slate-500">Last saved by <span className="text-slate-400">{settings.updatedBy}</span> {settings.updatedAt ? `· ${new Date(settings.updatedAt).toLocaleString()}` : ''}</p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => { setLoading(true); fetchSettings().then(d => { setSettings(d); setError(null); }).catch(() => setError('Failed to load settings.')).finally(() => setLoading(false)); }}
            className="ml-auto text-xs text-red-400 hover:text-red-300 underline">Retry</button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar tabs */}
          <div className="lg:w-52 flex-shrink-0">
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {TABS.map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ${isActive ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'}`}>
                    <TabIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-400' : tab.color}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
              <CurrentIcon className={`w-4 h-4 ${currentTab.color}`} />
              <h2 className="text-sm font-semibold text-white">{currentTab.label}</h2>
            </div>

            {activeTab === 'general'       && <GeneralTab       s={settings} set={setField} />}
            {activeTab === 'payments'      && <PaymentsTab      s={settings} set={setField} />}
            {activeTab === 'email'         && <EmailTab         s={settings} set={setField} />}
            {activeTab === 'appearance'    && <AppearanceTab    s={settings} set={setField} />}
            {activeTab === 'security'      && <SecurityTab      s={settings} set={setField} />}
            {activeTab === 'notifications' && <NotificationsTab s={settings} set={setField} />}
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      {!loading && !error && (
        <div className="sticky bottom-4 flex justify-end pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl pointer-events-auto">
            <span className="text-xs text-slate-400 hidden sm:block">Saved to database</span>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-lg text-white text-sm font-semibold hover:from-violet-600 hover:to-cyan-600 transition-all disabled:opacity-60 shadow-lg shadow-violet-500/20">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
