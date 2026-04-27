import { Briefcase, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom"; 
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { useAuth } from "@/hooks/use-auth";

export const Header = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="border-b border-slate-700/50 bg-slate-950/30 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-slate-300 hover:text-white">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-slate-600" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Job Openings
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Profile Section */}
        {isAuthenticated && (
          <button 
            onClick={() => navigate("/profile")}
            className="text-slate-300 hover:text-white transition-colors"
            aria-label="View Profile"
          >
            <UserCircle className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};