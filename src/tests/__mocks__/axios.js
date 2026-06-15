// Mock for src/config/axios.js — prevents real Supabase calls during tests
export const supabase = {
  from: () => ({
    select: () => ({ order: () => ({ data: [], error: null }) }),
    insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: () => ({ data: null, error: null }) }),
    delete: () => ({ eq: () => ({ data: null, error: null }) }),
  }),
};
