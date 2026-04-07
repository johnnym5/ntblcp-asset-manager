/**
 * @fileOverview Canonical Nigerian Administrative Data.
 * Defines the country's zones, states, and capitals for normalization.
 */

export interface StateInfo {
  name: string;
  capital: string;
  zone: string;
  code: string;
  aliases: string[];
}

export const NIGERIAN_GEO_DATA: StateInfo[] = [
  { name: 'Abia', capital: 'Umuahia', zone: 'South East', code: 'AB', aliases: [] },
  { name: 'Adamawa', capital: 'Yola', zone: 'North East', code: 'AD', aliases: [] },
  { name: 'Akwa Ibom', capital: 'Uyo', zone: 'South South', code: 'AK', aliases: [] },
  { name: 'Anambra', capital: 'Awka', zone: 'South East', code: 'AN', aliases: [] },
  { name: 'Bauchi', capital: 'Bauchi', zone: 'North East', code: 'BA', aliases: [] },
  { name: 'Bayelsa', capital: 'Yenagoa', zone: 'South South', code: 'BY', aliases: [] },
  { name: 'Benue', capital: 'Makurdi', zone: 'North Central', code: 'BE', aliases: [] },
  { name: 'Borno', capital: 'Maiduguri', zone: 'North East', code: 'BO', aliases: [] },
  { name: 'Cross River', capital: 'Calabar', zone: 'South South', code: 'CR', aliases: [] },
  { name: 'Delta', capital: 'Asaba', zone: 'South South', code: 'DE', aliases: [] },
  { name: 'Ebonyi', capital: 'Abakaliki', zone: 'South East', code: 'EB', aliases: [] },
  { name: 'Edo', capital: 'Benin City', zone: 'South South', code: 'ED', aliases: [] },
  { name: 'Ekiti', capital: 'Ado Ekiti', zone: 'South West', code: 'EK', aliases: [] },
  { name: 'Enugu', capital: 'Enugu', zone: 'South East', code: 'EN', aliases: [] },
  { name: 'FCT - Abuja', capital: 'Abuja', zone: 'North Central', code: 'FC', aliases: ['Abuja', 'FCT', 'Federal Capital Territory'] },
  { name: 'Gombe', capital: 'Gombe', zone: 'North East', code: 'GO', aliases: [] },
  { name: 'Imo', capital: 'Owerri', zone: 'South East', code: 'IM', aliases: [] },
  { name: 'Jigawa', capital: 'Dutse', zone: 'North West', code: 'JI', aliases: [] },
  { name: 'Kaduna', capital: 'Kaduna', zone: 'North West', code: 'KD', aliases: [] },
  { name: 'Kano', capital: 'Kano', zone: 'North West', code: 'KN', aliases: [] },
  { name: 'Katsina', capital: 'Katsina', zone: 'North West', code: 'KT', aliases: [] },
  { name: 'Kebbi', capital: 'Birnin Kebbi', zone: 'North West', code: 'KE', aliases: [] },
  { name: 'Kogi', capital: 'Lokoja', zone: 'North Central', code: 'KO', aliases: [] },
  { name: 'Kwara', capital: 'Ilorin', zone: 'North Central', code: 'KW', aliases: [] },
  { name: 'Lagos', capital: 'Ikeja', zone: 'South West', code: 'LA', aliases: [] },
  { name: 'Nasarawa', capital: 'Lafia', zone: 'North Central', code: 'NA', aliases: [] },
  { name: 'Niger', capital: 'Minna', zone: 'North Central', code: 'NI', aliases: [] },
  { name: 'Ogun', capital: 'Abeokuta', zone: 'South West', code: 'OG', aliases: [] },
  { name: 'Ondo', capital: 'Akure', zone: 'South West', code: 'ON', aliases: [] },
  { name: 'Osun', capital: 'Osogbo', zone: 'South West', code: 'OS', aliases: [] },
  { name: 'Oyo', capital: 'Ibadan', zone: 'South West', code: 'OY', aliases: [] },
  { name: 'Plateau', capital: 'Jos', zone: 'North Central', code: 'PL', aliases: [] },
  { name: 'Rivers', capital: 'Port Harcourt', zone: 'South South', code: 'RI', aliases: [] },
  { name: 'Sokoto', capital: 'Sokoto', zone: 'North West', code: 'SO', aliases: [] },
  { name: 'Taraba', capital: 'Jalingo', zone: 'North East', code: 'TA', aliases: [] },
  { name: 'Yobe', capital: 'Damaturu', zone: 'North East', code: 'YO', aliases: [] },
  { name: 'Zamfara', capital: 'Gusau', zone: 'North West', code: 'ZA', aliases: [] },
];

export const GEOPOLITICAL_ZONES = [
  'North Central',
  'North East',
  'North West',
  'South East',
  'South South',
  'South West'
];
