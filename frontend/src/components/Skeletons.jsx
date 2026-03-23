import React from 'react';

export const DashboardKpiSkeleton = () => (
  <div className="dashboard-grid mb-6">
    {[1].map((i) => (
      <div key={i} className="card">
        <div className="skeleton skeleton-text w-1/2 mb-2"></div>
        <div className="skeleton skeleton-title w-1/4"></div>
      </div>
    ))}
  </div>
);

export const DashboardChartSkeleton = () => (
  <div className="dashboard-grid">
    <div className="card" style={{ height: '470px' }}>
      <div className="flex justify-between items-center mb-6">
        <div className="skeleton skeleton-title mb-0"></div>
        <div className="skeleton skeleton-text w-24"></div>
      </div>
      <div className="skeleton skeleton-chart"></div>
    </div>
    <div className="card" style={{ height: '470px' }}>
      <div className="skeleton skeleton-title mb-6"></div>
      <div className="skeleton skeleton-chart" style={{ borderRadius: '50%' }}></div>
    </div>
  </div>
);

export const RiesgoDesercionSkeleton = () => (
  <div className="card mb-6">
    <div className="flex items-center gap-2 mb-4">
      <div className="skeleton skeleton-text w-8 h-8 rounded-full"></div>
      <div className="skeleton skeleton-title mb-0 w-1/4"></div>
    </div>
    <div className="flex flex-col gap-3">
      {[1].map((i) => (
        <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
          <div className="w-1/2">
            <div className="skeleton skeleton-text mb-2"></div>
            <div className="skeleton skeleton-text w-2/3"></div>
          </div>
          <div className="skeleton skeleton-text w-24"></div>
        </div>
      ))}
    </div>
  </div>
);
