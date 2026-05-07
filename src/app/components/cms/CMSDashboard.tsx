/**
 * CMSDashboard.tsx  —  Application container (NOT part of the UI submodule).
 *
 * Responsibilities:
 *   • Read NavigationContext to produce live navigation callbacks.
 *   • Pass those callbacks down to <DashboardView />.
 *
 * What this file must NEVER do:
 *   • Define or import mock / fixture data.
 *   • Render any UI itself.
 *   • Contain business logic beyond mapping context → callbacks.
 *
 * All data props are intentionally omitted here so that <DashboardView />
 * falls back to its fixture defaults until a real data layer is wired up.
 */
import React, { useContext } from 'react';
import { NavigationContext } from '../../App';
import { DashboardView } from './dashboard/DashboardView';

export function CMSDashboard(): React.ReactElement {
  const { navigateTo } = useContext(NavigationContext);

  return (
    <DashboardView
      onViewAllOrders={() => navigateTo('web-orders')}
      onManageStock={()   => navigateTo('products')}
      onViewAllMembers={() => navigateTo('members')}
      onExportReport={() => { /* TODO: wire to report-export service */ }}
    />
  );
}
