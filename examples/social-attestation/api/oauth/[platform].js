import { createAttestation } from '../_jwt.js';

const PLATFORMS = {
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
    getClient: () => ({
      id: process.env.GITHUB_CLIENT_ID,
      secret: process.env.GITHUB_CLIENT_SECRET,
    }),
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userUrl: 'https://api.twitter.com/2/users/me',
    scope: 'tweet.read users.read',
    getClient: () => ({
      id: process.env.TWITTER_CLIENT_ID,
      secret: process.env.TWITTER_CLIENT_SECRET,
    }),
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    scope: 'identify',
    getClient: () => ({
      id: process.env.DISCORD_CLIENT_ID,
      secret: process.env.DISCORD_CLIENT_SECRET,
    }),
  },
};

export default async function handler(req, res) {
  const platform = req.query.platform;
  
  if (!platform || !PLATFORMS[platform]) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  
  const config = PLATFORMS[platform];
  const client = config.getClient();
  
  if (!client.id || !client.secret) {
    return res.status(500).json({ error: `${platform} OAuth not configured` });
  }
  
  let state;
  try {
    state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
  } catch {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  const { address, redirectUri } = state;
  
  if (req.query.code) {
    try {
      const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          client_id: client.id,
          client_secret: client.secret,
          code: req.query.code,
          redirect_uri: `${process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : 'http://localhost:5173'}/api/oauth/${platform}`,
          grant_type: 'authorization_code',
        }),
      });
      
      const tokenData = await tokenRes.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }
      
      let handle;
      if (platform === 'github') {
        const userRes = await fetch(config.userUrl, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        handle = userData.login;
      } else if (platform === 'twitter') {
        const userRes = await fetch(config.userUrl, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        handle = userData.data?.username;
      } else if (platform === 'discord') {
        const userRes = await fetch(config.userUrl, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        handle = userData.username;
      }
      
      if (!handle) {
        throw new Error('Could not fetch user handle');
      }
      
      const jwt = await createAttestation({
        sub: address,
        platform,
        handle,
      });
      
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('attestation', jwt);
      redirectUrl.searchParams.set('platform', platform);
      redirectUrl.searchParams.set('handle', handle);
      
      res.redirect(redirectUrl.toString());
    } catch (err) {
      console.error('OAuth error:', err);
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('error', err.message);
      res.redirect(redirectUrl.toString());
    }
  } else {
    const callbackUrl = `${process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:5173'}/api/oauth/${platform}?state=${req.query.state}`;
    
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('client_id', client.id);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', config.scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', req.query.state);
    
    if (platform === 'twitter') {
      authUrl.searchParams.set('code_challenge', 'challenge');
      authUrl.searchParams.set('code_challenge_method', 'plain');
    }
    
    res.redirect(authUrl.toString());
  }
}
