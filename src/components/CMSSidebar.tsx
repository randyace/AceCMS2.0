import React, { useState } from 'react';
import {
  LayoutDashboard, FileText, Newspaper, Package, FolderTree,
  ShoppingCart, Truck, Users, Building2, UserCog, Settings,
  ChevronDown, Store,
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'content', label: 'Content Management', icon: FileText },
      { id: 'news', label: 'News Management', icon: Newspaper },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'categories', label: 'Product Categories', icon: FolderTree },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { id: 'web-orders', label: 'Web Orders', icon: ShoppingCart },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: Truck },
    ],
  },
  {
    label: 'CRM',
    items: [
      { id: 'members', label: 'Members', icon: Users },
      { id: 'suppliers', label: 'Suppliers & Clients', icon: Building2 },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'admin-users', label: 'Admin Users', icon: UserCog },
      { id: 'settings', label: 'Website Settings', icon: Settings },
    ],
  },
];

export function CMSSidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="w-60 bg-[#115160] flex flex-col flex-shrink-0 overflow-y-auto h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#cec18a] rounded-lg flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-[#115160]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">ShopAdmin CMS</p>
            <p className="text-xs text-white/50">v2.0 Enterprise</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2">
        {GROUPS.map((group) => {
          const isCollapsed = collapsed[group.label];
          return (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <span className="uppercase tracking-wider">{group.label}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                />
              </button>

              {!isCollapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => onSectionChange(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-[#cec18a] text-[#115160]'
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#cec18a] rounded-full flex items-center justify-center text-[#115160] text-xs font-medium flex-shrink-0">
            SA
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white truncate">Super Admin</p>
            <p className="text-xs text-white/50 truncate">admin@shopco.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
