import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";

export default function HomePage() {
  return (
    <ProtectedLayout>
      <DashboardLayout>
        <DashboardAnalytics />
      </DashboardLayout>
    </ProtectedLayout>
  );
}
