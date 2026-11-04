import { gql } from "@apollo/client";

/** แอดมินเท่านั้น · ใช้ users.id (ตัวเดียวกับ route /admin/users/:id) */
export const ADMIN_CAREGIVER_WORK_INFO = gql`
  query AdminCaregiverWorkInfo($userId: ID!) {
    adminCaregiverWorkInfo(userId: $userId) {
      caregiverId
      isAcceptingJobs
      careLevel
      careLevelSetAt
      careLevelSetByName
      availability {
        dayOfWeek
        timeSlot
      }
      jobTypes
      serviceLocations
      serviceAreaProvince
      serviceAreaDistrict
      payoutAccount {
        bankCode
        accountName
        accountNumberLast4
        status
        recipientStatus
        ready
        notReadyReason
        verifiedAt
        updatedAt
      }
    }
  }
`;
