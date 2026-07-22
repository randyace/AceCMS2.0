import React, { useState } from 'react';
import logoImg from 'figma:asset/6df9654c9a80b51c219bd3bcb3b9cfeee56ea000.png';
import {
  LayoutDashboard, FileText, Newspaper, Package, FolderTree,
  ShoppingCart, Truck, Users, Building2, UserCog, Settings,
  ChevronDown, Store, ShoppingBag, Handshake, Wrench, ChevronRight, Layers, Monitor,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: SubItem[];
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

// ─── Navigation structure ─────────────────────────────────────────────────────

const GROUPS: SidebarGroup[] = [
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
      {
        id: 'services-group',
        label: 'Services',
        icon: Wrench,
        children: [
          { id: 'service-categories', label: 'Service Categories', icon: FolderTree },
          { id: 'services', label: 'Services', icon: Wrench },
        ],
      },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'categories', label: 'Product Categories', icon: FolderTree },
      { id: 'attribute-groups', label: 'Attribute Groups', icon: Layers },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { id: 'pos', label: 'POS Terminal', icon: Monitor },
      { id: 'web-orders', label: 'Web Orders', icon: ShoppingCart },
      { id: 'retail-orders', label: 'Retail Orders', icon: ShoppingBag },
      { id: 'wholesale-orders', label: 'Wholesale Orders', icon: Store },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: Truck },
    ],
  },
  {
    label: 'CRM',
    items: [
      { id: 'members', label: 'Members', icon: Users },
      { id: 'suppliers', label: 'Suppliers', icon: Building2 },
      { id: 'merchants', label: 'Merchants', icon: Handshake },
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

// ─── Component ────────────────────────────────────────────────────────────────

export function CMSSidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    // Auto-expand the Services group if a service sub-section is active
    return { 'services-group': true };
  });

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isChildActive = (item: SidebarItem) =>
    item.children?.some((c) => c.id === activeSection) ?? false;

  return (
    <div className="w-60 bg-[#0f2942] flex flex-col flex-shrink-0 overflow-y-auto h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10 overflow-hidden">
            <img src={logoImg} alt="ACE CMS Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">ACE CMS</p>
            <p className="text-xs text-white/50">v2.0 Enterprise</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2">
        {GROUPS.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.label];
          return (
            <div key={group.label} className="mb-1">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <span className="uppercase tracking-wider">{group.label}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
                />
              </button>

              {!isGroupCollapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    // ── Expandable item (has children) ────────────────────
                    if (item.children && item.children.length > 0) {
                      const isExpanded = expandedItems[item.id] ?? false;
                      const anyChildActive = isChildActive(item);

                      return (
                        <li key={item.id}>
                          {/* Parent toggle button */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                              anyChildActive
                                ? 'text-[#cec18a] bg-white/10'
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate flex-1 text-left">{item.label}</span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </button>

                          {/* Sub-items */}
                          {isExpanded && (
                            <ul className="mt-0.5 space-y-0.5 ml-3 pl-3 border-l border-white/10">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isActive = activeSection === child.id;
                                return (
                                  <li key={child.id}>
                                    <button
                                      onClick={() => onSectionChange(child.id)}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                        isActive
                                          ? 'bg-[#cec18a] text-[#0f2942]'
                                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                                      }`}
                                    >
                                      <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span className="truncate">{child.label}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    }

                    // ── Regular item ──────────────────────────────────────
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => onSectionChange(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-[#cec18a] text-[#0f2942]'
                              : 'text-white hover:bg-white/10'
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
          <div className="w-8 h-8 bg-[#cec18a] rounded-full flex items-center justify-center text-[#0f2942] text-xs font-medium flex-shrink-0">
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