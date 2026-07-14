import { createContext, useContext } from 'react';

export const LoginVerifyContext = createContext<{
  isVerifying: boolean;
  setIsVerifying: (value: boolean) => void;
}>({ isVerifying: false, setIsVerifying: () => {} });

export const useLoginVerify = () => useContext(LoginVerifyContext);