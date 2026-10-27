import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/AuthService';
import { orderActivityService, UserActivityItem } from '../../services/OrderActivityService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  ShieldCheck,
  Camera,
  Save,
  ArrowLeft,
  Activity,
  Search,
  ShoppingCart,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  // Profile Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate || '1992-06-15');
  const [nationalId, setNationalId] = useState(currentUser?.nationalId || '199216702981');
  const [address, setAddress] = useState(currentUser?.address || 'No. 45, Temple Road, Colombo 03');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Activity Log State
  const [activities, setActivities] = useState<UserActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activityCategory, setActivityCategory] = useState<'ALL' | 'ORDER' | 'PAYMENT' | 'QUOTATION'>('ALL');
  const [activitySearch, setActivitySearch] = useState('');

  // Load activity log
  useEffect(() => {
    let isMounted = true;
    async function loadActivities() {
      if (!currentUser?.id) return;
      try {
        setLoadingActivities(true);
        const data = await orderActivityService.getUserActivityLog(currentUser.id, role);
        if (isMounted) {
          setActivities(data);
        }
      } catch (err) {
        console.error('Failed to load user activity log', err);
      } finally {
        if (isMounted) setLoadingActivities(false);
      }
    }
    loadActivities();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, role]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesCategory = activityCategory === 'ALL' || act.category === activityCategory;
      const matchesSearch =
        !activitySearch.trim() ||
        act.title.toLowerCase().includes(activitySearch.toLowerCase()) ||
        act.referenceNumber.toLowerCase().includes(activitySearch.toLowerCase()) ||
        act.customerName.toLowerCase().includes(activitySearch.toLowerCase()) ||
        act.description.toLowerCase().includes(activitySearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activities, activityCategory, activitySearch]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      authService.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthDate,
        nationalId: nationalId.trim(),
        address: address.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      toast.success('Profile details updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setName(currentUser?.name || '');
    setEmail(currentUser?.email || '');
    setPhone(currentUser?.phone || '');
    setBirthDate(currentUser?.birthDate || '1992-06-15');
    setNationalId(currentUser?.nationalId || '199216702981');
    setAddress(currentUser?.address || 'No. 45, Temple Road, Colombo 03');
    setAvatarUrl(currentUser?.avatarUrl || '');
    toast.info('Form reset to saved profile');
  };

  const initials = (name || currentUser?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-5 pb-28 sm:pb-8 max-w-4xl mx-auto px-1 sm:px-0">
      {/* 1. Header with Back Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 w-8 p-0 rounded-xl border-slate-200 shadow-2xs hover:bg-slate-100"
            title="Go Back"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              User Profile
            </h1>
            <p className="text-xs text-slate-500">
              Manage personal details, photo, and view your activity audit history.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 rounded-full border-primary/30 text-primary bg-primary-light/50">
          <ShieldCheck className="h-3.5 w-3.5 mr-1 text-primary" />
          {role.replace('_', ' ')}
        </Badge>
      </div>

      {/* 2. Profile Photo & Info Hero Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-gradient-to-br from-primary/[0.04] via-white to-slate-50/50 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          {/* Avatar with Camera Action */}
          <div className="relative group shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden bg-primary text-primary-foreground font-extrabold text-2xl flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-primary/20">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarPicker((prev) => !prev)}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-primary transition-colors cursor-pointer border border-white"
              title="Change Profile Photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{name || 'Your Name'}</h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              <Mail className="h-3 w-3 text-slate-400" />
              <span>{email}</span>
              <span>•</span>
              <MapPin className="h-3 w-3 text-rose-500" />
              <span>{currentUser?.areaName || 'Western Province Territory'}</span>
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                Emp ID: {currentUser?.id || 'usr-106'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Active DNS Account
              </span>
            </div>
          </div>
        </div>

        {/* Avatar Preset & Custom Picker */}
        {showAvatarPicker && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Choose an Avatar Photo</span>
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setAvatarUrl('');
                  setShowAvatarPicker(false);
                }}
                className={`h-11 w-11 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center border-2 transition-all ${
                  !avatarUrl ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
                }`}
                title="Use Initials"
              >
                Initials
              </button>
              {AVATAR_PRESETS.map((pUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAvatarUrl(pUrl);
                    setShowAvatarPicker(false);
                  }}
                  className={`h-11 w-11 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    avatarUrl === pUrl ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-slate-200'
                  }`}
                >
                  <img src={pUrl} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Or paste an image URL..."
                value={customAvatarInput}
                onChange={(e) => setCustomAvatarInput(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (customAvatarInput.trim()) {
                    setAvatarUrl(customAvatarInput.trim());
                    setCustomAvatarInput('');
                    setShowAvatarPicker(false);
                  }
                }}
                className="text-xs h-8"
              >
                Apply URL
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Personal & Contact Information Form (View & Edit) */}
      <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span>Personal &amp; Contact Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Kasun Wickramasinghe"
                    className="pl-9 text-xs h-9"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rep.colombo@dnserp.com"
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 678 9012"
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              {/* National ID / NIC */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">National ID / NIC</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="199216702981"
                    className="pl-9 text-xs h-9 font-mono"
                  />
                </div>
              </div>

              {/* Territory / Area (Read-only) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Assigned Territory / Area</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={currentUser?.areaName || 'Western Province Central'}
                    readOnly
                    className="pl-9 text-xs h-9 bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Address (Full width) */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Residential / Field Address</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="No. 45, Temple Road, Colombo 03"
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs gap-1.5 h-9 font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-primary hover:bg-primary-hover text-white text-xs gap-1.5 h-9 font-semibold shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? 'Updating...' : 'Save / Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4. Activity Log Section (Requirement 6) */}
      <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span>My Activity Log &amp; Audit Trail</span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredActivities.length}
                </span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                History of your field orders, customer collections, and workflow submissions.
              </p>
            </div>
            <Link to="/orders/activity-log">
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 font-semibold hover:bg-primary-light">
                Full Log View <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Activity Filter Chips & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {(
                [
                  { label: 'All', value: 'ALL' },
                  { label: 'Orders', value: 'ORDER' },
                  { label: 'Payments', value: 'PAYMENT' },
                  { label: 'Quotations', value: 'QUOTATION' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setActivityCategory(chip.value)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                    activityCategory === chip.value
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search activity records..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          {/* Activity Cards List */}
          {loadingActivities ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading activity records...</div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-100">
              <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-700">No activity records found</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activitySearch || activityCategory !== 'ALL'
                  ? 'Try adjusting your search query or filter.'
                  : 'Your field submissions and activities will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredActivities.slice(0, 15).map((act) => {
                const getCategoryIcon = () => {
                  switch (act.category) {
                    case 'ORDER':
                      return <ShoppingCart className="h-4 w-4 text-primary" />;
                    case 'PAYMENT':
                      return <CreditCard className="h-4 w-4 text-blue-600" />;
                    case 'QUOTATION':
                      return <FileSpreadsheet className="h-4 w-4 text-amber-600" />;
                    default:
                      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
                  }
                };

                const getCategoryBg = () => {
                  switch (act.category) {
                    case 'ORDER':
                      return 'bg-primary-light';
                    case 'PAYMENT':
                      return 'bg-blue-50';
                    case 'QUOTATION':
                      return 'bg-amber-50';
                    default:
                      return 'bg-emerald-50';
                  }
                };

                return (
                  <div
                    key={act.id}
                    onClick={() => act.link && navigate(act.link)}
                    className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/70 transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-start gap-3"
                  >
                    {/* Category Icon Badge */}
                    <div className={`h-9 w-9 rounded-xl ${getCategoryBg()} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}>
                      {getCategoryIcon()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {act.referenceNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-800">•</span>
                          <span className="text-xs font-semibold text-slate-700 truncate">
                            {act.customerName}
                          </span>
                        </div>
                        <Badge
                          variant={act.statusBadge.variant as any}
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        >
                          {act.statusBadge.label}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{act.description}</p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(act.timestamp)}</span>
                        </div>
                        {act.amount !== undefined && (
                          <div className="font-mono font-bold text-slate-900 text-xs tabular-nums">
                            {formatCurrency(act.amount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
