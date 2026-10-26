/**
 * ชุดบริการที่แนะนำตามกลุ่มของผู้สูงอายุ — S14 · PYG-629 (contract ตาม PYG-626 Draft v0.1)
 *
 * ★ ชุดเป็นแค่ทางลัดเติมบริการในหน้าจอง — ไม่ส่ง package ไปกับ booking (contract §8)
 * ★ ไม่ cache ข้ามการเปิดหน้า (R5 · AC5) ผู้เรียกต้องใช้ fetchPolicy 'network-only'
 * ★ containsSelectedServiceType คำนวณที่ server (มติ E6) — FE ห้ามเทียบ items เอง
 *   null = ไม่ได้ส่ง selectedServiceType · false = ชุดยังต้องแสดง แต่ติดป้าย
 */
import { gql } from '@apollo/client';

const RECOMMENDED_SERVICE_PACKAGES_FIELDS = gql`
  fragment RecommendedServicePackagesFields on RecommendedServicePackages {
    careGroup
    packages {
      id
      code
      nameTh
      nameEn
      descriptionTh
      descriptionEn
      containsSelectedServiceType
      items {
        serviceType
        nameTh
        nameEn
      }
    }
  }
`;

export const RECOMMENDED_SERVICE_PACKAGES = gql`
  query RecommendedServicePackages($careRecipientId: ID!, $selectedServiceType: String) {
    recommendedServicePackages(
      careRecipientId: $careRecipientId
      selectedServiceType: $selectedServiceType
    ) {
      ...RecommendedServicePackagesFields
    }
  }
  ${RECOMMENDED_SERVICE_PACKAGES_FIELDS}
`;

/**
 * จองแทนสมาชิกกลุ่ม — FE มีแค่ memberUserId ไม่มี id โปรไฟล์
 * BE ใช้โปรไฟล์เดียวกับที่ createBookingOnBehalf(memberUserId) จะผูกจริง
 * ★ alias เป็น recommendedServicePackages → ผลลัพธ์ใช้ type เดียวกับ query ข้างบน
 * ไม่ผ่านสิทธิ์ (เช่น สมาชิกยังไม่ยินยอมเปิดเผยให้กลุ่ม) = ASSESSMENT_ACCESS_DENIED
 */
export const RECOMMENDED_SERVICE_PACKAGES_FOR_MEMBER = gql`
  query RecommendedServicePackagesForMember(
    $groupId: ID!
    $memberUserId: ID!
    $selectedServiceType: String
  ) {
    recommendedServicePackages: recommendedServicePackagesForMember(
      groupId: $groupId
      memberUserId: $memberUserId
      selectedServiceType: $selectedServiceType
    ) {
      ...RecommendedServicePackagesFields
    }
  }
  ${RECOMMENDED_SERVICE_PACKAGES_FIELDS}
`;

/** ค่าตาม ElderCareGroup ของ S09 — อาจมีค่าใหม่ที่ FE ยังไม่รู้จัก ต้องมี fallback */
export type ElderCareGroup = 'SOCIAL' | 'HOMEBOUND' | 'BEDRIDDEN' | (string & {});

export interface ServicePackageItem {
  /** รหัสเดียวกับ bookings.service_type เช่น general_care */
  serviceType: string;
  nameTh: string;
  nameEn: string;
}

export interface ServicePackage {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  descriptionTh?: string | null;
  descriptionEn?: string | null;
  containsSelectedServiceType?: boolean | null;
  items: ServicePackageItem[];
}

export interface RecommendedServicePackagesData {
  recommendedServicePackages: {
    /** null = ยังไม่มีผลประเมิน (E1) */
    careGroup: ElderCareGroup | null;
    /** [] = มีกลุ่มแต่ไม่มีชุดที่เปิดใช้ (E2, E8) — ไม่ใช่ error */
    packages: ServicePackage[];
  };
}

export interface RecommendedServicePackagesVars {
  careRecipientId: string;
  selectedServiceType?: string | null;
}

export interface RecommendedServicePackagesForMemberVars {
  groupId: string;
  memberUserId: string;
  selectedServiceType?: string | null;
}
