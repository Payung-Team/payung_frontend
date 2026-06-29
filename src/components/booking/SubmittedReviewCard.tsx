import React from 'react';
import type { BookingReviewData } from './BookingReviewForm';
import '../../styles/review-page.css';

const RATING_LABELS: Record<number, string> = {
  1: 'แย่',
  2: 'พอใช้',
  3: 'ดี',
  4: 'ดีมาก',
  5: 'ยอดเยี่ยม',
};

function SubmittedStarIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`submitted-star-icon${active ? ' active' : ''}`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

interface SubmittedReviewCardProps {
  caregiverName: string;
  caregiverAvatarUrl?: string;
  review: BookingReviewData;
}

export const SubmittedReviewCard: React.FC<SubmittedReviewCardProps> = ({
  caregiverName,
  caregiverAvatarUrl,
  review,
}) => (
  <div className="review-card submitted-review-card">
    <span className="reviewed-badge">คุณรีวิวแล้ว</span>

    <div className="caregiver-details" style={{ marginBottom: 16 }}>
      <div className="avatar-container">
        <div className="avatar-circle">
          {caregiverAvatarUrl ? (
            <img src={caregiverAvatarUrl} alt={caregiverName} />
          ) : (
            caregiverName.charAt(0) || 'ด'
          )}
        </div>
      </div>
      <h2 className="caregiver-name">{caregiverName}</h2>
    </div>

    <div className="submitted-stars" aria-label={`คะแนน ${review.rating} จาก 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <SubmittedStarIcon key={value} active={value <= review.rating} />
      ))}
    </div>

    <p className="submitted-rating-label">{RATING_LABELS[review.rating]}</p>

    {review.text ? (
      <p className="submitted-review-text">{review.text}</p>
    ) : (
      <p className="submitted-review-text" style={{ fontStyle: 'italic', color: '#8A8C8E' }}>
        ไม่ได้เขียนรีวิวเพิ่มเติม
      </p>
    )}
  </div>
);

export default SubmittedReviewCard;
