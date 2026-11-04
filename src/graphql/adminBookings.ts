import { gql } from "@apollo/client";

/** แอดมินเท่านั้น · รายการ booking ทั้งระบบ (ใหม่ → เก่า) */
export const ADMIN_BOOKINGS = gql`
  query AdminBookings($input: AdminBookingsInput) {
    adminBookings(input: $input) {
      totalCount
      page
      limit
      hasNextPage
      nodes {
        id
        status
        bookingDate
        startTime
        durationHours
        serviceType
        estimatedCost
        paymentStatus
        disputeStatus
        createdAt
        patientId
        patientName
        patientPhone
        caregiverId
        caregiverName
        caregiverNumber
      }
    }
  }
`;

/** แอดมินเท่านั้น · รายละเอียด booking + การชำระเงิน + ประวัติสถานะ (เก่า → ใหม่) */
export const ADMIN_BOOKING_DETAIL = gql`
  query AdminBookingDetail($id: ID!) {
    adminBookingDetail(id: $id) {
      id
      status
      bookingDate
      startTime
      durationHours
      timeSlot
      serviceType
      serviceLocations
      locationAddress
      estimatedCost
      platformFee
      disputeStatus
      disputeReason
      rejectionReason
      tasks
      notes
      createdAt
      acceptedAt
      confirmedAt
      completedAt
      patientId
      patientName
      patientPhone
      patientEmail
      careRecipientName
      bookedByName
      dayOfContactName
      dayOfContactPhone
      dayOfContactRelationship
      caregiverId
      caregiverName
      caregiverNumber
      caregiverPhone
      caregiverUserId
      requiredLevel
      levelFromAdl
      levelFromFlags
      levelFromServices
      levelCalculatedAt
      requiredSkills {
        code
        nameTh
        sources
      }
      payment {
        id
        amount
        capturedAmount
        refundedAmount
        paymentMethod
        paymentStatus
        omiseChargeId
        failureMessage
        createdAt
      }
      statusHistory {
        id
        fromStatus
        toStatus
        reason
        changedByName
        createdAt
      }
    }
  }
`;

/**
 * แอดมินเท่านั้น · ประเมินผู้ดูแลทุกคนกับ booking นี้ ณ ตอนนี้ (live — ไม่ได้บันทึกผล)
 * หนักกว่า query ทั่วไป (ประเมินทั้งระบบ) → เรียกเมื่อแอดมินกดปุ่มเท่านั้น
 */
export const ADMIN_BOOKING_MATCH_REPORT = gql`
  query AdminBookingMatchReport($bookingId: ID!) {
    bookingMatchReport(bookingId: $bookingId) {
      evaluatedAt
      results {
        passed
        checks {
          level
          skills
          profession
          evidence
        }
        reasons {
          reason
          skillCode
        }
        caregiver {
          id
          userId
          fullName
          caregiverNumber
          profession
          careLevel
          serviceAreaProvince
          serviceAreaDistrict
        }
      }
    }
  }
`;
