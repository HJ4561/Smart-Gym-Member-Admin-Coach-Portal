import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { tl } from '../i18n';
import LangToggle from '../i18n/LangToggle';
import { emailError, onlyErrors } from '../utils/validate';
import { TwoFactorStep } from '../components/auth/TwoFactor';
import { homeFor, isCoach, isStaff, isTeam } from '../utils/roleHome';

// Sign-in for the admin console (variant "admin"), the coach portal ("coach") and the other team portals
// ("staff": front desk, shop, nutrition). Whoever signs in lands in their own portal.
const VARIANTS = {
  admin: { icon: 'admin_panel_settings', title: tl("Admin Console"), tag: tl("Staff sign-in"),
    emailLabel: tl("Administrator Email"), emailHint: tl("admin@smartgym.internal"), forgot: '/admin/forgot-password',
    allowed: isStaff, refused: tl("This account doesn’t have admin access. Members sign in on the member login page.") },
  coach: { icon: 'sports', title: tl("Coach Portal"), tag: tl("Coach sign-in"),
    emailLabel: tl("Coach Email"), emailHint: tl("coach@smartgym.com"), forgot: '/forgot-password',
    allowed: isCoach, refused: tl("This account isn’t a coach account. Members sign in on the member login page.") },
  staff: { icon: 'badge', title: tl("Team Portal"), tag: tl("Front desk, shop and nutrition"),
    emailLabel: tl("Work email"), emailHint: tl("name@smartgym.com"), forgot: '/forgot-password',
    allowed: (u) => isTeam(u) && !isStaff(u) && !isCoach(u),
    refused: tl("This account isn’t a gym team account. Members sign in on the member login page.") },
};

export default function AdminLogin({ variant = 'admin' }) {
  const v = VARIANTS[variant];
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, logout, finishLogin } = useAuth();
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(null);      // 2-step verification after the password

  // Signed in: staff land in their own portal (an admin on the coach page goes to the console).
  const done = async (result) => {
    const user = result.user;
    if (!isTeam(user)) {
      await logout();
      setStep(null);
      setErrors({ form: v.refused });
      return;
    }
    if (!v.allowed(user) && !user?.must_change_password) toast(tl("Opening your portal."), { icon: '↪' });
    else toast.success(tl("Signed in"));
    navigate(homeFor(user), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const found = onlyErrors({ email: emailError(email), password: password ? '' : tl('Password is required.') });
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.two_factor) setStep(result);
      else await done(result);
    } catch (err) {
      setErrors({ form: err.response
        ? tl(err.response.data?.detail || 'Wrong email or password. Check both and try again.')
        : tl('Network error — check your connection.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08080a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -right-32 -top-32 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center shadow-[0_0_30px_rgba(229,25,55,0.6)]">
              <span className="material-symbols-outlined text-on-primary-container text-[32px]">{v.icon}</span>
            </div>
            <span className="absolute inset-0 rounded-2xl ring-2 ring-primary-container/40 animate-ping" />
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-widest">{v.title}</h1>
          <p className="font-label-md text-[11px] text-primary uppercase tracking-[0.3em] mt-1 font-bold">{v.tag}</p>
        </div>

        {/* Form */}
        <div className="flex justify-end mb-3"><LangToggle /></div>
        {step ? (
          <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-2xl p-5 sm:p-8">
            <TwoFactorStep step={step} onDone={(data) => done(finishLogin(data))}
              onRestart={(msg) => { setStep(null); setErrors(msg ? { form: msg } : {}); }} />
          </div>
        ) : (
        <form onSubmit={handleSubmit} noValidate className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-2xl p-5 sm:p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider" htmlFor="admin-email">{v.emailLabel}</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none z-10">alternate_email</span>
              <input id="admin-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: '', form: '' })); }}
                placeholder={v.emailHint} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'admin-email-err' : undefined}
                className={`w-full bg-[#0a0a0c] text-on-surface font-body-md text-body-md pl-10 pr-4 py-3 rounded-lg border ${errors.email ? 'border-error' : 'border-[#1a1a1e]'} focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container placeholder:text-on-surface-variant/30 transition-all`} />
            </div>
            {errors.email && <span id="admin-email-err" role="alert" className="text-[12px] text-error">{errors.email}</span>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider" htmlFor="admin-password">{tl("Access Key")}</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none z-10">key</span>
              <input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: '', form: '' })); }}
                placeholder={tl("Enter secure key")} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'admin-pw-err' : undefined}
                className={`w-full bg-[#0a0a0c] text-on-surface font-body-md text-body-md pl-10 pr-12 py-3 rounded-lg border ${errors.password ? 'border-error' : 'border-[#1a1a1e]'} focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container placeholder:text-on-surface-variant/30 transition-all`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors" aria-label={tl("Toggle password")}>
                <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {errors.password && <span id="admin-pw-err" role="alert" className="text-[12px] text-error">{errors.password}</span>}
          </div>

          {errors.form && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-[13px] text-error">
              <span className="material-symbols-outlined text-[18px]">error</span><span>{errors.form}</span>
            </div>
          )}

          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
            className="disabled:opacity-60 w-full bg-primary-container hover:bg-secondary-container text-on-primary-container font-label-lg text-label-lg uppercase tracking-widest py-3.5 rounded-lg shadow-[0_0_24px_rgba(229,25,55,0.5)] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">{loading ? 'sync' : 'lock_open'}</span>
            <span>{loading ? tl("Signing in…") : tl("Sign in")}</span>
          </motion.button>

          <p className="text-center font-body-md text-[12px] text-on-surface-variant pt-4 border-t border-[#1a1a1e]">
            <Link to={v.forgot} className="text-primary hover:underline font-bold">{tl("Forgot your password?")}</Link>
          </p>
        </form>
        )}

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-between font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
          <span className="flex gap-4">
            {variant !== 'admin' && <Link to="/admin/login" className="hover:text-on-surface">{tl("Admin Login")}</Link>}
            {variant !== 'coach' && <Link to="/coach/login" className="hover:text-on-surface">{tl("Coach Login")}</Link>}
            {variant !== 'staff' && <Link to="/staff/login" className="hover:text-on-surface">{tl("Team Login")}</Link>}
          </span>
          <Link to="/login" className="text-primary hover:underline">{tl("Member Login →")}</Link>
        </div>
      </motion.div>
    </div>
  );
}