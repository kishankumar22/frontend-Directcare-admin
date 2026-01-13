export function getActiveBanners<T extends {
  isActive: boolean;
  startDate: string;
  endDate: string;
  displayOrder?: number;
}>(banners: T[]) {

  const now = new Date();

  return banners
    .filter(banner => {
      if (!banner.isActive) return false;
      if (new Date(banner.startDate) > now) return false;
      if (new Date(banner.endDate) < now) return false;
      return true;
    })
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}
