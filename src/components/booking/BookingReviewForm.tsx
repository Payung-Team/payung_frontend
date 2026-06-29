import React, { useState } from 'react';
import '../../styles/review-page.css';

const RATING_LABELS: Record<number, string> = {
  1: 'แย่',
  2: 'พอใช้',
  3: 'ดี',
  4: 'ดีมาก',
  5: 'ยอดเยี่ยม',
};

const MAX_REVIEW_LENGTH = 500;

function StarIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`star-icon${active ? ' active' : ''}`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

export interface BookingReviewData {
  rating: number;
  text: string;
  submittedAt: string;
}

interface BookingReviewFormProps {
  caregiverName: string;
  caregiverAvatarUrl?: string;
  onBack: () => void;
  onSubmit: (review: BookingReviewData) => void;
  isSubmitting?: boolean;
}

export const BookingReviewForm: React.FC<BookingReviewFormProps> = ({
  caregiverName,
  caregiverAvatarUrl,
  onBack,
  onSubmit,
  isSubmitting = false,
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');

  const displayRating = hoverRating || rating;

  const handleSubmit = () => {
    if (!rating || isSubmitting) return;
    onSubmit({
      rating,
      text: text.trim(),
      submittedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="review-page-container">
      <div className="review-header">
        <button type="button" className="back-btn" title="ย้อนกลับ" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#575859" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="review-header-title">รีวิวผู้ดูแล</h1>
      </div>

      <div className="status-pill">
        <span className="status-pill-dot" />
        ให้คะแนนและรีวิว
      </div>

      <div className="review-form-wrapper">
        <div className="review-card caregiver-info-card">
          <div className="card-subtitle">คุณกำลังรีวิว</div>
          <div className="caregiver-details">
            <div className="avatar-container">
              <div className="avatar-circle">
                {caregiverAvatarUrl ? (
                  <img src={caregiverAvatarUrl} alt={caregiverName} />
                ) : (
                  caregiverName.charAt(0) || 'ด'
                )}
              </div>
              <div className="avatar-verified-badge" title="ยืนยันตัวตนแล้ว">
                <svg className="avatar-verified-icon" viewBox="0 0 24 24" aria-hidden>
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </div>
            <h2 className="caregiver-name">{caregiverName}</h2>
          </div>
        </div>

        <div className="review-card">
          <h3 className="card-title">ประสบการณ์ของคุณเป็นอย่างไร?</h3>
          <div className="stars-container" role="radiogroup" aria-label="ให้คะแนน">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="star-btn"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} ดาว - ${RATING_LABELS[value]}`}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <StarIcon active={value <= displayRating} />
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <p className="rating-feedback-text">{RATING_LABELS[displayRating]}</p>
          )}
        </div>

        <div className="review-card">
          <h3 className="card-title">เขียนรีวิวเพิ่มเติม</h3>
          <textarea
            className="textarea-review"
            rows={4}
            placeholder="แชร์ประสบการณ์ของคุณ (ไม่บังคับ)"
            maxLength={MAX_REVIEW_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="char-count">
            {text.length}/{MAX_REVIEW_LENGTH}
          </div>
        </div>

        <button
          type="button"
          className="btn-submit-review"
          disabled={!rating || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
          <svg className="btn-submit-icon" viewBox="0 0 24 24" aria-hidden>
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BookingReviewForm;
