import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  ADMIN_USER_LIST,
  INVITE_ADMIN,
  SCHEDULE_DELETE_ADMIN,
  CANCEL_SCHEDULED_DELETE,
  TOGGLE_ADMIN_STATUS,
  SUSPEND_USER,
  ACTIVATE_USER,
  UPDATE_ADMIN_USER,
} from '../../graphql/queries';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import DataTableSkeleton from '../../components/ui/DataTableSkeleton';
import FilterTabs, { type FilterTabItem } from '../../components/ui/FilterTabs';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';

// ─── Types ─────────────────────────────────────────────────────────────────

type RoleFilterKey = 'all' | 'super_admin' | 'admin' | 'caregiver' | 'patient';
type ActionType = 'none' | 'user' | 'admin';

interface UserSummary {
  id: string;
  email: string;
  displayName?: string;
  role: number;
  isActive: boolean;
  isSuspended?: boolean | null;
  scheduledDeleteAt?: string | null;
  createdAt: string;
}

interface AdminUserListResponse {
  list: {
    items: UserSummary[];
    total: number;
    page: number;
    totalPages: number;
  };
  allCount: { total: number };
  superAdminCount: { total: number };
  adminCount: { total: number };
  caregiverCount: { total: number };
  patientCount: { total: number };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const TABLE_GRID_COLUMNS = 'minmax(160px,1.5fr) minmax(180px,2fr) 140px 200px 140px minmax(190px,auto)';

const ROLE_LABELS: Record<number, { label: string; badgeClass: string; textClass: string }> = {
  1: { label: 'ผู้ใช้', badgeClass: 'bg-gray-100', textClass: 'text-gray-600' },
  2: { label: 'ผู้ดูแล', badgeClass: 'bg-[#FEF3C7]', textClass: 'text-amber-700' },
  3: { label: 'Admin', badgeClass: 'bg-[#C8DBFF]', textClass: 'text-[#4472C4]' },
  4: { label: 'Super Admin', badgeClass: 'bg-[#E8D8FF]', textClass: 'text-[#793DCD]' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function daysUntil(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function getInitial(displayName?: string, email?: string) {
  const name = displayName || email || '';
  return name.charAt(0).toUpperCase() || 'A';
}

function getActionType(viewerRole: number, targetRole: number): ActionType {
  if (targetRole >= 3) return viewerRole === 4 ? 'admin' : 'none';
  return viewerRole >= 3 ? 'user' : 'none';
}

function splitDisplayName(displayName?: string) {
  if (!displayName) return { firstName: '', lastName: '' };
  const idx = displayName.indexOf(' ');
  if (idx === -1) return { firstName: displayName, lastName: '' };
  return { firstName: displayName.slice(0, idx), lastName: displayName.slice(idx + 1) };
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function UsersTableSkeleton() {
  return (
    <DataTableSkeleton
      rows={8}
      gridTemplateColumns={TABLE_GRID_COLUMNS}
      cells={[
        {
          content: (
            <div className="flex items-center gap-3">
              <Skeleton circle width={28} height={28} />
              <Skeleton width={100} height={14} />
            </div>
          ),
        },
        { width: 140, height: 14 },
        { width: 80, height: 20, borderRadius: 999 },
        { width: 90, height: 20, borderRadius: 999 },
        { width: 80, height: 14 },
        { width: 100, height: 23, borderRadius: 6 },
      ]}
    />
  );
}

// ─── Invite Modal ──────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const INPUT_STYLE_BASE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  borderRadius: 8,
  fontFamily: 'Bai Jamjuree, sans-serif',
  fontSize: 13,
  lineHeight: '16px',
  color: '#1F2937',
  outline: 'none',
  background: '#FFFFFF',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Bai Jamjuree, sans-serif',
  fontWeight: 600,
  fontSize: 12,
  lineHeight: '18px',
  color: '#4B5563',
  marginBottom: 6,
};

function InviteAdminModal({ onClose, onSuccess }: Readonly<InviteModalProps>) {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const [inviteAdmin, { loading }] = useMutation(INVITE_ADMIN, {
    onCompleted: () => { onSuccess(); },
    onError: (err) => { setSubmitError(err.message); },
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'กรุณากรอกชื่อ';
    if (!form.lastName.trim()) errs.lastName = 'กรุณากรอกนามสกุล';
    if (!form.email.trim()) errs.email = 'กรุณากรอกอีเมล';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!form.role) errs.role = 'กรุณาเลือกบทบาท';
    return errs;
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    inviteAdmin({
      variables: {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: Number.parseInt(form.role, 10),
      },
    });
  }

  return (
    <dialog open className="fixed inset-0 z-50 m-0 flex h-screen w-screen max-w-none items-center justify-center p-0 bg-black/40 backdrop-blur-sm">
      <button type="button" aria-label="ปิด" className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.12)',
          padding: '28px 28px 28px 28px',
        }}
      >
        {/* Header */}
        <h2
          style={{
            fontFamily: 'Bai Jamjuree, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            lineHeight: '27px',
            color: '#064E3B',
            margin: 0,
          }}
        >
          เชิญ Admin ใหม่
        </h2>
        <p
          style={{
            fontFamily: 'Bai Jamjuree, sans-serif',
            fontWeight: 400,
            fontSize: 13,
            lineHeight: '20px',
            color: '#6B7280',
            margin: '5px 0 20px 0',
          }}
        >
          ระบบจะส่งคำเชิญและรหัสบัญชีชั่วคราวไปยังอีเมลที่กรอก
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ชื่อ */}
          <div>
            <label htmlFor="invite-firstName" style={LABEL_STYLE}>
              {'ชื่อ '}
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="invite-firstName"
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="ชื่อ"
              style={{
                ...INPUT_STYLE_BASE,
                border: `0.8px solid ${fieldErrors.firstName ? '#EF4444' : '#E5E7EB'}`,
              }}
            />
            {fieldErrors.firstName && (
              <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: 'Bai Jamjuree, sans-serif' }}>
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          {/* นามสกุล */}
          <div>
            <label htmlFor="invite-lastName" style={LABEL_STYLE}>
              {'นามสกุล '}
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="invite-lastName"
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="นามสกุล"
              style={{
                ...INPUT_STYLE_BASE,
                border: `0.8px solid ${fieldErrors.lastName ? '#EF4444' : '#E5E7EB'}`,
              }}
            />
            {fieldErrors.lastName && (
              <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: 'Bai Jamjuree, sans-serif' }}>
                {fieldErrors.lastName}
              </p>
            )}
          </div>

          {/* อีเมล */}
          <div>
            <label htmlFor="invite-email" style={LABEL_STYLE}>
              {'อีเมล '}
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@payung.co"
              style={{
                ...INPUT_STYLE_BASE,
                border: `0.8px solid ${fieldErrors.email ? '#EF4444' : '#E5E7EB'}`,
              }}
            />
            {fieldErrors.email && (
              <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: 'Bai Jamjuree, sans-serif' }}>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* บทบาท */}
          <div>
            <label htmlFor="invite-role" style={LABEL_STYLE}>
              {'บทบาท '}
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="invite-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                style={{
                  ...INPUT_STYLE_BASE,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  border: `0.8px solid ${fieldErrors.role ? '#EF4444' : '#E5E7EB'}`,
                  color: form.role ? '#1F2937' : 'rgba(31, 41, 55, 0.5)',
                  cursor: 'pointer',
                  paddingRight: 36,
                }}
              >
                <option value="" disabled>เลือกบทบาท</option>
                <option value="3">Admin</option>
                <option value="4">Super Admin</option>
              </select>
              <span
                className="material-icons"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 19,
                  color: '#757575',
                  pointerEvents: 'none',
                }}
              >
                expand_more
              </span>
            </div>
            {fieldErrors.role && (
              <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: 'Bai Jamjuree, sans-serif' }}>
                {fieldErrors.role}
              </p>
            )}
          </div>

          {/* Server error */}
          {submitError && (
            <div
              style={{
                borderRadius: 6,
                background: '#FEF2F2',
                padding: '8px 12px',
                fontSize: 12,
                color: '#DC2626',
                fontFamily: 'Bai Jamjuree, sans-serif',
              }}
            >
              {submitError}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 115,
                height: 42,
                background: '#FFFFFF',
                border: '0.8px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 4,
                fontFamily: 'Bai Jamjuree, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                color: '#0A0A0A',
                cursor: 'pointer',
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: 143,
                height: 42,
                background: loading ? '#6EE7B7' : '#059669',
                boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
                borderRadius: 4,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontFamily: 'Bai Jamjuree, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                color: '#FFFFFF',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading
                ? <span className="material-icons animate-spin" style={{ fontSize: 18 }}>refresh</span>
                : <span className="material-icons" style={{ fontSize: 18 }}>mail</span>
              }
              ส่งคำเชิญ
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// ─── Edit Admin Modal ──────────────────────────────────────────────────────

interface EditAdminModalProps {
  user: UserSummary;
  onClose: () => void;
  onSuccess: () => void;
}

function EditAdminModal({ user, onClose, onSuccess }: Readonly<EditAdminModalProps>) {
  const { firstName: initFirst, lastName: initLast } = splitDisplayName(user.displayName);
  const [form, setForm] = useState({ firstName: initFirst, lastName: initLast, email: user.email, role: String(user.role) });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const [updateAdmin, { loading }] = useMutation(UPDATE_ADMIN_USER, {
    onCompleted: () => { onSuccess(); },
    onError: (err) => { setSubmitError(err.message); },
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'กรุณากรอกชื่อ';
    if (!form.lastName.trim()) errs.lastName = 'กรุณากรอกนามสกุล';
    if (!form.email.trim()) errs.email = 'กรุณากรอกอีเมล';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!form.role) errs.role = 'กรุณาเลือกบทบาท';
    return errs;
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    updateAdmin({
      variables: {
        adminId: user.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: Number.parseInt(form.role, 10),
      },
    });
  }

  return (
    <dialog open className="fixed inset-0 z-50 m-0 flex h-screen w-screen max-w-none items-center justify-center p-0 bg-black/40 backdrop-blur-sm">
      <button type="button" aria-label="ปิด" className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.12)',
          padding: 28,
        }}
      >
        <h2 style={{ fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 700, fontSize: 18, lineHeight: '27px', color: '#064E3B', margin: 0 }}>
          แก้ไขข้อมูลผู้ดูแลระบบ
        </h2>
        <p style={{ fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 600, fontSize: 13, lineHeight: '20px', color: '#0D9488', margin: '5px 0 20px 0' }}>
          {user.displayName || user.email}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ชื่อ */}
          <div>
            <label htmlFor="edit-firstName" style={LABEL_STYLE}>
              {'ชื่อ '}<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="edit-firstName"
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="ชื่อ"
              style={{ ...INPUT_STYLE_BASE, border: `0.8px solid ${fieldErrors.firstName ? '#EF4444' : '#E5E7EB'}` }}
            />
            {fieldErrors.firstName && <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: 'Bai Jamjuree, sans-serif' }}>{fieldErrors.firstName}</p>}
          </div>

          {/* นามสกุล */}
          <div>
            <label htmlFor="edit-lastName" style={LABEL_STYLE}>
              {'นามสกุล '}<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="edit-lastName"
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="นามสกุล"
              style={{ ...INPUT_STYLE_BASE, border: `0.8px solid ${fieldErrors.lastName ? '#EF4444' : '#E5E7EB'}` }}
            />
            {fieldErrors.lastName && <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: 'Bai Jamjuree, sans-serif' }}>{fieldErrors.lastName}</p>}
          </div>

          {/* อีเมล */}
          <div>
            <label htmlFor="edit-email" style={LABEL_STYLE}>
              {'อีเมล '}<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@payung.co"
              style={{ ...INPUT_STYLE_BASE, border: `0.8px solid ${fieldErrors.email ? '#EF4444' : '#E5E7EB'}` }}
            />
            {fieldErrors.email && <p style={{ marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: 'Bai Jamjuree, sans-serif' }}>{fieldErrors.email}</p>}
          </div>

          {/* บทบาท */}
          <div>
            <label htmlFor="edit-role" style={LABEL_STYLE}>
              {'บทบาท '}<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="edit-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                style={{
                  ...INPUT_STYLE_BASE,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  border: `0.8px solid ${fieldErrors.role ? '#EF4444' : '#E5E7EB'}`,
                  cursor: 'pointer',
                  paddingRight: 36,
                }}
              >
                <option value="3">Admin</option>
                <option value="4">Super Admin</option>
              </select>
              <span className="material-icons" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 19, color: '#757575', pointerEvents: 'none' }}>
                expand_more
              </span>
            </div>
          </div>

          {submitError && (
            <div style={{ borderRadius: 6, background: '#FEF2F2', padding: '8px 12px', fontSize: 12, color: '#DC2626', fontFamily: 'Bai Jamjuree, sans-serif' }}>
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ width: 115, height: 42, background: '#FFFFFF', border: '0.8px solid rgba(0,0,0,0.1)', borderRadius: 4, fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 500, fontSize: 14, color: '#0A0A0A', cursor: 'pointer' }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ width: 143, height: 42, background: loading ? 'rgba(5,150,105,0.5)' : '#059669', boxShadow: '0px 4px 4px rgba(0,0,0,0.25)', borderRadius: 4, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 500, fontSize: 14, color: '#FFFFFF', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading && <span className="material-icons animate-spin" style={{ fontSize: 18 }}>refresh</span>}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// ─── Confirm Deactivate Modal ──────────────────────────────────────────────

interface ConfirmDeactivateProps {
  user: UserSummary;
  isAdminTarget: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function ConfirmDeactivateModal({ user, isAdminTarget, onClose, onConfirm, loading }: Readonly<ConfirmDeactivateProps>) {
  const [inputValue, setInputValue] = useState('');
  const confirmName = user.displayName || user.email;
  const isMatch = inputValue === confirmName;

  return (
    <dialog open className="fixed inset-0 z-50 m-0 flex h-screen w-screen max-w-none items-center justify-center p-0 bg-black/40 backdrop-blur-sm">
      <button type="button" aria-label="ปิด" className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: 614,
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '33px 68px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
        }}
      >
        {/* Icon */}
        <span className="material-icons" style={{ fontSize: 69, color: '#F24822' }}>person_off</span>

        {/* Title + subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
          <h2 style={{ fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 600, fontSize: 20, lineHeight: '25px', color: '#DC2626', margin: 0, textAlign: 'center' }}>
            ปิดการใช้งาน?
          </h2>
          <p style={{ fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 400, fontSize: 14, lineHeight: '24px', color: '#717182', margin: 0, textAlign: 'center' }}>
            {isAdminTarget
              ? 'บัญชีจะถูกระงับทันทีและจะถูกลบถาวรภายใน 7 วัน หากไม่มีการเปิดใช้งาน'
              : 'บัญชีของผู้ใช้นี้จะถูกระงับทันที'}
          </p>
        </div>

        {/* Input section */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 500, fontSize: 15, lineHeight: '24px', color: '#575859', margin: 0 }}>
            {'พิมพ์ชื่อ '}
            <span style={{ fontWeight: 600 }}>"{confirmName}"</span>
            {' ลงในช่องด้านล่างเพื่อยืนยันการปิดใช้งาน'}
          </p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmName}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              height: 50,
              padding: '13px 16px',
              fontFamily: 'Bai Jamjuree, sans-serif',
              fontWeight: 500,
              fontSize: 15,
              lineHeight: '24px',
              color: '#575859',
              background: '#FFFFFF',
              border: `1.5px solid ${isMatch ? '#059669' : '#DC2626'}`,
              borderRadius: 8,
              outline: 'none',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 115,
              height: 35,
              background: '#FFFFFF',
              border: '0.8px solid rgba(0,0,0,0.1)',
              borderRadius: 4,
              fontFamily: 'Bai Jamjuree, sans-serif',
              fontWeight: 500,
              fontSize: 14,
              color: '#0A0A0A',
              cursor: 'pointer',
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || loading}
            style={{
              width: 143,
              height: 35,
              background: '#FEF2F2',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 4,
              fontFamily: 'Bai Jamjuree, sans-serif',
              fontWeight: 500,
              fontSize: 14,
              color: isMatch ? '#DC2626' : 'rgba(220,38,38,0.5)',
              cursor: isMatch && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {loading && <span className="material-icons animate-spin" style={{ fontSize: 14 }}>refresh</span>}
            ปิดการใช้งาน
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Confirm Activate Modal ────────────────────────────────────────────────

interface ConfirmActivateProps {
  user: UserSummary;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function ConfirmActivateModal({ user, onClose, onConfirm, loading }: Readonly<ConfirmActivateProps>) {
  const name = user.displayName || user.email;
  return (
    <dialog open className="fixed inset-0 z-50 m-0 flex h-screen w-screen max-w-none items-center justify-center p-0 bg-black/40 backdrop-blur-sm">
      <button type="button" aria-label="ปิด" className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: 614,
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '33px 68px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
        }}
      >
        {/* Icon */}
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-icons" style={{ fontSize: 64, color: '#14AE5C' }}>check</span>
        </div>

        {/* Title + subtitle */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <h2 style={{ fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 600, fontSize: 24, lineHeight: '30px', color: '#059669', margin: 0, textAlign: 'center', width: '100%' }}>
            เปิดการใช้งาน?
          </h2>
          <p style={{ fontFamily: 'Bai Jamjuree, sans-serif', fontWeight: 600, fontSize: 14, lineHeight: '24px', color: '#717182', margin: 0, textAlign: 'center', width: '100%' }}>
            บัญชีของ <span style={{ color: '#059669' }}>{name}</span> จะถูกเปิดใช้งานและยกเลิกการตั้งเวลาลบทันที
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 115,
              height: 35,
              background: '#FFFFFF',
              border: '0.8px solid rgba(0,0,0,0.1)',
              borderRadius: 4,
              fontFamily: 'Bai Jamjuree, sans-serif',
              fontWeight: 500,
              fontSize: 14,
              color: '#0A0A0A',
              cursor: 'pointer',
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              width: 143,
              height: 35,
              background: '#ECFDF5',
              border: '1px solid #059669',
              borderRadius: 4,
              fontFamily: 'Bai Jamjuree, sans-serif',
              fontWeight: 500,
              fontSize: 14,
              color: '#059669',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading && <span className="material-icons animate-spin" style={{ fontSize: 14 }}>refresh</span>}
            เปิดการใช้งาน
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const viewerRole = userRole ?? 3;
  const isSuperAdmin = viewerRole === 4;

  const [activeFilter, setActiveFilter] = useState<RoleFilterKey>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<UserSummary | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<UserSummary | null>(null);
  const [editTarget, setEditTarget] = useState<UserSummary | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const trimmedSearch = search.trim();
  const roleVariable = activeFilter === 'all' ? undefined : activeFilter;

  const { data, loading: queryLoading, error: queryError, refetch } = useQuery<AdminUserListResponse>(
    ADMIN_USER_LIST,
    {
      variables: {
        role: roleVariable,
        search: trimmedSearch || undefined,
        page,
        limit: PAGE_SIZE,
        countSearch: trimmedSearch || undefined,
      },
      fetchPolicy: 'cache-and-network',
    },
  );

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const [scheduleDelete, { loading: scheduleDeleteLoading }] = useMutation(SCHEDULE_DELETE_ADMIN, {
    onCompleted: () => { showToast('ปิดการใช้งานและกำหนดลบบัญชีเรียบร้อย', 'success'); setConfirmDeactivate(null); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); setConfirmDeactivate(null); },
  });

  const [cancelDelete, { loading: cancelLoading }] = useMutation(CANCEL_SCHEDULED_DELETE, {
    onCompleted: () => { showToast('เปิดใช้งานบัญชีเรียบร้อย', 'success'); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); },
  });

  const [suspendUser, { loading: suspendLoading }] = useMutation(SUSPEND_USER, {
    onCompleted: () => { showToast('ปิดการใช้งานบัญชีเรียบร้อย', 'success'); setConfirmDeactivate(null); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); setConfirmDeactivate(null); },
  });

  const [activateUser, { loading: activateLoading }] = useMutation(ACTIVATE_USER, {
    onCompleted: () => { showToast('เปิดใช้งานบัญชีเรียบร้อย', 'success'); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); },
  });

  const [toggleStatus, { loading: toggleLoading }] = useMutation(TOGGLE_ADMIN_STATUS, {
    onCompleted: () => { showToast('เปิดใช้งานบัญชีเรียบร้อย', 'success'); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); },
  });

  const handleDeactivate = useCallback((target: UserSummary) => {
    if (target.role >= 3) {
      scheduleDelete({ variables: { adminId: target.id, gracePeriodDays: 7 } });
    } else {
      suspendUser({ variables: { userId: target.id } });
    }
  }, [scheduleDelete, suspendUser]);

  const handleActivate = useCallback((target: UserSummary) => {
    if (target.role >= 3) {
      if (target.scheduledDeleteAt) {
        cancelDelete({ variables: { adminId: target.id } });
      } else {
        toggleStatus({ variables: { adminId: target.id, isActive: true } });
      }
    } else {
      activateUser({ variables: { userId: target.id } });
    }
  }, [cancelDelete, toggleStatus, activateUser]);

  const items = data?.list.items ?? [];
  const totalItems = data?.list.total ?? 0;
  const totalPages = data?.list.totalPages ?? 1;
  const firstItem = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, totalItems);

  const filterTabs = useMemo<FilterTabItem<RoleFilterKey>[]>(() => [
    { key: 'all', label: 'ทั้งหมด', count: data?.allCount.total ?? 0 },
    { key: 'super_admin', label: 'Super Admin', count: data?.superAdminCount.total ?? 0 },
    { key: 'admin', label: 'Admin', count: data?.adminCount.total ?? 0 },
    { key: 'caregiver', label: 'ผู้ดูแล', count: data?.caregiverCount.total ?? 0 },
    { key: 'patient', label: 'ผู้ใช้', count: data?.patientCount.total ?? 0 },
  ], [data]);

  const isLoading = queryLoading && !data;
  const actionLoading = scheduleDeleteLoading || cancelLoading || suspendLoading || activateLoading || toggleLoading;

  const columns = useMemo<DataTableColumn<UserSummary>[]>(() => [
    {
      key: 'displayName',
      header: 'ชื่อ',
      render: (item) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-xs font-bold text-[#0D9488]">
            {getInitial(item.displayName, item.email)}
          </div>
          <span className="truncate text-sm font-medium text-gray-900">
            {item.displayName || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'อีเมล',
      className: 'truncate text-sm text-gray-500',
      render: (item) => item.email,
    },
    {
      key: 'role',
      header: 'บทบาท',
      render: (item) => {
        const meta = ROLE_LABELS[item.role];
        if (!meta) return <span className="text-xs text-gray-400">-</span>;
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass} ${meta.textClass}`}
            style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (item) => {
        const isActive = item.isActive && !item.isSuspended;
        if (isActive) {
          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-semibold text-[#1B6B3A]"
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" aria-hidden="true"></span>
              {'เปิดใช้งาน'}
            </span>
          );
        }
        if (item.scheduledDeleteAt) {
          const days = daysUntil(item.scheduledDeleteAt);
          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              title={`กำหนดลบ: ${formatDate(item.scheduledDeleteAt)}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
              {days > 0 ? `ลบใน ${days} วัน` : 'ลบวันนี้'}
            </span>
          );
        }
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500"
            style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true"></span>
            {'ถูกปิดใช้งาน'}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'วันที่สร้าง',
      className: 'text-sm text-gray-500',
      render: (item) => formatDate(item.createdAt),
    },
    {
      key: 'actions',
      header: 'จัดการ',
      render: (item) => {
        const action = getActionType(viewerRole, item.role);
        if (action === 'none') return <span className="text-xs text-gray-400">-</span>;

        const isActive = item.isActive && !item.isSuspended;
        return (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setEditTarget(item)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
            >
              <span className="material-icons" style={{ fontSize: 13 }}>edit</span>
              {'แก้ไข'}
            </button>
            {isActive ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDeactivate(item)}
                className="inline-flex items-center gap-1 rounded-md border border-[#F7C1C1] px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                ปิดใช้งาน
              </button>
            ) : item.scheduledDeleteAt ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmActivate(item)}
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                เปิดใช้งาน
              </button>
            ) : (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmActivate(item)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                เปิดใช้งาน
              </button>
            )}
          </div>
        );
      },
    },
  ], [viewerRole, actionLoading]);

  return (
    <div className="bg-[#F9FAFB] text-gray-900">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-5 top-5 z-60 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#059669]' : 'bg-red-500'}`}
          style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
        >
          <span className="material-icons text-base">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}

      <section className="mx-auto max-w-328 px-4 py-6 sm:px-6 lg:px-8">
        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <FilterTabs
            items={filterTabs}
            activeKey={activeFilter}
            onChange={(filter) => {
              setActiveFilter(filter);
              setPage(1);
            }}
          />

          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อ, อีเมล..."
              ariaLabel="ค้นหาชื่อหรืออีเมล"
              className="xl:max-w-102.75"
            />

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[#059669] px-3 py-2 text-xs font-semibold text-white hover:bg-[#047857]"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                <span className="material-icons text-base" aria-hidden="true">person_add</span>
                {'เชิญ Admin ใหม่'}
              </button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          items={items}
          getRowKey={(item) => item.id}
          gridTemplateColumns={TABLE_GRID_COLUMNS}
          loading={isLoading}
          loadingContent={<UsersTableSkeleton />}
          error={queryError}
          renderError={(err) => (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Icon name="error" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดรายการผู้ใช้ไม่สำเร็จ</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">{err.message}</p>
            </div>
          )}
          renderEmpty={
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#0D9488]">
                <Icon name="people" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">ไม่พบรายการผู้ใช้</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">
                {trimmedSearch
                  ? `ไม่พบผู้ใช้ที่ตรงกับ "${trimmedSearch}"`
                  : 'ยังไม่มีผู้ใช้ในแท็บนี้'}
              </p>
            </div>
          }
          footer={
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
                แสดง {firstItem}-{lastItem} จาก {totalItems} รายการ
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          }
        />
      </section>

      {/* Modals */}
      {showInviteModal && (
        <InviteAdminModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            showToast('ส่งคำเชิญเรียบร้อยแล้ว', 'success');
            refetch();
          }}
        />
      )}

      {editTarget && (
        <EditAdminModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            showToast('อัปเดตข้อมูลเรียบร้อยแล้ว', 'success');
            refetch();
          }}
        />
      )}

      {confirmDeactivate && (
        <ConfirmDeactivateModal
          user={confirmDeactivate}
          isAdminTarget={confirmDeactivate.role >= 3}
          onClose={() => setConfirmDeactivate(null)}
          onConfirm={() => handleDeactivate(confirmDeactivate)}
          loading={actionLoading}
        />
      )}

      {confirmActivate && (
        <ConfirmActivateModal
          user={confirmActivate}
          onClose={() => setConfirmActivate(null)}
          onConfirm={() => { handleActivate(confirmActivate); setConfirmActivate(null); }}
          loading={actionLoading}
        />
      )}
    </div>
  );
}