const STORAGE_KEYS = {
  PLAYER_ID: 'mafia_lan_player_id',
  PLAYER_NAME: 'mafia_lan_player_name',
  ROOM_CODE: 'mafia_lan_room_code'
};

// Safe storage access (supports environments where sessionStorage or localStorage might throw)
const getSession = () => (typeof window !== 'undefined' ? window.sessionStorage : null);
const getLocal = () => (typeof window !== 'undefined' ? window.localStorage : null);

export const storage = {
  getPlayerId(): string | null {
    return getSession()?.getItem(STORAGE_KEYS.PLAYER_ID) || null;
  },

  setPlayerId(id: string): void {
    getSession()?.setItem(STORAGE_KEYS.PLAYER_ID, id);
  },

  getPlayerName(): string {
    return getLocal()?.getItem(STORAGE_KEYS.PLAYER_NAME) || '';
  },

  setPlayerName(name: string): void {
    getLocal()?.setItem(STORAGE_KEYS.PLAYER_NAME, name);
  },

  getRoomCode(): string | null {
    return getSession()?.getItem(STORAGE_KEYS.ROOM_CODE) || null;
  },

  setRoomCode(code: string): void {
    getSession()?.setItem(STORAGE_KEYS.ROOM_CODE, code);
  },

  clearRoom(): void {
    getSession()?.removeItem(STORAGE_KEYS.ROOM_CODE);
    getSession()?.removeItem(STORAGE_KEYS.PLAYER_ID);
  },

  clearAll(): void {
    getSession()?.removeItem(STORAGE_KEYS.PLAYER_ID);
    getSession()?.removeItem(STORAGE_KEYS.ROOM_CODE);
    getLocal()?.removeItem(STORAGE_KEYS.PLAYER_NAME);
  }
};
