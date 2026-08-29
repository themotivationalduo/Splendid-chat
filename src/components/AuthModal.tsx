import React, { useState } from 'react';
import { User } from '../types';
import { registerFirebaseUser, loginFirebaseUser } from '../services/firestoreService';
import { playGlassChimeSound } from '../services/audioService';
import { COUNTRIES } from '../lib/countries';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User) => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isMandatory = false
}) => {
  const [isRegister, setIsRegister] = useState(false);
  
  // Registration Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedDialCode, setSelectedDialCode] = useState('+1');
  const [passcode, setPasscode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const AVATAR_OPTIONS = ['👤', '🌟', '🚀', '💎', '🔥', '⚡', '👑', '🎯', '🦊', '🌸', '🦁', '🦉'];

  const handlePasscodeChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setPasscode(digitsOnly);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegister) {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name');
        return;
      }
      if (!username.trim()) {
        setErrorMessage('Please choose a username');
        return;
      }
      if (!phoneNumber.trim()) {
        setErrorMessage('Please enter your phone number');
        return;
      }
      if (passcode.length !== 6) {
        setErrorMessage('Please enter a 6-digit passcode');
        return;
      }

      const fullPhoneNumber = `${selectedDialCode}${phoneNumber.replace(/\s+/g, '')}`;

      setIsLoading(true);
      try {
        const res = await registerFirebaseUser(fullName, username, fullPhoneNumber, passcode);
        setIsLoading(false);

        if (res.success && res.user) {
          playGlassChimeSound('sent');
          setSuccessMessage('Account registered successfully!');
          setTimeout(() => {
            onLoginSuccess(res.user!);
            if (onClose) onClose();
          }, 600);
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Error creating account.');
      }

    } else {
      // Login flow: Phone number + 6-digit passcode
      if (!phoneNumber.trim()) {
        setErrorMessage('Please enter your phone number');
        return;
      }
      if (passcode.length !== 6) {
        setErrorMessage('Please enter your 6-digit passcode');
        return;
      }

      const fullPhoneNumber = `${selectedDialCode}${phoneNumber.replace(/\s+/g, '')}`;

      setIsLoading(true);
      try {
        const res = await loginFirebaseUser(fullPhoneNumber, passcode);
        setIsLoading(false);

        if (res.success && res.user) {
          playGlassChimeSound('sent');
          setSuccessMessage('Welcome back!');
          setTimeout(() => {
            onLoginSuccess(res.user!);
            if (onClose) onClose();
          }, 500);
        } else {
          setErrorMessage(res.error || 'Invalid phone number or passcode.');
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Error signing in.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-xl animate-in fade-in duration-75">
      <div className="w-full max-w-md p-6 rounded-3xl mirror-glass-card border border-white/15 shadow-2xl space-y-5 text-slate-100 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Subtle background glow effect */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-2xl shadow-lg shadow-red-600/30 border border-white/20">
              💬
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>SPLENDID CHAT</span>
                <span className="text-red-500 text-xs">✨</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isRegister ? 'Create your personal account' : 'Sign in with your phone number'}
              </p>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-lg rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              ❌
            </button>
          )}
        </div>

        {/* Tab Selector: Login vs Register */}
        <div className="flex p-1 rounded-2xl mirror-glass-input border border-white/10">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isRegister
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isRegister
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>✨</span>
            <span>Create Account</span>
          </button>
        </div>

        {/* Error / Success Messages */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2 animate-in fade-in">
            <span className="text-base">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <span className="text-base">✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full h-11 px-4 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>🏷️</span>
                  <span>Username</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs text-slate-400 font-bold">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="sarah_c"
                    className="w-full h-11 pl-8 pr-4 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>Choose Profile Avatar</span>
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center shrink-0 transition-all ${
                        selectedAvatar === emoji
                          ? 'bg-red-600/30 border-2 border-red-500 scale-110'
                          : 'mirror-glass-input border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Phone Number with Country Code */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>📱</span>
              <span>Phone Number</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedDialCode}
                onChange={(e) => setSelectedDialCode(e.target.value)}
                className="h-11 px-3 rounded-xl mirror-glass-input border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all custom-scrollbar cursor-pointer w-28 shrink-0"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.dialCode}>
                    {c.flag} {c.dialCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9 ]/g, ''))}
                placeholder="555 000 0000"
                className="flex-1 h-11 px-4 rounded-xl mirror-glass-input border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                required
              />
            </div>
          </div>

          {/* 6-Digit Passcode */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>🔢</span>
                <span>6-Digit Passcode</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {passcode.length}/6 digits
              </span>
            </div>

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={passcode}
              onChange={(e) => handlePasscodeChange(e.target.value)}
              placeholder="••••••"
              className="w-full h-11 px-4 text-center tracking-[0.6em] font-mono text-base font-bold rounded-xl mirror-glass-input border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
              required
            />

            {/* Visual Dot Indicators */}
            <div className="flex items-center justify-center gap-2.5 pt-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all duration-75 ${
                    idx < passcode.length
                      ? 'bg-red-500 scale-110 shadow-sm shadow-red-500'
                      : 'bg-white/15 border border-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || passcode.length !== 6}
            className="w-full h-12 mt-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : isRegister ? (
              <>
                <span>✨</span>
                <span>Register & Open App</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Sign In to Splendid</span>
              </>
            )}
          </button>
        </form>

        {/* Auth Verification Footer */}
        <div className="pt-2 text-center flex items-center justify-center text-xs text-slate-400">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>🔒</span>
            <span>End-to-end encrypted</span>
          </span>
        </div>
      </div>
    </div>
  );
};
