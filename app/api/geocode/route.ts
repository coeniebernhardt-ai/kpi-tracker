import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    // Proxy Nominatim API request to avoid CORS issues
    // Using multiple query types to get better results including POIs and street numbers
    const baseUrl = 'https://nominatim.openstreetmap.org/search';
    const params = new URLSearchParams({
      format: 'json',
      q: query,
      limit: '10', // Increased limit to get more diverse results
      addressdetails: '1',
      extratags: '1', // Get extra tags for POIs
      namedetails: '1', // Get name details
      dedupe: '0', // Don't deduplicate to get more variety
      // Don't restrict to country - allows better POI results
      // countrycodes: 'za', // Commented out to allow POIs and international addresses
      'accept-language': 'en',
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'User-Agent': 'Think-Q/1.0 (contact: webmaster@thinkdigital.co.za)',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    let data = await response.json();
    
    // Enhance results to include street numbers and POI names more prominently
    data = data.map((item: any) => {
      const address = item.address || {};
      const name = item.name || item.display_name;
      
      // Build a more descriptive display name
      let displayName = item.display_name;
      
      // If it's a POI (has a name that's not just the address), use that
      if (item.name && !item.name.match(/^\d+/)) {
        // It's likely a POI
        displayName = item.name;
        if (address.house_number || address.road || address.suburb || address.city) {
          const addressParts = [];
          if (address.house_number) addressParts.push(address.house_number);
          if (address.road) addressParts.push(address.road);
          if (address.suburb) addressParts.push(address.suburb);
          if (address.city) addressParts.push(address.city);
          if (addressParts.length > 0) {
            displayName += `, ${addressParts.join(', ')}`;
          }
          if (address.country) {
            displayName += `, ${address.country}`;
          }
        }
      } else if (address.house_number && address.road) {
        // Has a house number - make it more prominent
        displayName = `${address.house_number} ${address.road}`;
        if (address.suburb) displayName += `, ${address.suburb}`;
        if (address.city) displayName += `, ${address.city}`;
        if (address.country) displayName += `, ${address.country}`;
      }
      
      return {
        ...item,
        display_name: displayName,
      };
    });
    
    // Filter to prioritize South African results but keep others
    const zaResults = data.filter((item: any) => 
      item.address?.country_code === 'za' || 
      item.address?.country === 'South Africa'
    );
    const otherResults = data.filter((item: any) => 
      item.address?.country_code !== 'za' && 
      item.address?.country !== 'South Africa'
    );
    
    // Return South African results first, then others (limit to 8 total)
    const results = [...zaResults.slice(0, 6), ...otherResults.slice(0, 2)].slice(0, 8);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch address suggestions' },
      { status: 500 }
    );
  }
}

