import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { GeocodingService } from '@/lib/services/GeocodingService';

interface LocationData {
  displayName: string;
  coordinates: { lat: number; lng: number; accuracy: string };
  placeId?: string;
  source: 'geocoded';
  geocodedAt: string;
}

export async function POST() {
  try {
    console.log('🌍 Starting location geocoding process...');
    
    // 1. Fetch all profiles with string locations that need geocoding
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, username, data')
      .not('data->location', 'is', null);
    
    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    console.log(`📊 Found ${profiles?.length || 0} profiles to analyze`);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No profiles found to process',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    // 2. Filter profiles that need geocoding (string locations without coordinates)
    const profilesToGeocode = profiles.filter(profile => {
      const locationData = profile.data?.location;
      
      // Skip if no location data
      if (!locationData) return false;
      
      // Skip if already has coordinates (new format)
      if (typeof locationData === 'object' && locationData.coordinates) {
        return false;
      }
      
      // Include if it's a string location that can be geocoded
      return typeof locationData === 'string' && locationData.trim().length > 0;
    });

    console.log(`🎯 Found ${profilesToGeocode.length} profiles with string locations to geocode`);

    if (profilesToGeocode.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All profiles already have coordinates or no location data',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    // 3. Process geocoding with rate limiting
    const geocodingService = GeocodingService.getInstance();
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const results: Array<{ username: string; status: 'success' | 'failed'; location?: string; error?: string }> = [];

    for (const profile of profilesToGeocode) {
      try {
        const locationString = profile.data.location as string;
        console.log(`📍 Geocoding: ${profile.username} - "${locationString}"`);
        
        // Geocode the location
        const result = await geocodingService.geocodeLocation(locationString);
        
        // Create enhanced location data
        const enhancedLocation: LocationData = {
          displayName: result.displayName,
          coordinates: {
            lat: result.lat,
            lng: result.lng,
            accuracy: result.accuracy
          },
          placeId: result.placeId,
          source: 'geocoded',
          geocodedAt: new Date().toISOString()
        };
        
        // Update the profile in the database
        const updatedData = {
          ...profile.data,
          location: enhancedLocation
        };
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ data: updatedData })
          .eq('user_id', profile.user_id);
        
        if (updateError) {
          console.error(`❌ Failed to update ${profile.username}:`, updateError.message);
          failed++;
          results.push({
            username: profile.username,
            status: 'failed',
            error: updateError.message
          });
        } else {
          console.log(`✅ Updated ${profile.username}: ${result.displayName}`);
          successful++;
          results.push({
            username: profile.username,
            status: 'success',
            location: result.displayName
          });
        }
        
      } catch (geocodeError) {
        const errorMessage = geocodeError instanceof Error ? geocodeError.message : 'Unknown error';
        console.error(`❌ Failed to geocode ${profile.username}:`, errorMessage);
        failed++;
        results.push({
          username: profile.username,
          status: 'failed',
          error: errorMessage
        });
      }
      
      processed++;
      
      // Rate limiting delay (200ms between requests)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n🎉 Geocoding process completed!');
    console.log(`📊 Results: ${successful} successful, ${failed} failed`);
    
    return NextResponse.json({
      success: true,
      message: 'Geocoding process completed',
      results: {
        processed,
        successful,
        failed,
        successRate: ((successful / processed) * 100).toFixed(1) + '%',
        details: results
      }
    });
    
  } catch (error) {
    console.error('💥 Geocoding process failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to start geocoding process',
    endpoint: '/api/admin/geocode-locations'
  });
}
