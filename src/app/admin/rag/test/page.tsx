'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface Business {
  id: string;
  name: string;
}

export default function RAGTestPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses');
      const data = await res.json();
      setBusinesses(data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const handleSearch = async () => {
    if (!query || !selectedBusiness) {
      alert('Please select a business and enter a query');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          businessId: selectedBusiness,
          limit: 5,
        }),
      });

      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    'What are your office hours?',
    'Do you accept insurance?',
    'How do I book an appointment?',
    'What is your cancellation policy?',
    'Where are you located?',
  ];

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">RAG Search Test</h1>
          <p className="mt-2 text-sm text-gray-700">
            Test how the AI searches your knowledge base for relevant content
          </p>
        </div>

        {/* Search Interface */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Business
              </label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Choose a business...</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="What are your office hours?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading || !selectedBusiness || !query}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Searching...' : 'Search Knowledge Base'}
            </button>
          </div>

          {/* Example Queries */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Found {results.length} relevant result{results.length !== 1 ? 's' : ''}
            </h2>

            {results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {result.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                        {result.category}
                      </span>
                      <span className="text-sm text-gray-600">
                        Relevance: {(result.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl">
                      {result.similarity > 0.85
                        ? '🎯'
                        : result.similarity > 0.70
                        ? '✅'
                        : '📌'}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {result.content}
                  </p>
                </div>

                {/* Similarity Score Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        result.similarity > 0.85
                          ? 'bg-green-500'
                          : result.similarity > 0.70
                          ? 'bg-blue-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${result.similarity * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && selectedBusiness && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">
              No relevant content found for this query. Try rephrasing or add more content to your
              knowledge base.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
