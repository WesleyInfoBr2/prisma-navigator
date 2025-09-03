import { Button } from "@/components/ui/button";
import { Search, BarChart3, FileText, Settings, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Início" },
    { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
    { href: "/search", icon: Search, label: "Busca" },
    { href: "/results", icon: FileText, label: "Resultados" },
    { href: "/prisma", icon: Settings, label: "PRISMA" },
  ];

  return (
    <nav className="bg-gradient-primary shadow-scientific border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-foreground rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-primary-foreground">RevPRISMA</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : ""
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;