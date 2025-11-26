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

export const countriesService = {
  // Get all countries from REST Countries API
  getAllCountries: async (): Promise<Country[]> => {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flag,region');
      const data = await response.json();
      return data.sort((a: Country, b: Country) => 
        a.name.common.localeCompare(b.name.common)
      );
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  },
};
