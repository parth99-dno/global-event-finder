import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, LogOut, Check, Search, Clock, Save, Edit2, Loader2, X } from 'lucide-react';
import api from '../lib/api';

const AVAILABLE_INTERESTS = [
  'Politics', 'Economy', 'Technology', 'Sports',
  'Environment', 'Health', 'Science', 'Diplomacy'
];

interface UserProfile {
  id: string;
  name: string;
  email: string;
  interests: string[];
  savedCount: number;
}

interface SearchHistoryItem {
  _id: string;
  query: string;
  timestamp: string;
}

export default function Profile() {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/users/history')
        ]);
        setProfile(profileRes.data.user);
        setSelectedInterests(profileRes.data.user.interests || []);
        setHistory(historyRes.data.history || []);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (authUser) fetchProfileData();
  }, [authUser]);

  if (!authUser) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const saveInterests = async () => {
    try {
      setSaving(true);
      const res = await api.patch('/users/me', { interests: selectedInterests });
      setProfile(prev => prev ? { ...prev, interests: res.data.user.interests } : null);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-indigo-500/20 mb-4">
                {authUser.name[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-slate-100">{authUser.name}</h2>
              <div className="flex items-center gap-1.5 text-slate-400 mt-1 justify-center text-sm">
                <Shield size={14} className="text-emerald-400" /> Standard User
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-slate-300">
                <Mail size={18} className="text-purple-400" />
                <span className="text-sm">{authUser.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Save size={18} className="text-blue-400" />
                <span className="text-sm">{profile?.savedCount || 0} Saved Events</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold transition-colors border border-red-500/20"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* Right Col: Interests & History */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Interests */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/70">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Check size={20} className="text-indigo-400" /> My Interests
              </h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Edit2 size={14} /> Edit
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => { setIsEditing(false); setSelectedInterests(profile?.interests || []); }} className="text-sm text-slate-400 hover:text-slate-300">Cancel</button>
                  <button onClick={saveInterests} disabled={saving} className="text-sm text-indigo-400 font-semibold flex items-center gap-1">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map(interest => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                          : 'bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.interests && profile.interests.length > 0 ? (
                  profile.interests.map(interest => (
                    <span key={interest} className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No interests selected.</span>
                )}
              </div>
            )}
          </div>

          {/* History */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/70">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Clock size={20} className="text-indigo-400" /> Recent Searches
            </h3>
            
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                    <Search size={16} className="text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-300 flex-1">{item.query}</span>
                    <span className="text-xs text-slate-600">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No recent searches found.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
