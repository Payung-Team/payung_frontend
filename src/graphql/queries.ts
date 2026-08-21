import { gql } from "@apollo/client";

export const LOGIN_USER = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: {
      email: $email
      password: $password
    }) {
      accessToken
      refreshToken
      user {
        id
        email
        role
        isActive
        mustChangePassword
        phone
      }
    }
  }
`;

export const COMPLETE_PASSWORD_CHANGE = gql`
  mutation CompletePasswordChange {
    completePasswordChange {
      id
      mustChangePassword
    }
  }
`;

export const REGISTER_USER = gql`
  mutation Register($email: String!, $password: String!, $role: Int!) {
    register(input: {
      email: $email
      password: $password
      role: $role
    }) {
      accessToken
      refreshToken
      user {
        id
        email
        role
      }
    }
  }
`;

export const LOGOUT_USER = gql`
  mutation Logout {
    logout
  }
`;

export const GET_USER = gql`
  query GetUser {
    me {
      id
      email
      displayName
      phone
      address
      subDistrict
      district
      province
      postalCode
      bio
      avatarUrl
      role
      createdAt
    }
  }
`;

export const SET_CAREGIVER_SEARCHABLE = gql`
  mutation SetSearchable($isSearchable: Boolean!) {
    setSearchable(isSearchable: $isSearchable) {
      id
      kycStatus
      isSearchable
    }
  }
`;

export const UPLOAD_KYC_DOCUMENT = gql`
  mutation UploadKycDocument($input: UploadDocumentInput!) {
    uploadKycDocument(input: $input) {
      id
      docType
      fileName
      fileUrl
    }
  }
`;

export const SUBMIT_KYC = gql`
  mutation SubmitKyc($input: KycInput!) {
    submitKyc(input: $input) {
      id
      fullName
      dateOfBirth
      gender
      kycStatus
      kycSubmittedAt
    }
  }
`;

export const GET_CAREGIVER_PROFILE = gql`
  query GetCaregiverProfile {
    myCaregiverProfile {
      id
      caregiverNumber
      fullName
      idCardNumber
      gender
      dateOfBirth
      phone
      address
      bio
      hourlyRate
      skills
      experienceYears
      kycStatus
      kycSubmittedAt
      kycVerifiedAt
      resubmitCount
      isSearchable
      languages
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_CAREGIVER_PROFILE = gql`
  mutation UpdateCaregiverProfile($input: UpdateCaregiverInput!) {
    updateCaregiverProfile(input: $input) {
      id
      bio
      hourlyRate
      skills
      experienceYears
      phone
      address
      languages
      updatedAt
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $displayName: String
    $phone: String
    $address: String
    $subDistrict: String
    $district: String
    $province: String
    $postalCode: String
    $bio: String
    $avatarUrl: String
  ) {
    updateProfile(input: {
      displayName: $displayName
      phone: $phone
      address: $address
      subDistrict: $subDistrict
      district: $district
      province: $province
      postalCode: $postalCode
      bio: $bio
      avatarUrl: $avatarUrl
    }) {
      id
      email
      displayName
      phone
      address
      subDistrict
      district
      province
      postalCode
      bio
      avatarUrl
      role
    }
  }
`;

export const GET_KYC_STATUS = gql`
  query GetKycStatus {
    kycStatus {
      status
      submittedAt
      verifiedAt
      rejectedAt
      rejectedReason
      caregiver {
        id
        fullName
        dateOfBirth
        gender
        idCardNumber
        phone
        skills
        experienceYears
        hourlyRate
        bio
        kycStatus
        rejectionReasons {
          title
          detail
          documentType
        }
      }
      documents {
        id
        docType
        fileName
        fileUrl
        signedUrl
        mimeType
      }
    }
  }
`;

export const GET_KYC_DOCUMENTS = gql`
  query GetKycDocuments {
    kycStatus {
      documents {
        id
        docType
        fileName
        fileUrl
        fileSize
        mimeType
        uploadedAt
      }
    }
  }
`;

export const ADMIN_KYC_LIST = gql`
  query AdminKycList(
    $status: KycStatusFilter
    $search: String
    $page: Int
    $limit: Int
    $countSearch: String
  ) {
    list: adminKycList(input: {
      status: $status
      search: $search
      page: $page
      limit: $limit
    }) {
      items {
        id
        caregiverNumber
        fullName
        email
        kycStatus
        submittedAt
        documentCount
      }
      total
      page
      totalPages
    }
    allCount: adminKycList(input: {
      status: all
      search: $countSearch
      page: 1
      limit: 1
    }) {
      total
    }
    pendingCount: adminKycList(input: {
      status: pending
      search: $countSearch
      page: 1
      limit: 1
    }) {
      total
    }
    verifiedCount: adminKycList(input: {
      status: verified
      search: $countSearch
      page: 1
      limit: 1
    }) {
      total
    }
    rejectedCount: adminKycList(input: {
      status: rejected
      search: $countSearch
      page: 1
      limit: 1
    }) {
      total
    }
  }
`;

export const ADMIN_KYC_DETAIL = gql`
  query AdminKycDetail($caregiverId: ID!) {
    adminKycDetail(caregiverId: $caregiverId) {
      caregiver {
        id
        userId
        caregiverNumber
        fullName
        email
        idCardNumber
        gender
        dateOfBirth
        address
        phone
        skills
        experienceYears
        hourlyRate
        bio
        kycStatus
        kycSubmittedAt
        kycVerifiedAt
        resubmitCount
        createdAt
        updatedAt
      }
      documents {
        id
        docType
        fileName
        fileUrl
        fileSize
        mimeType
        signedUrl
        uploadedAt
      }
      resubmitCount
      reviews {
        id
        action
        reason
        reviewedBy
        reviewerName
        reviewedAt
      }
      editHistory {
        id
        action
        editorName
        createdAt
        fieldChanges {
          field
          oldValue
          newValue
        }
      }
    }
  }
`;

export const ADMIN_USER_DETAIL = gql`
  query AdminUserDetail($userId: ID!) {
    adminUserDetail(userId: $userId) {
      user {
        id
        email
        displayName
        phone
      }
    }
  }
`;

export const APPROVE_KYC = gql`
  mutation ApproveKyc($caregiverId: ID!) {
    approveKyc(caregiverId: $caregiverId) {
      id
      kycStatus
      kycVerifiedAt
      updatedAt
    }
  }
`;

export const REJECT_KYC = gql`
  mutation RejectKyc($caregiverId: ID!, $reasons: [RejectionReasonItem!]!) {
    rejectKyc(input: { caregiverId: $caregiverId, reasons: $reasons }) {
      id
      kycStatus
      updatedAt
    }
  }
`;

export const RESUBMIT_KYC = gql`
  mutation ResubmitKyc($input: KycInput!) {
    resubmitKyc(input: $input) {
      id
      fullName
      dateOfBirth
      gender
      kycStatus
      kycSubmittedAt
    }
  }
`;

export const DELETE_KYC_DOCUMENT = gql`
  mutation DeleteKycDocument($documentId: String!) {
    deleteKycDocument(documentId: $documentId)
  }
`;

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int, $offset: Int, $unreadOnly: Boolean) {
    notifications(limit: $limit, offset: $offset, unreadOnly: $unreadOnly) {
      id
      userId
      type
      title
      body
      data
      isRead
      readAt
      createdAt
    }
  }
`;

export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount {
    unreadCount
  }
`;

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: String!) {
    markAsRead(id: $id) {
      id
      isRead
      readAt
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllAsRead
  }
`;

export const UPDATE_EMAIL_PREFERENCE = gql`
  mutation UpdateEmailPreference($enabled: Boolean!) {
    updateEmailPreference(enabled: $enabled) {
      id
      emailPreferences
    }
  }
`;

export const ADMIN_DASHBOARD = gql`
  query AdminDashboard {
    adminDashboard {
      summary {
        totalUsers
        totalCaregivers
        pendingKyc
        verifiedKyc
        rejectedKyc
      }
      weeklySubmissions {
        week
        count
      }
      avgReviewTimeHours
      recentActivity {
        type
        caregiverName
        action
        timestamp
      }
    }
  }
`;

export const ADMIN_PENDING_COUNT = gql`
  query AdminPendingCount {
    pendingCount: adminKycList(input: { status: pending, page: 1, limit: 1 }) {
      total
    }
  }
`;

export const ADMIN_PENDING_QUEUE = gql`
  query AdminPendingQueue {
    list: adminKycList(input: { status: pending, page: 1, limit: 5 }) {
      items {
        id
        fullName
        kycStatus
        submittedAt
      }
      total
    }
  }
`;

export const ADMIN_USER_LIST = gql`
  query AdminUserList($role: RoleFilter, $search: String, $page: Int, $limit: Int, $countSearch: String) {
    list: adminUserList(input: { role: $role, search: $search, page: $page, limit: $limit }) {
      items {
        id
        email
        displayName
        role
        isActive
        isSuspended
        scheduledDeleteAt
        createdAt
        caregiverNumber
        kycStatus
      }
      total
      page
      totalPages
    }
    allCount: adminUserList(input: { search: $countSearch, page: 1, limit: 1 }) { total }
    superAdminCount: adminUserList(input: { role: super_admin, search: $countSearch, page: 1, limit: 1 }) { total }
    adminCount: adminUserList(input: { role: admin, search: $countSearch, page: 1, limit: 1 }) { total }
    caregiverCount: adminUserList(input: { role: caregiver, search: $countSearch, page: 1, limit: 1 }) { total }
    patientCount: adminUserList(input: { role: patient, search: $countSearch, page: 1, limit: 1 }) { total }
  }
`;

export const INVITE_ADMIN = gql`
  mutation InviteAdmin($email: String!, $firstName: String!, $lastName: String!, $role: Int!) {
    inviteAdmin(input: { email: $email, firstName: $firstName, lastName: $lastName, role: $role }) {
      user {
        id
        email
        displayName
        role
      }
      tempPasswordSent
    }
  }
`;

export const TOGGLE_ADMIN_STATUS = gql`
  mutation ToggleAdminStatus($adminId: ID!, $isActive: Boolean!) {
    toggleAdminStatus(input: { adminId: $adminId, isActive: $isActive }) {
      user {
        id
        email
        isActive
      }
      action
    }
  }
`;

export const CANCEL_SCHEDULED_DELETE = gql`
  mutation CancelScheduledDelete($adminId: String!) {
    cancelScheduledDelete(input: { adminId: $adminId }) {
      user {
        id
        email
        isActive
      }
      reactivated
    }
  }
`;

export const UPDATE_ADMIN_USER = gql`
  mutation UpdateAdminUser($adminId: ID!, $firstName: String, $lastName: String, $email: String, $role: Int) {
    editAdminInfo(input: { adminId: $adminId, firstName: $firstName, lastName: $lastName, email: $email, role: $role }) {
      user {
        id
        email
        displayName
        role
      }
    }
  }
`;

export const SCHEDULE_DELETE_ADMIN = gql`
  mutation ScheduleDeleteAdmin($adminId: String!, $gracePeriodDays: Int!) {
    scheduleDeleteAdmin(input: { adminId: $adminId, gracePeriodDays: $gracePeriodDays }) {
      user {
        id
        email
        isActive
      }
      scheduledDeleteAt
      gracePeriodDays
    }
  }
`;

export const SUSPEND_USER = gql`
  mutation SuspendUser($userId: ID!) {
    suspendUser(userId: $userId) {
      id
      email
      isActive
      isSuspended
    }
  }
`;

export const ACTIVATE_USER = gql`
  mutation ActivateUser($userId: ID!) {
    activateUser(userId: $userId) {
      id
      email
      isActive
      isSuspended
    }
  }
`;

export const ADMIN_UPDATE_CAREGIVER_INFO = gql`
  mutation AdminUpdateCaregiverInfo($input: AdminUpdateCaregiverInfoInput!) {
    adminUpdateCaregiverInfo(input: $input) {
      id
      firstName
      lastName
      idCardNumber
      email
    }
  }
`;

export const ADMIN_EDIT_USER = gql`
  mutation AdminEditUser($input: AdminEditUserInput!) {
    adminEditUser(input: $input) {
      id
      displayName
      email
      phone
      address
      bio
    }
  }
`;

export const GET_WORK_CONDITION = gql`
  query GetWorkCondition {
    myWorkCondition {
      availability {
        dayOfWeek
        timeSlot
        isActive
      }
      serviceLocations
      jobTypes
      serviceArea {
        province
        district
      }
    }
  }
`;

export const UPDATE_WORK_CONDITION = gql`
  mutation UpdateWorkCondition($input: UpdateWorkConditionInput!) {
    updateWorkCondition(input: $input) {
      availability {
        dayOfWeek
        timeSlot
        isActive
      }
      serviceLocations
      jobTypes
      serviceArea {
        province
        district
      }
    }
  }
`;

const CAREGIVER_BOOKING_SUMMARY_FIELDS = `
  id
  status
  serviceType
  serviceLocations
  tasks
  timeSlot
  bookingDate
  startTime
  durationHours
  estimatedCost
  locationAddress
  locationLat
  locationLng
  notes
  patient {
    id
    displayName
    avatarUrl
  }
  careRecipientName
  confirmedAt
  rejectionReason
  createdAt
`;

export const GET_MY_BOOKING = gql`
  query GetMyBooking($id: ID!) {
    myBooking(id: $id) {
      id
      status
      disputeStatus
      disputeReason
      serviceType
      timeSlot
      startTime
      durationHours
      tasks
      serviceLocations
      bookingDate
      locationAddress
      locationLat
      locationLng
      notes
      estimatedCost
      careRecipientName
      confirmedAt
      createdAt
      caregiver {
        id
        fullName
        avatarUrl
        hourlyRate
      }
      payment {
        id
        amount
        currency
        paymentMethod
        paymentStatus
        failureMessage
        qrCodeUrl
        updatedAt
      }
    }
  }
`;

// PYG-361 — proof-of-work summary for the patient's live tracking view.
// This is the single source of truth for check-in/check-out; the realtime
// job_events subscription only tells us WHEN to refetch this, never what to show
// (realtime delivers raw rows with no signed photo URL and no computed flags).
// export const GET_PROOF_OF_WORK = gql`
//   query GetProofOfWork($bookingId: ID!) {
//     proofOfWork(bookingId: $bookingId) {
//       checkIn {
//         serverTs
//         lat
//         lng
//         photoUrl
//         note
//       }
//       checkOut {
//         serverTs
//         photoUrl
//         note
//       }
//       actualMinutes
//       bookedMinutes
//       distanceInM
//       distanceOutM
//       noCheckout
//       jobCoordsMissing
//       reviewReasons
//       disputed
//       verdict
//     }
//   }
// `;

export const GET_MY_BOOKING_HISTORY = gql`
  query GetMyBookingHistory($input: BookingHistoryInput) {
    myBookingHistory(input: $input) {
      data {
        id
        status
        serviceType
        timeSlot
        startTime
        durationHours
        tasks
        serviceLocations
        bookingDate
        locationAddress
        estimatedCost
        careRecipientName
        confirmedAt
        createdAt
        caregiver {
          id
          fullName
          avatarUrl
          hourlyRate
        }
      }
      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

export const GET_CAREGIVER_BOOKINGS = gql`
  query GetCaregiverBookings($input: CaregiverBookingsInput!) {
    caregiverBookings(input: $input) {
      data {
        ${CAREGIVER_BOOKING_SUMMARY_FIELDS}
      }
      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

export const SEARCH_CAREGIVERS = gql`
  query SearchCaregivers($input: SearchCaregiverInput!) {
    searchCaregivers(input: $input) {
      data {
        id
        fullName
        avatarUrl
        hourlyRate
        avgRating
        reviewCount
        skills
        province
        district
      }
      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

export const GET_CAREGIVER_BOOKING_HISTORY = gql`
  query GetCaregiverBookingHistory($input: CaregiverBookingHistoryInput) {
    caregiverBookingHistory(input: $input) {
      data {
        ${CAREGIVER_BOOKING_SUMMARY_FIELDS}
      }
      pagination {
        page
        limit
        total
        totalPages
      }
    }
  }
`;

// PYG-360 [FE] Caregiver check-in — single booking by id, with the day-of-contact fields the
// check-in and service-progress screens need on top of the shared summary fields (which already
// include locationLat/locationLng).
// Backend: caregiverBooking(id) is a planned addition (see implementation plan §3.1) — not yet
// deployed, so this query will error until it ships. The page handles that gracefully (falls
// back to router state / shows the existing "not found" state).
export const GET_CAREGIVER_BOOKING = gql`
  query GetCaregiverBooking($id: ID!) {
    caregiverBooking(id: $id) {
      ${CAREGIVER_BOOKING_SUMMARY_FIELDS}
      dayOfContactName
      dayOfContactPhone
      dayOfContactRelationship
    }
  }
`;

export const CHECK_IN_BOOKING = gql`
  mutation CheckInBooking($input: CheckInInput!) {
    checkInBooking(input: $input) {
      id
      bookingId
      eventType
      source
      lat
      lng
      distanceM
      accuracyM
      serverTs
      deviceTs
      gpsAccuracyLow
      jobCoordsMissing
      withinWarnRadius
      reviewReasons
      alreadyCheckedIn
    }
  }
`;

export const GET_PROOF_OF_WORK = gql`
  query GetProofOfWork($bookingId: ID!) {
    proofOfWork(bookingId: $bookingId) {
      checkIn {
        serverTs
        distanceM
        accuracyM
        reviewReasons
        gpsAccuracyLow
        withinWarnRadius
      }
      checkOut {
        serverTs
        distanceM
        accuracyM
        reviewReasons
      }
      actualMinutes
      bookedMinutes
      distanceInM
      distanceOutM
      durationOk
      noCheckout
      jobCoordsMissing
      reviewReasons
      disputed
      verdict
    }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(input: { email: $email }) {
      success
      message
    }
  }
`;

export const COMPLETE_BOOKING = gql`
  mutation CompleteBooking($bookingId: ID!) {
    completeBooking(bookingId: $bookingId) {
      bookingId
      status
    }
  }
`;

export const CREATE_REVIEW = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      comment
      isAnonymous
      createdAt
    }
  }
`;

export const CAREGIVER_REVIEWS = gql`
  query CaregiverReviews($input: CaregiverReviewsInput!) {
    caregiverReviews(input: $input) {
      data {
        id
        rating
        comment
        reviewerName
        isAnonymous
        isVisible
        createdAt
      }
      pagination { page limit total totalPages }
    }
  }
`;

export const ACCEPT_BOOKING = gql`
  mutation AcceptBooking($bookingId: ID!) {
    acceptBooking(bookingId: $bookingId) {
      id
      status
      acceptedAt
    }
  }
`;

export const DECLINE_BOOKING = gql`
  mutation DeclineBooking($input: DeclineBookingInput!) {
    declineBooking(input: $input) {
      id
      status
      rejectionReason
    }
  }
`;

export const CANCEL_ACCEPTANCE = gql`
  mutation CancelAcceptance($input: CancelAcceptanceInput!) {
    cancelAcceptance(input: $input) {
      id
      status
      rejectionReason
    }
  }
`;

export const CREATE_PAYMENT = gql`
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      paymentStatus
      omiseChargeId
      amount
      currency
      qrCodeUrl
    }
  }
`;

export const GET_PAYMENT_HISTORY = gql`
  query GetPaymentHistory($paymentId: ID!) {
    paymentHistory(paymentId: $paymentId) {
      id
      paymentId
      fromStatus
      toStatus
      reason
      changedBy
      createdAt
    }
  }
`;

export const GET_PAYMENT_BY_BOOKING = gql`
  query GetPaymentByBooking($bookingId: ID!) {
    paymentByBooking(bookingId: $bookingId) {
      id
      paymentStatus
      paymentMethod
      qrCodeUrl
    }
  }
`;

export const FLAG_BOOKING_DISPUTE = gql`
  mutation FlagBookingDispute($bookingId: ID!, $reason: String!) {
    flagBookingDispute(input: { bookingId: $bookingId, reason: $reason }) {
      id
      disputeStatus
    }
  }
`;

export const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($newPassword: String!) {
    updatePassword(input: { newPassword: $newPassword }) {
      success
      message
    }
  }
`;

// TODO: Backend ยังไม่มี — stub สำหรับ SP-2 Complete Service
export const GET_BOOKING_DETAIL = gql`
  query GetBookingDetail($bookingId: ID!) {
    bookingDetail(bookingId: $bookingId) {
      id
      status
      paymentStatus
      serviceType
      serviceLocations
      timeSlot
      bookingDate
      startTime
      durationHours
      estimatedCost
      locationAddress
      patient {
        id
        displayName
        avatarUrl
      }
      caregiver {
        id
        fullName
        avatarUrl
      }
      careRecipientName
      acceptedAt
      confirmedAt
      completedAt
      rejectionReason
      createdAt
    }
  }
`;

// TODO: Backend ยังไม่มี — stub สำหรับ SP-2 Complete Service
export const COMPLETE_SERVICE = gql`
  mutation CompleteService($bookingId: ID!) {
    completeService(bookingId: $bookingId) {
      id
      status
      completedAt
    }
  }
`;

// TODO: Backend ยังไม่มี — stub สำหรับ SP-1 Admin Payments
export const ADMIN_PENDING_TRANSFERS = gql`
  query AdminPendingTransfers($page: Int, $limit: Int) {
    adminPendingTransfers(page: $page, limit: $limit) {
      items {
        id
        caregiverName
        bookingId
        amount
        serviceDate
        status
      }
      total
      page
      totalPages
    }
  }
`;

export const ADMIN_DISPUTES = gql`
  query AdminDisputes($page: Int, $limit: Int) {
    adminDisputes(page: $page, limit: $limit) {
      items {
        id
        bookingId
        patientName
        caregiverName
        reason
        flaggedAt
        paymentAmount
        serviceType
        bookingDate
        disputeReason
      }
      total
      page
      totalPages
    }
  }
`;

export const ADMIN_REFUND_HISTORY = gql`
  query AdminRefundHistory($page: Int, $limit: Int) {
    adminRefundHistory(page: $page, limit: $limit) {
      items {
        id
        bookingId
        patientName
        amount
        resolution
        resolvedBy
        resolvedAt
      }
      total
      page
      totalPages
    }
  }
`;

// PYG-317 — Admin Dispute Queue (ตรงตาม schema จริง: adminDisputes → DisputeSummaryConnection)
export const ADMIN_DISPUTE_QUEUE = gql`
  query AdminDisputeQueue(
    $disputeStatus: DisputeStatus
    $filedBy: DisputeFiledBy
    $q: String
    $sortBy: DisputeSortBy
    $page: Int
    $limit: Int
  ) {
    list: adminDisputes(input: {
      disputeStatus: $disputeStatus
      filedBy: $filedBy
      q: $q
      sortBy: $sortBy
      page: $page
      limit: $limit
    }) {
      nodes {
        id
        bookingId
        filedBy
        amount
        currency
        filedAt
        slaDueAt
        status
        patient { id displayName email }
        caregiver { id displayName email }
      }
      totalCount
      page
      limit
      hasNextPage
    }
    allCount: adminDisputes(input: { page: 1, limit: 1 }) { totalCount }
    flaggedCount: adminDisputes(input: { disputeStatus: flagged, page: 1, limit: 1 }) { totalCount }
    resolvedCount: adminDisputes(input: { disputeStatus: resolved, page: 1, limit: 1 }) { totalCount }
  }
`;

// PYG-317 — badge count คำร้องรอตรวจสอบ (สำหรับ sidebar)
export const ADMIN_DISPUTE_PENDING_COUNT = gql`
  query AdminDisputePendingCount {
    flaggedCount: adminDisputes(input: { disputeStatus: flagged, page: 1, limit: 1 }) {
      totalCount
    }
  }
`;

export const RESOLVE_DISPUTE = gql`
  mutation ResolveDispute($input: ResolveDisputeInput!) {
    resolveDispute(input: $input) {
      id
      resolution
      amount
      resolvedAt
    }
  }
`;

// ══════════════════════════════════════════════════════════════════════════
// PYG-358 — proof of work (เช็คอิน / เช็คเอาท์)
// ══════════════════════════════════════════════════════════════════════════

const JOB_EVENT_FIELDS = `
  id
  bookingId
  eventType
  source
  lat
  lng
  distanceM
  accuracyM
  serverTs
  deviceTs
  note
  photoUrl
  gpsAccuracyLow
  jobCoordsMissing
  withinWarnRadius
  reviewReasons
  alreadyCheckedIn
`;

/**
 * สรุปหลักฐานการทำงาน — "แหล่งความจริงเดียว" ของหน้าปิดงาน
 *
 * ★ เวลาเช็คอินและเวลาทำงานจริงต้องอ่านจากที่นี่เท่านั้น ห้ามคำนวณจากนาฬิกาเครื่อง
 */
export const PROOF_OF_WORK = gql`
  query ProofOfWork($bookingId: ID!) {
    proofOfWork(bookingId: $bookingId) {
      checkIn { ${JOB_EVENT_FIELDS} }
      checkOut { ${JOB_EVENT_FIELDS} }
      actualMinutes
      bookedMinutes
      distanceInM
      distanceOutM
      durationOk
      noCheckout
      jobCoordsMissing
      reviewReasons
      disputed
      verdict
    }
  }
`;

/** ผู้ดูแลกดปิดงานเอง — ผู้รับบริการไม่ต้องยืนยันอะไรอีก (ทีมตัดสินใจ 2026-07-27) */
export const CHECK_OUT_BOOKING = gql`
  mutation CheckOutBooking($input: CheckOutInput!) {
    checkOutBooking(input: $input) {
      ${JOB_EVENT_FIELDS}
    }
  }
`;
