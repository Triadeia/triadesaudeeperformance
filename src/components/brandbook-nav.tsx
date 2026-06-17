"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/app/marca", "Visão geral"],
  ["/app/marca/diretorio", "Diretório"],
  ["/app/marca/estrategia", "Estratégia"],
  ["/app/marca/voz", "Voz"],
  ["/app/marca/cores", "Cores"],
  ["/app/marca/tipografia", "Tipografia"],
  ["/app/marca/layout", "Layout"],
  ["/app/marca/componentes", "Componentes"],
  ["/app/marca/tabelas", "Tabelas"],
  ["/app/marca/movimento", "Movimento"],
];

export function BrandbookNav() {
  const pathname = usePathname();

  return (
    <nav className="brand-nav mb-6" aria-label="Navegação do brandbook">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
