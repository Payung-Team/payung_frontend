import { useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import FamilyGroupPage from './FamilyGroupPage';
import { createMockFamilyClient } from './demo/mockFamilyClient';
import { FONT } from './components/familyUi';

/**
 * `/family-demo` — the real dashboard running against an in-memory mock backend, with no
 * login required. Preview/dev only. Switch groups (top-right, appears with 2+ groups) to
 * see the owner view (ครอบครัววงศ์ดี) vs the member view (บ้านคุณยายสมจิตร) — the member view
 * hides every owner-only action per permission model §6.
 */
export default function FamilyGroupDemo() {
  const [client] = useState(createMockFamilyClient);
  return (
    <div className="min-h-screen bg-[#F6FAF9]" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-center gap-2 bg-[#064E3B] px-4 py-2 text-center text-[12px] font-semibold text-white">
        ตัวอย่างหน้าจัดการกลุ่ม · ข้อมูลจำลอง (ไม่ได้เชื่อมต่อเซิร์ฟเวอร์จริง)
      </div>
      <ApolloProvider client={client}>
        <FamilyGroupPage />
      </ApolloProvider>
    </div>
  );
}
