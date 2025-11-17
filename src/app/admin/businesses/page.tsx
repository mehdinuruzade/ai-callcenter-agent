'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface Business {
  id: string;
  name: string;
  domain: string;
  description?: string;
  isActive: boolean;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState<Partial<Business>>({});

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    const res = await fetch('/api/businesses');
    const data = await res.json();
    setBusinesses(data);
  };

  const handleSave = async () => {
    const method = currentBusiness.id ? 'PUT' : 'POST';
    await fetch('/api/businesses', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentBusiness),
    });
    setShowModal(false);
    setCurrentBusiness({});
    fetchBusinesses();
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <h1 className="text-2xl font-bold">Businesses</h1>
          <button
            onClick={() => { setCurrentBusiness({}); setShowModal(true); }}
            className="mt-4 sm:mt-0 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Add Business
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <div key={business.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-2">{business.name}</h3>
              <p className="text-sm text-gray-600 mb-4">Domain: {business.domain}</p>
              <button
                onClick={() => { setCurrentBusiness(business); setShowModal(true); }}
                className="w-full px-3 py-2 bg-primary-50 text-primary-700 rounded-md"
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">
                {currentBusiness.id ? 'Edit Business' : 'Add Business'}
              </h3>
              
              <input
                type="text"
                placeholder="Business Name"
                value={currentBusiness.name || ''}
                onChange={(e) => setCurrentBusiness({...currentBusiness, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-md mb-3"
              />

              <select
                value={currentBusiness.domain || ''}
                onChange={(e) => setCurrentBusiness({...currentBusiness, domain: e.target.value})}
                className="w-full px-3 py-2 border rounded-md mb-3"
              >
                <option value="">Select domain</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail</option>
                <option value="restaurant">Restaurant</option>
                <option value="finance">Finance</option>
              </select>

              <div className="flex justify-end space-x-3 mt-4">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">
                  Cancel
                </button>
                <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-md">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}