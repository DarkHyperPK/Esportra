import { NavLink } from "react-router-dom";
export function BroadcastNavigation() {
  return (
    <nav
      className="mb-5 flex flex-wrap gap-2"
      aria-label="Broadcast navigation"
    >
      {[
        ["/broadcast/home", "Home"],
        ["/air", "Independent projects"],
        ["/broadcast/shows", "Shows"],
        ["/broadcast/get-started", "Get started"],
        ["/broadcast/crew/shows", "My crew shows"],
      ].map(([path, label]) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `border px-4 py-2 text-sm focus-visible:outline-white ${isActive ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-zinc-400"}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
