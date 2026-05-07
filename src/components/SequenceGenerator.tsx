import React, { useState } from 'react';
import SequenceGeneratorView from './figma-ui/SequenceGeneratorView';
import { buildContainerContract } from './containerContracts';

export function SequenceGenerator() {
  const [sequenceSteps, setSequenceSteps] = useState([
    { id: 1, channel: 'email', delay: 0, template: 'Initial Notice', active: true },
    { id: 2, channel: 'sms', delay: 3, template: 'SMS Reminder', active: true },
    { id: 3, channel: 'email', delay: 7, template: 'Follow-up Email', active: true },
    { id: 4, channel: 'voice', delay: 14, template: 'Voice Call', active: true },
    { id: 5, channel: 'email', delay: 21, template: 'Final Notice', active: true }
  ]);

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-500';
      case 'sms': return 'bg-green-500';
      case 'voice': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const stepsWithUi = sequenceSteps.map((step, index) => ({
    ...step,
    order: index + 1,
    channelColor: getChannelColor(step.channel),
    channelIcon: step.channel,
    description:
      step.channel === 'email'
        ? 'Automated email with payment link and personalized message'
        : step.channel === 'sms'
          ? 'Text message reminder with short, actionable content'
          : 'Automated voice call with interactive options',
  }));
  const channelMix = { email: 60, sms: 20, voice: 20 };
  const prediction = { openRate: 68, responseRate: 12, collectionRate: 45, avgDaysToPayment: 8.5 };
  const exitCriteria = { paymentReceived: true, customerReply: true, manualStop: true };

  const containerContract = buildContainerContract({
    data: { sequenceSteps: stepsWithUi, channelMix, prediction, exitCriteria },
    uiState: { aiRecommended: true },
    asyncState: { loading: false, saving: false, error: null },
    callbacks: {
      onOptimize: () => {},
      onSaveSequence: () => {},
      onAddStep: (_afterId?: number) => {},
      onRemoveStep: (id: number) => setSequenceSteps((prev) => prev.filter((step) => step.id !== id)),
      onConfigureStep: (_id: number) => {},
      onToggleExitCriteria: (_key: string, _value: boolean) => {},
      onConfigureTiming: () => {},
      onApplyQuickTemplate: (_template: string) => {},
    },
    meta: {
      title: 'Sequence Generator',
      subtitle: 'Create automated multi-channel collection sequences',
    },
  });

  return <SequenceGeneratorView {...containerContract} />;
}