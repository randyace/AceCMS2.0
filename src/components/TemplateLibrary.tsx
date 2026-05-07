import React, { useState } from 'react';
import TemplateLibraryView from './figma-ui/TemplateLibraryView';
import { buildContainerContract } from './containerContracts';

const templateCategories = ['All', 'Friendly', 'Firm', 'Final Notice', 'Custom'];

const templates = [
  {
    id: 1,
    name: 'Friendly Reminder',
    category: 'Friendly',
    channel: 'email',
    usage: 156,
    effectiveness: '12.5%',
    thumbnail: 'email-friendly.png'
  },
  {
    id: 2,
    name: 'Payment Due SMS',
    category: 'Firm',
    channel: 'sms',
    usage: 89,
    effectiveness: '8.2%',
    thumbnail: 'sms-firm.png'
  },
  {
    id: 3,
    name: 'Final Notice Call',
    category: 'Final Notice',
    channel: 'voice',
    usage: 45,
    effectiveness: '15.7%',
    thumbnail: 'voice-final.png'
  },
  {
    id: 4,
    name: 'Custom Follow-up',
    category: 'Custom',
    channel: 'email',
    usage: 23,
    effectiveness: '9.8%',
    thumbnail: 'email-custom.png'
  }
];

export function TemplateLibrary() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('email');
  const [templateContent, setTemplateContent] = useState(
    'Dear {{First Name}},\n\nWe hope this message finds you well. We wanted to remind you that your payment of {{Amount}} was due on {{Due Date}}.\n\nPlease click the link below to make your payment:\n{{Payment Link}}\n\nIf you have any questions, please do not hesitate to contact us.\n\nBest regards,\nCollections Team',
  );

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-700';
      case 'sms': return 'bg-green-100 text-green-700';
      case 'voice': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const channels = [
    { id: 'email', name: 'Email' },
    { id: 'sms', name: 'SMS' },
    { id: 'voice', name: 'Voice' },
  ];
  const tokens = ['{{First Name}}', '{{Last Name}}', '{{Company}}', '{{Amount}}', '{{Due Date}}', '{{Days Overdue}}', '{{Payment Link}}', '{{Phone}}'];
  const renderedPreview = templateContent.replace(/\{\{([^}]+)\}\}/g, (_match, token) => {
    const examples: Record<string, string> = {
      'First Name': 'John',
      'Last Name': 'Doe',
      Company: 'Acme Corp',
      Amount: '$1,250.00',
      'Due Date': 'February 15, 2024',
      'Days Overdue': '5',
      'Payment Link': 'https://pay.example.com/abc123',
      Phone: '+1 (555) 123-4567',
    };
    return examples[token] || `[${token}]`;
  });

  const containerContract = buildContainerContract({
    data: {
      templateCategories,
      templates,
      filteredTemplates: filteredTemplates.map((template) => ({ ...template, channelColor: getChannelColor(template.channel) })),
      channels,
      tokens,
      editor: {
        selectedChannel,
        templateContent,
        renderedPreview,
      },
    },
    uiState: {
      selectedCategory,
      searchTerm,
      showEditor,
      isEmptyResult: filteredTemplates.length === 0,
    },
    asyncState: { loading: false, saving: false, error: null },
    callbacks: {
      onCategoryChange: (category: string) => setSelectedCategory(category),
      onSearchTermChange: (value: string) => setSearchTerm(value),
      onOpenEditor: () => setShowEditor(true),
      onCloseEditor: () => setShowEditor(false),
      onSelectChannel: (channel: string) => setSelectedChannel(channel),
      onTemplateContentChange: (value: string) => setTemplateContent(value),
      onInsertToken: (token: string) => setTemplateContent((prev) => prev + token),
      onSaveTemplate: () => {},
    },
    meta: {
      title: showEditor ? 'Template Editor' : 'Template Library',
      subtitle: 'Create and manage your collection message templates',
    },
  });

  return <TemplateLibraryView {...containerContract} />;
}