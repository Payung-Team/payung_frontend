import { useMutation } from '@apollo/client/react';
import { REGISTER_USER } from '../graphql/queries';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logGraphQLError } from '../lib/logGraphQLError';
import { extractGraphQLErrorCode } from '../lib/apolloErrors';
import { CONSENT_ERROR, type ConsentAnswer } from '../graphql/consent';

export interface RegisterData {
  email: string;
  password: string;
  role: number; // 1 = patient, 2 = caregiver
  /**
   * PYG-475 — คำตอบความยินยอมของทุกข้อที่หน้าสมัครแสดง (จาก consentPolicy source: "register")
   * ข้อที่ไม่ติ๊กก็ต้องส่ง granted: false มาด้วย ไม่ใช่ตัดออก
   * policyVersion มาจาก consentPolicy.version ห้าม hardcode
   */
  consents: ConsentAnswer[];
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
          // set flag ก่อน setSession เพื่อป้องกัน race condition
          // (GuestRoute อาจ re-render จาก onAuthStateChange ก่อนที่ flag จะถูก set)
          if (user) {
            localStorage.setItem('is_registering', 'true');
            setUserRole(user.role);
          }

          // เซ็ต session ใน Supabase
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        }
      }
      // ไม่ log response — ในนั้นมี accessToken/refreshToken และข้อมูลผู้ใช้

      return { data: response.data, error: null };
    } catch (err: any) {
      logGraphQLError('Register', err);
      const errorMessage = err.message || '';
      let displayError = 'เกิดข้อผิดพลาดในการลงทะเบียน';
      
      // PYG-475: BE ส่ง code เรื่องความยินยอมมาใน extensions.code (ConsentError ของ PYG-474)
      //   แปลเป็นสิ่งที่ผู้ใช้ต้องทำต่อ — ข้อความดิบไม่ได้บอกว่าต้องติ๊กอะไรหรือต้องรีเฟรช
      const code = extractGraphQLErrorCode(err);
      if (code === CONSENT_ERROR.VERSION_MISMATCH) {
        return {
          data: null,
          error: 'นโยบายความเป็นส่วนตัวมีฉบับใหม่แล้ว กรุณารีเฟรชหน้าเว็บแล้วอ่านอีกครั้ง',
          code,
        };
      }
      if (code && code.startsWith('CONSENT_')) {
        return {
          data: null,
          error: 'ต้องให้ความยินยอมข้อที่บังคับก่อนจึงจะสมัครได้',
          code,
        };
      }

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
