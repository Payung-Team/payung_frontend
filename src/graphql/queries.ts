import { gql } from "@apollo/client";

export const REGISTER_USER = gql`
  mutation Register($email: String!, $password: String!, $role: String!) {
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

export const GET_USER = gql`
  query GetUser {
    me {
      id
      email
      displayName
      avatarUrl
      role
    }
  }
`;