const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;

export const isSpotifyIntegrationEnabled = !!SPOTIFY_CLIENT_ID;

function generateRandomString(length: number) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export async function initiateSpotifyLoginPopup(): Promise<any> {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error("Spotify Client ID is missing.");
  }

  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email';
  
  // Using Implicit Grant Flow for popup
  const args = new URLSearchParams({
    response_type: 'token',
    client_id: SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: REDIRECT_URI,
    state: state,
  });
  
  const authUrl = 'https://accounts.spotify.com/authorize?' + args.toString();

  const width = 450;
  const height = 730;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  
  return new Promise((resolve, reject) => {
    const popup = window.open(
      authUrl,
      'Spotify Login',
      `menubar=no,location=no,resizable=no,scrollbars=no,status=no,width=${width},height=${height},top=${top},left=${left}`
    );

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    const checkPopup = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkPopup);
          reject(new Error("Login popup closed before completion."));
          return;
        }

        const currentUrl = popup.location.href;
        
        // Ensure popup reached the redirect URI safely and has hash
        if (currentUrl && currentUrl.startsWith(REDIRECT_URI) && currentUrl.includes('#')) {
          const hashParams = new URLSearchParams(popup.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const error = hashParams.get('error');

          if (error) {
            clearInterval(checkPopup);
            popup.close();
            reject(new Error(error));
            return;
          }

          if (accessToken) {
            clearInterval(checkPopup);
            popup.close();
            resolve(fetchSpotifyProfile(accessToken));
          }
        }
      } catch (error) {
        // Ignored. CORS blocks cross-origin reading. Once it redirects back to our origin, it works.
      }
    }, 500);
  });
}

async function fetchSpotifyProfile(accessToken: string) {
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!profileRes.ok) {
    throw new Error('Failed to fetch Spotify profile');
  }

  const profile = await profileRes.json();
  return {
    access_token: accessToken,
    product: profile.product || 'unknown' // 'premium' | 'free'
  };
}
