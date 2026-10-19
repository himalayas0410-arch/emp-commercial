import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { History, ShieldAlert, CheckCircle, Clock, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export const EmergencyHistoryView: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emergency/history/me');
      setIncidents(res.incidents || []);
    } catch (err) {
      console.error('Failed to load incident history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Emergency Incident Log...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} style={{ color: 'var(--red-600)' }} />
            <span>Emergency History & Incident Audit Trail</span>
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Every time your emergency QR code is scanned and an alert is raised, it is cryptographically logged here.
          </p>
        </div>

        <button onClick={fetchHistory} className="emp-btn emp-btn-outline emp-btn-sm">
          <RefreshCw size={14} />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      {/* Incident List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {incidents.length > 0 ? (
          incidents.map((inc: any) => (
            <div
              key={inc.id}
              className="emp-card"
              style={{
                borderLeft: inc.status === 'triggered' ? '4px solid var(--red-600)' : '4px solid var(--emerald-600)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                      {inc.incident_code}
                    </span>
                    <StatusBadge status={inc.status} size="sm" />
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> Triggered: {new Date(inc.triggered_at).toLocaleString()}
                    </span>
                    {inc.location_address && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} style={{ color: 'var(--red-600)' }} /> {inc.location_address}
                      </span>
                    )}
                    {inc.acknowledged_by && (
                      <span style={{ color: 'var(--teal-700)', fontWeight: 600 }}>
                        ✓ Acknowledged by: {inc.acknowledged_by}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery logs */}
              {inc.deliveries && inc.deliveries.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Broadcast Delivery Receipts ({inc.deliveries.length} channels dispatched):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {inc.deliveries.map((del: any) => (
                      <span
                        key={del.id}
                        style={{
                          background: 'var(--bg-subtle)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          color: del.status === 'delivered' || del.status === 'sent' ? 'var(--emerald-700)' : 'var(--text-secondary)'
                        }}
                      >
                        <strong>{del.channel.toUpperCase()}:</strong> {del.recipient_name} ({del.status})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="emp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <CheckCircle size={44} style={{ color: 'var(--emerald-600)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>No Incidents on Record</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
              Your emergency profile is completely safe. Any emergency alerts triggered by bystanders or paramedics will appear here in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
