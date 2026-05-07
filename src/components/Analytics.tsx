import React, { useState } from 'react';
import AnalyticsView from './figma-ui/AnalyticsView';
import { buildContainerContract } from './containerContracts';

export function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const funnelData = [
    { stage: 'Sent', count: 1250, percentage: 100, color: 'bg-blue-500' },
    { stage: 'Delivered', count: 1189, percentage: 95.1, color: 'bg-blue-400' },
    { stage: 'Opened', count: 845, percentage: 67.6, color: 'bg-blue-300' },
    { stage: 'Clicked', count: 234, percentage: 18.7, color: 'bg-blue-200' },
    { stage: 'Paid', count: 156, percentage: 12.5, color: 'bg-green-500' }
  ];

  const templatePerformance = [
    { template: 'Friendly Reminder', conversion: 15.2, avgDays: 8.3, sent: 450 },
    { template: 'Firm Notice', conversion: 12.8, avgDays: 6.1, sent: 320 },
    { template: 'Final Warning', conversion: 18.7, avgDays: 4.2, sent: 180 },
    { template: 'Payment Due', conversion: 11.4, avgDays: 9.7, sent: 280 }
  ];

  const abTestResults = [
    {
      test: 'Subject Line A/B',
      variantA: { name: 'Payment Reminder', conversion: 12.5, sent: 500 },
      variantB: { name: 'Action Required', conversion: 15.2, sent: 500 },
      significance: 'Significant',
      winner: 'B'
    },
    {
      test: 'Send Time A/B',
      variantA: { name: 'Morning (9 AM)', conversion: 14.1, sent: 300 },
      variantB: { name: 'Afternoon (2 PM)', conversion: 16.8, sent: 300 },
      significance: 'Significant',
      winner: 'B'
    }
  ];

  const periodOptions = ['7d', '30d', '90d', 'custom'];
  const overviewMetrics = [
    { title: 'Total Collections', value: '$234,567', change: '+18.2% from last month', trend: 'up', icon: 'dollar-sign' },
    { title: 'Collection Rate', value: '68.5%', change: '+5.1% from last month', trend: 'up', icon: 'target' },
    { title: 'Avg. Days to Pay', value: '8.3', change: '-1.2 days improvement', trend: 'down', icon: 'calendar' },
    { title: 'Active Campaigns', value: '24', change: '3 new this week', trend: 'neutral', icon: 'users' },
  ];

  const channelPerformance = [
    { name: 'Email', sent: 850, conversion: 12.5, icon: 'mail' },
    { name: 'SMS', sent: 245, conversion: 18.2, icon: 'message-square' },
    { name: 'Voice', sent: 155, conversion: 24.5, icon: 'phone' },
  ];

  const channelDeepDive = {
    email: { openRate: 68.2, clickRate: 15.4, conversionRate: 12.5, bounceRate: 2.1 },
    sms: { deliveryRate: 98.7, responseRate: 24.3, conversionRate: 18.2, optOutRate: 0.8 },
    voice: { answerRate: 42.1, completionRate: 78.9, conversionRate: 24.5, callbackRate: 8.3 },
  };

  const containerContract = buildContainerContract({
    data: {
      selectedPeriod,
      periodOptions,
      overviewMetrics,
      funnelData,
      templatePerformance,
      abTestResults,
      channelPerformance,
      channelDeepDive,
    },
    uiState: {
      activeTab: 'overview',
      chartPlaceholder: 'Chart visualization would go here',
    },
    asyncState: { loading: false, saving: false, error: null },
    callbacks: {
      onPeriodChange: (period: string) => setSelectedPeriod(period),
      onFilter: () => {},
      onExport: () => {},
      onCreateAbTest: () => {},
    },
    meta: {
      title: 'Analytics & Reporting',
      subtitle: 'Track performance and optimize your collection campaigns',
    },
  });

  return <AnalyticsView {...containerContract} />;
}