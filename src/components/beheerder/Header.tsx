import MobileSidebar from "./MobileSidebar";
import UserMenu from "./UserMenu";
import type { NavItem } from "@/lib/navigation";

interface HeaderProps {
  userName: string;
  userRole: string;
  navItems: NavItem[];
}

export default function Header({ userName, userRole, navItems }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <MobileSidebar items={navItems} />
        <h2 className="font-heading text-lg font-bold text-[#1b4332]">
          Backoffice
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <UserMenu userName={userName} userRole={userRole} />
      </div>
    </header>
  );
}
