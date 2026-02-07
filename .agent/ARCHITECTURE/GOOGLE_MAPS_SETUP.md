# Google Maps Setup Guide

## Overview

CivicMatch now includes Google Maps integration for location-based user discovery. This guide covers the setup required to enable these features.

## Required Google Cloud APIs

Enable the following APIs in your Google Cloud Console:

1. **Maps JavaScript API** - For displaying the interactive map
2. **Geocoding API** - For converting addresses to coordinates  
3. **Places API** - For location autocomplete in profile editing

## Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id
```

## API Key Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the required APIs listed above
4. Create an API key:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the key to the enabled APIs for security
   - Add domain restrictions for production

5. Create a Map ID (required for AdvancedMarkerElement):
   - Go to "Map Styles" → "Create Style"
   - Name it "CivicMatch Dark Mode"
   - Apply the dark theme styling (or leave default)
   - Copy the Map ID that's generated
   - Add it to your environment variables

## API Key Restrictions (Recommended)

### Application Restrictions
- **HTTP referrers**: Add your domain(s)
  - `http://localhost:3000/*` (development)
  - `https://yourdomain.com/*` (production)

### API Restrictions
- Maps JavaScript API
- Geocoding API  
- Places API

## Features Enabled

### Profile Page Location Input
- Google Places Autocomplete for accurate location entry
- Automatic coordinate resolution for map positioning
- Migration prompts for users with legacy string locations

### Explore Page Map View
- Interactive world map showing user locations
- User pills positioned by geographic coordinates
- Toggle between map and list views
- Dashed borders for profiles needing location updates

### Location Data Migration
- **New Users**: Coordinates saved automatically via Places Autocomplete
- **Existing Users**: Prompted to update location for map visibility
- **Legacy Support**: String locations preserved as fallback

## Cost Considerations

### Expected Monthly Usage
- **Maps JavaScript API**: ~10,000 map loads ($70)
- **Geocoding API**: ~1,000 requests ($5)
- **Places API**: ~2,000 autocomplete requests ($17)

**Total Estimated Cost**: ~$90/month

### Cost Optimization
- Coordinate caching reduces geocoding by 90%
- Map loading is lazy (only when map view selected)
- Places API only loads on profile edit

## Testing

1. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
2. Restart development server
3. Navigate to `/profile` to test location autocomplete
4. Navigate to `/` and toggle to map view
5. Verify user pills appear on map with coordinates

## Troubleshooting

### Map Not Loading
- Check API key is set correctly
- Verify APIs are enabled in Google Cloud Console
- Check browser console for error messages

### Map Appears in Light Mode
- **Issue**: Map ID not configured in environment
- **Solution**: Add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=yourapihere` to `.env.local`
- **Default**: The app uses your Map Style ID `api` as fallback
- **Custom Styling**: Map ID enables both AdvancedMarkerElement and custom dark mode styling

### Autocomplete Not Working
- Ensure Places API is enabled
- Verify API key has Places API permissions
- Check for JavaScript errors in console

### No Users on Map
- Users need to update their location via profile page
- Users without any location are placed randomly with dashed borders
- Successfully geocoded locations show with solid borders

### "Map initialized without valid Map ID" Warning
- This warning appears when using DEMO_MAP_ID
- Create a proper Map ID in Google Cloud Console to resolve
- AdvancedMarkerElement requires a valid Map ID to function properly

## Security Notes

- Never commit API keys to version control
- Use domain restrictions in production
- Monitor API usage in Google Cloud Console
- Set up billing alerts to avoid unexpected charges
