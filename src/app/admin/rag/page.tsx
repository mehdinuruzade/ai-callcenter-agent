'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface Business {
  id: string;
  name: string;
}

interface RAGContent {
  id: string;
  title: string;
  content: string;
  category: string;
  metadata?: any;
  isActive: boolean;
  createdAt: string;
}

export default function RAGPage() {
  const [contents, setContents] = useState<RAGContent[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentContent, setCurrentContent] = useState<Partial<RAGContent>>({});
  const [saving, setSaving] = useState(false);

  // Filter
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchContents();
    } else {
      setContents([]);
    }
  }, [selectedBusiness, categoryFilter]);

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

  const fetchContents = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('businessId', selectedBusiness);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/rag?${params}`);
      const data = await res.json();
      setContents(data);
    } catch (error) {
      console.error('Error fetching contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!currentContent.title?.trim()) {
      alert('Please enter a title');
      return;
    }
  
    if (!currentContent.content?.trim()) {
      alert('Please enter content');
      return;
    }
  
    if (!currentContent.category) {
      alert('Please select a category');
      return;
    }
  
    if (!selectedBusiness) {
      alert('Please select a business');
      return;
    }
  
    setSaving(true);
    
    try {
      const isUpdate = !!currentContent.id;
      const method = isUpdate ? 'PUT' : 'POST';
      
      // Build payload
      const payload = {
        title: currentContent.title.trim(),
        content: currentContent.content.trim(),
        category: currentContent.category,
        metadata: currentContent.metadata || {},
        businessId: selectedBusiness,
        ...(isUpdate && { id: currentContent.id }), // Only add id if updating
      };
  
      console.log(`${isUpdate ? 'Updating' : 'Creating'} content:`, payload);
  
      const res = await fetch('/api/rag', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${isUpdate ? 'update' : 'create'} content`);
      }
  
      alert(`Content ${isUpdate ? 'updated' : 'created'} successfully!`);
      setShowModal(false);
      setCurrentContent({});
      await fetchContents();
      
    } catch (error: any) {
      console.error('Save error:', error);
      alert(error.message || 'Failed to save content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const res = await fetch(`/api/rag?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Content deleted successfully!');
        fetchContents();
      } else {
        alert('Failed to delete content');
      }
    } catch (error) {
      alert('Error deleting content');
    }
  };

  const categories = [
    'FAQ',
    'Product Info',
    'Policy',
    'Pricing',
    'Support',
    'Location',
    'Hours',
    'Services',
    'Booking',
    'Other',
  ];

  const activeContents = contents.filter(c => c.isActive);
  const totalCategories = new Set(contents.map(c => c.category)).size;

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="mt-2 text-sm text-gray-700">
            Add content to train your AI agent for each business
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

        {selectedBusiness && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="text-4xl mr-4">📚</div>
                  <div>
                    <p className="text-sm text-gray-600">Total Content</p>
                    <p className="text-2xl font-bold text-gray-900">{contents.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="text-4xl mr-4">✅</div>
                  <div>
                    <p className="text-sm text-gray-600">Active Content</p>
                    <p className="text-2xl font-bold text-gray-900">{activeContents.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="text-4xl mr-4">🏷️</div>
                  <div>
                    <p className="text-sm text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">{totalCategories}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Add Button */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setCurrentContent({ isActive: true });
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap"
                >
                  + Add Content
                </button>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                ))
              ) : contents.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No content yet for {businesses.find(b => b.id === selectedBusiness)?.name}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add your first piece of knowledge to train the AI agent for this business
                  </p>
                  <button
                    onClick={() => {
                      setCurrentContent({ isActive: true });
                      setShowModal(true);
                    }}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Add First Content
                  </button>
                </div>
              ) : (
                contents.map((content) => (
                  <div
                    key={content.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {content.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                              {content.category}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            content.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {content.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {content.content}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCurrentContent(content);
                            setShowModal(true);
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {!selectedBusiness && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select a business to manage knowledge base
            </h3>
            <p className="text-gray-600">
              Choose a business from the dropdown above to view and manage its AI training content
            </p>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentContent.id ? 'Edit Content' : 'Add New Content'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  For: {businesses.find(b => b.id === selectedBusiness)?.name}
                </p>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentContent.title || ''}
                    onChange={(e) =>
                      setCurrentContent({ ...currentContent, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Office Hours"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentContent.category || ''}
                    onChange={(e) =>
                      setCurrentContent({ ...currentContent, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={currentContent.content || ''}
                    onChange={(e) =>
                      setCurrentContent({ ...currentContent, content: e.target.value })
                    }
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter the information that the AI should know..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This content will be used to answer customer questions for this business. Be
                    clear and specific.
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentContent.isActive ?? true}
                    onChange={(e) =>
                      setCurrentContent({ ...currentContent, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-900">Active</label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setCurrentContent({});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
