import React, { useState } from 'react';
import SettingsView from './figma-ui/SettingsView';
import { buildContainerContract } from './containerContracts';

export function Settings() {
  const [activeTab, setActiveTab] = useState('channels');

  const tabs = [
    { id: 'channels', label: 'Channels' },
    { id: 'organization', label: 'Organization' },
    { id: 'security', label: 'Security' },
    { id: 'api', label: 'API Keys' },
  ];

  const containerContract = buildContainerContract({
    data: {
      tabs,
      panels: {
        channels: { component: 'ChannelsTab' },
        organization: { component: 'OrganizationTab' },
        security: { component: 'SecurityTab' },
        api: { component: 'ApiKeysTab' },
      },
    },
    uiState: { activeTab },
    asyncState: { loading: false, saving: false, error: null },
    callbacks: {
      onTabChange: (tab: string) => setActiveTab(tab),
    },
    meta: {
      title: 'Settings',
      subtitle: 'Configure your account and system preferences',
    },
  });

  return <SettingsView {...containerContract} />;
}