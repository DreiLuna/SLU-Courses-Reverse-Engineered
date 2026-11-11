// Degree Works panel math (from the Milestone 3 Figma "Component 1" variants, with the mockup's
// hard-coded percentages replaced by real calculations).

/**
 * cartCredits: credits already in the cart this term
 * pendingCredits: credits checked in the panel but not added yet
 * Returns everything the two meters need.
 */
export function degreeMeters({ cartCredits = 0, pendingCredits = 0, completed, required, min, max }) {
  const selected = cartCredits + pendingCredits;
  const projected = Math.min(completed + selected, required);
  const remaining = Math.max(required - projected, 0);
  const percent = required ? Math.round((projected / required) * 100) : 0;
  const completedPercent = required ? Math.round((completed / required) * 100) : 0;

  let status;
  if (selected < min) {
    status = { level: "low", title: "Need attention", detail: `Add ${min - selected} more credit hour${min - selected === 1 ? "" : "s"} to reach the ${min} minimum.` };
  } else if (selected > max) {
    status = { level: "high", title: "Needs attention!", detail: `${selected - max} credit hour${selected - max === 1 ? "" : "s"} over the ${max} maximum.` };
  } else {
    status = { level: "good", title: "Looks good!", detail: `Within ${min} to ${max} credit hours.` };
  }

  return {
    selected,
    cartCredits,
    pendingCredits,
    // bar fills against the max; the cart part is solid, the checked-but-not-added part is striped
    cartWidth: max ? Math.min(cartCredits / max, 1) : 0,
    pendingWidth: max ? Math.max(Math.min(selected / max, 1) - Math.min(cartCredits / max, 1), 0) : 0,
    minMark: max ? Math.min(min / max, 1) : 0,
    projected,
    remaining,
    percent,
    completedPercent,
    status,
  };
}
