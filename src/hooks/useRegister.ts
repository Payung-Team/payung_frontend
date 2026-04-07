import { useMutation } from '@apollo/client/react';
import { REGISTER_USER } from '../graphql/queries';

export interface RegisterData {
  email: string;
  password: string;
  role: string;
}

export function useRegister() {
  const [registerUserMutation, { loading, error: mutationError }] = useMutation(REGISTER_USER);

  const registerUser = async (data: RegisterData) => {
    try {
      const response = await registerUserMutation({
        variables: data
      });
      return { data: response.data, error: null };
    } catch (err: any) {
      console.error('Registration Mutation Error:', err);
      const errorMessage = err.message || '';
      let displayError = 'เกิดข้อผิดพลาดในการลงทะเบียน';
      
      if (errorMessage.includes('Email is already in use') || errorMessage.includes('Unique constraint failed') || errorMessage.toLowerCase().includes('already exists')) {
        displayError = 'อีเมลนี้ถูกใช้งานแล้ว';
      } else if (errorMessage) {
        displayError = errorMessage;
      }
      
      return { data: null, error: displayError };
    }
  };

  // เรา export registerUser (ฟังก์ชันที่ครอบ error handling แล้ว) ส่งต่อให้ UI ใช้
  return { registerUser, loading, error: mutationError };
}
