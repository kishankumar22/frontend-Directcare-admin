// lib/services/countries.ts
export interface Country {
  name: {
    common: string;
    official: string;
  };
  cca2: string; // 2-letter country code
  flag: string;
  region: string;
}

// Initialize as empty array instead of null
let cachedCountries: Country[] = [];

export const countriesService = {
  // Get all countries from REST Countries API
  getAllCountries: async (): Promise<Country[]> => {
    // Return cached data if available
    if (cachedCountries.length > 0) {
      return cachedCountries;
    }

    try {
      const response = await fetch(
        'https://restcountries.com/v3.1/all?fields=name,cca2,flag,region'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }

      const data: Country[] = await response.json();
      
      // Sort and cache
      cachedCountries = data.sort((a: Country, b: Country) =>
        a.name.common.localeCompare(b.name.common)
      );
      
      return cachedCountries;
    } catch (error) {
      console.error('Error fetching countries:', error);
      // Return empty array on error
      return [];
    }
  },

  // Search countries
  searchCountries: (countries: Country[], searchTerm: string): Country[] => {
    if (!searchTerm.trim()) {
      return countries;
    }

    const term = searchTerm.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.common.toLowerCase().includes(term) ||
        country.cca2.toLowerCase().includes(term) ||
        country.region.toLowerCase().includes(term)
    );
  },

  // Get country by code
  getCountryByCode: (countries: Country[], code: string): Country | undefined => {
    return countries.find((country) => country.cca2 === code);
  },

  // Clear cache (useful for testing)
  clearCache: (): void => {
    cachedCountries = [];
  },
};
