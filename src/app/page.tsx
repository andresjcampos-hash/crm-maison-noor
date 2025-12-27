"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Assim que a página inicial carregar, redireciona para /login
    router.replace("/login");
  }, [router]);

  // Não precisa exibir nada, o usuário será redirecionado automaticamente
  return null;
}
