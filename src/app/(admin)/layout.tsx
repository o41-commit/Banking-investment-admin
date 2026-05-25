import { AdminLayout } from "@/layouts/AdminLayout";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
