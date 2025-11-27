/**
 * Common IANA timezone identifiers
 * Organized by region for better discoverability
 */
export const TIMEZONES = [
  // Africa
  { value: "Africa/Cairo", label: "Africa/Cairo (Egypt)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (South Africa)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (Nigeria)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (Kenya)" },

  // America - North America
  { value: "America/New_York", label: "America/New_York (US Eastern)" },
  { value: "America/Chicago", label: "America/Chicago (US Central)" },
  { value: "America/Denver", label: "America/Denver (US Mountain)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (US Pacific)" },
  { value: "America/Anchorage", label: "America/Anchorage (Alaska)" },
  { value: "America/Phoenix", label: "America/Phoenix (Arizona)" },
  { value: "America/Toronto", label: "America/Toronto (Canada Eastern)" },
  { value: "America/Vancouver", label: "America/Vancouver (Canada Pacific)" },
  { value: "America/Mexico_City", label: "America/Mexico_City (Mexico)" },

  // America - Central & South America
  { value: "America/Buenos_Aires", label: "America/Buenos_Aires (Argentina)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (Brazil)" },
  { value: "America/Santiago", label: "America/Santiago (Chile)" },
  { value: "America/Bogota", label: "America/Bogota (Colombia)" },
  { value: "America/Lima", label: "America/Lima (Peru)" },
  { value: "America/Caracas", label: "America/Caracas (Venezuela)" },

  // Asia - East Asia
  { value: "Asia/Tokyo", label: "Asia/Tokyo (Japan)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (South Korea)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (China)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong" },
  { value: "Asia/Taipei", label: "Asia/Taipei (Taiwan)" },

  // Asia - Southeast Asia
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta (Indonesia)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (Thailand)" },
  { value: "Asia/Kuala_Lumpur", label: "Asia/Kuala_Lumpur (Malaysia)" },
  { value: "Asia/Manila", label: "Asia/Manila (Philippines)" },
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (Vietnam)" },
  { value: "Asia/Yangon", label: "Asia/Yangon (Myanmar)" },

  // Asia - South Asia
  { value: "Asia/Kolkata", label: "Asia/Kolkata (India)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (Pakistan)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (Bangladesh)" },
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu (Nepal)" },
  { value: "Asia/Colombo", label: "Asia/Colombo (Sri Lanka)" },

  // Asia - Middle East
  { value: "Asia/Dubai", label: "Asia/Dubai (UAE)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (Saudi Arabia)" },
  { value: "Asia/Tehran", label: "Asia/Tehran (Iran)" },
  { value: "Asia/Jerusalem", label: "Asia/Jerusalem (Israel)" },
  { value: "Asia/Istanbul", label: "Asia/Istanbul (Turkey)" },

  // Australia & Pacific
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane" },
  { value: "Australia/Perth", label: "Australia/Perth" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (New Zealand)" },
  { value: "Pacific/Fiji", label: "Pacific/Fiji" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (Hawaii)" },

  // Europe - Western Europe
  { value: "Europe/London", label: "Europe/London (UK)" },
  { value: "Europe/Dublin", label: "Europe/Dublin (Ireland)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (Portugal)" },

  // Europe - Central Europe
  { value: "Europe/Paris", label: "Europe/Paris (France)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (Germany)" },
  { value: "Europe/Rome", label: "Europe/Rome (Italy)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (Spain)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (Netherlands)" },
  { value: "Europe/Brussels", label: "Europe/Brussels (Belgium)" },
  { value: "Europe/Vienna", label: "Europe/Vienna (Austria)" },
  { value: "Europe/Zurich", label: "Europe/Zurich (Switzerland)" },
  { value: "Europe/Stockholm", label: "Europe/Stockholm (Sweden)" },
  { value: "Europe/Oslo", label: "Europe/Oslo (Norway)" },
  { value: "Europe/Copenhagen", label: "Europe/Copenhagen (Denmark)" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw (Poland)" },

  // Europe - Eastern Europe
  { value: "Europe/Athens", label: "Europe/Athens (Greece)" },
  { value: "Europe/Bucharest", label: "Europe/Bucharest (Romania)" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki (Finland)" },
  { value: "Europe/Kiev", label: "Europe/Kiev (Ukraine)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (Russia)" },

  // UTC
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
] as const;

/**
 * Get timezone by value
 */
export function getTimezoneByValue(value: string) {
  return TIMEZONES.find(tz => tz.value === value);
}

/**
 * Search timezones by query
 */
export function searchTimezones(query: string) {
  const lowerQuery = query.toLowerCase();
  return TIMEZONES.filter(
    tz =>
      tz.value.toLowerCase().includes(lowerQuery) ||
      tz.label.toLowerCase().includes(lowerQuery)
  );
}
