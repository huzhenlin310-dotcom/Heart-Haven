import type { Route } from "../types";

type NavigationProps = {
  route: Route;
  onNavigate: (route: Route) => void;
};

const mainRoutes: { route: Route; label: string; icon: "sun" | "bars" | "heart" | "gear" }[] = [
  { route: "home", label: "冥想", icon: "sun" },
  { route: "stats", label: "趋势", icon: "bars" },
  { route: "care", label: "关怀", icon: "heart" },
  { route: "settings", label: "设置", icon: "gear" }
];

const internalRouteMap: Partial<Record<Route, Route>> = {
  "audio-select": "home",
  meditate: "home",
  "journey-result": "home",
  "update-history": "settings",
  "care-person": "care"
};

export function Navigation({ route, onNavigate }: NavigationProps) {
  const activeRoute = internalRouteMap[route] || route;
  let touchStartY = 0;

  function switchByDirection(direction: number) {
    const currentIndex = mainRoutes.findIndex((item) => item.route === activeRoute);
    const nextIndex = (currentIndex + direction + mainRoutes.length) % mainRoutes.length;
    onNavigate(mainRoutes[nextIndex].route);
  }

  return (
    <nav
      className="side-nav"
      aria-label="主导航"
      onWheel={(event) => {
        event.preventDefault();
        if (Math.abs(event.deltaY) < 18) return;
        switchByDirection(event.deltaY > 0 ? 1 : -1);
      }}
      onTouchStart={(event) => {
        touchStartY = event.touches[0].clientY;
      }}
      onTouchEnd={(event) => {
        const deltaY = touchStartY - event.changedTouches[0].clientY;
        if (Math.abs(deltaY) < 34) return;
        switchByDirection(deltaY > 0 ? 1 : -1);
      }}
    >
      {mainRoutes.map((item) => (
        <button
          key={item.route}
          className={`nav-item ${activeRoute === item.route ? "is-active" : ""}`}
          type="button"
          aria-label={item.label}
          onClick={() => onNavigate(item.route)}
        >
          <NavIcon icon={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function NavIcon({ icon }: { icon: "sun" | "bars" | "heart" | "gear" }) {
  if (icon === "bars") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V5M4 19h16" />
        <path d="M8 16v-5M12 16V8M16 16v-8" />
      </svg>
    );
  }

  if (icon === "heart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        <path d="M12 8v6M9 11h6" />
      </svg>
    );
  }

  if (icon === "gear") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .3 2l.1.1-2 2-.1-.1a1.8 1.8 0 0 0-2-.3 1.8 1.8 0 0 0-1 1.6V20h-3v-.2a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .3l-.1.1-2-2 .1-.1a1.8 1.8 0 0 0 .3-2 1.8 1.8 0 0 0-1.6-1H5v-3h.2a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.3-2l-.1-.1 2-2 .1.1a1.8 1.8 0 0 0 2 .3 1.8 1.8 0 0 0 1-1.6V4h3v.2a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.3l.1-.1 2 2-.1.1a1.8 1.8 0 0 0-.3 2 1.8 1.8 0 0 0 1.6 1h.2v3h-.2a1.8 1.8 0 0 0-1.6 1Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v3M12 18v3M4.2 5.8l2.1 2.1M17.7 16.1l2.1 2.1M3 12h3M18 12h3M4.2 18.2l2.1-2.1M17.7 7.9l2.1-2.1" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}
