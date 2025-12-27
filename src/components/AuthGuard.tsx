// src/components/AuthGuard.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

type Props = {
  children: ReactNode;
};

export function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted) return;

      setUser(firebaseUser ?? null);

      // se não estiver logado e não estiver já na página de login → redireciona
      if (!firebaseUser && pathname !== "/login") {
        router.replace("/login");
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router, pathname]);

  // ainda verificando o estado do usuário
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-zinc-200">
        <p>Carregando sessão...</p>
      </div>
    );
  }

  // não logado: já foi redirecionado no useEffect
  if (user === null && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
