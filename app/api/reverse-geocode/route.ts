import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 });
  }

  try {
    // Try Geoapify reverse geocoding first
    const API_KEY = process.env.GEOAPIFY_API_KEY || '';
    
    if (API_KEY) {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${API_KEY}&format=json&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const props = result.properties || {};
          
          // Build address string
          let displayName = '';
          if (props.housenumber && props.street) {
            displayName = `${props.housenumber} ${props.street}`;
          } else if (props.street) {
            displayName = props.street;
          } else if (props.name) {
            displayName = props.name;
          }
          
          if (props.suburb || props.district) {
            if (displayName) displayName += ', ';
            displayName += props.suburb || props.district;
          }
          if (props.city && props.city !== props.suburb) {
            if (displayName) displayName += ', ';
            displayName += props.city;
          }
          if (props.state === 'Gauteng' && !displayName.includes('Gauteng')) {
            if (displayName) displayName += ', ';
            displayName += 'Gauteng';
          }
          
          return NextResponse.json({
            display_name: displayName || result.formatted || 'Unknown location',
            address: {
              house_number: props.housenumber,
              road: props.street,
              suburb: props.suburb || props.district,
              city: props.city,
              state: props.state,
            },
          });
        }
      }
    }
    
    // Fallback to Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Think-Q/1.0 (contact: webmaster@thinkdigital.co.za)',
          'Accept-Language': 'en',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        display_name: data.display_name || 'Unknown location',
        address: data.address || {},
      });
    }
    
    return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: 500 });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode location' },
      { status: 500 }
    );
  }
}

