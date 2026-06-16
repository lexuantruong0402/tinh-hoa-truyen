import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { auth, signIn, signOut } from "@/src/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return {
    user,
    setUser,
    showAuthModal,
    setShowAuthModal,
    signIn: () => signIn(),
    signOut: () => signOut(),
  };
}