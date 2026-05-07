import React from 'react';
import DashboardView from './figma-ui/DashboardView';
import { buildContainerContract } from './containerContracts';

export function Dashboard() {
  const metrics = [
    { title: 'Total Outstanding', value: '$2,345,678', change: '+12.5%', trend: 'up', icon: 'dollar-sign' },
    { title: 'Active Campaigns', value: '24', change: '+3', trend: 'up', icon: 'users' },
    { title: 'Collections Rate', value: '68%', change: '+5.2%', trend: 'up', icon: 'trending-up' },
    { title: 'Avg. Days to Pay', value: '12.3', change: '-2.1', trend: 'down', icon: 'clock' },
  ];

  const recentActivity = [
    { action: 'Payment received', amount: '$1,250', customer: 'Smith Corp', time: '2m ago' },
    { action: 'Email sequence completed', customer: 'Johnson LLC', time: '15m ago' },
    { action: 'New import processed', details: '450 records', time: '1h ago' },
    { action: 'Campaign started', customer: 'Anderson Inc', time: '2h ago' },
  ];

  const channelStats = [
    { name: 'Email', sent: 1250, opened: 845, responded: 234, icon: 'mail', color: 'bg-blue-500' },
    { name: 'SMS', sent: 680, opened: 612, responded: 156, icon: 'message-square', color: 'bg-green-500' },
    { name: 'Voice', sent: 320, opened: 298, responded: 89, icon: 'phone', color: 'bg-purple-500' },
  ];

  const containerContract = buildContainerContract({
    data: { metrics, recentActivity, channelStats },
    uiState: {},
    asyncState: { loading: false, saving: false, error: null },
    callbacks: {
      onExportReport: () => {},
      onCreateCampaign: () => {},
      onViewAllActivity: () => {},
      onQuickAction: (_action: string) => {},
    },
    meta: {
      title: 'Dashboard',
      subtitle: 'Overview of your collections performance',
    },
  });

  return <DashboardView {...containerContract} />;
}