import { gql } from "@apollo/client";

/**
 * แอดมินเท่านั้น · โปรไฟล์ผู้ใช้ (ผู้จอง) + ผู้รับการดูแล + แบบประเมิน ADL + สรุปการจอง (ใช้ users.id)
 * ★ มีข้อมูลสุขภาพ — ห้าม log response และห้ามเก็บลง localStorage
 */
export const ADMIN_PATIENT_PROFILE = gql`
  query AdminPatientProfile($userId: ID!) {
    adminPatientProfile(userId: $userId) {
      id
      name
      email
      phone
      avatarUrl
      address
      role
      isActive
      isSuspended
      createdAt
      lastLoginAt
      bookingStats {
        total
        active
        completed
        cancelled
        totalPaid
      }
      recentBookings {
        id
        status
        bookingDate
        serviceType
        estimatedCost
        caregiverName
        careRecipientName
      }
      careRecipients {
        id
        name
        nickname
        isSelf
        dateOfBirth
        gender
        weightKg
        heightCm
        bloodType
        mobilityLevel
        medicalConditions
        currentMedications
        allergies
        hasInfectiousDisease
        emergencyContactName
        emergencyContactPhone
        emergencyContactRel
        preferredHospital
        careNotes
        assessment {
          answers {
            code
            value
          }
          adlTotalScore
          unsureCount
          flags
          noSpecialConditions
          hasUnsureFlag
          dementiaSevere
          careGroup
          assessedByName
          assessedAt
        }
      }
    }
  }
`;
