import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // Fase 2: rota Projetos removida — redireciona para Reuniões.
      { source: "/app/projetos", destination: "/app/reunioes", permanent: false },
      { source: "/app/projetos/:path*", destination: "/app/reunioes", permanent: false },
    ];
  },
};

export default nextConfig;
