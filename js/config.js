export const CONFIG = {
  supabaseUrl: 'https://arjjukxsnffmhjlgmmoz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyamp1a3hzbmZmbWhqbGdtbW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mzg2NDcsImV4cCI6MjA5MzUxNDY0N30.zFMAxEAAYVAgpUcmlI8VxjNlt0Xcbeb4iR4xDzPeFQU',

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
