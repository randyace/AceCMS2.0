import React, { useState } from 'react';
import { Save, Globe, Mail, CreditCard, Truck, Share2, Shield, Wrench, Bell, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { toast } from 'sonner@2.0.3';

const TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'seo', label: 'SEO', icon: Globe },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'social', label: 'Social Media', icon: Share2 },
  { id: 'loyalty', label: 'Loyalty Program', icon: Tag },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;
type TabId = typeof TABS[number]['id'];

interface Settings {
  // General
  siteName: string; tagline: string; contactEmail: string; contactPhone: string;
  timezone: string; currency: string; defaultLanguage: string; googleMapsApiKey: string;
  // SEO
  defaultMetaTitle: string; defaultMetaDescription: string; robotsTxt: string; googleAnalyticsId: string;
  // Email
  smtpHost: string; smtpPort: string; smtpUser: string; smtpPassword: string;
  emailFromName: string; emailFromAddress: string;
  notifyNewOrder: boolean; notifyLowStock: boolean; notifyNewMember: boolean;
  // Payment
  stripeEnabled: boolean; stripePublicKey: string; stripeSecretKey: string;
  paypalEnabled: boolean; paypalClientId: string;
  codEnabled: boolean; bankTransferEnabled: boolean;
  // Shipping
  freeShippingThreshold: number; defaultShippingRate: number; shippingZones: string;
  localPickupEnabled: boolean; estimatedDeliveryDays: number;
  // Social
  facebookUrl: string; instagramUrl: string; whatsapp: string; youtubeUrl: string;
  // Loyalty
  loyaltyEnabled: boolean; pointsPerDollar: number; pointsRedemptionRate: number;
  welcomeBonus: number; birthdayBonus: number;
  // Security
  recaptchaEnabled: boolean; recaptchaSiteKey: string; recaptchaSecretKey: string;
  passwordMinLength: number; sessionTimeout: number; loginAttempts: number;
  // Maintenance
  maintenanceMode: boolean; maintenanceMessage: string; maintenanceEndTime: string;
  allowedIPs: string;
  // Notifications
  slackWebhook: string; adminEmailAlerts: boolean; smsAlerts: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  siteName: 'ShopCo', tagline: 'Your Premium Shopping Destination', contactEmail: 'info@shopco.com',
  contactPhone: '+852 2345 6789', timezone: 'Asia/Hong_Kong', currency: 'HKD', defaultLanguage: 'en',
  googleMapsApiKey: '',
  defaultMetaTitle: 'ShopCo — Premium Shopping', defaultMetaDescription: 'Shop the latest products at ShopCo.',
  robotsTxt: 'User-agent: *\nDisallow: /admin/\nSitemap: https://shopco.com/sitemap.xml', googleAnalyticsId: 'G-XXXXXXXXXX',
  smtpHost: 'smtp.shopco.com', smtpPort: '587', smtpUser: 'noreply@shopco.com', smtpPassword: '••••••••',
  emailFromName: 'ShopCo', emailFromAddress: 'noreply@shopco.com',
  notifyNewOrder: true, notifyLowStock: true, notifyNewMember: false,
  stripeEnabled: true, stripePublicKey: 'pk_live_...', stripeSecretKey: '••••••••••••',
  paypalEnabled: false, paypalClientId: '',
  codEnabled: true, bankTransferEnabled: true,
  freeShippingThreshold: 500, defaultShippingRate: 35, shippingZones: 'Hong Kong Island, Kowloon, New Territories',
  localPickupEnabled: true, estimatedDeliveryDays: 2,
  facebookUrl: 'https://facebook.com/shopco', instagramUrl: 'https://instagram.com/shopco',
  whatsapp: '+852 9876 5432', youtubeUrl: '',
  loyaltyEnabled: true, pointsPerDollar: 1, pointsRedemptionRate: 100, welcomeBonus: 50, birthdayBonus: 100,
  recaptchaEnabled: true, recaptchaSiteKey: '6Le...', recaptchaSecretKey: '••••••••',
  passwordMinLength: 8, sessionTimeout: 30, loginAttempts: 5,
  maintenanceMode: false, maintenanceMessage: 'We are currently undergoing maintenance. Please check back soon.',
  maintenanceEndTime: '', allowedIPs: '127.0.0.1',
  slackWebhook: '', adminEmailAlerts: true, smsAlerts: false,
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function WebsiteSettings() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => toast.success('Settings saved successfully');

  return (
    <main className="flex h-full">
      {/* Sidebar Tabs */}
      <div className="w-48 border-r border-border flex-shrink-0 py-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              activeTab === id ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h1>{TABS.find((t) => t.id === activeTab)?.label} Settings</h1>
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Save Changes</Button>
          </div>

          {activeTab === 'general' && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Site Name"><Input value={settings.siteName} onChange={(e) => set('siteName', e.target.value)} /></Field>
                  <Field label="Tagline"><Input value={settings.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
                  <Field label="Contact Email"><Input type="email" value={settings.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
                  <Field label="Contact Phone"><Input value={settings.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></Field>
                  <Field label="Timezone">
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={settings.timezone} onChange={(e) => set('timezone', e.target.value)}>
                      <option value="Asia/Hong_Kong">Asia/Hong Kong (UTC+8)</option>
                      <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                      <option value="Asia/Taipei">Asia/Taipei (UTC+8)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </Field>
                  <Field label="Default Currency">
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={settings.currency} onChange={(e) => set('currency', e.target.value)}>
                      {['HKD', 'USD', 'CNY', 'TWD', 'EUR'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Default Language">
                    <select className="w-full h-9 px-3 border border-border rounded-md text-sm bg-background" value={settings.defaultLanguage} onChange={(e) => set('defaultLanguage', e.target.value)}>
                      <option value="en">English</option>
                      <option value="zh_TW">繁體中文</option>
                      <option value="zh_CN">简体中文</option>
                    </select>
                  </Field>
                  <Field label="Google Maps API Key" hint="Used for store locator"><Input value={settings.googleMapsApiKey} onChange={(e) => set('googleMapsApiKey', e.target.value)} placeholder="AIza..." /></Field>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'seo' && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <Field label="Default Meta Title"><Input value={settings.defaultMetaTitle} onChange={(e) => set('defaultMetaTitle', e.target.value)} /></Field>
                <Field label="Default Meta Description"><textarea className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={settings.defaultMetaDescription} onChange={(e) => set('defaultMetaDescription', e.target.value)} /></Field>
                <Field label="Google Analytics ID" hint="e.g. G-XXXXXXXXXX or UA-XXXXX-Y"><Input value={settings.googleAnalyticsId} onChange={(e) => set('googleAnalyticsId', e.target.value)} /></Field>
                <Field label="robots.txt" hint="Crawl rules for search engines">
                  <textarea className="w-full h-28 px-3 py-2 border border-border rounded-lg text-sm font-mono resize-none outline-none focus:ring-1 focus:ring-ring" value={settings.robotsTxt} onChange={(e) => set('robotsTxt', e.target.value)} />
                </Field>
              </CardContent>
            </Card>
          )}

          {activeTab === 'email' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">SMTP Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="SMTP Host"><Input value={settings.smtpHost} onChange={(e) => set('smtpHost', e.target.value)} /></Field>
                    <Field label="SMTP Port"><Input value={settings.smtpPort} onChange={(e) => set('smtpPort', e.target.value)} /></Field>
                    <Field label="Username"><Input value={settings.smtpUser} onChange={(e) => set('smtpUser', e.target.value)} /></Field>
                    <Field label="Password"><Input type="password" value={settings.smtpPassword} onChange={(e) => set('smtpPassword', e.target.value)} /></Field>
                    <Field label="From Name"><Input value={settings.emailFromName} onChange={(e) => set('emailFromName', e.target.value)} /></Field>
                    <Field label="From Email"><Input value={settings.emailFromAddress} onChange={(e) => set('emailFromAddress', e.target.value)} /></Field>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Test email sent!')}>Send Test Email</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Email Notifications</CardTitle></CardHeader>
                <CardContent className="divide-y divide-border">
                  <ToggleRow label="New Order Notification" desc="Notify admin on new orders" checked={settings.notifyNewOrder} onChange={(v) => set('notifyNewOrder', v)} />
                  <ToggleRow label="Low Stock Alert" desc="Alert when product stock falls below threshold" checked={settings.notifyLowStock} onChange={(v) => set('notifyLowStock', v)} />
                  <ToggleRow label="New Member Registration" desc="Notify admin on new signups" checked={settings.notifyNewMember} onChange={(v) => set('notifyNewMember', v)} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Stripe</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ToggleRow label="Enable Stripe" checked={settings.stripeEnabled} onChange={(v) => set('stripeEnabled', v)} />
                  {settings.stripeEnabled && (
                    <>
                      <Field label="Public Key"><Input value={settings.stripePublicKey} onChange={(e) => set('stripePublicKey', e.target.value)} /></Field>
                      <Field label="Secret Key"><Input type="password" value={settings.stripeSecretKey} onChange={(e) => set('stripeSecretKey', e.target.value)} /></Field>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">PayPal</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ToggleRow label="Enable PayPal" checked={settings.paypalEnabled} onChange={(v) => set('paypalEnabled', v)} />
                  {settings.paypalEnabled && (
                    <Field label="Client ID"><Input value={settings.paypalClientId} onChange={(e) => set('paypalClientId', e.target.value)} /></Field>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Other Payment Methods</CardTitle></CardHeader>
                <CardContent className="divide-y divide-border">
                  <ToggleRow label="Cash on Delivery (COD)" checked={settings.codEnabled} onChange={(v) => set('codEnabled', v)} />
                  <ToggleRow label="Bank Transfer" checked={settings.bankTransferEnabled} onChange={(v) => set('bankTransferEnabled', v)} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'shipping' && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Free Shipping Threshold (HKD)" hint="Set 0 to disable"><Input type="number" value={settings.freeShippingThreshold} onChange={(e) => set('freeShippingThreshold', parseFloat(e.target.value))} /></Field>
                  <Field label="Default Shipping Rate (HKD)"><Input type="number" value={settings.defaultShippingRate} onChange={(e) => set('defaultShippingRate', parseFloat(e.target.value))} /></Field>
                  <Field label="Estimated Delivery (Days)"><Input type="number" min={1} value={settings.estimatedDeliveryDays} onChange={(e) => set('estimatedDeliveryDays', parseInt(e.target.value))} /></Field>
                </div>
                <Field label="Shipping Zones" hint="Comma-separated list of zones">
                  <Input value={settings.shippingZones} onChange={(e) => set('shippingZones', e.target.value)} />
                </Field>
                <ToggleRow label="Enable Local Pickup" desc="Allow customers to pick up orders in-store" checked={settings.localPickupEnabled} onChange={(v) => set('localPickupEnabled', v)} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'social' && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <Field label="Facebook"><Input value={settings.facebookUrl} onChange={(e) => set('facebookUrl', e.target.value)} placeholder="https://facebook.com/yourpage" /></Field>
                <Field label="Instagram"><Input value={settings.instagramUrl} onChange={(e) => set('instagramUrl', e.target.value)} placeholder="https://instagram.com/yourhandle" /></Field>
                <Field label="WhatsApp"><Input value={settings.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+852 1234 5678" /></Field>
                <Field label="YouTube"><Input value={settings.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} placeholder="https://youtube.com/channel/..." /></Field>
              </CardContent>
            </Card>
          )}

          {activeTab === 'loyalty' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Loyalty Points Program</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ToggleRow label="Enable Loyalty Points Program" checked={settings.loyaltyEnabled} onChange={(v) => set('loyaltyEnabled', v)} />
                {settings.loyaltyEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Field label="Points Earned per HKD Spent" hint="e.g. 1 = 1 pt per HK$1"><Input type="number" min={0} step={0.1} value={settings.pointsPerDollar} onChange={(e) => set('pointsPerDollar', parseFloat(e.target.value))} /></Field>
                    <Field label="Points to Redeem per HKD" hint="e.g. 100 pts = HK$1"><Input type="number" min={1} value={settings.pointsRedemptionRate} onChange={(e) => set('pointsRedemptionRate', parseInt(e.target.value))} /></Field>
                    <Field label="Welcome Bonus (pts)" hint="Points for new registrations"><Input type="number" min={0} value={settings.welcomeBonus} onChange={(e) => set('welcomeBonus', parseInt(e.target.value))} /></Field>
                    <Field label="Birthday Bonus (pts)" hint="Points on member's birthday"><Input type="number" min={0} value={settings.birthdayBonus} onChange={(e) => set('birthdayBonus', parseInt(e.target.value))} /></Field>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <ToggleRow label="Enable Google reCAPTCHA" desc="Protect forms from spam" checked={settings.recaptchaEnabled} onChange={(v) => set('recaptchaEnabled', v)} />
                {settings.recaptchaEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="reCAPTCHA Site Key"><Input value={settings.recaptchaSiteKey} onChange={(e) => set('recaptchaSiteKey', e.target.value)} /></Field>
                    <Field label="reCAPTCHA Secret Key"><Input type="password" value={settings.recaptchaSecretKey} onChange={(e) => set('recaptchaSecretKey', e.target.value)} /></Field>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                  <Field label="Min. Password Length"><Input type="number" min={6} max={30} value={settings.passwordMinLength} onChange={(e) => set('passwordMinLength', parseInt(e.target.value))} /></Field>
                  <Field label="Session Timeout (min)"><Input type="number" min={5} value={settings.sessionTimeout} onChange={(e) => set('sessionTimeout', parseInt(e.target.value))} /></Field>
                  <Field label="Max Login Attempts"><Input type="number" min={3} value={settings.loginAttempts} onChange={(e) => set('loginAttempts', parseInt(e.target.value))} /></Field>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'maintenance' && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className={`p-4 rounded-lg border ${settings.maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-muted/30 border-border'}`}>
                  <ToggleRow
                    label="Maintenance Mode"
                    desc={settings.maintenanceMode ? '⚠️ ACTIVE — Your site is currently offline to visitors' : 'Take your site offline for maintenance'}
                    checked={settings.maintenanceMode}
                    onChange={(v) => set('maintenanceMode', v)}
                  />
                </div>
                <Field label="Maintenance Message" hint="Shown to visitors during maintenance">
                  <textarea className="w-full h-24 px-3 py-2 border border-border rounded-lg text-sm resize-none outline-none focus:ring-1 focus:ring-ring" value={settings.maintenanceMessage} onChange={(e) => set('maintenanceMessage', e.target.value)} />
                </Field>
                <Field label="Expected End Time"><Input type="datetime-local" value={settings.maintenanceEndTime} onChange={(e) => set('maintenanceEndTime', e.target.value)} /></Field>
                <Field label="Allowed IPs (bypass maintenance)" hint="Comma-separated IPs that can access the site normally">
                  <Input value={settings.allowedIPs} onChange={(e) => set('allowedIPs', e.target.value)} placeholder="127.0.0.1, 192.168.1.0" />
                </Field>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <Field label="Slack Webhook URL" hint="Receive critical alerts in your Slack channel"><Input value={settings.slackWebhook} onChange={(e) => set('slackWebhook', e.target.value)} placeholder="https://hooks.slack.com/services/..." /></Field>
                <div className="divide-y divide-border">
                  <ToggleRow label="Admin Email Alerts" desc="Critical system alerts to admin email" checked={settings.adminEmailAlerts} onChange={(v) => set('adminEmailAlerts', v)} />
                  <ToggleRow label="SMS Alerts" desc="Urgent alerts via SMS (requires SMS gateway config)" checked={settings.smsAlerts} onChange={(v) => set('smsAlerts', v)} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}