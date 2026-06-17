"use client";

import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { assetDirectory, directoryItems } from "@/lib/brandbook";

const filters = ["Todos", "Marca", "Fundamentos", "Produto"];

export function BrandbookDirectory() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const entries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return [...directoryItems, ...assetDirectory].filter((item) => {
      const matchesFilter = filter === "Todos" || item.group === filter;
      const haystack = `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase("pt-BR");
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [filter, query]);

  return (
    <>
      <div className="directory-toolbar mb-5">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search className="muted absolute left-3 size-4" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar página, capítulo, componente ou asset..."
            className="pl-10"
            aria-label="Buscar no diretório"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto" aria-label="Filtrar diretório">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className="theme-option whitespace-nowrap"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <p className="muted mb-4 text-sm">{entries.length} itens encontrados</p>
      <div className="directory-grid">
        {entries.map((item) => (
          <Link key={item.id} href={item.href} className="directory-item panel panel-interactive">
            <div className="flex items-center justify-between">
              <span className="brand-index-number">{item.category}</span>
              <ArrowUpRight className="muted size-4" aria-hidden="true" />
            </div>
            <h2 className="mt-6 font-heading text-lg font-semibold">{item.name}</h2>
            <p className="muted mt-2 text-sm leading-6">{item.description}</p>
            <footer><span>{item.group}</span><span>Ver item</span></footer>
          </Link>
        ))}
      </div>
    </>
  );
}
