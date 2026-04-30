import React from 'react';
import { Card } from './Card';
import type { DashboardResponse } from '../types';

interface LenderDashboardProps {
  dashboard: DashboardResponse | null;
  refreshing: boolean;
  onRefresh: () => void;
  userName: string;
}

export function LenderDashboard({ dashboard, refreshing, onRefresh, userName }: LenderDashboardProps) {
  const handleRefresh = () => {
    onRefresh();
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px' }}>
        <span style={{ backgroundColor: '#007bff', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
          Lender Dashboard
        </span>
        <h1 style={{ fontSize: '24px', margin: '10px 0', color: '#333' }}>
          {dashboard?.headline ?? `Welcome back, ${userName}`}
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          {dashboard?.summary ?? "Your lender dashboard is connected. Click refresh to update live platform data from the backend."}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {(dashboard?.metrics ?? []).map((metric) => (
          <Card key={metric.label}>
            <div>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>{metric.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' }}>{metric.value}</p>
              <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>{metric.helper}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#333' }}>
          {dashboard?.primaryListTitle ?? "Portfolio overview"}
        </h2>
        {(dashboard?.primaryList ?? []).length > 0 ? (
          dashboard?.primaryList.map((item) => (
            <div key={item.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#333' }}>{item.title}</p>
                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>{item.subtitle}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 4px 0' }}>{item.meta}</p>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: item.status === 'active' ? '#d4edda' : '#f8d7da',
                  color: item.status === 'active' ? '#155724' : '#721c24'
                }}>
                  {item.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic' }}>
            No lender portfolio records are available yet.
          </p>
        )}
      </Card>

      <Card>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#333' }}>
          {dashboard?.secondaryListTitle ?? "Borrower relationships"}
        </h2>
        {(dashboard?.secondaryList ?? []).length > 0 ? (
          dashboard?.secondaryList.map((item) => (
            <div key={item.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#333' }}>{item.title}</p>
                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>{item.subtitle}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 4px 0' }}>{item.meta}</p>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: item.status === 'active' ? '#d4edda' : '#f8d7da',
                  color: item.status === 'active' ? '#155724' : '#721c24'
                }}>
                  {item.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic' }}>
            No borrower relationship records are available yet.
          </p>
        )}
      </Card>

      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: refreshing ? 'not-allowed' : 'pointer',
          opacity: refreshing ? 0.6 : 1,
        }}
      >
        {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
      </button>
    </div>
  );
}