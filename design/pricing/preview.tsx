import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Pricing from '../../src/pages/Pricing';
import { AuthContext } from '../../src/contexts/auth-context';
import { getWebsiteAssetUrl } from '../../src/lib/storage';
import { initReduceMotion } from '../../src/lib/motionPreference';
import '../../src/index.css';

const noAction = async () => {};
initReduceMotion();
const fixture = {
  user: null, profile: null, loading: false, isEmailVerified: false,
  signIn: noAction, signUp: noAction, signInWithGoogle: noAction,
  signInWithDiscord: noAction, signOut: noAction, updateProfile: noAction,
  isOrganizer: () => false, isVenueOwner: () => false, isCasual: () => true,
};
document.querySelector<HTMLImageElement>('#preview-logo')!.src = getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthContext.Provider value={fixture}><Pricing /></AuthContext.Provider></BrowserRouter></React.StrictMode>,
);
