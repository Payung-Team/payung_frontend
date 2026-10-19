import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { CARE_SKILLS_QUERY } from '../../graphql/careSkills';
import { CARE_SKILLS, type CareSkillDef } from '../../lib/skillLabels';

/**
 * รายการทักษะกลางจาก API `careSkills(profession)` (PYG-655 · BE PYG-652) — แอดมินแก้ care_skills แล้วหน้าจอตาม
 *
 * API ตอบ "ทักษะพื้นฐาน + ทักษะเฉพาะของวิชาชีพนั้น" ไม่ได้บอกว่าตัวไหนเป็นตัวไหน
 *   → ถามครบ 3 วิชาชีพ: ของ general_caregiver = พื้นฐาน · ของพยาบาล/นักกายภาพฯ ที่เกินพื้นฐาน = เฉพาะวิชาชีพนั้น
 *   (ต้องรู้ทักษะเฉพาะของทุกวิชาชีพ เพื่อกันไม่ให้ติ๊กทักษะเฉพาะของวิชาชีพอื่น และแยกออกตอนเปลี่ยนวิชาชีพ)
 * ระหว่างโหลด / โหลดไม่สำเร็จ (BE เก่า · เน็ต) → ใช้ CARE_SKILLS ใน skillLabels.ts แทน ฟอร์มยังใช้ได้
 */
type CareSkillItem = { code: string; nameTh: string };
type Data = { careSkills: CareSkillItem[] };

export function useCareSkillCatalog(): ReadonlyArray<CareSkillDef> {
  const general = useQuery<Data>(CARE_SKILLS_QUERY, { variables: { profession: 'general_caregiver' } });
  const nurse = useQuery<Data>(CARE_SKILLS_QUERY, { variables: { profession: 'nurse' } });
  const physio = useQuery<Data>(CARE_SKILLS_QUERY, { variables: { profession: 'physiotherapist' } });

  return useMemo(() => {
    const basic = general.data?.careSkills;
    const nurseSkills = nurse.data?.careSkills;
    const physioSkills = physio.data?.careSkills;
    if (!basic?.length || !nurseSkills || !physioSkills) return CARE_SKILLS;

    const basicCodes = new Set(basic.map((s) => s.code));
    const seen = new Set<string>();
    const catalog: CareSkillDef[] = [];
    const add = (s: CareSkillItem, profession?: CareSkillDef['profession']) => {
      if (seen.has(s.code)) return;
      seen.add(s.code);
      catalog.push({ value: s.code, label: s.nameTh, ...(profession && { profession }) });
    };
    basic.forEach((s) => add(s));
    nurseSkills.filter((s) => !basicCodes.has(s.code)).forEach((s) => add(s, 'nurse'));
    physioSkills.filter((s) => !basicCodes.has(s.code)).forEach((s) => add(s, 'physiotherapist'));
    return catalog;
  }, [general.data, nurse.data, physio.data]);
}
