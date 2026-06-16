import { FloatingPaths } from "@/components/ui/background-paths";
import LoginCard from "@/components/ui/login-1";

export const metadata = {
  title: "Sign In — DREADNOUGHT ASRE",
};

export default function LoginPage() {
  return (
    <div className="relative flex h-full min-h-screen items-center justify-center bg-[#02060e] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
      <div className="relative z-10">
        <LoginCard />
      </div>
    </div>
  );
}
