import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ADMIN_CARE_ACTIVITIES,
  CARE_ACTIVITIES,
  CREATE_CARE_ACTIVITY,
  SET_CARE_ACTIVITY_ACTIVE,
  UPDATE_CARE_ACTIVITY,
  type CareActivity,
  type CareActivityLevel,
} from '../../graphql/careActivities';
import {
  CARE_ACTIVITY_CATEGORY_MAX,
  CARE_ACTIVITY_ERROR,
  CARE_ACTIVITY_NAME_MAX,
  careActivityAdminErrorMessage,
  careActivityErrorField,
  useCareActivityStrings,
} from '../../lib/careActivityStrings';
import { CARE_LEVELS, useCareLevelStrings } from '../../lib/careLevels';
import { extractGraphQLErrorExtensions } from '../../lib/apolloErrors';
import { logGraphQLError } from '../../lib/logGraphQLError';
import CareLevelBadge from '../../components/ui/CareLevelBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import FilterTabs, { type FilterTabItem } from '../../components/ui/FilterTabs';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';

/**
 * จัดการกิจกรรมการดูแลกลาง (PYG-635 · S15 · BE PYG-634)
 *
 * - กรองฝั่ง FE ทั้งหมด (รายการกลางมีหลักสิบ) — query เดียวได้ทั้งตารางและรายชื่อหมวดสำหรับตัวกรอง/ฟอร์ม
 *   BE มี filter ใน adminCareActivities ไว้แล้ว ถ้ารายการโตเป็นหลักพันค่อยย้ายไปกรองที่ BE
 * - ไม่มีการลบ: ปิดใช้งาน = ไม่แสดงในหน้าจอง แต่ booking เดิมยังเก็บ snapshot ชื่อเดิม
 * - หลังแก้ไข/เปลี่ยนสถานะ refetch careActivities ด้วย (cache ของหน้าจองในแท็บเดียวกัน)
 */

type StatusFilter = 'all' | 'active' | 'inactive';
type FormField = 'nameTh' | 'nameEn' | 'category' | 'careLevel' | 'sortOrder';

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

interface FormValues {
  nameTh: string;
  nameEn: string;
  category: string;
  careLevel: CareActivityLevel | '';
  sortOrder: string;
}

const EMPTY_FORM: FormValues = { nameTh: '', nameEn: '', category: '', careLevel: '', sortOrder: '' };

function toForm(a: CareActivity): FormValues {
  return {
    nameTh: a.nameTh,
    nameEn: a.nameEn ?? '',
    category: a.category,
    careLevel: a.careLevel,
    sortOrder: String(a.sortOrder),
  };
}

/** mount เฉพาะตอนเปิด — เปิดใหม่ได้ค่าตั้งต้นเสมอ */
function ActivityFormModal({
  editing,
  categories,
  onClose,
  onSaved,
}: {
  editing: CareActivity | null;
  categories: string[];
  onClose: () => void;
  onSaved: (saved: CareActivity, created: boolean) => void;
}) {
  const s = useCareActivityStrings();
  const ls = useCareLevelStrings();
  const [values, setValues] = useState<FormValues>(editing ? toForm(editing) : EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<{ field: FormField | null; message: string } | null>(null);

  const refetchBookingList = { refetchQueries: [{ query: CARE_ACTIVITIES }] };
  const [createActivity, { loading: creating }] = useMutation<{ createCareActivity: CareActivity }>(
    CREATE_CARE_ACTIVITY,
    refetchBookingList,
  );
  const [updateActivity, { loading: updating }] = useMutation<{ updateCareActivity: CareActivity }>(
    UPDATE_CARE_ACTIVITY,
    refetchBookingList,
  );
  const saving = creating || updating;

  const errors = useMemo(() => {
    const e: Partial<Record<FormField, string>> = {};
    const nameTh = values.nameTh.trim();
    const nameEn = values.nameEn.trim();
    const category = values.category.trim();
    if (!nameTh) e.nameTh = s.required;
    else if (nameTh.length > CARE_ACTIVITY_NAME_MAX) e.nameTh = s.tooLong(CARE_ACTIVITY_NAME_MAX);
    if (nameEn.length > CARE_ACTIVITY_NAME_MAX) e.nameEn = s.tooLong(CARE_ACTIVITY_NAME_MAX);
    if (!category) e.category = s.required;
    else if (category.length > CARE_ACTIVITY_CATEGORY_MAX) e.category = s.tooLong(CARE_ACTIVITY_CATEGORY_MAX);
    if (!values.careLevel) e.careLevel = s.required;
    const order = values.sortOrder.trim();
    if (order && !/^\d+$/.test(order)) e.sortOrder = s.orderInvalid;
    return e;
  }, [values, s]);
  const valid = Object.keys(errors).length === 0;

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (serverError?.field === key || serverError?.field === null) setServerError(null);
  }

  function fieldError(field: FormField): string | undefined {
    if (serverError?.field === field) return serverError.message;
    return touched ? errors[field] : undefined;
  }

  async function submit() {
    setTouched(true);
    if (!valid || !values.careLevel) return;
    const order = values.sortOrder.trim();
    const base = {
      nameTh: values.nameTh.trim(),
      category: values.category.trim(),
      careLevel: values.careLevel,
    };
    try {
      if (editing) {
        const { data } = await updateActivity({
          variables: {
            id: editing.id,
            input: {
              ...base,
              // "" = ลบชื่ออังกฤษ (contract BE) · เว้นลำดับว่างตอนแก้ = คงลำดับเดิม
              nameEn: values.nameEn.trim(),
              ...(order ? { sortOrder: Number(order) } : {}),
            },
          },
        });
        if (data) onSaved(data.updateCareActivity, false);
      } else {
        const { data } = await createActivity({
          variables: {
            input: {
              ...base,
              nameEn: values.nameEn.trim() || null,
              ...(order ? { sortOrder: Number(order) } : {}),
            },
          },
        });
        if (data) onSaved(data.createCareActivity, true);
      }
    } catch (err) {
      logGraphQLError(editing ? 'UpdateCareActivity' : 'CreateCareActivity', err);
      setServerError({
        field: careActivityErrorField(err),
        message: careActivityAdminErrorMessage(err, s) ?? s.saveFailed,
      });
    }
  }

  const inputClass = (field: FormField) =>
    `w-full rounded-lg border px-3 py-2 text-[14px] text-[#1F2937] outline-none focus:border-[#059669] ${
      fieldError(field) ? 'border-red-400' : 'border-[#D1D5DB]'
    }`;

  function errorText(field: FormField) {
    const msg = fieldError(field);
    return msg ? (
      <span id={`care-activity-${field}-error`} className="text-xs font-medium text-red-500">
        {msg}
      </span>
    ) : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="fixed inset-0 -z-10" onClick={saving ? undefined : onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-activity-form-title"
        className="flex max-h-[92vh] w-[560px] max-w-[92vw] flex-col gap-4 overflow-y-auto rounded-xl bg-white p-7 shadow-2xl"
        style={font}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="flex flex-col gap-1">
          <h2 id="care-activity-form-title" className="text-[20px] font-semibold text-[#064E3B]">
            {editing ? s.formEditTitle : s.formAddTitle}
          </h2>
          {editing && <p className="text-[13px] leading-6 text-[#717182]">{s.formEditNote}</p>}
          {editing?.code && <p className="text-[12px] text-[#94A3B8]">{editing.code}</p>}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#374151]">
            {s.fieldNameTh} <span className="text-red-600" aria-hidden="true">*</span>
          </span>
          <input
            value={values.nameTh}
            onChange={(e) => set('nameTh', e.target.value)}
            className={inputClass('nameTh')}
            aria-invalid={!!fieldError('nameTh') || undefined}
            aria-describedby={fieldError('nameTh') ? 'care-activity-nameTh-error' : undefined}
            autoFocus
          />
          {errorText('nameTh')}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#374151]">{s.fieldNameEn}</span>
          <input
            value={values.nameEn}
            onChange={(e) => set('nameEn', e.target.value)}
            className={inputClass('nameEn')}
            aria-invalid={!!fieldError('nameEn') || undefined}
            aria-describedby={fieldError('nameEn') ? 'care-activity-nameEn-error' : undefined}
          />
          {errorText('nameEn')}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#374151]">
            {s.fieldCategory} <span className="text-red-600" aria-hidden="true">*</span>
          </span>
          <input
            value={values.category}
            onChange={(e) => set('category', e.target.value)}
            list="care-activity-categories"
            className={inputClass('category')}
            aria-invalid={!!fieldError('category') || undefined}
            aria-describedby={fieldError('category') ? 'care-activity-category-error' : 'care-activity-category-hint'}
          />
          <datalist id="care-activity-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {fieldError('category') ? (
            errorText('category')
          ) : (
            <span id="care-activity-category-hint" className="text-xs text-[#94A3B8]">
              {s.fieldCategoryHint}
            </span>
          )}
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-[#374151]">
            {s.fieldLevel} <span className="text-red-600" aria-hidden="true">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {CARE_LEVELS.map((level) => {
              const on = values.careLevel === level;
              return (
                <label
                  key={level}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[14px] ${
                    on ? 'border-[#059669] bg-[#ECFDF5]' : 'border-[#D1D5DB] bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="care-activity-level"
                    value={level}
                    checked={on}
                    onChange={() => set('careLevel', level)}
                    className="accent-[#059669]"
                  />
                  {ls.levelLabel[level]}
                </label>
              );
            })}
          </div>
          {errorText('careLevel')}
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#374151]">{s.fieldOrder}</span>
          <input
            value={values.sortOrder}
            onChange={(e) => set('sortOrder', e.target.value)}
            inputMode="numeric"
            className={`${inputClass('sortOrder')} max-w-[160px]`}
            aria-invalid={!!fieldError('sortOrder') || undefined}
            aria-describedby={fieldError('sortOrder') ? 'care-activity-sortOrder-error' : 'care-activity-sortOrder-hint'}
          />
          {fieldError('sortOrder') ? (
            errorText('sortOrder')
          ) : (
            <span id="care-activity-sortOrder-hint" className="text-xs text-[#94A3B8]">
              {s.fieldOrderHint}
            </span>
          )}
        </label>

        {serverError && serverError.field === null && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {serverError.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-[35px] w-[115px] cursor-pointer rounded border border-black/10 bg-white text-[14px] font-medium text-[#0A0A0A] hover:bg-gray-50"
          >
            {s.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || (touched && !valid)}
            className="h-[35px] w-[143px] cursor-pointer rounded bg-[#059669] text-[14px] font-medium text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? s.saving : s.save}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CareActivitiesPage() {
  const s = useCareActivityStrings();
  const ls = useCareLevelStrings();
  const toast = useToast();

  const { data, loading, error, refetch } = useQuery<{ adminCareActivities: CareActivity[] }>(ADMIN_CARE_ACTIVITIES, {
    variables: { filter: {} },
    fetchPolicy: 'cache-and-network',
  });
  const [setActive, { loading: toggling }] = useMutation<{ setCareActivityActive: CareActivity }>(
    SET_CARE_ACTIVITY_ACTIVE,
    { refetchQueries: [{ query: CARE_ACTIVITIES }] },
  );

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<CareActivityLevel | ''>('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [formTarget, setFormTarget] = useState<CareActivity | 'new' | null>(null);
  const [toggleTarget, setToggleTarget] = useState<CareActivity | null>(null);

  const all = useMemo(() => data?.adminCareActivities ?? [], [data]);
  const categories = useMemo(() => [...new Set(all.map((a) => a.category))].sort((a, b) => a.localeCompare(b, 'th')), [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((a) => {
      if (category && a.category !== category) return false;
      if (level && a.careLevel !== level) return false;
      if (status === 'active' && !a.isActive) return false;
      if (status === 'inactive' && a.isActive) return false;
      if (q && ![a.nameTh, a.nameEn ?? '', a.code ?? ''].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [all, search, category, level, status]);

  const activeCount = all.filter((a) => a.isActive).length;
  const tabs: FilterTabItem<StatusFilter>[] = [
    { key: 'all', label: s.statusAll, count: all.length },
    { key: 'active', label: s.statusActive, count: activeCount },
    { key: 'inactive', label: s.statusInactive, count: all.length - activeCount },
  ];
  const filtered = Boolean(search.trim() || category || level || status !== 'all');

  async function confirmToggle() {
    if (!toggleTarget) return;
    const target = toggleTarget;
    const next = !target.isActive;
    try {
      await setActive({ variables: { id: target.id, isActive: next } });
      toast.success(next ? s.activated(target.nameTh) : s.deactivated(target.nameTh), undefined, 'admin-toast');
    } catch (err) {
      logGraphQLError('SetCareActivityActive', err);
      if (extractGraphQLErrorExtensions(err)?.code === CARE_ACTIVITY_ERROR.NOT_FOUND) void refetch();
      toast.error(careActivityAdminErrorMessage(err, s) ?? s.toggleFailed, 6000, 'admin-toast');
    } finally {
      setToggleTarget(null);
    }
  }

  function onSaved(saved: CareActivity, created: boolean) {
    setFormTarget(null);
    toast.success(created ? s.created(saved.nameTh) : s.updated(saved.nameTh), undefined, 'admin-toast');
    // เพิ่มใหม่ไม่อยู่ใน cache ของรายการ → โหลดใหม่ (แก้ไข Apollo อัปเดต entity ให้เองแล้ว แต่ลำดับอาจเปลี่ยน)
    void refetch();
  }

  const selectClass =
    'h-[38px] rounded-lg border border-[#D1D5DB] bg-white px-3 text-[14px] text-[#1F2937] outline-none focus:border-[#059669]';

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" style={font}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <h1 className="text-[20px] font-bold text-[#0F172A]">{s.adminTitle}</h1>
          <p className="text-[13px] text-[#64748B]">{s.adminSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget('new')}
          className="inline-flex h-[38px] cursor-pointer items-center gap-1.5 rounded-lg bg-[#059669] px-4 text-[14px] font-semibold text-white hover:bg-[#047857]"
        >
          <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">
            add
          </span>
          {s.add}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <span
            className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            style={{ fontSize: 18 }}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={s.searchPlaceholder}
            aria-label={s.searchPlaceholder}
            className="h-[38px] w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-[14px] outline-none focus:border-[#059669]"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={s.colCategory} className={selectClass}>
          <option value="">{s.allCategories}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as CareActivityLevel | '')}
          aria-label={s.colLevel}
          className={selectClass}
        >
          <option value="">{s.allLevels}</option>
          {CARE_LEVELS.map((l) => (
            <option key={l} value={l}>
              {ls.levelLabel[l]}
            </option>
          ))}
        </select>
        <FilterTabs items={tabs} activeKey={status} onChange={setStatus} />
      </div>

      {error && !data ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {s.loadFailed} · {error.message}
        </div>
      ) : loading && !data ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-12 text-center">
          <span className="material-icons-outlined text-[#94A3B8]" style={{ fontSize: 36 }} aria-hidden="true">
            checklist
          </span>
          <p className="text-[15px] font-semibold text-[#334155]">{filtered ? s.emptyFiltered : s.emptyAll}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="bg-[#F8FAFC] text-[12.5px] font-semibold text-[#64748B]">
              <tr>
                <th className="px-4 py-3">{s.colName}</th>
                <th className="px-4 py-3">{s.colCategory}</th>
                <th className="px-4 py-3">{s.colLevel}</th>
                <th className="px-4 py-3 text-right">{s.colOrder}</th>
                <th className="px-4 py-3">{s.colStatus}</th>
                <th className="px-4 py-3">
                  <span className="sr-only">{s.edit}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.map((a) => (
                <tr key={a.id} className={a.isActive ? '' : 'bg-[#FAFAFA] text-[#94A3B8]'}>
                  <td className="px-4 py-3">
                    <div className={`font-semibold ${a.isActive ? 'text-[#0F172A]' : ''}`}>{a.nameTh}</div>
                    {(a.nameEn || a.code) && (
                      <div className="text-[12px] text-[#94A3B8]">
                        {[a.code, a.nameEn].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{a.category}</td>
                  <td className="px-4 py-3">
                    <CareLevelBadge level={a.careLevel} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                        a.isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${a.isActive ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}`}
                        aria-hidden="true"
                      />
                      {a.isActive ? s.statusActive : s.statusInactive}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setFormTarget(a)}
                      className="mr-2 cursor-pointer rounded border border-[#D1D5DB] px-3 py-1 text-[13px] font-medium text-[#334155] hover:bg-gray-50"
                    >
                      {s.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => setToggleTarget(a)}
                      className={`cursor-pointer rounded border px-3 py-1 text-[13px] font-medium ${
                        a.isActive
                          ? 'border-[#DC2626] text-[#DC2626] hover:bg-red-50'
                          : 'border-[#059669] text-[#059669] hover:bg-[#ECFDF5]'
                      }`}
                    >
                      {a.isActive ? s.deactivate : s.activate}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-[#F1F5F9] px-4 py-2 text-[12.5px] text-[#64748B]">{s.count(rows.length)}</p>
        </div>
      )}

      {formTarget && (
        <ActivityFormModal
          editing={formTarget === 'new' ? null : formTarget}
          categories={categories}
          onClose={() => setFormTarget(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmModal
        isOpen={!!toggleTarget}
        isLoading={toggling}
        title={toggleTarget?.isActive ? s.deactivateTitle : s.activateTitle}
        iconName={toggleTarget?.isActive ? 'block' : 'check'}
        iconBgColor={toggleTarget?.isActive ? 'bg-[#DC2626]' : undefined}
        confirmBtnBgColor={toggleTarget?.isActive ? 'bg-[#DC2626]' : undefined}
        confirmBtnHoverBgColor={toggleTarget?.isActive ? 'hover:bg-[#B91C1C]' : undefined}
        confirmText={toggleTarget?.isActive ? s.deactivate : s.activate}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        description={
          toggleTarget && (toggleTarget.isActive ? s.deactivateBody(toggleTarget.nameTh) : s.activateBody(toggleTarget.nameTh))
        }
      />

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} position="top-right" variant="admin-toast" />
    </div>
  );
}
