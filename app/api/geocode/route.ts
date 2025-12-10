import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    // Proxy Nominatim API request to avoid CORS issues
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=za&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Think-Q/1.0 (contact: webmaster@thinkdigital.co.za)',
          'Accept-Language': 'en',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch address suggestions' },
      { status: 500 }
    );
  }
}

