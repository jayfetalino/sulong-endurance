// src/lib/strava.ts
// ─────────────────────────────────────────────────────────
// All Strava API logic lives here.
// Other files import from here — never call Strava directly.
// ─────────────────────────────────────────────────────────

// The URL we send athletes to so they can approve our app
// Think of it like "Sign in with Google" but for Strava
export function getStravaAuthUrl(athleteId: string): string {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`
  // After athlete approves, Strava sends them back to this URL

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    // "code" = Strava gives us a temporary code we exchange for a token
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    // We only need to READ activities — not write or delete
    state: athleteId,
    // "state" = we pass the athlete's ID through the flow
    // so we know WHO approved when Strava redirects back
  })

  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

// Exchange the temporary code for a real access token
export async function exchangeStravaCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: { id: number; firstname: string; lastname: string }
}> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  return response.json()
}

// Fetch recent activities from Strava
// "after" = Unix timestamp — only get activities after this date
export async function fetchStravaActivities(
  accessToken: string,
  after: number  // Unix timestamp (seconds since Jan 1 1970)
): Promise<StravaActivity[]> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      // Bearer token = "prove who you are" header
    }
  )
  return response.json()
}

// What a Strava activity looks like when we get it from their API
export interface StravaActivity {
  id: number
  name: string
  type: string           // "Run", "Ride", "Swim", etc.
  sport_type: string
  start_date: string     // ISO date string
  elapsed_time: number   // seconds
  moving_time: number    // seconds (excludes stopped time)
  distance: number       // meters
  average_heartrate?: number
  max_heartrate?: number
  average_watts?: number
  average_cadence?: number
  total_elevation_gain?: number
}

// Convert Strava sport type → our app's sport type
export function mapStravaSport(stravaType: string): 'swim' | 'bike' | 'run' | 'brick' {
  const type = stravaType.toLowerCase()
  if (type.includes('swim')) return 'swim'
  if (type.includes('ride') || type.includes('cycling') || type.includes('bike')) return 'bike'
  if (type.includes('run')) return 'run'
  return 'run' // default fallback
}

// Calculate Training Stress Score (TSS) estimate from HR data
// TSS = how hard was this workout overall, on a 0-150+ scale
export function estimateTSS(
  durationSeconds: number,
  avgHR: number | undefined,
  lthr: number | undefined  // Lactate Threshold Heart Rate
): number | null {
  if (!avgHR || !lthr) return null
  const hours = durationSeconds / 3600
  const intensity = avgHR / lthr
  // intensity > 1 means above threshold, < 1 means below
  const tss = hours * intensity * intensity * 100
  // This is a simplified HR-based TSS formula
  return Math.round(tss * 10) / 10
  // Round to 1 decimal place
}

