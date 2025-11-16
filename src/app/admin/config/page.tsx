'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface ConfigItem {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean';
  description: string;
}

const CONFIG_ITEMS: ConfigItem[] = [
  {
    key: 'ai_personality',
    label: 'AI Personality',
    type: 'textarea',
    description: 'Define how the AI agent should behave and communicate',
  },
  {
    key: 'greeting_message',
    label: 'Greeting Message',
    type: 'textarea',
    description: 'The initial message when a call starts',
  },
  {
    key: 'max_call_duration',
    label: 'Max Call Duration (seconds)',
    type: 'number',
    description: 'Maximum duration for a single call',
  },
  {
    key: 'enable_recording',
    label: 'Enable Call Recording',
    type: 'boolean',
    description: 'Record all calls for quality assurance',
  },
  {
    key: 'transfer_number',
    label: 'Transfer Phone Number',
    type: 'text',
    description: 'Phone number to transfer calls if AI cannot handle',
  },
  {
    key: 'business_hours',
    label: 'Business Hours',
    type: 'textarea',
    description: 'Define operating hours (JSON format)',
  },
  {
    key: 'sentiment_analysis',
    label: 'Enable Sentiment Analysis',
    type: 'boolean',
    description: 'Analyze customer sentiment during calls',
  },
];

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState(''); // Should come from context/auth

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/config?businessId=${businessId}`);
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, configurations: config }),
      });

      if (response.ok) {
        alert('Configuration saved successfully!');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: { text: value },
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">
              AI Configuration
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Configure how your AI call center agent behaves
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {CONFIG_ITEMS.map((item) => (
            <div
              key={item.key}
              className="bg-white shadow sm:rounded-lg p-6"
            >
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-900">
                  {item.label}
                </label>
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              </div>

              {item.type === 'text' && (
                <input
                  type="text"
                  value={config[item.key]?.text || ''}
                  onChange={(e) => updateConfig(item.key, e.target.value)}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              )}

              {item.type === 'textarea' && (
                <textarea
                  value={config[item.key]?.text || ''}
                  onChange={(e) => updateConfig(item.key, e.target.value)}
                  rows={4}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              )}

              {item.type === 'number' && (
                <input
                  type="number"
                  value={config[item.key]?.text || ''}
                  onChange={(e) => updateConfig(item.key, e.target.value)}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              )}

              {item.type === 'boolean' && (
                <div className="mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config[item.key]?.text === 'true'}
                      onChange={(e) =>
                        updateConfig(item.key, e.target.checked ? 'true' : 'false')
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enabled</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Configuration changes will take effect immediately for new calls.
                Existing calls will continue with their original configuration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
