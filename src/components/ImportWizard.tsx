import React, { useState } from 'react';
import ImportWizardView from './figma-ui/ImportWizardView';
import { buildContainerContract } from './containerContracts';

interface ImportStep {
  id: number;
  title: string;
  description: string;
}

const steps: ImportStep[] = [
  { id: 1, title: 'Upload File', description: 'Select and upload your data file' },
  { id: 2, title: 'Field Mapping', description: 'Map your columns to required fields' },
  { id: 3, title: 'Validation', description: 'Review and fix any data issues' },
  { id: 4, title: 'Campaign Setup', description: 'Configure your collection sequence' }
];

export function ImportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [campaignName, setCampaignName] = useState('February Collections 2024');
  const [startDate, setStartDate] = useState('');
  const [timezone, setTimezone] = useState('est');
  const [mapping, setMapping] = useState<Record<string, string>>({
    'Customer Name': 'customer_name',
    Email: 'email_address',
    Phone: 'phone_number',
    'Amount Due': 'amount_due',
    'Due Date': 'due_date',
  });

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const detectedColumns = ['customer_name', 'email_address', 'phone_number', 'amount_due', 'due_date'];
  const requiredFields = ['Customer Name', 'Email', 'Phone', 'Amount Due', 'Due Date'];
  const validationIssues = [
    { row: 15, field: 'Phone', issue: 'Invalid phone number format', value: '123-456' },
    { row: 23, field: 'Email', issue: 'Missing email address', value: '' },
    { row: 31, field: 'Amount', issue: 'Non-numeric amount', value: 'N/A' },
  ];
  const previewRows = [
    { status: 'ok', customerName: 'John Smith', email: 'john@example.com', phone: '+1234567890', amountDue: '$1,250.00', dueDate: '2024-02-15' },
    { status: 'error', customerName: 'Jane Doe', email: 'Missing', phone: '+1234567891', amountDue: '$850.00', dueDate: '2024-02-20' },
    { status: 'ok', customerName: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892', amountDue: '$2,100.00', dueDate: '2024-02-10' },
  ];
  const sequenceSteps = [
    { day: 0, channel: 'email', title: 'Initial Notice', description: 'Automated email with payment link' },
    { day: 3, channel: 'sms', title: 'SMS Reminder', description: 'Text message reminder' },
    { day: 7, channel: 'email', title: 'Follow-up Email', description: 'Automated email with payment link' },
    { day: 14, channel: 'voice', title: 'Voice Call', description: 'Automated voice call' },
    { day: 21, channel: 'email', title: 'Final Notice', description: 'Automated email with payment link' },
  ];

  const containerContract = buildContainerContract({
    data: {
      steps,
      currentStep,
      uploadProgress,
      detectedColumns,
      requiredFields,
      mapping,
      validationIssues,
      previewRows,
      campaign: { name: campaignName, startDate, timezone },
      sequenceSteps,
    },
    uiState: {
      isUploading,
      canGoPrevious: currentStep > 1,
      canGoNext: currentStep < 4,
    },
    asyncState: { loading: false, saving: false, uploading: isUploading, error: null },
    callbacks: {
      onNext: handleNext,
      onPrevious: handlePrevious,
      onUpload: simulateUpload,
      onMappingChange: (field: string, column: string) => setMapping((prev) => ({ ...prev, [field]: column })),
      onCampaignNameChange: (value: string) => setCampaignName(value),
      onStartDateChange: (value: string) => setStartDate(value),
      onTimezoneChange: (value: string) => setTimezone(value),
      onGenerateSequence: () => {},
    },
    meta: {
      title: 'Data Import Wizard',
      subtitle: 'Import your customer data and set up collection campaigns',
      totalSteps: 4,
    },
  });

  return <ImportWizardView {...containerContract} />;
}