/**
 * อัปโหลดรูปกลุ่มครอบครัว (เจ้าของกลุ่มเท่านั้น — BE ตรวจซ้ำ)
 *
 * รับ JPEG ที่ครอปเป็นสี่เหลี่ยมจัตุรัสมาแล้ว (PhotoCropModal → cropToSquareJpeg)
 * ลบรูปใช้ mutation REMOVE_FAMILY_GROUP_AVATAR แทน (src/graphql/familyGroup.ts)
 */
import { postJpegPhoto } from './profilePhoto';

export interface FamilyGroupAvatarResult {
  /** signed URL ของรูปใหม่ (หมดอายุ 1 ชม.) — null ถ้า BE sign ไม่สำเร็จ */
  avatarUrl: string | null;
}

export function uploadFamilyGroupAvatar(groupId: string, jpeg: Blob): Promise<FamilyGroupAvatarResult> {
  return postJpegPhoto<FamilyGroupAvatarResult>(
    `/api/v1/family-groups/${encodeURIComponent(groupId)}/avatar`,
    jpeg,
    'group.jpg',
    'อัปโหลดรูปกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  );
}
