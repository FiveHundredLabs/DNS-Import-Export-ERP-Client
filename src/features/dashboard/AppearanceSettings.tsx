import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Palette,
  Check,
  ShieldAlert,
  Sparkles,
  Save,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Eye,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export function AppearanceSettings() {
  const { currentColor, availableColors, setPrimaryColor, canConfigureTheme, currentUser } =
    useTheme();

  // Internal draft selection (allows live previewing before committing)
  const [selectedHex, setSelectedHex] = useState<string>(currentColor.hex);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [lastSavedColorName, setLastSavedColorName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // If role is not DIRECTOR, lock down completely
  if (!canConfigureTheme) {
    return (
      <Card className="border-rose-200 bg-rose-50/50 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 text-rose-700">
          <ShieldAlert className="h-6 w-6 shrink-0 text-rose-600" />
          <div>
            <h3 className="text-sm font-bold">Access Restricted</h3>
            <p className="text-xs text-rose-600 mt-0.5">
              Only authenticated users with the <span className="font-bold">Director</span> role are
              permitted to configure the enterprise primary color and appearance settings.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const selectedOption =
    availableColors.find((c) => c.hex.toLowerCase() === selectedHex.toLowerCase()) ||
    currentColor;

  const handleSave = () => {
    setIsSaving(true);
    const result = setPrimaryColor(selectedHex);

    setTimeout(() => {
      setIsSaving(false);
      if (result.success && result.color) {
        setSavedSuccess(true);
        setLastSavedColorName(result.color.name);
        toast.success(`Primary color successfully updated to ${result.color.name} (${result.color.hex})!`, {
          description: 'The enterprise theme has been saved and applied globally across all ERP sessions.',
        });
      } else {
        toast.error(result.error || 'Failed to update primary color.');
      }
    }, 150);
  };

  const handleSelectSwatch = (hex: string) => {
    setSelectedHex(hex);
    // Update global primary color immediately upon selecting swatch
    const result = setPrimaryColor(hex);
    if (result.success && result.color) {
      setSavedSuccess(true);
      setLastSavedColorName(result.color.name);
    }
  };

  const isCurrentActive = currentColor.hex.toLowerCase() === selectedHex.toLowerCase();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header matching Director Dashboard > Settings > Appearance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Director Dashboard</span>
            <span className="text-slate-300">/</span>
            <span>Settings</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-semibold">Appearance</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Primary Color System
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure the global brand accent color for the entire ERP system. Saved changes apply
            instantly to all modules and user sessions.
          </p>
        </div>

      </div>

      {/* Success Notification Alert Banner */}
      {savedSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-emerald-950">
                Primary Color Successfully Updated & Saved!
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                The global enterprise theme is now active with{' '}
                <span className="font-semibold underline">{lastSavedColorName}</span> ({currentColor.hex}
                ). All navigation, primary buttons, badges, links, and input highlights reflect this
                change.
              </p>
            </div>
            <div
              className="h-7 w-7 rounded-full border-2 border-white shadow-sm shrink-0"
              style={{ backgroundColor: currentColor.hex }}
              title={`Active color: ${currentColor.name}`}
            />
          </div>
        </div>
      )}

      {/* Configuration Grid: Left Swatches & Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 5 Predefined Color Swatches (7 Cols) */}
        <Card className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                <Sliders className="h-4 w-4 text-slate-500" />
                Select Enterprise Primary Color
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select one of the five approved corporate color options. Only one primary color can
                be active at a time.
              </p>
            </div>
            <Badge variant="outline" className="text-xs uppercase font-mono">
              Director Only
            </Badge>
          </div>

          {/* Color Swatches List */}
          <div className="space-y-3 mt-5">
            {availableColors.map((color) => {
              const isSelected = selectedHex.toLowerCase() === color.hex.toLowerCase();
              const isPersisted = currentColor.hex.toLowerCase() === color.hex.toLowerCase();

              return (
                <div
                  key={color.id}
                  onClick={() => handleSelectSwatch(color.hex)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-slate-800 bg-slate-50/80 shadow-sm ring-1 ring-slate-800/10'
                      : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Clickable Circular Swatch */}
                    <button
                      type="button"
                      aria-label={`Select ${color.name} (${color.hex})`}
                      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform duration-150 ${
                        isSelected ? 'scale-110 ring-4 ring-offset-2 ring-slate-400' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {/* Checkmark inside selected swatch */}
                      {isSelected && (
                        <Check className="h-5 w-5 text-white stroke-[3] drop-shadow-sm" />
                      )}
                    </button>

                    {/* Color Name & Hex Code Display */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{color.name}</span>
                        {isPersisted && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Active
                          </span>
                        )}
                        {color.hex === '#6AAED3' && (
                          <span className="text-xs font-medium text-slate-400">
                            (Default)
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-500 font-medium">
                        {color.hex}
                      </span>
                    </div>
                  </div>

                  {/* Right Status Badge */}
                  <div>
                    {isSelected ? (
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color.hex }}
                        />
                        Selected
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 hover:text-slate-600">Select</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Trigger */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {isCurrentActive ? (
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Current selected color is already active.
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">
                  Unsaved changes: click "Save Changes" to apply across the company.
                </span>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 text-xs font-bold w-full sm:w-auto"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </Card>

        {/* Right Column: Live Interactive Preview (5 Cols) */}
        <Card className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Live Component Preview
              </h3>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-2xs"
                style={{ backgroundColor: selectedOption.hex }}
              >
                {selectedOption.name}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Live visualization of buttons, navigation pills, badges, inputs, and highlights using{' '}
              <span className="font-bold text-slate-800">{selectedOption.name}</span>.
            </p>

            {/* Preview Components Sandbox */}
            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              {/* 1. Primary & Secondary Buttons Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  1. Buttons
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    style={{
                      backgroundColor: selectedOption.hex,
                      color: selectedOption.foreground,
                    }}
                    className="inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition-all"
                  >
                    Primary Action
                  </button>
                  <button
                    type="button"
                    style={{
                      borderColor: selectedOption.border,
                      color: selectedOption.text,
                      backgroundColor: selectedOption.light,
                    }}
                    className="inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-xs font-bold transition-all"
                  >
                    Subtle Action
                  </button>
                </div>
              </div>

              {/* 2. Navigation Pill & Tabs Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  2. Navigation & Tabs
                </label>
                <div className="space-y-2">
                  <div
                    style={{
                      backgroundColor: selectedOption.hex,
                      color: selectedOption.foreground,
                    }}
                    className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Active Navigation Item</span>
                  </div>

                  <div
                    style={{
                      backgroundColor: selectedOption.light,
                      color: selectedOption.text,
                      borderColor: selectedOption.border,
                    }}
                    className="flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-bold"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Submenu Active Pill</span>
                  </div>
                </div>
              </div>

              {/* 3. Badges Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  3. Badges & Tags
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    style={{
                      backgroundColor: selectedOption.light,
                      color: selectedOption.text,
                      borderColor: selectedOption.border,
                    }}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold"
                  >
                    Primary Badge
                  </span>
                  <span
                    style={{
                      backgroundColor: selectedOption.hex,
                      color: selectedOption.foreground,
                    }}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                  >
                    Solid Tag
                  </span>
                </div>
              </div>

              {/* 4. Form Input Focus State */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  4. Form Input Focus
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value="Input field with active focus border"
                    style={{
                      borderColor: selectedOption.hex,
                      boxShadow: `0 0 0 3px ${selectedOption.ring}`,
                    }}
                    className="w-full rounded-xl bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* 5. Color Palette Tokens Strip */}
              <div className="pt-2 border-t border-slate-200/80">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Generated Color Variants
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  <div
                    className="p-1.5 rounded-lg text-white font-bold"
                    style={{ backgroundColor: selectedOption.hex }}
                  >
                    Base
                  </div>
                  <div
                    className="p-1.5 rounded-lg text-white font-bold"
                    style={{ backgroundColor: selectedOption.hover }}
                  >
                    Hover
                  </div>
                  <div
                    className="p-1.5 rounded-lg font-bold border"
                    style={{
                      backgroundColor: selectedOption.light,
                      borderColor: selectedOption.border,
                      color: selectedOption.text,
                    }}
                  >
                    Light
                  </div>
                  <div
                    className="p-1.5 rounded-lg font-bold"
                    style={{ backgroundColor: selectedOption.active, color: '#fff' }}
                  >
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current User Role Notice */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Configuring as: {currentUser?.name}</span>
            <span className="font-bold text-slate-600">Role: DIRECTOR</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
