export const VIEW_PERIODS = ["week", "fortnight", "month", "quarter", "year"] as const;
export type ViewPeriod = (typeof VIEW_PERIODS)[number];

export function isValidViewPeriod(v: string | undefined): v is ViewPeriod {
  return VIEW_PERIODS.includes(v as ViewPeriod);
}

export const AVG_YEAR = 365.25;

/** Days in each budget's native period (for pro-rating). */
export const BUDGET_PERIOD_DAYS: Record<string, number> = {
  weekly:       7,
  fortnightly:  14,
  monthly:      AVG_YEAR / 12,
  quarterly:    AVG_YEAR / 4,
  annual:       AVG_YEAR,
  biennial:     AVG_YEAR * 2,
  triennial:    AVG_YEAR * 3,
  quinquennial: AVG_YEAR * 5,
  decennial:    AVG_YEAR * 10,
};

/** Days in each selectable view window. */
export const VIEW_PERIOD_DAYS: Record<ViewPeriod, number> = {
  week:      7,
  fortnight: 14,
  month:     AVG_YEAR / 12,
  quarter:   AVG_YEAR / 4,
  year:      AVG_YEAR,
};
