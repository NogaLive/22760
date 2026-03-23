import React from 'react';

export const DashboardKpiSkeleton = () => (
  <div className="dashboard-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', display: 'grid' }}>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="card p-4">
        <div className="skeleton skeleton-text w-1/3 mb-2"></div>
        <div className="skeleton skeleton-title w-1/2 mb-0"></div>
      </div>
    ))}
  </div>
);

export const DashboardChartSkeleton = () => (
  <div className="dashboard-grid">
    <div className="card p-6" style={{ height: '400px' }}>
      <div className="flex justify-between items-center mb-6">
        <div className="skeleton skeleton-title w-1/3 mb-0"></div>
        <div className="skeleton skeleton-text w-20"></div>
      </div>
      <div className="skeleton skeleton-chart" style={{ height: '280px' }}></div>
    </div>
    <div className="card p-6" style={{ height: '400px' }}>
      <div className="skeleton skeleton-title w-1/3 mb-6"></div>
      <div className="flex justify-center items-center h-full">
        <div className="skeleton" style={{ width: '220px', height: '220px', borderRadius: '50%' }}></div>
      </div>
    </div>
  </div>
);

export const RiesgoDesercionSkeleton = () => (
  <div className="card p-6 mb-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="skeleton rounded-full" style={{ width: '40px', height: '40px' }}></div>
      <div className="skeleton skeleton-title w-1/4 mb-0"></div>
    </div>
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="flex justify-between items-center p-4 border border-gray-50 rounded-xl">
          <div className="space-y-2 w-1/2">
            <div className="skeleton skeleton-text w-3/4"></div>
            <div className="skeleton skeleton-text w-1/2"></div>
          </div>
          <div className="skeleton skeleton-text w-20"></div>
        </div>
      ))}
    </div>
  </div>
);
