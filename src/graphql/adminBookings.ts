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
