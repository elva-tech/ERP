
import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    onLogin();
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#0A192F] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img src="/elva-logo.png" alt="ELVA Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-[#0A192F]">ELVA TECH</h1>
          <p className="text-[#2563EB] font-semibold tracking-widest mt-1">IDENTITY & ACCESS MANAGEMENT</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Central Admin Login</h2>
            <p className="text-gray-500 text-sm mt-2">Sign in to manage identities and access</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={19} className="absolute left-3 top-3.5 text-gray-400" />
                <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@elva.com" autoComplete="username" required className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <LockKeyhole size={19} className="absolute left-3 top-3.5 text-gray-400" />
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-[#2563EB] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm">Sign In</button>
          </form>
          <div className="flex items-center justify-center gap-2 mt-7 text-gray-500 text-xs">
            <ShieldCheck size={16} className="text-green-600" />
            <span>ELVA Identity & Access Management</span>
          </div>
        </div>
        <p className="text-center text-gray-400 text-xs mt-6">© 2026 ELVA TECH. All rights reserved.</p>
      </div>
    </div>
  );
}
