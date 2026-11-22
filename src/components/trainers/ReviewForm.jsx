// src/components/trainers/ReviewForm.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { catalogService } from '../../services/catalogService';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl } from '../../i18n';

const MAX = 1000;

/** A member's star rating + comment. `trainer` is whatever is reviewed (a coach, or a course with `send`). */
export default function ReviewForm({ trainer, onSaved, send, heading, placeholder }) {
  const mine = trainer.my_review;
  const [rating, setRating] = useState(mine?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(mine?.comment || '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (!trainer.can_review) {
    return trainer.review_hint ? (
      <p className="text-[13px] text-on-surface-variant rounded-xl bg-surface-container-low p-4 flex gap-2 items-start">
        <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">
          info
        </span>
        <span>{tl(trainer.review_hint)}</span>
      </p>
    ) : null;
  }

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!rating) found.rating = tl('Choose a rating from 1 to 5 stars.');
    if (comment.trim().length > MAX) found.comment = tl('Keep your review under 1000 characters.');
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = { rating, comment: comment.trim() };
      await (send ? send(body) : catalogService.reviewTrainer(trainer.id, body));
      toast.success(tl('Thanks! Your review will show once the gym approves it.'), { duration: 6000 });
      onSaved?.();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Couldn’t save your review.')));
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-xl bg-surface-container border border-surface-container-high p-4 flex flex-col gap-3"
      aria-labelledby="review-form-title"
    >
      <h3 id="review-form-title" className="text-on-surface font-bold">
        {mine ? tl('Your review') : heading || tl('Rate your coach')}
      </h3>
      {mine?.status === 'pending' && (
        <p className="text-[12px] text-amber-400">{tl('Waiting for the gym to approve it — only you can see it for now.')}</p>
      )}
      {mine?.status === 'rejected' && (
        <p className="text-[12px] text-error">{tl('The gym didn’t approve this review. You can edit it and send it again.')}</p>
      )}

      <fieldset className="border-0 p-0 m-0">
        <legend className="sr-only">{tl('Rating')}</legend>
        <div
          className="flex gap-1"
          role="radiogroup"
          aria-label={tl('Rating')}
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={tl('{0} stars', { 0: n })}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(0)}
              onClick={() => {
                setRating(n);
                setErrors((x) => ({ ...x, rating: '' }));
              }}
              className="p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <span
                className={`material-symbols-outlined text-[28px] ${
                  n <= shown ? 'text-amber-400' : 'text-on-surface-variant/40'
                }`}
                style={{ fontVariationSettings: n <= shown ? "'FILL' 1" : "'FILL' 0" }}
                aria-hidden="true"
              >
                star
              </span>
            </button>
          ))}
        </div>
        {errors.rating && (
          <p role="alert" className="text-[12px] text-error mt-1">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="review-comment" className="sr-only">
          {tl('Your review')}
        </label>
        <textarea
          id="review-comment"
          rows={3}
          value={comment}
          maxLength={MAX + 50}
          onChange={(e) => {
            setComment(e.target.value);
            setErrors((x) => ({ ...x, comment: '' }));
          }}
          placeholder={placeholder || tl('What was training with them like? (optional)')}
          aria-invalid={!!errors.comment}
          aria-describedby="review-comment-help"
          className={`w-full bg-surface-container-low text-on-surface px-3 py-2 rounded-lg border text-[14px] focus:outline-none ${
            errors.comment
              ? 'border-error'
              : 'border-surface-container-high focus:border-primary'
          }`}
        />
        <div id="review-comment-help" className="flex justify-between text-[11px] mt-1">
          <span className="text-error" role="alert">
            {errors.comment}
          </span>
          <span className={comment.length > MAX ? 'text-error' : 'text-on-surface-variant'} aria-hidden="true">
            {comment.length}/{MAX}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-fit px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold text-[13px] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        {busy ? tl('Saving…') : mine ? tl('Update review') : tl('Post review')}
      </button>
    </form>
  );
}