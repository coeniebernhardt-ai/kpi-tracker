// Type declarations for Google Maps API
declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            inputField: HTMLInputElement,
            options?: {
              types?: string[];
              componentRestrictions?: { country: string };
            }
          ) => {
            getPlace: () => {
              formatted_address?: string;
              [key: string]: any;
            };
            addListener: (event: string, callback: () => void) => void;
          };
        };
        event: {
          clearInstanceListeners: (instance: any) => void;
        };
      };
    };
  }
}

export {};

