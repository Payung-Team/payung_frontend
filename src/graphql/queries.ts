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
      kycStatus
      kycSubmittedAt
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