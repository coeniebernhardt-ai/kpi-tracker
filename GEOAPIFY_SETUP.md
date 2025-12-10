# Geoapify API Setup

The address autocomplete now uses **Geoapify Address Autocomplete API** for better coverage of businesses, estates, street numbers, and building names in Gauteng, South Africa.

## Setup Instructions

1. **Sign up for a free account:**
   - Visit: https://www.geoapify.com/get-started-with-maps-api
   - Create a free account (no credit card required)

2. **Get your API key:**
   - After signing up, go to your dashboard
   - Copy your API key

3. **Add API key to environment variables:**
   - Open `.env.local` in the project root
   - Add this line:
     ```
     GEOAPIFY_API_KEY=your_api_key_here
     ```
   - Replace `your_api_key_here` with your actual API key

4. **Restart your development server:**
   - Stop the server (Ctrl+C)
   - Run `yarn dev` again

## Free Tier Limits

- **20,000 requests per month** (free tier)
- Perfect for development and small to medium applications
- Upgrade available if needed

## Features

✅ Businesses and POIs (Points of Interest)
✅ Residential estates
✅ Street addresses with house numbers
✅ Building names
✅ Focused on Gauteng, South Africa
✅ Prioritizes local results

## Alternative: If you prefer a different provider

The code includes a fallback to Nominatim if Geoapify is not configured. You can also modify `app/api/geocode/route.ts` to use:
- **Mapbox** (requires API key)
- **Google Places API** (requires API key and billing)
- **Here API** (requires API key)

If you'd like me to switch to a different provider, just let me know!

