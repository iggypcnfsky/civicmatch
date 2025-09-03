/**
 * One-time geocoding script to update user locations in the database
 * This script finds users with string locations and geocodes them to coordinates
 */

import { createClient } from '@supabase/supabase-js';
import { GeocodingService } from '@/lib/services/GeocodingService';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ProfileRow {
  user_id: string;
  username: string;
  data: Record<string, unknown>;
}

interface LocationData {
  displayName: string;
  coordinates: { lat: number; lng: number; accuracy: string };
  placeId?: string;
  source: 'geocoded';
  geocodedAt: string;
}

async function geocodeUserLocations() {
  console.log('🌍 Starting location geocoding process...');
  
  try {
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
      console.log('✅ No profiles found to process');
      return;
    }

    // 2. Filter profiles that need geocoding (string locations without coordinates)
    const profilesToGeocode: ProfileRow[] = [];
    
    for (const profile of profiles) {
      const locationData = profile.data?.location;
      
      // Skip if no location data
      if (!locationData) continue;
      
      // Skip if already has coordinates (new format)
      if (typeof locationData === 'object' && locationData.coordinates) {
        continue;
      }
      
      // Include if it's a string location that can be geocoded
      if (typeof locationData === 'string' && locationData.trim().length > 0) {
        profilesToGeocode.push(profile);
      }
    }

    console.log(`🎯 Found ${profilesToGeocode.length} profiles with string locations to geocode`);

    if (profilesToGeocode.length === 0) {
      console.log('✅ All profiles already have coordinates or no location data');
      return;
    }

    // 3. Process geocoding in batches to respect rate limits
    const geocodingService = GeocodingService.getInstance();
    const batchSize = 10;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < profilesToGeocode.length; i += batchSize) {
      const batch = profilesToGeocode.slice(i, i + batchSize);
      console.log(`📍 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(profilesToGeocode.length / batchSize)} (${batch.length} profiles)`);
      
      for (const profile of batch) {
        try {
          const locationString = profile.data.location as string;
          console.log(`  Geocoding: ${profile.username} - "${locationString}"`);
          
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
            console.error(`  ❌ Failed to update ${profile.username}:`, updateError.message);
            failed++;
          } else {
            console.log(`  ✅ Updated ${profile.username}: ${result.displayName}`);
            successful++;
          }
          
        } catch (geocodeError) {
          console.error(`  ❌ Failed to geocode ${profile.username}:`, geocodeError);
          failed++;
        }
        
        processed++;
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Batch delay
      if (i + batchSize < profilesToGeocode.length) {
        console.log(`⏳ Waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 Geocoding process completed!');
    console.log(`📊 Results:`);
    console.log(`  - Total processed: ${processed}`);
    console.log(`  - Successful: ${successful}`);
    console.log(`  - Failed: ${failed}`);
    console.log(`  - Success rate: ${((successful / processed) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('💥 Geocoding process failed:', error);
    process.exit(1);
  }
}

// Run the geocoding process
if (require.main === module) {
  geocodeUserLocations()
    .then(() => {
      console.log('🏁 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { geocodeUserLocations };
