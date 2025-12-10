import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    // Using Geoapify Address Autocomplete API - better coverage for South Africa
    // Free tier: 20,000 requests/month
    // Get your API key from https://www.geoapify.com/get-started-with-maps-api
    const API_KEY = process.env.GEOAPIFY_API_KEY || '';
    
    if (!API_KEY) {
      // Fallback to Nominatim if no API key configured
      return await tryNominatimFallback(query);
    }
    
    const baseUrl = 'https://api.geoapify.com/v1/geocode/autocomplete';
    
    // Focus on Gauteng, South Africa
    const searchQuery = query.includes(',') ? query : `${query}, Gauteng, South Africa`;
    
    const params = new URLSearchParams({
      text: searchQuery,
      type: 'amenity,building,street,address,postcode,locality,place', // Include all types
      filter: 'countrycode:za', // Restrict to South Africa
      limit: '15',
      lang: 'en',
      bias: 'rect:25.7,-26.5,28.7,-25.0', // Gauteng bounding box for bias
      apiKey: API_KEY,
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If Geoapify fails, try Nominatim as fallback
      console.log('Geoapify failed, trying Nominatim fallback...');
      return await tryNominatimFallback(query);
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      // Try Nominatim if no results
      return await tryNominatimFallback(query);
    }

    // Process Geoapify results
    const processedData = data.features.map((feature: any) => {
      const props = feature.properties || {};
      const geometry = feature.geometry || {};
      
      // Extract address components
      const address = {
        house_number: props.housenumber || props.house_number,
        road: props.street || props.road,
        suburb: props.suburb || props.district || props.neighbourhood,
        city: props.city || props.municipality,
        state: props.state || props.region,
        postcode: props.postcode,
        country: props.country || 'South Africa',
      };
      
      // Build display name
      let displayName = '';
      let priority = 0;
      
      // Check if it's a POI (business, amenity)
      const isPOI = props.type === 'amenity' || 
                    props.type === 'building' ||
                    (props.name && (
                      props.category === 'commercial' ||
                      props.category === 'amenity' ||
                      props.category === 'catering' ||
                      props.category === 'tourism' ||
                      props.category === 'shopping'
                    ));
      
      // Check if it's an estate (residential area with name)
      const isEstate = props.type === 'locality' ||
                       props.type === 'place' ||
                       (props.name && (
                         props.name.toLowerCase().includes('estate') ||
                         props.name.toLowerCase().includes('park') ||
                         props.name.toLowerCase().includes('village') ||
                         props.name.toLowerCase().includes('manor') ||
                         props.name.toLowerCase().includes('grove')
                       ));
      
      // Check for street address with number
      const hasStreetAddress = address.house_number && address.road;
      
      if (isPOI && props.name) {
        // POI/Business: Name, Street, Suburb, City
        displayName = props.name;
        priority = 40;
        
        const addressParts = [];
        if (address.house_number && address.road) {
          addressParts.push(`${address.house_number} ${address.road}`);
        } else if (address.road) {
          addressParts.push(address.road);
        }
        if (address.suburb) addressParts.push(address.suburb);
        if (address.city && address.city !== address.suburb) addressParts.push(address.city);
        if (addressParts.length > 0) {
          displayName += `, ${addressParts.join(', ')}`;
        }
      } else if (hasStreetAddress) {
        // Street address: Number Street, Suburb, City
        displayName = `${address.house_number} ${address.road}`;
        priority = 30;
        
        if (address.suburb) displayName += `, ${address.suburb}`;
        if (address.city && address.city !== address.suburb) {
          displayName += `, ${address.city}`;
        }
      } else if (isEstate && props.name) {
        // Estate: Estate Name, City
        displayName = props.name;
        priority = 35;
        
        if (address.suburb && !displayName.includes(address.suburb)) displayName += `, ${address.suburb}`;
        if (address.city && address.city !== address.suburb && !displayName.includes(address.city)) {
          displayName += `, ${address.city}`;
        }
      } else if (address.road) {
        // Street name
        displayName = address.road;
        priority = 20;
        if (address.suburb) displayName += `, ${address.suburb}`;
        if (address.city && address.city !== address.suburb) displayName += `, ${address.city}`;
      } else if (props.name) {
        // Place name (estate, suburb, etc.)
        displayName = props.name;
        priority = 15;
        if (address.city && !displayName.includes(address.city)) displayName += `, ${address.city}`;
      } else {
        // Fallback to formatted address
        displayName = props.formatted || props.name || 'Unknown location';
        priority = 10;
      }
      
      // Add Gauteng if in Gauteng
      if (address.state === 'Gauteng' && !displayName.includes('Gauteng')) {
        displayName += ', Gauteng';
      }
      
      return {
        place_id: feature.properties?.place_id || feature.id || Math.random().toString(),
        display_name: displayName,
        priority: priority,
        isPOI: isPOI,
        isEstate: isEstate,
        hasStreetAddress: hasStreetAddress,
        address: address,
        geometry: geometry,
        properties: props,
      };
    });
    
    // Prioritize Gauteng results
    const gautengResults = processedData.filter((item: any) => 
      item.address?.state === 'Gauteng' ||
      item.properties?.state === 'Gauteng' ||
      item.display_name.includes('Gauteng') ||
      item.address?.city === 'Johannesburg' ||
      item.address?.city === 'Pretoria' ||
      item.address?.city === 'Centurion' ||
      item.properties?.city === 'Johannesburg' ||
      item.properties?.city === 'Pretoria' ||
      item.properties?.city === 'Centurion'
    );
    
    const otherResults = processedData.filter((item: any) => !gautengResults.includes(item));
    
    // Sort by priority
    const sortByPriority = (a: any, b: any) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return 0;
    };
    
    gautengResults.sort(sortByPriority);
    otherResults.sort(sortByPriority);
    
    // Return up to 10 results (prioritize Gauteng)
    const results = [...gautengResults.slice(0, 10), ...otherResults.slice(0, 3)].slice(0, 10);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Geocoding error:', error);
    return await tryNominatimFallback(query);
  }
}

// Fallback to Nominatim if Geoapify fails or is not configured
async function tryNominatimFallback(query: string): Promise<NextResponse> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Gauteng, South Africa')}&limit=10&addressdetails=1&extratags=1&countrycodes=za`,
      {
        headers: {
          'User-Agent': 'Think-Q/1.0 (contact: webmaster@thinkdigital.co.za)',
          'Accept-Language': 'en',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(
        data.map((item: any) => ({
          place_id: item.place_id || item.osm_id,
          display_name: item.display_name,
        })).slice(0, 10)
      );
    }
  } catch (error) {
    console.error('Nominatim fallback error:', error);
  }
  
  return NextResponse.json(
    { error: 'Failed to fetch address suggestions. Please configure GEOAPIFY_API_KEY in .env.local for better results. See GEOAPIFY_SETUP.md for instructions.' },
    { status: 500 }
  );
}
