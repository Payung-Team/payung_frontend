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
      }
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
      fullName
      phone
      address
      bio
      hourlyRate
      skills
      experienceYears
      kycStatus
      isSearchable
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
      updatedAt
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($displayName: String, $phone: String, $address: String, $bio: String) {
    updateProfile(input: {
      displayName: $displayName
      phone: $phone
      address: $address
      bio: $bio
    }) {
      id
      email
      displayName
      phone
      address
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