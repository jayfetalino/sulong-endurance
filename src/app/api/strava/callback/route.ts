// src/app/api/strava/callback/route.ts
// ─────────────────────────────────────────────────────────
// This is an API route — it runs on the SERVER not browser.
// Strava redirects here after the athlete approves our app.
// 
// Flow:
// 1. Athlete clicks "Connect Strava" 
// 2. Strava asks "Allow Sulong Endurance to see your activities?"
// 3. Athlete clicks Allow
// 4. Strava redirects to THIS URL with a code
// 5. We exchange that code for a real token
// 6. We store the token and import their activities
// ─────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  exchangeStravaCode,
  fetchStravaActivities,
  mapStravaSport,
  estimateTSS,
} from '@/lib/strava'

export async function GET(request: NextRequest) {
  // Read the URL parameters Strava sent us
  const searchParams = request.nextUrl.searchParams
  const code      = searchParams.get('code')
  // "code" = temporary code from Strava
  const athleteId = searchParams.get('state')
  // "state" = the athlete ID we passed in the auth URL
  const error     = searchParams.get('error')

  // If athlete clicked "Cancel" on Strava's page
  if (error || !code || !athleteId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/athlete?strava=cancelled`
    )
  }

  const supabase = await createSupabaseServerClient()

  try {
    // Step 1: Exchange the code for a real access token
    const tokenData = await exchangeStravaCode(code)

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token from Strava')
    }

    // Step 2: Save the Strava tokens to the athlete's profile
    // We need these tokens to make future API calls on their behalf
    await supabase
      .from('profiles')
      .update({
        strava_access_token:  tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires: tokenData.expires_at,
        strava_athlete_id:    tokenData.athlete.id,
      })
      .eq('id', athleteId)

    // Step 3: Import last 30 days of activities
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
    // Date.now() = current time in milliseconds
    // / 1000 = convert to seconds (Unix timestamp)
    // - (30 * 24 * 60 * 60) = subtract 30 days in seconds

    const stravaActivities = await fetchStravaActivities(
      tokenData.access_token,
      thirtyDaysAgo
    )

    // Step 4: Save each activity to our database
    if (stravaActivities && stravaActivities.length > 0) {
      // Get the athlete's profile to access their LTHR for TSS calc
      const { data: profile } = await supabase
        .from('profiles')
        .select('lthr')
        .eq('id', athleteId)
        .single()

      // Build an array of activity rows to insert
      const activitiesToInsert = stravaActivities.map(act => ({
        athlete_id:           athleteId,
        scheduled_workout_id: null,
        // Strava activities won't match a scheduled workout automatically
        sport:      mapStravaSport(act.sport_type || act.type),
        started_at: act.start_date,
        duration_seconds: act.moving_time,
        tss: estimateTSS(
          act.moving_time,
          act.average_heartrate,
          profile?.lthr ?? undefined
        ),
        avg_power:      act.average_watts    ? Math.round(act.average_watts) : null,
        avg_heart_rate: act.average_heartrate ? Math.round(act.average_heartrate) : null,
        avg_cadence:    act.average_cadence  ? Math.round(act.average_cadence) : null,
        total_distance: act.distance ?? null,
        strava_activity_id: act.id,
        fit_file_url: null,
      }))

      // Insert all activities
      // onConflict = if activity already exists (same strava_id), skip it
      // This prevents duplicate imports if they reconnect Strava
      await supabase
        .from('activities')
        .upsert(activitiesToInsert, {
          onConflict: 'strava_activity_id',
          ignoreDuplicates: true,
        })
    }

    // Success! Redirect athlete back to their dashboard
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/athlete?strava=connected&imported=${stravaActivities?.length ?? 0}`
    )

  } catch (err) {
    console.error('Strava callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/athlete?strava=error`
    )
  }
}

