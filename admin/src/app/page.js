import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedLayout from "@/components/layout/protected-layout";

export default function HomePage() {
  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Welcome to the attendance admin dashboard. Choose an option from the sidebar to get started.
          </p>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}
