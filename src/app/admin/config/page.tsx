'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface Business {
  id: string;
  name: string;
}

interface ConfigValue {
  value: any;
  type: string;
}

interface Configs {
  [key: string]: ConfigValue;
}

const defaultConfigs: Configs = {
  ai_personality: {
    value: 'friendly and professional',
    type: 'string',
  },
  greeting_message: {
    value: 'Hello! Thank you for calling. How can I help you today?',
    type: 'string',
  },
  max_call_duration: {
    value: 300,
    type: 'number',
  },
  enable_voicemail: {
    value: true,
    type: 'boolean',
  },
  voicemail_message: {
    value: 'Sorry we missed your call. Please leave a message and we will get back to you soon.',
    type: 'string',
  },
  transfer_number: {
    value: '',
    type: 'string',
  },
  enable_transfer: {
    value: false,
    type: 'boolean',
  },
  operating_hours_message: {
    value: 'We are currently closed. Our hours are Monday-Friday 9 AM to 5 PM.',
    type: 'string',
  },
  language: {
    value: 'en',
    type: 'string',
  },
  voice_speed: {
    value: 1.0,
    type: 'number',
  },
  conversation_style: {
    value: 'concise',
    type: 'string',
  },
};

export default function ConfigPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [configs, setConfigs] = useState<Configs>(defaultConfigs);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchConfigs();
    }
  }, [selectedBusiness]);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses');
      const data = await res.json();
      setBusinesses(data);
      if (data.length > 0) {
        setSelectedBusiness(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const fetchConfigs = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/config?businessId=${selectedBusiness}`);
      const data = await res.json();
      
      // Merge fetched configs with defaults
      const mergedConfigs = { ...defaultConfigs };
      Object.keys(data.configs).forEach((key) => {
        if (mergedConfigs[key]) {
          mergedConfigs[key].value = data.configs[key];
        }
      });
      
      setConfigs(mergedConfigs);
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBusiness) {
      alert('Please select a business');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          configs,
        }),
      });

      if (res.ok) {
        alert('Configuration saved successfully!');
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setConfigs({
      ...configs,
      [key]: {
        ...configs[key],
        value,
      },
    });
  };

  const configSections = [
    {
      title: 'AI Personality',
      icon: '🤖',
      configs: ['ai_personality', 'conversation_style', 'language'],
    },
    {
      title: 'Greeting & Messages',
      icon: '💬',
      configs: ['greeting_message', 'operating_hours_message', 'voicemail_message'],
    },
    {
      title: 'Call Settings',
      icon: '📞',
      configs: ['max_call_duration', 'enable_voicemail', 'voice_speed'],
    },
    {
      title: 'Transfer Settings',
      icon: '↪️',
      configs: ['enable_transfer', 'transfer_number'],
    },
  ];

  const renderConfigInput = (key: string, config: ConfigValue) => {
    const labels: { [key: string]: string } = {
      ai_personality: 'AI Personality',
      greeting_message: 'Greeting Message',
      max_call_duration: 'Max Call Duration (seconds)',
      enable_voicemail: 'Enable Voicemail',
      voicemail_message: 'Voicemail Message',
      transfer_number: 'Transfer Phone Number',
      enable_transfer: 'Enable Call Transfer',
      operating_hours_message: 'After Hours Message',
      language: 'Language',
      voice_speed: 'Voice Speed (0.5 - 2.0)',
      conversation_style: 'Conversation Style',
    };

    const placeholders: { [key: string]: string } = {
      ai_personality: 'e.g., friendly and professional',
      greeting_message: 'What should the AI say when answering?',
      transfer_number: '+1234567890',
      conversation_style: 'concise, detailed, or casual',
    };

    switch (config.type) {
      case 'boolean':
        return (
          <div key={key} className="flex items-center justify-between py-3">
            <label className="text-sm font-medium text-gray-700">
              {labels[key] || key}
            </label>
            <input
              type="checkbox"
              checked={config.value}
              onChange={(e) => updateConfig(key, e.target.checked)}
              className="h-4 w-4 text-primary-600 rounded"
            />
          </div>
        );

      case 'number':
        return (
          <div key={key} className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {labels[key] || key}
            </label>
            <input
              type="number"
              value={config.value}
              onChange={(e) => updateConfig(key, parseFloat(e.target.value))}
              step={key === 'voice_speed' ? '0.1' : '1'}
              min={key === 'voice_speed' ? '0.5' : '0'}
              max={key === 'voice_speed' ? '2.0' : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        );

      case 'string':
        if (key.includes('message') || key === 'ai_personality') {
          return (
            <div key={key} className="py-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {labels[key] || key}
              </label>
              <textarea
                value={config.value}
                onChange={(e) => updateConfig(key, e.target.value)}
                rows={3}
                placeholder={placeholders[key]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          );
        }

        return (
          <div key={key} className="py-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {labels[key] || key}
            </label>
            <input
              type="text"
              value={config.value}
              onChange={(e) => updateConfig(key, e.target.value)}
              placeholder={placeholders[key]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Configuration</h1>
          <p className="mt-2 text-sm text-gray-700">
            Customize your AI agent's behavior and responses
          </p>
        </div>

        {/* Business Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Business
          </label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Choose a business...</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        {/* Configuration Sections */}
        {selectedBusiness && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {configSections.map((section) => (
                  <div key={section.title} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        <span className="mr-2">{section.icon}</span>
                        {section.title}
                      </h2>
                    </div>
                    <div className="px-6 divide-y divide-gray-200">
                      {section.configs.map((key) =>
                        configs[key] ? renderConfigInput(key, configs[key]) : null
                      )}
                    </div>
                  </div>
                ))}

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedBusiness && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select a business to configure
            </h3>
            <p className="text-gray-600">
              Choose a business from the dropdown above to customize its AI settings
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
