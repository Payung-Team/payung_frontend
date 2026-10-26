import { useRef, useState, type ChangeEvent } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import PhotoCropModal from '../../../components/caregiver/PhotoCropModal';
import { validatePhotoSourceFile } from '../../../lib/profilePhotoCrop';
import { uploadFamilyGroupAvatar } from '../../../lib/familyGroupAvatar';
import {
  MY_FAMILY_GROUPS,
  REMOVE_FAMILY_GROUP_AVATAR,
  type FamilyGroup,
} from '../../../graphql/familyGroup';
import { useStrings } from '../familyStrings';
import { fgErrorMessage } from '../familyErrors';
import { ConfirmDialog } from './familyUi';

const UPLOAD_FAILED = 'อัปโหลดรูปกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';

/**
 * Change / remove the group picture (owner only — the BE re-checks).
 *
 * Reuses the profile-photo pieces: the same file check, the same crop modal (square JPEG,
 * EXIF-rotated, HEIC → JPEG) and the same upload helper. Returns the actions for the header
 * card / menu plus `dialogs`, the hidden file input and modals the page renders once.
 */
export function useGroupPhotoEditor(
  group: FamilyGroup | null,
  onToast: (message: string, kind?: 'success' | 'error') => void,
) {
  const s = useStrings();
  const client = useApolloClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removeAvatar, { loading: removing }] = useMutation<{
    removeFamilyGroupAvatar: Pick<FamilyGroup, 'id' | 'avatarUrl'>;
  }>(REMOVE_FAMILY_GROUP_AVATAR);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so picking the same file again still fires onChange
    e.target.value = '';
    if (!file) return;
    const invalid = validatePhotoSourceFile(file);
    if (invalid) {
      onToast(invalid, 'error');
      return;
    }
    setPickedFile(file);
  };

  const handleCropConfirm = async (jpeg: Blob) => {
    setPickedFile(null);
    if (!group) return;
    setUploading(true);
    try {
      const { avatarUrl } = await uploadFamilyGroupAvatar(group.id, jpeg);
      if (avatarUrl) {
        client.cache.modify({
          id: client.cache.identify({ __typename: 'FamilyGroup', id: group.id }),
          fields: { avatarUrl: () => avatarUrl },
        });
      } else {
        // Uploaded but the BE couldn't sign a URL this time — reload the list to pick it up.
        await client.refetchQueries({ include: [MY_FAMILY_GROUPS] });
      }
      onToast(s.toastGroupPhotoChanged, 'success');
    } catch (err) {
      // fetch() network failures are English TypeErrors; BE errors already come in Thai.
      onToast(err instanceof Error && !(err instanceof TypeError) ? err.message : UPLOAD_FAILED, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!group) return;
    try {
      // The result carries { id, avatarUrl: null } — Apollo updates the cached group itself.
      await removeAvatar({ variables: { groupId: group.id } });
      setConfirmingRemove(false);
      onToast(s.toastGroupPhotoRemoved, 'success');
    } catch (err) {
      onToast(fgErrorMessage(err), 'error');
    }
  };

  const dialogs = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      {pickedFile && (
        <PhotoCropModal
          file={pickedFile}
          title={s.groupPhotoCropTitle}
          tips={[]}
          onCancel={() => setPickedFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
      {confirmingRemove && (
        <ConfirmDialog
          onClose={() => setConfirmingRemove(false)}
          onConfirm={handleRemove}
          loading={removing}
          icon="hide_image"
          iconBg="bg-[#DC2626]"
          confirmBg="bg-[#DC2626]"
          confirmHover="hover:bg-[#B91C1C]"
          title={s.removeGroupPhotoTitle}
          cancelText={s.cancel}
          confirmText={s.removeGroupPhotoCta}
          busyText={s.busyRemoving}
        >
          {s.removeGroupPhotoBody}
        </ConfirmDialog>
      )}
    </>
  );

  return {
    pickPhoto: () => inputRef.current?.click(),
    askRemovePhoto: () => setConfirmingRemove(true),
    uploading,
    dialogs,
  };
}
