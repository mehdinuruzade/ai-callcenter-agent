'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface Business {
  id: string;
  name: string;
}

interface AIConfig {
  // Basic Settings
  ai_personality: string;
  greeting_message: string;
  instructions: string;
  
  // Voice Settings
  ai_voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  
  // Model Parameters
  temperature: number;
  max_tokens: number;
  
  // Turn Detection
  turn_detection_type: 'server_vad' | 'none';
  vad_threshold: number;
  vad_prefix_padding_ms: number;
  vad_silence_duration_ms: number;
  
  // Advanced
  enable_function_calls: boolean;
  enable_transcription: boolean;
  transcription_model: string;
}

const defaultConfig: AIConfig = {
  ai_personality: 'You are a helpful and professional customer service agent. Be friendly, concise, and efficient in your responses.',
  greeting_message: 'Hello! Thank you for calling. How can I assist you today?',
  instructions: 'Always be polite and professional. If you need information from the knowledge base, use the query_knowledge_base function.',
  ai_voice: 'alloy',
  temperature: 0.8,
  max_tokens: 4096,
  turn_detection_type: 'server_vad',
  vad_threshold: 0.5,
  vad_prefix_padding_ms: 300,
  vad_silence_duration_ms: 500,
  enable_function_calls: true,
  enable_transcription: true,
  transcription_model: 'whisper-1',
};

export default function AIConfigPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchConfig();
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

  const fetchConfig = async () => {
    if (!selectedBusiness) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/ai-config?businessId=${selectedBusiness}`);
      const data = await res.json();

      if (data.config) {
        setConfig({ ...defaultConfig, ...data.config });
      } else {
        setConfig(defaultConfig);
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching config:', error);
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
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          config,
        }),
      });

      if (res.ok) {
        alert('AI configuration saved successfully!');
        setHasChanges(false);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default settings?')) {
      setConfig(defaultConfig);
      setHasChanges(true);
    }
  };

  const updateConfig = (key: keyof AIConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const voices = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British Male)' },
    { value: 'onyx', label: 'Onyx (Deep Male)' },
    { value: 'nova', label: 'Nova (Female)' },
    { value: 'shimmer', label: 'Shimmer (Female)' },
  ];

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Agent Configuration</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure how your AI agent behaves and responds to customers
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

        {selectedBusiness && !loading && (
          <>
            {/* Save Banner */}
            {hasChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-yellow-800 font-medium">
                    ⚠️ You have unsaved changes
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchConfig()}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Configuration Sections */}
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">🎭 Basic Settings</h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* AI Personality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Personality / System Prompt
                    </label>
                    <textarea
                      value={config.ai_personality}
                      onChange={(e) => updateConfig('ai_personality', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Define how your AI agent should behave..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This is the system prompt that defines your AI agent's personality and behavior
                    </p>
                  </div>

                  {/* Greeting Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Greeting Message
                    </label>
                    <input
                      type="text"
                      value={config.greeting_message}
                      onChange={(e) => updateConfig('greeting_message', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Hello! How can I help you today?"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      The first message customers hear when they call
                    </p>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Instructions
                    </label>
                    <textarea
                      value={config.instructions}
                      onChange={(e) => updateConfig('instructions', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Add specific instructions for handling calls..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Additional guidelines for how the AI should handle conversations
                    </p>
                  </div>
                </div>
              </div>

              {/* Voice Settings */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">🎤 Voice Settings</h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Voice Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Voice
                    </label>
                    <select
                      value={config.ai_voice}
                      onChange={(e) => updateConfig('ai_voice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {voices.map((voice) => (
                        <option key={voice.value} value={voice.value}>
                          {voice.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Choose the voice personality for your AI agent
                    </p>
                  </div>

                  {/* Preview Voice */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">
                          Voice Preview
                        </p>
                        <p className="text-xs text-purple-700 mt-1">
                          Selected: {voices.find(v => v.value === config.ai_voice)?.label}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          alert('Voice preview would play a sample here');
                        }}
                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        🔊 Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Parameters */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">⚙️ Model Parameters</h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Temperature
                      </label>
                      <span className="text-sm font-semibold text-primary-600">
                        {config.temperature}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 (Focused)</span>
                      <span>0.5 (Balanced)</span>
                      <span>1 (Creative)</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Controls randomness: 0 is focused and deterministic, 1 is creative and varied
                    </p>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Response Tokens
                    </label>
                    <input
                      type="number"
                      min="256"
                      max="4096"
                      step="256"
                      value={config.max_tokens}
                      onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum length of AI responses (256-4096). Higher values allow longer responses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Turn Detection (VAD) */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">🎙️ Voice Activity Detection</h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Enable VAD */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Turn Detection Type
                    </label>
                    <select
                      value={config.turn_detection_type}
                      onChange={(e) => updateConfig('turn_detection_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="server_vad">Server VAD (Recommended)</option>
                      <option value="none">None (Manual)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Server VAD automatically detects when the user stops speaking
                    </p>
                  </div>

                  {config.turn_detection_type === 'server_vad' && (
                    <>
                      {/* VAD Threshold */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Detection Threshold
                          </label>
                          <span className="text-sm font-semibold text-primary-600">
                            {config.vad_threshold}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={config.vad_threshold}
                          onChange={(e) => updateConfig('vad_threshold', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Sensitivity for detecting speech (0.5 is recommended)
                        </p>
                      </div>

                      {/* Prefix Padding */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prefix Padding (ms)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          step="100"
                          value={config.vad_prefix_padding_ms}
                          onChange={(e) => updateConfig('vad_prefix_padding_ms', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Audio included before speech starts (300ms recommended)
                        </p>
                      </div>

                      {/* Silence Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Silence Duration (ms)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="2000"
                          step="100"
                          value={config.vad_silence_duration_ms}
                          onChange={(e) => updateConfig('vad_silence_duration_ms', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          How long to wait for silence before ending turn (500ms recommended)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Advanced Features */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">🔧 Advanced Features</h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Function Calls */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={config.enable_function_calls}
                        onChange={(e) => updateConfig('enable_function_calls', e.target.checked)}
                        className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label className="text-sm font-medium text-gray-700">
                        Enable Knowledge Base Access
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Allow AI to query the knowledge base for accurate information
                      </p>
                    </div>
                  </div>

                  {/* Transcription */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={config.enable_transcription}
                        onChange={(e) => updateConfig('enable_transcription', e.target.checked)}
                        className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label className="text-sm font-medium text-gray-700">
                        Enable Call Transcription
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Save full conversation transcripts for review
                      </p>
                    </div>
                  </div>

                  {config.enable_transcription && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transcription Model
                      </label>
                      <select
                        value={config.transcription_model}
                        onChange={(e) => updateConfig('transcription_model', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="whisper-1">Whisper v1</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">👁️ Configuration Preview</h2>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-white text-sm underline hover:no-underline"
                  >
                    {showPreview ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showPreview && (
                  <div className="p-6">
                    <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
{JSON.stringify(config, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reset to Default
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}

        {!selectedBusiness && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select a business to configure AI agent
            </h3>
            <p className="text-gray-600">
              Choose a business from the dropdown above to customize its AI behavior
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}