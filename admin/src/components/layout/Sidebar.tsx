interface NavLink {
  label: string;
  href: string;
}

const links: NavLink[] = [
  { label: "Dashboard", href: "/" },
  { label: "Employees", href: "/employees" },
  { label: "Attendance", href: "/attendance" },
  { label: "Leaves", href: "/leaves" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar() {
  return (
    <aside className="border-r bg-background px-4 py-6 text-sm">
      <nav>
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.href}>
              <a className="text-muted-foreground hover:text-foreground" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
