export const CONFIG = {
  supabaseUrl: 'https://arjjukxsnffmhjlgmmoz.supabase.co',
  supabaseAnonKey: 'sb_publishable_1mCLOBQJMpY-2-1R32OwdA_B2cT9qTK',

  strava: {
    clientId: '235355',
    redirectUri: `${window.location.origin}/strava-callback.html`,
    scope: 'read,activity:read_all'
  },

  stripe: {
    publishableKey: 'pk_test_51TTVFaFiPJTB5pwwyDlB5XV4nk0PR3mnHhmrLMswXtAxzDtF1yTl9R0U8FNJbHLGxszhXUbJYsSrrNQyjajon2Cb00SekpnkoA',
    priceId: 'price_1TTiBpFiPJTB5pwwACXcfXhy'
  },

  adminEmail: 'cadenceai2026@hotmail.com'
};
