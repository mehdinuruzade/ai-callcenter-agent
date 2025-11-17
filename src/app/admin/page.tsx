'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalCalls: 0,
    todayCalls: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/businesses');
      const businesses = await res.json();
      setStats({ ...stats, totalBusinesses: businesses.length || 0 });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your AI call center today.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-4xl mb-2">🏢</div>
            <p className="text-sm text-gray-600">Total Businesses</p>
            <p className="text-2xl font-bold">{stats.totalBusinesses}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-4xl mb-2">📞</div>
            <p className="text-sm text-gray-600">Total Calls</p>
            <p className="text-2xl font-bold">{stats.totalCalls}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm text-gray-600">Today's Calls</p>
            <p className="text-2xl font-bold">{stats.todayCalls}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <a href="/admin/businesses" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg">
            <div className="text-4xl mb-2">🏢</div>
            <h3 className="text-lg font-semibold">Manage Businesses</h3>
            <p className="mt-2 text-sm text-gray-600">Create and configure your business accounts</p>
          </a>

          <a href="/admin/rag" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg">
            <div className="text-4xl mb-2">📚</div>
            <h3 className="text-lg font-semibold">Knowledge Base</h3>
            <p className="mt-2 text-sm text-gray-600">Add content for your AI agent</p>
          </a>

          <a href="/admin/config" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg">
            <div className="text-4xl mb-2">⚙️</div>
            <h3 className="text-lg font-semibold">Configure AI</h3>
            <p className="mt-2 text-sm text-gray-600">Customize your AI agent's personality</p>
          </a>
        </div>
      </div>
    </AdminLayout>
  );
}