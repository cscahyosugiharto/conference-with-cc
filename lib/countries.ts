export type CountryDial = {
  iso: string;
  name: string;
  dial: string;
};

/** Indonesia first; then a compact international list for the WhatsApp selector. */
export const COUNTRY_DIALS: CountryDial[] = [
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "VN", name: "Vietnam", dial: "+84" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "KR", name: "South Korea", dial: "+82" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "TR", name: "Türkiye", dial: "+90" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "HK", name: "Hong Kong", dial: "+852" },
  { iso: "TW", name: "Taiwan", dial: "+886" },
  { iso: "BN", name: "Brunei", dial: "+673" },
];

export const DEFAULT_COUNTRY_DIAL = "+62";

export function isKnownDial(dial: string): boolean {
  return COUNTRY_DIALS.some((c) => c.dial === dial);
}
