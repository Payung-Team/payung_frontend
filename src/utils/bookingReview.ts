import type { BookingReviewData } from '../components/booking/BookingReviewForm';

const REVIEW_STORAGE_PREFIX = 'booking-review-';

export function getStoredReview(bookingId: string): BookingReviewData | null {
  try {
    const raw = localStorage.getItem(`${REVIEW_STORAGE_PREFIX}${bookingId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BookingReviewData;
  } catch {
    return null;
  }
}

export function saveStoredReview(bookingId: string, review: BookingReviewData): void {
  localStorage.setItem(`${REVIEW_STORAGE_PREFIX}${bookingId}`, JSON.stringify(review));
}

/** Mock preset for testing already-reviewed state — use booking id ending with `-reviewed` */
export function getMockPresetReview(bookingId: string): BookingReviewData | null {
  if (!bookingId.endsWith('-reviewed')) return null;
  return {
    rating: 5,
    text: 'ผู้ดูแลดูแลดีมาก ตรงเวลาและใส่ใจรายละเอียด',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function getBookingReview(bookingId: string): BookingReviewData | null {
  return getStoredReview(bookingId) ?? getMockPresetReview(bookingId);
}
