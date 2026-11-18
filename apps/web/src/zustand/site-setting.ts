import { create } from "zustand";

interface SiteSettingState {
  siteName: string;
  setSiteName: (siteName: string) => void;
}

const useSiteSettingStore = create<SiteSettingState>((set) => ({
  siteName: "ITAM",
  setSiteName: (siteName) => set({ siteName }),
}));

export default useSiteSettingStore;
