import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error('RootErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#070a14',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              backgroundColor: '#0b101e',
              border: '2px solid #f59e0b',
              borderRadius: '20px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ color: '#fbbf24', margin: '0 0 8px', fontSize: '18px' }}>
              Khôi phục dữ liệu phiên chơi
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '16px' }}>
              Phát hiện dữ liệu bộ nhớ đệm cũ không tương thích. Nhấn nút bên dưới để làm mới và vào ngay Làng Ma Sói 3D.
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('werewolf_user');
                } catch {
                  // ignore
                }
                this.setState({ hasError: false, errorMsg: '' });
              }}
              style={{
                backgroundColor: '#f59e0b',
                color: '#020617',
                fontWeight: 800,
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              Vào Làng Ma Sói 3D Ngay
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
