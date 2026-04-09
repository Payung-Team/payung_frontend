import React from 'react';
import Avatar from './Avatar';
import Skeleton from './Skeleton';
import { Icon } from './Icon';

interface ProfileCardProps {
  user?: {
    displayName?: string;
    email: string;
    phone?: string;
    address?: string;
    bio?: string;
    avatarUrl?: string;
    role: number;
  };
  loading?: boolean;
  onEditProfile?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, loading, onEditProfile }) => {

  const getRoleLabel = (role: number) => {
    const roles: Record<number, string> = {
      1: 'ผู้สูงอายุ',
      2: 'ผู้ดูแล',
      3: 'ผู้ดูแลระบบ',
    };
    return roles[role] || role;
  };

  if (loading || !user) {
    return (
      <aside className="bg-white rounded-3xl px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] md:sticky md:top-24">
        <div className="text-center mb-5">
          <Skeleton circle width={76} height={76} className="mx-auto mb-3" />
          <Skeleton width={120} height={17} className="mx-auto mb-1.5" />
          <Skeleton width={160} height={12} className="mx-auto mb-3" />
          <Skeleton width={90} height={24} borderRadius={16} className="mx-auto" />
        </div>
        <div className="grid grid-cols-3 gap-1 my-[18px] py-3.5 border-y border-[#F0F1F3]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="text-center">
              <Skeleton width={36} height={18} className="mx-auto mb-1" />
              <Skeleton width={44} height={10} className="mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton height={40} className="mt-3.5" />
      </aside>
    );
  }

  return (
    <aside className="bg-white rounded-3xl px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] md:sticky md:top-24">
      <div className="text-center mb-5 group">
        <Avatar
          src={user.avatarUrl}
          name={user.displayName || user.email}
          size={76}
          className="mx-auto mb-3 transition-transform duration-200 cursor-pointer group-hover:scale-105"
          showStatus={true}
          gradient="linear-gradient(135deg,#76C893,#3A9A7E)"
        />
        <div className="text-[17px] font-bold text-[#1A1A1A] mb-0.5 group-hover:text-[#52B69A] transition-colors">
          {user.displayName || 'ผู้ใช้แอป Payung'}
        </div>
        <div className="text-xs text-[#8A8C8E] mb-3">{user.email}</div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-[#E6F5ED] text-[#3A9A7E]">
          <Icon name="person" size="small" color="currentColor" />
          {getRoleLabel(user.role)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 my-[18px] py-3.5 border-y border-[#F0F1F3]">
        {[
          { val: '12', lbl: 'นัดหมาย' },
          { val: '3', lbl: 'ผู้ดูแล' },
          { val: '4.8', lbl: 'คะแนน' },
        ].map((s) => (
          <div key={s.lbl} className="text-center">
            <div className="text-[18px] font-bold text-[#1A1A1A]">{s.val}</div>
            <div className="text-[10px] font-medium text-[#8A8C8E] mt-px">{s.lbl}</div>
          </div>
        ))}
      </div>

      <button 
        className="w-full h-10 border border-[#E0E2E5] rounded-lg bg-white text-[13px] font-semibold text-[#575859] flex items-center justify-center gap-1.5 mt-3.5 cursor-pointer transition-all duration-200 hover:border-[#52B69A] hover:text-[#52B69A] hover:bg-[#F0FAF4]"
        onClick={onEditProfile}
      >
        <Icon name="edit" size="small" color="currentColor" />
        แก้ไขโปรไฟล์
      </button>
    </aside>
  );
};

export default ProfileCard;
