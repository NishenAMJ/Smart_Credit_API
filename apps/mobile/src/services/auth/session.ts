type SessionState = {
  accessToken?: string;
  userId?: string;
};

let currentSession: SessionState = {};

export const session = {
  set(value: SessionState) {
    currentSession = value;
  },
  get() {
    return currentSession;
  },
  clear() {
    currentSession = {};
  },
};
