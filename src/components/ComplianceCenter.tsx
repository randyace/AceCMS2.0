import React, { useState } from 'react';
import ComplianceCenterView from './figma-ui/ComplianceCenterView';
import { buildContainerContract } from './containerContracts';

export function ComplianceCenter() {
  const [activeTab, setActiveTab] = useState('optout');
  const [searchTerm, setSearchTerm] = useState('');
  const [optOutTypeFilter, setOptOutTypeFilter] = useState('All Types');
  const [newOptOutContact, setNewOptOutContact] = useState('');
  const [newOptOutType, setNewOptOutType] = useState('Email');
  const [checkerContact, setCheckerContact] = useState('');
  const [checkerMessageType, setCheckerMessageType] = useState('Collection Email');

  const optOutList = [
    { id: 1, contact: 'john@example.com', type: 'Email', date: '2024-01-15', reason: 'User request' },
    { id: 2, contact: '+1234567890', type: 'SMS', date: '2024-01-14', reason: 'Auto opt-out' },
    { id: 3, contact: 'jane@company.com', type: 'Email', date: '2024-01-12', reason: 'Bounce back' },
    { id: 4, contact: '+1234567891', type: 'SMS', date: '2024-01-10', reason: 'User request' }
  ];

  const consentStatus = [
    { customer: 'Acme Corp', email: 'consent', sms: 'consent', voice: 'no-consent', lastUpdated: '2024-01-15' },
    { customer: 'Smith LLC', email: 'consent', sms: 'no-consent', voice: 'consent', lastUpdated: '2024-01-14' },
    { customer: 'Johnson Inc', email: 'no-consent', sms: 'consent', voice: 'consent', lastUpdated: '2024-01-12' },
    { customer: 'Wilson Co', email: 'consent', sms: 'consent', voice: 'pending', lastUpdated: '2024-01-10' }
  ];

  const complianceChecks = [
    { rule: 'TCPA Compliance', status: 'passed', description: 'All voice calls have proper consent' },
    { rule: 'CAN-SPAM Act', status: 'passed', description: 'Email opt-out mechanisms in place' },
    { rule: 'FDCPA Guidelines', status: 'warning', description: '2 messages sent outside business hours' },
    { rule: 'State Regulations', status: 'passed', description: 'All state-specific rules followed' }
  ];

  const filteredOptOutList = optOutList.filter((item) => {
    const typeMatch = optOutTypeFilter === 'All Types' || item.type === optOutTypeFilter;
    const searchMatch = searchTerm.trim() === '' || item.contact.toLowerCase().includes(searchTerm.toLowerCase());
    return typeMatch && searchMatch;
  });
  const consentStatusWithBadgeType = consentStatus.map((item) => ({
    ...item,
    emailBadge: item.email,
    smsBadge: item.sms,
    voiceBadge: item.voice,
  }));
  const complianceChecksWithIcons = complianceChecks.map((item) => ({
    ...item,
    icon: item.status === 'passed' ? 'check-circle' : item.status === 'warning' ? 'alert-triangle' : 'x-circle',
  }));
  const consentSummary = {
    email: { consented: 1245, noConsent: 156, pending: 23 },
    sms: { consented: 892, noConsent: 398, pending: 134 },
    voice: { consented: 567, noConsent: 654, pending: 203 },
  };

  const containerContract = buildContainerContract({
    data: {
      optOutList: filteredOptOutList,
      consentStatus: consentStatusWithBadgeType,
      complianceChecks: complianceChecksWithIcons,
      consentSummary,
      checkerResult: {
        status: 'passed',
        items: [
          'Customer has opted in for email communications',
          'Message content follows FDCPA guidelines',
          'Sending within allowed business hours',
          'Proper identification and opt-out instructions included',
        ],
      },
    },
    uiState: {
      activeTab,
      searchTerm,
      optOutTypeFilter,
      newOptOutContact,
      newOptOutType,
      checkerContact,
      checkerMessageType,
    },
    asyncState: { loading: false, saving: false, error: null },
    callbacks: {
      onTabChange: (tab: string) => setActiveTab(tab),
      onSearchTermChange: (value: string) => setSearchTerm(value),
      onOptOutTypeFilterChange: (value: string) => setOptOutTypeFilter(value),
      onImportOptOut: () => {},
      onExportOptOutCsv: () => {},
      onRemoveOptOut: (_id: number) => {},
      onNewOptOutContactChange: (value: string) => setNewOptOutContact(value),
      onNewOptOutTypeChange: (value: string) => setNewOptOutType(value),
      onAddOptOut: () => {},
      onEditConsent: (_customer: string) => {},
      onCheckerContactChange: (value: string) => setCheckerContact(value),
      onCheckerMessageTypeChange: (value: string) => setCheckerMessageType(value),
      onRunComplianceCheck: () => {},
      onDownloadComplianceReport: () => {},
    },
    meta: {
      title: 'Compliance Center',
      subtitle: 'Manage opt-outs, consent, and regulatory compliance',
    },
  });

  return <ComplianceCenterView {...containerContract} />;
}