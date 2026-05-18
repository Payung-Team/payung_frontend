export function getPostLoginRedirect(user: {
  role: number;
  mustChangePassword: boolean;
}): string {
  if (user.mustChangePassword) {
    return '/change-password';
  }

  switch (user.role) {
    case 3:
    case 4:
      return '/admin';
    case 2:
      return '/caregiver-home';
    case 1:
    default:
      return '/patient-home';
  }
}
