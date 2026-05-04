import { useMutation } from '@apollo/client/react';
import { REGISTER_USER } from '../graphql/queries';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface RegisterData {
  email: string;
  password: string;
  role: number; // 1 = patient, 2 = caregiver
}

export interface RegisterResponse {
  register: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: number; // เปลี่ยนเป็น number ตามที่ backend ส่งกลับมา
    };
  };
}

export function useRegister() {
  // ระบุให้ useMutation รู้ชัดเจนว่าข้อมูลที่จะได้กลับคืนมาคือ RegisterResponse 
  // และข้อมูลที่จะส่งเข้าไปคือ RegisterData
  const [registerUserMutation, { loading, error: mutationError }] = useMutation<RegisterResponse, RegisterData>(REGISTER_USER);
  const { setUserRole } = useAuth();

  const registerUser = async (data: RegisterData) => {
    try {
      const response = await registerUserMutation({
        variables: data
      });

      // ดึง tokens จาก response และเซ็ต session ใน supabase เพื่อให้ user ล็อกอินทันที
      const registerData = response.data?.register;
      if (registerData) {
        const { accessToken, refreshToken, user } = registerData;
        if (accessToken && refreshToken) {
          // เซ็ต session ใน Supabase
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          // เก็บ role ไว้ใน auth context
          if (user) {
            setUserRole(user.role);
          }
        }
      }
      console.log('Registration Mutation Response:', response);

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
