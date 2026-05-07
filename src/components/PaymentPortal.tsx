import React, { useState } from 'react';
import PaymentPortalView from './figma-ui/PaymentPortalView';
import { buildContainerContract } from './containerContracts';

export function PaymentPortal() {
  const [companyName, setCompanyName] = useState('CollectPro');
  const [successUrl, setSuccessUrl] = useState('');
  const [failureUrl, setFailureUrl] = useState('');
  const [testAmount, setTestAmount] = useState('$100.00');
  const [testEmail, setTestEmail] = useState('test@example.com');

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', enabled: true, icon: 'credit-card', description: 'Visa, Mastercard, American Express' },
    { id: 'ach', name: 'Bank Transfer (ACH)', enabled: true, icon: 'building-2', description: 'Direct bank transfers' },
  ];

  const recentPayments = [
    { id: 1, customer: 'Acme Corp', amount: '$2,450.00', method: 'Card', status: 'completed', date: '2 hours ago' },
    { id: 2, customer: 'Smith LLC', amount: '$1,250.00', method: 'ACH', status: 'pending', date: '5 hours ago' },
    { id: 3, customer: 'Johnson Inc', amount: '$875.00', method: 'Card', status: 'completed', date: '1 day ago' },
    { id: 4, customer: 'Wilson Co', amount: '$3,200.00', method: 'ACH', status: 'failed', date: '2 days ago' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const recentPaymentsWithUi = recentPayments.map((payment) => ({
    ...payment,
    statusColor: getStatusColor(payment.status),
    statusIcon: payment.status === 'completed' ? 'check-circle' : payment.status === 'pending' ? 'clock' : 'alert-circle',
  }));

  const containerContract = buildContainerContract({
    data: {
      paymentMethods,
      recentPayments: recentPaymentsWithUi,
      settings: { companyName, successUrl, failureUrl },
      testPayment: { amount: testAmount, email: testEmail },
      portalPreview: {
        companyName,
        invoiceId: '12345',
        amount: '$1,250.00',
        dueDate: 'February 15, 2024',
      },
    },
    uiState: {},
    asyncState: { loading: false, saving: false, error: null },
    callbacks: {
      onPreviewPortal: () => {},
      onCompanyNameChange: (value: string) => setCompanyName(value),
      onSuccessUrlChange: (value: string) => setSuccessUrl(value),
      onFailureUrlChange: (value: string) => setFailureUrl(value),
      onTogglePaymentMethod: (methodId: string) => {},
      onTestAmountChange: (value: string) => setTestAmount(value),
      onTestEmailChange: (value: string) => setTestEmail(value),
      onGenerateTestPaymentLink: () => {},
      onExportPayments: () => {},
    },
    meta: {
      title: 'Payment Portal',
      subtitle: 'Configure payment methods and manage transactions',
    },
  });

  return <PaymentPortalView {...containerContract} />;
}