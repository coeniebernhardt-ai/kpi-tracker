import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    const baseUrl = 'https://nominatim.openstreetmap.org/search';
    
    // Focus on Gauteng, South Africa - search with explicit Gauteng location
    const searchQuery = `${query}, Gauteng, South Africa`;
    
    const params = new URLSearchParams({
      format: 'json',
      q: searchQuery,
      limit: '15', // Get more results to filter from
      addressdetails: '1',
      extratags: '1', // Essential for POIs and estate names
      namedetails: '1',
      dedupe: '0',
      countrycodes: 'za', // Restrict to South Africa
      'accept-language': 'en',
    });

    const headers = {
      'User-Agent': 'Think-Q/1.0 (contact: webmaster@thinkdigital.co.za)',
      'Accept-Language': 'en',
    };

    // Make the request
    const response = await fetch(`${baseUrl}?${params.toString()}`, { headers });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    let data = await response.json();
    
    // Process and enhance results to prioritize Gauteng addresses with estate names, POIs, and street numbers
    const processedData = data.map((item: any) => {
      const address = item.address || {};
      const extraTags = item.extratags || {};
      const osmType = item.osm_type; // node, way, relation
      const type = item.type || item.class; // residential, commercial, etc.
      
      let displayName = '';
      let priority = 0; // Higher priority = shown first
      
      // Check if it's an estate (usually a residential area or suburb with a specific name)
      const isEstate = address.place === 'neighbourhood' || 
                       address.place === 'suburb' ||
                       (osmType === 'relation' && type === 'administrative') ||
                       extraTags.place === 'neighbourhood' ||
                       extraTags.place === 'estate' ||
                       (address.neighbourhood && address.neighbourhood.toLowerCase().includes('estate')) ||
                       (item.name && (item.name.toLowerCase().includes('estate') || item.name.toLowerCase().includes('park') || item.name.toLowerCase().includes('village')));
      
      // Check if it's a POI (Point of Interest)
      const isPOI = osmType === 'node' && 
                    type && 
                    ['amenity', 'shop', 'tourism', 'leisure', 'office', 'craft', 'healthcare'].includes(type) &&
                    item.name;
      
      // Street address with house number
      const hasStreetAddress = address.house_number && address.road;
      
      // Build optimized display name based on type
      if (isPOI && item.name) {
        // POI: Name, Street (if available), Suburb, City
        displayName = item.name;
        priority = 40; // High priority for POIs
        
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
        priority = 30; // High priority for street addresses
        
        if (address.suburb) displayName += `, ${address.suburb}`;
        if (address.city && address.city !== address.suburb) {
          displayName += `, ${address.city}`;
        }
        // Add estate name if available
        if (address.neighbourhood && !displayName.includes(address.neighbourhood)) {
          displayName += `, ${address.neighbourhood}`;
        }
      } else if (isEstate) {
        // Estate: Estate Name, City
        displayName = item.name || address.neighbourhood || address.suburb || item.display_name.split(',')[0];
        priority = 35; // Very high priority for estates
        
        const addressParts = [];
        if (address.suburb && !displayName.includes(address.suburb)) addressParts.push(address.suburb);
        if (address.city && address.city !== address.suburb) addressParts.push(address.city);
        if (addressParts.length > 0) {
          displayName += `, ${addressParts.join(', ')}`;
        }
      } else if (address.road) {
        // Just a street name: Street, Suburb, City
        displayName = address.road;
        priority = 20;
        
        if (address.suburb) displayName += `, ${address.suburb}`;
        if (address.city && address.city !== address.suburb) displayName += `, ${address.city}`;
      } else if (address.suburb || address.neighbourhood) {
        // Suburb/Neighbourhood
        displayName = address.neighbourhood || address.suburb || item.display_name.split(',')[0];
        priority = 15;
        
        if (address.city && !displayName.includes(address.city)) {
          displayName += `, ${address.city}`;
        }
      } else {
        // Fallback to original display name
        displayName = item.display_name;
        priority = 10;
      }
      
      // Add Gauteng if not already in the name
      if (!displayName.includes('Gauteng') && address.state === 'Gauteng') {
        displayName += ', Gauteng';
      }
      
      return {
        ...item,
        display_name: displayName,
        priority: priority,
        isPOI: isPOI,
        isEstate: isEstate,
        hasStreetAddress: hasStreetAddress,
        city: address.city,
        state: address.state,
      };
    });
    
    // Filter and prioritize: Gauteng results first, then prioritize by type
    const gautengResults = processedData.filter((item: any) => 
      item.state === 'Gauteng' || 
      item.address?.state === 'Gauteng' ||
      item.display_name.includes('Gauteng') ||
      item.city === 'Johannesburg' || 
      item.city === 'Pretoria' ||
      item.city === 'Centurion' ||
      item.address?.city === 'Johannesburg' ||
      item.address?.city === 'Pretoria' ||
      item.address?.city === 'Centurion'
    );
    
    const otherResults = processedData.filter((item: any) => !gautengResults.includes(item));
    
    // Sort by priority (highest first), then by relevance
    const sortByPriority = (a: any, b: any) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return (b.importance || 0) - (a.importance || 0);
    };
    
    gautengResults.sort(sortByPriority);
    otherResults.sort(sortByPriority);
    
    // Combine: Gauteng results first (up to 10), then others (up to 3)
    const results = [...gautengResults.slice(0, 10), ...otherResults.slice(0, 3)];
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch address suggestions' },
      { status: 500 }
    );
  }
}

