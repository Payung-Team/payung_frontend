import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  RECOMMENDED_SERVICE_PACKAGES,
  type RecommendedServicePackagesData,
  type RecommendedServicePackagesVars,
  type ServicePackage,
} from '../../graphql/servicePackages';
import type { PackageTarget } from './usePackageTarget';
import {
  extractGraphQLErrorCode,
  extractGraphQLErrorMessage,
  extractServerErrorBody,
} from '../../lib/apolloErrors';
import { careGroupLabel, useServicePackageStrings } from '../../lib/servicePackageStrings';

/**
 * ส่วน "ชุดบริการที่แนะนำ" ในขั้นบริการของการจอง — S14 · PYG-629
 *
 * ★ ชุดมาจาก BE เท่านั้น (recommendedServicePackages · contract PYG-626) ไม่ฝังตารางกลุ่ม/ชุดไว้ฝั่ง FE
 * ★ เป็นคำแนะนำ (R4): ส่วนนี้โหลดไม่ได้ / ว่าง / ไม่มีกลุ่ม → หน้าจองต้องจองต่อได้เสมอ
 *   ส่วนนี้จึงไม่รายงาน stepMissing และไม่กันปุ่มถัดไป
 */

/**
 * BE ที่ deploy อยู่ยังไม่มี query นี้ (ตอบ 400 GRAPHQL_VALIDATION_FAILED) — จำไว้ทั้ง session
 * ★ ไม่งั้นทุกครั้งที่เปลี่ยนบริการที่เลือก (selectedServiceType เปลี่ยน) จะยิงซ้ำแล้วได้ 400 ซ้ำ
 *   BE ขึ้นแล้วโหลดหน้าใหม่ครั้งเดียวก็กลับมาขอได้ตามปกติ
 */
let schemaMissingThisSession = false;

interface Props {
  target: PackageTarget;
  /** รหัสประเภทบริการที่เลือก (ส่งให้ BE คำนวณ flag) — null เมื่อยังไม่ได้เลือกค่าเดียว */
  selectedServiceType: string | null;
  /** ชื่อของประเภทข้างบน ใช้ในป้าย "ไม่มี … ที่คุณเลือก" */
  selectedServiceName: string | null;
  /** รหัสบริการที่เลือกอยู่จริงตอนนี้ — ใช้บอกว่าปรับบริการหลังเลือกชุดแล้วหรือยัง (E5) */
  selectedCodes: string[];
  picked?: { id: string; serviceTypes: string[] };
  onPick: (pkg: ServicePackage) => void;
  onUnpick: () => void;
}

export default function RecommendedPackages(props: Props) {
  const s = useServicePackageStrings();
  const { target } = props;

  if (target.kind === 'hidden') return null;

  return (
    <section
      aria-labelledby="recommended-packages-title"
      className="bg-white p-6 rounded-2xl border border-gray-100"
    >
      {target.kind === 'recipient' ? (
        <PackageList key={target.careRecipientId} {...props} target={target} />
      ) : (
        <>
          <h2 id="recommended-packages-title" className="text-lg font-bold text-[#1A1A1A]">
            {s.sectionTitleNoName}
          </h2>
          {target.kind === 'resolving' ? (
            <LoadingState />
          ) : target.kind === 'resolveFailed' ? (
            <ErrorState onRetry={target.retry} />
          ) : (
            <Notice
              title={s.unavailableTitle}
              body={target.kind === 'member' ? s.memberUnavailableBody : s.unavailableBody}
            />
          )}
        </>
      )}
    </section>
  );
}

/** key = careRecipientId → เปลี่ยนคนแล้ว remount ทั้งก้อน ไม่มีทางเห็นชุดของคนเดิมค้างอยู่ (E3) */
function PackageList({
  target,
  selectedServiceType,
  selectedServiceName,
  selectedCodes,
  picked,
  onPick,
  onUnpick,
}: Props & { target: Extract<PackageTarget, { kind: 'recipient' }> }) {
  const s = useServicePackageStrings();

  const { data, previousData, loading, error, refetch } = useQuery<
    RecommendedServicePackagesData,
    RecommendedServicePackagesVars
  >(RECOMMENDED_SERVICE_PACKAGES, {
    variables: { careRecipientId: target.careRecipientId, selectedServiceType },
    // R5 · AC5: อ่านกลุ่มล่าสุดทุกครั้งที่เปิดหน้า ไม่ใช้ผลที่ cache ไว้
    fetchPolicy: 'network-only',
    skip: schemaMissingThisSession,
  });
  const schemaMissing = schemaMissingThisSession || (!!error && isSchemaMissing(error));
  useEffect(() => {
    if (schemaMissing) schemaMissingThisSession = true;
  }, [schemaMissing]);
  // เปลี่ยนประเภทบริการที่เลือก → ขอใหม่เพื่อให้ได้ flag ใหม่ ระหว่างรอแสดงชุดเดิมไว้ไม่ให้กระพริบ
  //   previousData ปลอดภัยเพราะ component นี้ผูกกับผู้สูงอายุคนเดียว (key)
  const result = (data ?? (loading ? previousData : undefined))?.recommendedServicePackages;

  const title = (
    <h2 id="recommended-packages-title" className="text-lg font-bold text-[#1A1A1A]">
      {s.sectionTitle(target.name)}
    </h2>
  );

  if (!result) {
    if (schemaMissing) {
      return (
        <>
          {title}
          <Notice title={s.unavailableTitle} body={s.unavailableBody} />
        </>
      );
    }
    if (error && !loading) {
      return (
        <>
          {title}
          <ErrorState onRetry={() => void refetch()} />

        </>
      );
    }
    return (
      <>
        {title}
        <LoadingState />
      </>
    );
  }

  if (result.careGroup == null) {
    return (
      <>
        {title}
        <Notice title={s.noGroupTitle(target.name)} body={s.noGroupBody} />
      </>
    );
  }

  const groupText = s.groupReason(careGroupLabel(s, result.careGroup));
  if (result.packages.length === 0) {
    return (
      <>
        {title}
        <p className="mt-1 text-sm text-[#575859]">{groupText}</p>
        <Notice title={s.noPackagesTitle} body={s.noPackagesBody} />
      </>
    );
  }

  const selectedSet = new Set(selectedCodes);

  return (
    <>
      {title}
      <p className="mt-1 text-sm text-[#575859]">{groupText}</p>
      <p className="mt-0.5 text-sm text-[#575859]">{s.optionalHint}</p>
      {/* แสดงตามลำดับที่ API ส่งมา ไม่กรองและไม่เรียงใหม่ (มติ E6) */}
      <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {result.packages.map((pkg) => {
          const isPicked = picked?.id === pkg.id;
          const adjusted = isPicked && !sameSet(selectedSet, picked?.serviceTypes ?? []);
          return (
            <li key={pkg.id}>
              <PackageCard
                pkg={pkg}
                isPicked={isPicked}
                adjusted={adjusted}
                missingSelected={
                  pkg.containsSelectedServiceType === false && selectedServiceName
                    ? s.missingSelected(selectedServiceName)
                    : null
                }
                onPick={() => onPick(pkg)}
                onUnpick={onUnpick}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PackageCard({
  pkg,
  isPicked,
  adjusted,
  missingSelected,
  onPick,
  onUnpick,
}: {
  pkg: ServicePackage;
  isPicked: boolean;
  adjusted: boolean;
  missingSelected: string | null;
  onPick: () => void;
  onUnpick: () => void;
}) {
  const s = useServicePackageStrings();
  const en = s.lang === 'en';
  const name = en ? pkg.nameEn : pkg.nameTh;
  const description = en ? pkg.descriptionEn : pkg.descriptionTh;
  const headingId = `package-${pkg.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className={`h-full flex flex-col gap-3 rounded-xl border-2 p-4 transition ${
        isPicked ? 'border-[#1B5C48] bg-[#F0FAF4]' : 'border-[#E0E2E5] bg-white'
      }`}
    >
      <div>
        <h3 id={headingId} className="text-base font-bold text-[#1A1A1A] break-words">
          {name}
        </h3>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-[#575859] break-words">{description}</p>
        )}
      </div>

      {missingSelected && (
        <p className="inline-flex items-start gap-1.5 self-start rounded-lg border border-[#E8C77A] bg-[#FFF6E5] px-2.5 py-1.5 text-xs font-semibold text-[#6B4E12]">
          <span className="material-icons" style={{ fontSize: 16 }} aria-hidden="true">
            info
          </span>
          {missingSelected}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold text-[#575859]">{s.servicesInPackage}</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {pkg.items.map((item) => (
            <li
              key={item.serviceType}
              className="rounded-full border border-[#D5E3DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#1B5C48] break-words"
            >
              {en ? item.nameEn : item.nameTh}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-1">
        {isPicked ? (
          <div className="flex flex-col gap-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B5C48]">
              <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">
                {adjusted ? 'edit' : 'check_circle'}
              </span>
              {adjusted ? s.pickedAdjusted : s.picked}
            </p>
            {adjusted && <p className="text-xs leading-relaxed text-[#575859]">{s.adjustedHint}</p>}
            <button
              type="button"
              onClick={onUnpick}
              className="self-start min-h-[44px] px-4 rounded-xl border border-[#C7CDD2] bg-white text-sm font-semibold text-[#575859] hover:bg-gray-50 transition cursor-pointer"
            >
              {s.unpick}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPick}
            aria-label={s.pickAria(name)}
            className="min-h-[44px] px-4 rounded-xl border border-[#1B5C48] bg-white text-sm font-bold text-[#1B5C48] hover:bg-[#F0FAF4] transition cursor-pointer"
          >
            {s.pick}
          </button>
        )}
      </div>
    </article>
  );
}

function LoadingState() {
  const s = useServicePackageStrings();
  return (
    <div aria-live="polite" className="mt-4">
      <p className="text-sm text-[#575859]">{s.loading}</p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="h-36 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-36 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const s = useServicePackageStrings();
  return (
    <div
      role="alert"
      className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-[#FEF2F2] p-4"
    >
      <div>
        <p className="text-sm font-bold text-red-700">{s.loadFailed}</p>
        <p className="mt-0.5 text-sm text-[#7F1D1D]">{s.loadFailedBody}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] px-4 rounded-xl bg-[#1B5C48] text-sm font-bold text-white hover:bg-[#164B3B] transition cursor-pointer"
      >
        {s.retry}
      </button>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[#C7CDD2] bg-[#F6FAF9] p-4">
      <p className="text-sm font-bold text-[#1A1A1A]">{title}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-[#575859]">{body}</p>
    </div>
  );
}

function sameSet(a: Set<string>, b: string[]): boolean {
  return a.size === new Set(b).size && b.every((x) => a.has(x));
}

/** query/field ยังไม่มีใน schema ของ BE ที่ deploy อยู่ (แนวเดียวกับ ActivityPanel) */
function isSchemaMissing(err: unknown): boolean {
  if (extractGraphQLErrorCode(err) === 'GRAPHQL_VALIDATION_FAILED') return true;
  const text = extractGraphQLErrorMessage(err) ?? extractServerErrorBody(err) ?? '';
  return /GRAPHQL_VALIDATION_FAILED|Cannot query field|Unknown (?:type|argument)/i.test(text);
}
