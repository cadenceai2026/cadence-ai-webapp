export const state = {
  // Auth
  session: null,
  user: null,
  profile: null,
  stravaConnection: null,
  activities: [],
  currentPage: 'dashboard',
  // Game
  gameProfile: null,    // XP, level, league, streak
  activeBattle: null,   // current 1v1 battle
  rival: null,          // current assigned rival
  battlePass: null,     // season progress + reward tiers
  challenges: [],       // daily + weekly challenges
  leaderboard: [],      // league ranking for current tier
  notifications: [],    // unread in-app notifications
  gameLoaded: false,    // whether game data has been fetched
};
