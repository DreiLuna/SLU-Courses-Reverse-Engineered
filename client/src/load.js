// Credit-load guidance shown with the cart. Typical undergraduate limits; programs differ, so the wording says "usually".
export const FULL_TIME_MIN = 12;
export const OVERLOAD_OVER = 18;

/** -> { level: "ok"|"low"|"high", text } or null for an empty cart */
export function loadMessage(credits) {
  if (credits <= 0) return null;
  if (credits > OVERLOAD_OVER) {
    return { level: "high", text: `${credits} credit hours is an overload. More than ${OVERLOAD_OVER} usually needs advisor approval.` };
  }
  if (credits < FULL_TIME_MIN) {
    return { level: "low", text: `${credits} credit hours is part-time. Under ${FULL_TIME_MIN} can affect financial aid and housing.` };
  }
  return { level: "ok", text: `${credits} credit hours is a full-time load.` };
}
