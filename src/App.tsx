import React, { useState, createContext, useContext } from 'react';
import { CMSSidebar } from './components/CMSSidebar';
import { CMSDashboard } from './components/cms/CMSDashboard';
import { ContentManagement } from './components/cms/ContentManagement';
import { NewsManagement } from './components/cms/NewsManagement';
import { ProductsManagement } from './components/cms/ProductsManagement';
import { ProductCategories } from './components/cms/ProductCategories';
import { AttributeGroups } from './components/cms/AttributeGroups';
import { MembershipManagement } from './components/cms/MembershipManagement';
import { WebOrderManagement } from './components/cms/WebOrderManagement';
import { PurchaseOrderManagement } from './components/cms/PurchaseOrderManagement';
import { RetailOrders } from './components/cms/RetailOrders';
import { WholesaleOrders } from './components/cms/WholesaleOrders';
import { ServicesManagement } from './components/cms/ServicesManagement';
import { ServiceCategories } from './components/cms/ServiceCategories';
import { SupplierManagement } from './components/cms/SupplierManagement';
import { MerchantManagement } from './components/cms/MerchantManagement';
import { AdminUsers } from './components/cms/AdminUsers';
import { WebsiteSettings } from './components/cms/WebsiteSettings';
import { Toaster } from './components/ui/sonner';
import { Bell, Search, Globe, ChevronDown, Menu, X } from 'lucide-react';
import { AttributeGroup, INITIAL_ATTRIBUTE_GROUPS } from './components/cms/shared/attributeGroupsStore';

export type InterfaceLang = 'en' | 'zh_TW' | 'zh_CN';

export const InterfaceLangContext = createContext<{
  lang: InterfaceLang;
  setLang: (l: InterfaceLang) => void;
}>({ lang: 'en', setLang: () => {} });

export const NavigationContext = createContext<{
  navigateTo: (section: string, itemId?: string) => void;
}>({ navigateTo: () => {} });

export const AttributeGroupsContext = createContext<{
  groups: AttributeGroup[];
  setGroups: (g: AttributeGroup[] | ((prev: AttributeGroup[]) => AttributeGroup[])) => void;
}>({ groups: INITIAL_ATTRIBUTE_GROUPS, setGroups: () => {} });

const LANG_OPTIONS: { value: InterfaceLang; label: string; short: string }[] = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'zh_TW', label: '繁體中文', short: '繁中' },
  { value: 'zh_CN', label: '简体中文', short: '简中' },
];

const NOTIFICATIONS = [
  { text: 'New order ORD-20260001 received', time: '2m ago', unread: true },
  { text: 'Stock alert: ELEC-0042 low stock (3 units)', time: '15m ago', unread: true },
  { text: 'New merchant application: Fashion Forward Co.', time: '1h ago', unread: false },
];

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [navItemId, setNavItemId] = useState<string | undefined>(undefined);
  const [interfaceLang, setInterfaceLang] = useState<InterfaceLang>('en');
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [attrGroups, setAttrGroups] = useState<AttributeGroup[]>(INITIAL_ATTRIBUTE_GROUPS);

  const navigateTo = (section: string, itemId?: string) => {
    setActiveSection(section);
    setNavItemId(itemId);
    setMobileSidebarOpen(false);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setNavItemId(undefined);
    setMobileSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <CMSDashboard />;
      case 'content': return <ContentManagement />;
      case 'news': return <NewsManagement />;
      case 'services': return <ServicesManagement />;
      case 'service-categories': return <ServiceCategories />;
      case 'products': return <ProductsManagement />;
      case 'categories': return <ProductCategories />;
      case 'attribute-groups': return <AttributeGroups />;
      case 'members': return <MembershipManagement initialItemId={navItemId} onItemOpened={() => setNavItemId(undefined)} />;
      case 'web-orders': return <WebOrderManagement initialItemId={navItemId} onItemOpened={() => setNavItemId(undefined)} />;
      case 'retail-orders': return <RetailOrders initialItemId={navItemId} onItemOpened={() => setNavItemId(undefined)} />;
      case 'wholesale-orders': return <WholesaleOrders initialItemId={navItemId} onItemOpened={() => setNavItemId(undefined)} />;
      case 'purchase-orders': return <PurchaseOrderManagement initialItemId={navItemId} onItemOpened={() => setNavItemId(undefined)} />;
      case 'suppliers': return <SupplierManagement initialItemId={navItemId} onItemOpened={() => setNavItemId(undefined)} />;
      case 'merchants': return <MerchantManagement initialItemId={navItemId} onItemOpened={() => setNavItemId(undefined)} />;
      case 'admin-users': return <AdminUsers />;
      case 'settings': return <WebsiteSettings />;
      default: return <CMSDashboard />;
    }
  };

  const currentLang = LANG_OPTIONS.find((l) => l.value === interfaceLang)!;
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <InterfaceLangContext.Provider value={{ lang: interfaceLang, setLang: setInterfaceLang }}>
      <NavigationContext.Provider value={{ navigateTo }}>
        <AttributeGroupsContext.Provider value={{ groups: attrGroups, setGroups: setAttrGroups }}>
          <div className="flex h-screen bg-background overflow-hidden">
            {/* Mobile sidebar overlay */}
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div className={`
              fixed md:relative inset-y-0 left-0 z-50 md:z-auto
              transform transition-transform duration-300 ease-in-out
              ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              flex-shrink-0
            `}>
              <CMSSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Top Header */}
              <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background flex-shrink-0 gap-3">
                {/* Mobile menu button */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Search */}
                <div className="relative flex-1 max-w-xs hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search orders, products, members..."
                    className="w-full pl-9 pr-4 py-1.5 text-sm bg-muted rounded-lg outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  {/* Interface Language Selector */}
                  <div className="relative">
                    <button
                      onClick={() => { setLangOpen((v) => !v); setNotifOpen(false); setUserOpen(false); }}
                      className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors"
                    >
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="hidden sm:inline">{currentLang.short}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                    </button>
                    {langOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                        {LANG_OPTIONS.map((l) => (
                          <button
                            key={l.value}
                            onClick={() => { setInterfaceLang(l.value); setLangOpen(false); }}
                            className={`w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center justify-between ${interfaceLang === l.value ? 'text-primary' : ''}`}
                          >
                            {l.label}
                            {interfaceLang === l.value && <span className="text-xs text-primary">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notifications */}
                  <div className="relative">
                    <button
                      onClick={() => { setNotifOpen((v) => !v); setLangOpen(false); setUserOpen(false); }}
                      className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                      )}
                    </button>
                    {notifOpen && (
                      <div className="absolute right-0 top-full mt-1 w-72 sm:w-80 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                          <p className="text-sm font-medium">Notifications</p>
                          <span className="text-xs text-primary">{unreadCount} unread</span>
                        </div>
                        {NOTIFICATIONS.map((n, i) => (
                          <div key={i} className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer ${n.unread ? 'bg-primary/5' : ''}`}>
                            <p className={`text-sm ${n.unread ? 'font-medium' : ''}`}>{n.text}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                          </div>
                        ))}
                        <div className="px-4 py-2 border-t border-border">
                          <button className="text-xs text-primary hover:underline w-full text-center">Mark all as read</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => { setUserOpen((v) => !v); setLangOpen(false); setNotifOpen(false); }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-medium flex-shrink-0">
                        SA
                      </div>
                      <span className="text-sm hidden sm:inline">Super Admin</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                    </button>
                    {userOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                        <div className="px-4 py-2 border-b border-border">
                          <p className="text-sm font-medium">Super Admin</p>
                          <p className="text-xs text-muted-foreground">admin@shopco.com</p>
                        </div>
                        <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted" onClick={() => { handleSectionChange('admin-users'); setUserOpen(false); }}>My Profile</button>
                        <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted" onClick={() => { handleSectionChange('settings'); setUserOpen(false); }}>Settings</button>
                        <div className="border-t border-border mt-1 pt-1">
                          <button className="w-full px-4 py-2 text-sm text-left text-destructive hover:bg-muted">Sign Out</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* Click overlay to close dropdowns */}
              {(langOpen || notifOpen || userOpen) && (
                <div className="fixed inset-0 z-40" onClick={() => { setLangOpen(false); setNotifOpen(false); setUserOpen(false); }} />
              )}

              {/* Main Content */}
              <main className="flex-1 overflow-auto bg-secondary/20">
                {renderContent()}
              </main>
            </div>

            <Toaster position="bottom-right" />
          </div>
        </AttributeGroupsContext.Provider>
      </NavigationContext.Provider>
    </InterfaceLangContext.Provider>
  );
}