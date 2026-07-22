export type HostEarningsEstimate = {
  subscribers: number;
  showsPerMonth: number;
  avgViewersPerShow: number;
  earningsPerShow: number;
  monthlyEarnings: number;
};

/** Illustrative model for the apply-page slider — not a guarantee. */
export function estimateHostEarnings(subscribers: number): HostEarningsEstimate {
  const showsPerMonth = Math.min(
    8,
    Math.max(3, Math.round(2 + Math.log10(Math.max(subscribers, 1000)) * 1.8)),
  );

  const attendanceRate =
    subscribers < 10_000 ? 0.08 : subscribers < 100_000 ? 0.06 : 0.04;
  const avgViewersPerShow = Math.round(subscribers * attendanceRate);
  const purchasesPerShow = avgViewersPerShow * 0.05;
  const earningsPerShow = purchasesPerShow * 85 * 0.12;
  const monthlyEarnings = Math.round(earningsPerShow * showsPerMonth);

  return {
    subscribers,
    showsPerMonth,
    avgViewersPerShow,
    earningsPerShow: Math.round(earningsPerShow),
    monthlyEarnings,
  };
}

export const SUBSCRIBER_SLIDER_STEPS = [
  1_000,
  2_500,
  5_000,
  10_000,
  25_000,
  50_000,
  100_000,
  250_000,
  500_000,
  1_000_000,
] as const;

export function subscribersFromSliderValue(value: number): number {
  const index = Math.round(
    (value / 100) * (SUBSCRIBER_SLIDER_STEPS.length - 1),
  );
  return SUBSCRIBER_SLIDER_STEPS[
    Math.min(SUBSCRIBER_SLIDER_STEPS.length - 1, Math.max(0, index))
  ];
}

export function sliderValueFromSubscribers(subscribers: number): number {
  let closestIndex = 0;
  let closestDistance = Infinity;

  SUBSCRIBER_SLIDER_STEPS.forEach((step, index) => {
    const distance = Math.abs(step - subscribers);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return (closestIndex / (SUBSCRIBER_SLIDER_STEPS.length - 1)) * 100;
}
