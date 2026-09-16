import React from 'react';

/**
 * ErrorBoundary — กันหน้าจอขาว
 *
 * ถ้า component ไหน throw ตอน render React จะ unmount ทั้ง tree ทิ้ง เหลือหน้าว่าง ๆ
 * ผู้ใช้ไม่รู้ว่าเกิดอะไรขึ้นและเราก็ไม่รู้ว่าพังตรงไหน → ครอบ App ไว้เพื่อแสดงข้อความ
 * พร้อมทางออก (โหลดใหม่ / กลับหน้าแรก) และ log error ไว้ดูใน console
 */
interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] หน้าพังตอน render:', error, info.componentStack);
  }

  private handleReload = () => {
    globalThis.location.reload();
  };

  private handleGoHome = () => {
    // full reload ไปหน้าแรก — router อยู่ข้างใน boundary จึงใช้ navigate ไม่ได้ตอนพัง
    globalThis.location.assign('/');
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <span className="material-icons text-[40px] text-[#E5484D]">error_outline</span>
          <h1 className="text-lg font-bold text-[#1A1A1A] mt-3"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            หน้านี้มีปัญหา
          </h1>
          <p className="text-sm text-[#8A8C8E] mt-2"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ระบบแสดงหน้านี้ไม่สำเร็จ ข้อมูลการจองของคุณยังอยู่ ลองโหลดหน้าใหม่อีกครั้ง
            ถ้ายังไม่หาย กรุณาแจ้งทีมงานพร้อมข้อความด้านล่าง
          </p>
          <p className="text-[11px] text-[#8A8C8E] bg-[#F6FAF9] border border-[#E0E2E5] rounded-lg px-3 py-2 mt-3 break-words text-left">
            {error.message || String(error)}
          </p>
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 px-4 py-2.5 bg-[#52B69A] text-white text-sm font-bold rounded-xl hover:bg-[#469e85] transition-colors cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              โหลดหน้าใหม่
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 px-4 py-2.5 border border-[#E0E2E5] text-[#575859] text-sm font-semibold rounded-xl hover:bg-[#F6FAF9] transition-colors cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
