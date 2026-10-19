import { gql } from '@apollo/client';

/**
 * ทักษะกลางที่วิชาชีพนี้มีได้ (BE PYG-652 · ตาราง care_skills)
 * คืนทักษะพื้นฐานก่อน แล้วตามด้วยทักษะเฉพาะของวิชาชีพนั้น — ใช้ใน useCareSkillCatalog เท่านั้น
 */
export const CARE_SKILLS_QUERY = gql`
  query CareSkills($profession: String!) {
    careSkills(profession: $profession) {
      code
      nameTh
    }
  }
`;
