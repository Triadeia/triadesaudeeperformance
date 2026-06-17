import { BrandbookNav } from "@/components/brandbook-nav";

export default function BrandbookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <BrandbookNav />
      {children}
    </div>
  );
}
