import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";

export default function HomePage() {
  return (
    <ProtectedLayout>
      <DashboardLayout>
        <EnhancedDashboard />
      </DashboardLayout>
    </ProtectedLayout>
  );
}
